
const prisma = require('../database/prismaClient');
const cryptoService = require('../services/cryptoService');
const bcrypt = require('bcryptjs');



const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
};



const getNotes = async (req, res, next) => {
  try {
    const notes = await prisma.note.findMany({
      select: {
        id: true,
        userId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(notes);
  } catch (error) {
    next(error);
  }
};



const createAccessRequest = async (req, res, next) => {
  try {
    const noteId = Number(req.params.id);
    const { reason } = req.body;

    if (!Number.isSafeInteger(noteId) || noteId <= 0) {
      return res.status(400).json({
        error: 'Invalid note ID.',
      });
    }

    if (
      typeof reason !== 'string' ||
      reason.trim().length < 10 ||
      reason.trim().length > 500
    ) {
      return res.status(400).json({
        error: 'Reason must contain between 10 and 500 characters.',
      });
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return res.status(404).json({
        error: 'Note not found.',
      });
    }


    if (note.userId === req.userId) {
      return res.status(400).json({
        error: 'You cannot request administrator access to your own note.',
      });
    }

    const now = new Date();


    await prisma.accessRequest.updateMany({
      where: {
        adminId: req.userId,
        noteId: note.id,
        type: 'NORMAL',
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const existingRequest = await prisma.accessRequest.findFirst({
      where: {
        adminId: req.userId,
        noteId: note.id,
        type: 'NORMAL',
        status: 'PENDING',
        expiresAt: { gt: now },
      },
    });

    if (existingRequest) {
      return res.status(409).json({
        error: 'An active access request already exists for this note.',
        requestId: existingRequest.id,
      });
    }

    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);


    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.accessRequest.create({
        data: {
          adminId: req.userId,
          userId: note.userId,
          noteId: note.id,
          reason: reason.trim(),
          type: 'NORMAL',
          status: 'PENDING',
          expiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          adminId: req.userId,
          action: 'NOTE_ACCESS_REQUESTED',
          targetUserId: note.userId,
          noteId: note.id,
          reason: reason.trim(),
        },
      });

      return request;
    });

    res.status(201).json({
      message: 'Access request submitted successfully. Waiting for note owner approval.',
      request: {
        id: result.id,
        status: result.status,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};



const decryptApprovedNote = async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);

    if (!Number.isSafeInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        error: 'Invalid access request ID.',
      });
    }

    const now = new Date();

    const accessRequest = await prisma.accessRequest.findFirst({
      where: {
        id: requestId,
        adminId: req.userId,
        type: 'NORMAL',
        status: 'APPROVED',
        usedAt: null,
        expiresAt: { gt: now },
      },
      include: {
        note: true,
      },
    });

    if (!accessRequest) {
      return res.status(403).json({
        error: 'No valid approved access request found. The request may be expired or already used.',
      });
    }


    const decryptedContent = cryptoService.decrypt(
      accessRequest.note.content,
      accessRequest.note.iv,
      accessRequest.note.authTag
    );

    // Atomically consume approval and create audit record.
    const consumed = await prisma.$transaction(async (tx) => {
      const result = await tx.accessRequest.updateMany({
        where: {
          id: requestId,
          adminId: req.userId,
          type: 'NORMAL',
          status: 'APPROVED',
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          status: 'USED',
          usedAt: new Date(),
        },
      });

      if (result.count !== 1) {
        return false;
      }

      await tx.auditLog.create({
        data: {
          adminId: req.userId,
          action: 'NOTE_DECRYPTED_AFTER_APPROVAL',
          targetUserId: accessRequest.userId,
          noteId: accessRequest.noteId,
          reason: accessRequest.reason,
        },
      });

      return true;
    });

    if (!consumed) {
      return res.status(409).json({
        error: 'This approval has expired or has already been used.',
      });
    }

    res.json({
      id: accessRequest.note.id,
      title: accessRequest.note.title,
      content: decryptedContent,
      accessType: 'NORMAL',
    });
  } catch (error) {
    next(error);
  }
};


const emergencyDecryptNote = async (req, res, next) => {
  try {
    const noteId = Number(req.params.id);
    const { password, reason } = req.body;

    if (!Number.isSafeInteger(noteId) || noteId <= 0) {
      return res.status(400).json({
        error: 'Invalid note ID.',
      });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({
        error: 'Administrator password is required.',
      });
    }

    if (
      typeof reason !== 'string' ||
      reason.trim().length < 30 ||
      reason.trim().length > 500
    ) {
      return res.status(400).json({
        error: 'Emergency justification must contain between 30 and 500 characters.',
      });
    }

    // Verify administrator account and role again.
    const admin = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
      },
    });

    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Administrator access denied.',
      });
    }

    // Verify fresh password.
    const passwordValid = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!passwordValid) {
      await prisma.auditLog.create({
        data: {
          adminId: req.userId,
          action: 'EMERGENCY_ACCESS_FAILED',
          reason: reason.trim(),
        },
      });

      return res.status(403).json({
        error: 'Administrator password is incorrect.',
      });
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return res.status(404).json({
        error: 'Note not found.',
      });
    }

  
    const decryptedContent = cryptoService.decrypt(
      note.content,
      note.iv,
      note.authTag
    );

    const now = new Date();

  
    await prisma.$transaction(async (tx) => {
      await tx.accessRequest.create({
        data: {
          adminId: req.userId,
          userId: note.userId,
          noteId: note.id,
          reason: reason.trim(),
          type: 'EMERGENCY',
          status: 'USED',
          expiresAt: now,
          usedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          adminId: req.userId,
          action: 'EMERGENCY_NOTE_DECRYPTED',
          targetUserId: note.userId,
          noteId: note.id,
          reason: reason.trim(),
        },
      });
    });

    res.json({
      id: note.id,
      title: note.title,
      content: decryptedContent,
      emergencyAccess: true,
    });
  } catch (error) {
    next(error);
  }
};



module.exports = {
  getUsers,
  getNotes,
  createAccessRequest,
  decryptApprovedNote,
  emergencyDecryptNote,
};
