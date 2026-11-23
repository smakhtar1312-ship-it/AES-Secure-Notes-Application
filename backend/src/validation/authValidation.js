const { body } = require('express-validator');

const registerValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email is too long.'),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .isLength({ max: 128 }).withMessage('Password is too long.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Invalid email.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ max: 128 }).withMessage('Password is too long.'),
];

module.exports = { registerValidation, loginValidation };
