const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const ExamState = require('../models/ExamState');

// ── Student auth ──────────────────────────────────────────────
const authStudent = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ error: 'Not authorised, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.student = await Student.findById(decoded.id).select('-__v -passwordHash');
    if (!req.student) return res.status(401).json({ error: 'Student not found' });
    if (!decoded.sessionId || req.student.activeSessionId !== decoded.sessionId) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Active student auth (blocks terminated students) ───────────
const authActiveStudent = async (req, res, next) => {
  try {
    await authStudent(req, res, async () => {
      if (req.student?.codingCompletedAt) {
        return res.status(403).json({
          error: 'exam_completed',
          message: 'You have already completed the exam',
        });
      }
      if (req.student?.terminated === true) {
        return res.status(403).json({
          error: 'terminated',
          reason: req.student.terminatedReason || 'policy_violation',
        });
      }
      next();
    });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Admin auth (password-based, returns short-lived token) ────
const adminProtect = async (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'Admin token required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin' || !decoded.sessionId) throw new Error('Not admin');

    const state = await ExamState.findById('global');
    if (!state || state.activeAdminSessionId !== decoded.sessionId) {
      return res.status(401).json({ error: 'Admin session expired. Please login again.' });
    }

    const activeSession = state.adminSessions.find(
      s => s.sessionId === decoded.sessionId && !s.revokedAt
    );
    if (!activeSession) {
      return res.status(401).json({ error: 'Invalid admin session' });
    }

    activeSession.lastSeenAt = new Date();
    await state.save();
    next();
  } catch {
    res.status(401).json({ error: 'Invalid admin token' });
  }
};

// `protect` is kept as backwards-compatible alias for routes that should
// allow terminated users (status/profile/auth flows).
const protect = authStudent;

module.exports = { authStudent, authActiveStudent, protect, adminProtect };
