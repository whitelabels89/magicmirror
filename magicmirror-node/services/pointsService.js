const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const CONFIG_PATH = path.join(__dirname, '..', 'points.config.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    return { default_per_lesson: 0, overrides: {} };
  }
}

/**
 * Award points to a user for completing a lesson.
 * Ensures idempotency based on uid + course + lesson.
 * @param {Object} params
 * @param {string} params.uid
 * @param {string} params.courseId
 * @param {string} params.lessonId
 * @param {string} [params.source]
 * @returns {Promise<{added:number,total_points:number}>}
 */
async function awardPoints({ uid, courseId, lessonId, source = 'worksheet_submit' }) {
  if (!uid || !courseId || !lessonId) {
    throw new Error('Missing required fields');
  }
  const cfg = readConfig();
  const points = (cfg.overrides && cfg.overrides[`${courseId}:${lessonId}`]) || cfg.default_per_lesson || 0;
  const checksum = `${uid}|${courseId}|${lessonId}`;
  const db = admin.firestore();

  return await db.runTransaction(async (t) => {
    const logRef = db.collection('points_log');
    const existing = await t.get(logRef.where('checksum', '==', checksum).limit(1));
    const userRef = db.collection('user_stats').doc(uid);
    const userSnap = await t.get(userRef);
    const currentTotal = userSnap.exists ? Number(userSnap.data().total_points || 0) : 0;
    if (!existing.empty) {
      return { added: 0, total_points: currentTotal };
    }
    const now = admin.firestore.Timestamp.now();
    t.set(logRef.doc(), {
      uid,
      course_id: courseId,
      lesson_id: lessonId,
      points,
      claimed_at: now,
      source,
      checksum
    });
    if (userSnap.exists) {
      const courses = userSnap.data().courses || {};
      const newCourse = Number(courses[courseId] || 0) + points;
      courses[courseId] = newCourse;
      t.update(userRef, {
        total_points: currentTotal + points,
        courses,
        last_updated: now
      });
      return { added: points, total_points: currentTotal + points };
    } else {
      t.set(userRef, {
        uid,
        total_points: points,
        courses: { [courseId]: points },
        last_updated: now
      });
      return { added: points, total_points: points };
    }
  });
}

/** Get user statistics */
async function getUserStats(uid) {
  const snap = await admin.firestore().collection('user_stats').doc(uid).get();
  if (!snap.exists) return { uid, total_points: 0, courses: {}, last_updated: null };
  const data = snap.data();
  return {
    uid: data.uid || uid,
    total_points: Number(data.total_points || 0),
    courses: data.courses || {},
    last_updated: data.last_updated || null
  };
}

/** Get user log items with pagination */
async function getUserLogs(uid, { limit = 20, cursor } = {}) {
  const db = admin.firestore();
  let q = db.collection('points_log').where('uid', '==', uid).orderBy('claimed_at', 'desc').limit(Number(limit));
  if (cursor) {
    const ts = typeof cursor === 'string' && !isNaN(cursor) ? Number(cursor) : Date.parse(cursor);
    if (!isNaN(ts)) {
      q = q.startAfter(admin.firestore.Timestamp.fromMillis(ts));
    }
  }
  const snap = await q.get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const last = items[items.length - 1];
  const next_cursor = items.length === Number(limit) && last ? last.claimed_at.toMillis() : null;
  return { items, next_cursor };
}

/** Aggregate summary for a date range */
async function getSummary({ from, to }) {
  const db = admin.firestore();
  const start = admin.firestore.Timestamp.fromDate(new Date(from));
  const end = admin.firestore.Timestamp.fromDate(new Date(to));
  const snap = await db.collection('points_log')
    .where('claimed_at', '>=', start)
    .where('claimed_at', '<=', end)
    .get();
  let total = 0;
  const per_course = {};
  snap.forEach(doc => {
    const data = doc.data();
    const p = Number(data.points || 0);
    total += p;
    const cid = data.course_id;
    per_course[cid] = (per_course[cid] || 0) + p;
  });
  return { total_points: total, per_course };
}

module.exports = {
  awardPoints,
  getUserStats,
  getUserLogs,
  getSummary
};
