const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matches.controller');
const { authenticateJWT } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.get('/',           authenticateJWT, matchController.getAllMatches);
router.get('/live/sse',   matchController.liveMatchSSE);
router.get('/:id',        authenticateJWT, matchController.getMatchById);
router.post('/',          authenticateJWT, requireRole(['admin', 'coach']), matchController.createMatch);
router.put('/:id/score',  authenticateJWT, requireRole(['admin', 'coach']), matchController.updateScore);

module.exports = router;
