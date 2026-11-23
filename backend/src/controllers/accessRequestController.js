
const prisma = require('../database/prismaClient');


async function getMyAccessRequests(req, res, next) {
  try {
    const requests = await prisma.accessRequest.findMany({
      where: {
        userId: req.userId,
        type: 'NORMAL',
        status: {
          in: ['PENDING', 'APPROVED', 'DENIED', 'EXPIRED']
        }
      },
      select: {
        id: true,
        adminId: true,
        noteId: true,
        reason: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        admin: {
          select: { email: true }
        },
        note: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();

    
    const expiredIds = requests
      .filter(request =>
        request.status === 'PENDING' &&
        request.expiresAt <= now
      )
      .map(request => request.id);

    if (expiredIds.length > 0) {
      await prisma.accessRequest.updateMany({
        where: {
          id: { in: expiredIds },
          userId: req.userId,
          status: 'PENDING',
          expiresAt: { lte: now }
        },
        data: { status: 'EXPIRED' }
      });
    }

    const updatedRequests = requests.map(request => ({
      ...request,
      status:
        request.status === 'PENDING' && request.expiresAt <= now
          ? 'EXPIRED'
          : request.status
    }));

    res.json({ requests: updatedRequests });
  } catch (error) {
    next(error);
  }
}



async function respondToAccessRequest(req, res, next) {
  try {
    const requestId = Number(req.params.id);
    const { decision } = req.body;

    if (!Number.isSafeInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        error: 'Invalid request ID.'
      });
    }

    if (!['APPROVED', 'DENIED'].includes(decision)) {
      return res.status(400).json({
        error: 'Decision must be APPROVED or DENIED.'
      });
    }

    const accessRequest = await prisma.accessRequest.findFirst({
      where: {
        id: requestId,
        userId: req.userId,
        type: 'NORMAL'
      }
    });

    if (!accessRequest) {
      return res.status(404).json({
        error: 'Access request not found.'
      });
    }

    const now = new Date();

    if (
      accessRequest.status !== 'PENDING' ||
      accessRequest.expiresAt <= now
    ) {
      if (
        accessRequest.status === 'PENDING' &&
        accessRequest.expiresAt <= now
      ) {
        await prisma.accessRequest.updateMany({
          where: {
            id: requestId,
            userId: req.userId,
            status: 'PENDING',
            expiresAt: { lte: now }
          },
          data: { status: 'EXPIRED' }
        });
      }

      return res.status(409).json({
        error: 'This request is no longer pending or has expired.'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.accessRequest.updateMany({
        where: {
          id: requestId,
          userId: req.userId,
          type: 'NORMAL',
          status: 'PENDING',
          expiresAt: { gt: now }
        },
        data: { status: decision }
      });

      if (updated.count !== 1) {
        return false;
      }

      await tx.auditLog.create({
        data: {
          adminId: accessRequest.adminId,
          action:
            decision === 'APPROVED'
              ? 'NOTE_ACCESS_APPROVED'
              : 'NOTE_ACCESS_DENIED',
          targetUserId: req.userId,
          noteId: accessRequest.noteId,
          reason: accessRequest.reason
        }
      });

      return true;
    });

    if (!result) {
      return res.status(409).json({
        error: 'The request has already been answered or has expired.'
      });
    }

    res.json({
      message:
        decision === 'APPROVED'
          ? 'Access request approved.'
          : 'Access request denied.',
      status: decision
    });
  } catch (error) {
    next(error);
  }
}



async function getEmergencyAccessNotifications(req, res, next) {
  try {
    // Only successful emergency decryption events
    // belonging to the currently logged-in user.
    const logs = await prisma.auditLog.findMany({
      where: {
        targetUserId: req.userId,
        action: 'EMERGENCY_NOTE_DECRYPTED'
      },
      select: {
        id: true,
        adminId: true,
        noteId: true,
        reason: true,
        createdAt: true,
        admin: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });


    const noteIds = [
      ...new Set(
        logs
          .map(log => log.noteId)
          .filter(id => id !== null)
      )
    ];

    const notes = noteIds.length
      ? await prisma.note.findMany({
          where: {
            id: { in: noteIds },
            userId: req.userId
          },
          select: {
            id: true,
            title: true
          }
        })
      : [];

    const noteTitleMap = new Map(
      notes.map(note => [note.id, note.title])
    );

    const notifications = logs.map(log => ({
      id: log.id,
      adminId: log.adminId,
      adminEmail: log.admin.email,
      noteId: log.noteId,
      noteTitle: noteTitleMap.get(log.noteId) || 'Deleted note',
      reason: log.reason,
      accessedAt: log.createdAt,
      type: 'EMERGENCY_ACCESS'
    }));

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyAccessRequests,
  respondToAccessRequest,
  getEmergencyAccessNotifications
};
