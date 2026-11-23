
const express = require('express');
const router = express.Router();

const {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote
} = require('../controllers/notesController');

const {
  getMyAccessRequests,
  respondToAccessRequest,
  getEmergencyAccessNotifications
} = require('../controllers/accessRequestController');

const { requireAuth } = require('../middleware/auth');

const {
  createNoteValidation,
  updateNoteValidation,
  noteIdValidation
} = require('../validation/noteValidation');


router.use(requireAuth);


router.get('/access-requests', getMyAccessRequests);


router.post('/access-requests/:id/respond', respondToAccessRequest);


router.get('/security-notifications', getEmergencyAccessNotifications);


router.get('/', getNotes);
router.get('/:id', noteIdValidation, getNoteById);
router.post('/', createNoteValidation, createNote);
router.put('/:id', updateNoteValidation, updateNote);
router.delete('/:id', noteIdValidation, deleteNote);

module.exports = router;
