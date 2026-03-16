const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Student = require('../models/Student');
const ExamState = require('../models/ExamState');
const { protect, adminProtect } = require('../middleware/auth');

const signToken = (id, sessionId) =>
  jwt.sign({ id, sessionId }, process.env.JWT_SECRET, { expiresIn: '12h' });

const signAdminToken = (sessionId) =>
  jwt.sign({ role: 'admin', sessionId }, process.env.JWT_SECRET, { expiresIn: '8h' });

async function getState() {
  let state = await ExamState.findById('global');
  if (!state) state = await ExamState.create({ _id: 'global' });
  return state;
}

const normalizeStudent = (student) => ({
  id: student._id,
  _id: student._id,
  name: student.name,
  rollNo: student.rollNo,
  college: student.college,
  phoneNumber: student.phoneNumber,
  department: student.department,
  academicSession: student.academicSession,
  currentRound: student.currentRound || 1,
  eliminated: Boolean(student.eliminated || false),
  eliminatedReason: student.eliminatedReason || '',
  terminated: Boolean(student.terminated || false),
  terminatedReason: student.terminatedReason || '',
  mcqCompletedAt: student.mcqCompletedAt || null,
  debugCompletedAt: student.debugCompletedAt || null,
  codingCompletedAt: student.codingCompletedAt || null,
  codingSolvedCount: Number(student.codingSolvedCount || 0),
  violationCount: Number(student.violationCount || 0),
  status: student.status,
});

const startStudentSession = (student, req) => {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  student.activeSessionId = sessionId;
  student.lastSeen = now;
  student.sessions.push({
    sessionId,
    createdAt: now,
    lastSeenAt: now,
    userAgent: req.get('user-agent') || '',
    ipAddress: req.ip || '',
  });
  return sessionId;
};

// POST /api/auth/register  — student registration
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      rollNo,
      college,
      phoneNumber,
      department,
      academicSession,
      password,
      currentPassword,
    } = req.body;
    if (!name?.trim() || !rollNo?.trim() || !college?.trim() || !phoneNumber?.trim() || !department?.trim() || !password) {
      return res.status(400).json({ error: 'All registration fields are required' });
    }

    if ((currentPassword || '') !== password) {
      return res.status(400).json({ error: 'Password and current password must match' });
    }

    if (!/^\d{10,15}$/.test(String(phoneNumber).trim())) {
      return res.status(400).json({ error: 'Phone number must contain 10 to 15 digits' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const roll = rollNo.trim().toUpperCase();

    const existing = await Student.findOne({ rollNo: roll });
    if (existing) {
      return res.status(409).json({ error: 'Roll Number is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const student = await Student.create({
      name: name.trim(),
      rollNo: roll,
      college: college.trim(),
      phoneNumber: String(phoneNumber).trim(),
      department: department.trim(),
      academicSession: String(academicSession || '').trim(),
      passwordHash,
      lastSeen: new Date(),
    });

    const sessionId = startStudentSession(student, req);
    await student.save();
    const token = signToken(student._id, sessionId);
    return res.status(201).json({
      token,
      student: normalizeStudent(student),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Roll Number is already registered' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login  — student login
router.post('/login', async (req, res) => {
  try {
    const { rollNo, password } = req.body;
    if (!rollNo?.trim() || !password)
      return res.status(400).json({ error: 'Roll Number and Password are required' });

    const roll = rollNo.trim().toUpperCase();

    const student = await Student.findOne({ rollNo: roll });
    if (!student) {
      return res.status(404).json({ error: 'Student not found. Please register first.' });
    }

    const passwordOk = await bcrypt.compare(password, student.passwordHash || '');
    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid roll number or password' });
    }

    if (student.activeSessionId) {
      const activeSession = student.sessions.find(s => s.sessionId === student.activeSessionId && !s.revokedAt);
      if (activeSession) activeSession.revokedAt = new Date();
    }

    const sessionId = startStudentSession(student, req);
    await student.save();

    const freshStudent = await Student.findById(student._id);

    const token = signToken(student._id, sessionId);
    return res.json({
      token,
      student: normalizeStudent(freshStudent || student),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/admin — admin login
router.post('/admin', async (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Invalid admin password' });

  const state = await getState();

  if (state.activeAdminSessionId) {
    const active = state.adminSessions.find(s => s.sessionId === state.activeAdminSessionId && !s.revokedAt);
    if (active) active.revokedAt = new Date();
  }

  const sessionId = crypto.randomUUID();
  const now = new Date();
  state.activeAdminSessionId = sessionId;
  state.adminSessions.push({
    sessionId,
    createdAt: now,
    lastSeenAt: now,
    userAgent: req.get('user-agent') || '',
    ipAddress: req.ip || '',
  });
  await state.save();

  res.json({ token: signAdminToken(sessionId) });
});

// POST /api/auth/admin/logout — revoke current admin session
router.post('/admin/logout', adminProtect, async (req, res) => {
  try {
    const token = req.headers['x-admin-token'];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const state = await getState();

    const active = state.adminSessions.find(s => s.sessionId === decoded.sessionId && !s.revokedAt);
    if (active) active.revokedAt = new Date();
    state.activeAdminSessionId = null;
    await state.save();

    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid admin token' });
  }
});

// POST /api/auth/reinstate — student re-entry after kick
router.post('/reinstate', async (req, res) => {
  try {
    const { rollNo, code } = req.body;
    if (code !== process.env.INVIGILATOR_CODE)
      return res.status(401).json({ error: 'Invalid invigilator code' });

    let query = null;
    if (rollNo?.trim()) {
      query = { rollNo: rollNo.trim().toUpperCase() };
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      query = { _id: decoded.id };
    }
    if (!query) return res.status(400).json({ error: 'rollNo is required when not authenticated' });

    const student = await Student.findOneAndUpdate(
      query,
      { status: 'Active', lastSeen: new Date(), terminated: false, terminatedReason: '', violationCount: 0 },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (student.activeSessionId) {
      const activeSession = student.sessions.find(s => s.sessionId === student.activeSessionId && !s.revokedAt);
      if (activeSession) activeSession.revokedAt = new Date();
    }

    const sessionId = startStudentSession(student, req);
    await student.save();
    const token = signToken(student._id, sessionId);
    res.json({ token, student: normalizeStudent(student) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout — revoke current student session
router.post('/logout', protect, async (req, res) => {
  try {
    const student = req.student;
    if (student.activeSessionId) {
      const activeSession = student.sessions.find(s => s.sessionId === student.activeSessionId && !s.revokedAt);
      if (activeSession) activeSession.revokedAt = new Date();
    }
    student.activeSessionId = null;
    await student.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
