const express = require('express');
const { awardPoints, getUserStats, getUserLogs, getSummary } = require('../services/pointsService');

const router = express.Router();
const modRouter = express.Router();

function requireAuth(req, res, next) {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  next();
}
function requireMod(req, res, next) {
  if (!req.user || !['moderator', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  next();
}

// --- Student endpoints ---
router.post('/claim', requireAuth, async (req, res) => {
  const { course_id, lesson_id } = req.body || {};
  if (!course_id || !lesson_id) {
    return res.status(400).json({ ok: false, error: 'invalid_body' });
  }
  try {
    const result = await awardPoints({
      uid: req.user.uid,
      courseId: course_id,
      lessonId: lesson_id,
      source: 'worksheet_submit'
    });
    res.json({ ok: true, added: result.added, total_points: result.total_points });
  } catch (e) {
    console.error('awardPoints error:', e);
    res.status(500).json({ ok: false, error: e.message || 'internal' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const stats = await getUserStats(req.user.uid);
    res.json({ ok: true, total_points: stats.total_points, courses: stats.courses, last_updated: stats.last_updated });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal' });
  }
});

router.get('/logs', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const cursor = req.query.cursor;
    const logs = await getUserLogs(req.user.uid, { limit, cursor });
    res.json({ ok: true, items: logs.items, next_cursor: logs.next_cursor });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal' });
  }
});

// --- Moderator endpoints ---
modRouter.use(requireAuth, requireMod);

modRouter.get('/summary', async (req, res) => {
  const { from, to } = req.query || {};
  if (!from || !to) {
    return res.status(400).json({ ok: false, error: 'invalid_range' });
  }
  try {
    const summary = await getSummary({ from, to });
    res.json({ ok: true, total_points: summary.total_points, per_course: summary.per_course });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal' });
  }
});

modRouter.get('/user/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const stats = await getUserStats(uid);
    const logs = await getUserLogs(uid, { limit: 50 });
    res.json({ ok: true, stats, logs: logs.items });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal' });
  }
});

module.exports = router;
module.exports.modRouter = modRouter;
