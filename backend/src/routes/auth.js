const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { register, login, logout, me } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../validation/authValidation');
const { requireAuth } = require('../middleware/auth');


const authLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: { error: 'Too many attempts. Please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    });

router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

module.exports = router;
