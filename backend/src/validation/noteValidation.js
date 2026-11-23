const { body, param } = require('express-validator');

const createNoteValidation = [
  body('title')
    .notEmpty().withMessage('Title is required.')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters.')
    .trim(),

  body('content')
    .notEmpty().withMessage('Content is required.')
    .isLength({ max: 10000 }).withMessage('Content cannot exceed 10000 characters.'),
];

const updateNoteValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid note ID.'),

  body('title')
    .notEmpty().withMessage('Title is required.')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters.')
    .trim(),

  body('content')
    .notEmpty().withMessage('Content is required.')
    .isLength({ max: 10000 }).withMessage('Content cannot exceed 10000 characters.'),
];

const noteIdValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid note ID.'),
];

module.exports = { createNoteValidation, updateNoteValidation, noteIdValidation };
