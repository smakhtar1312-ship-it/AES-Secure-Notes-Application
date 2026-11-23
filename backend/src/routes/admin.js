
const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const requireAdmin = require('../middleware/requireAdmin');

const {
  getUsers,
  getNotes,
  createAccessRequest,
  decryptApprovedNote,
  emergencyDecryptNote,
} = require('../controllers/adminController');


const emergencyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    error: 'Too many emergency access attempts. Try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});


router.use(requireAdmin);


router.get('/users', getUsers);
router.get('/notes', getNotes);


router.post(
  '/notes/:id/access-request',
  createAccessRequest
);


router.post(
  '/access-requests/:id/decrypt',
  decryptApprovedNote
);


router.post(
  '/notes/:id/emergency-decrypt',
  emergencyLimiter,
  emergencyDecryptNote
);

module.exports = router;
