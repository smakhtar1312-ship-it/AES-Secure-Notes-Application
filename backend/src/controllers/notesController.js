const { validationResult } = require('express-validator');
const prisma = require('../database/prismaClient');
const { encrypt, decrypt } = require('../services/cryptoService');
const logger = require('../utils/logger');


async function getNotes(req, res, next) {
  try {
    const notes = await prisma.note.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
  
    });

    res.json({ notes });
  } catch (err) {
    next(err);
  }
}


async function getNoteById(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const noteId = parseInt(req.params.id);

    const note = await prisma.note.findUnique({ where: { id: noteId } });

    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }


    if (note.userId !== req.userId) {
      logger.info(`Unauthorized note access attempt: user ${req.userId} tried to access note ${noteId} owned by user ${note.userId}`);
      return res.status(403).json({ error: 'Access denied.' });
    }


    const content = decrypt(note.content, note.iv, note.authTag);

    res.json({
      note: {
        id: note.id,
        title: note.title,
        content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}


async function createNote(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content } = req.body;


    const userId = req.userId;

    const { encryptedContent, iv, authTag } = encrypt(content);

    const note = await prisma.note.create({
      data: {
        title,
        content: encryptedContent,
        iv,
        authTag,
        userId,
      },
      select: { id: true, title: true, createdAt: true },
    });

    logger.info(`Note created: id=${note.id} user=${userId}`);

    res.status(201).json({ message: 'Note created.', note });
  } catch (err) {
    next(err);
  }
}


async function updateNote(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const noteId = parseInt(req.params.id);
    const { title, content } = req.body;

  
    const existing = await prisma.note.findUnique({ where: { id: noteId } });

    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }


    if (existing.userId !== req.userId) {
      logger.info(`Unauthorized update attempt: user ${req.userId} tried to update note ${noteId}`);
      return res.status(403).json({ error: 'Access denied.' });
    }


    const { encryptedContent, iv, authTag } = encrypt(content);

    const updated = await prisma.note.update({
      where: { id: noteId },
      data: { title, content: encryptedContent, iv, authTag },
      select: { id: true, title: true, updatedAt: true },
    });

    logger.info(`Note updated: id=${noteId} user=${req.userId}`);

    res.json({ message: 'Note updated.', note: updated });
  } catch (err) {
    next(err);
  }
}


async function deleteNote(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const noteId = parseInt(req.params.id);


    const existing = await prisma.note.findUnique({ where: { id: noteId } });

    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }


    if (existing.userId !== req.userId) {
      logger.info(`Unauthorized delete attempt: user ${req.userId} tried to delete note ${noteId}`);
      return res.status(403).json({ error: 'Access denied.' });
    }

    await prisma.note.delete({ where: { id: noteId } });

    logger.info(`Note deleted: id=${noteId} user=${req.userId}`);

    res.json({ message: 'Note deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getNotes, getNoteById, createNote, updateNote, deleteNote };
