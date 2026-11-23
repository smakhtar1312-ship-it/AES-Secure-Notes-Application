const prisma = require('../database/prismaClient');

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        error: 'Unauthorized. Please log in.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Access denied. Administrator privileges required.'
      });
    }

    req.userId = user.id;
    req.userRole = user.role;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = requireAdmin;