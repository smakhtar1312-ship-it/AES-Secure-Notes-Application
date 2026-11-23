
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const prisma = require('../database/prismaClient');
const logger = require('../utils/logger');


async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;


    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      return res.status(409).json({
        error: 'An account with that email already exists.'
      });
    }


    const passwordHash = await bcrypt.hash(password, 12);


    const user = await prisma.user.create({
      data: {
        email,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      message: 'Account created successfully.',
      user
    });
  } catch (err) {
    next(err);
  }
}


async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }


    const emailNormalized = req.body.email.trim().toLowerCase();
    const { password } = req.body;

  
    const user = await prisma.user.findUnique({
      where: { email: emailNormalized }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }


    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {
      logger.info(`Failed login attempt for: ${emailNormalized}`);
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    // Regenerate session to prevent session fixation
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = user.id;
      req.session.email = user.email;

      logger.info(`User logged in: ${user.email}`);

      res.json({
        message: 'Logged in successfully.',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (err) {
    next(err);
  }
}


function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);

    res.clearCookie('sid');

    res.json({
      message: 'Logged out successfully.'
    });
  });
}


async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  me
};
