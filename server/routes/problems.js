const router = require('express').Router();
const crypto = require('crypto');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { protect, adminProtect } = require('../middleware/auth');
const { MCQ, DebugProblem, CodingProblem } = require('../models/Problem');
const Student = require('../models/Student');
const ExamState = require('../models/ExamState');

async function resetStudentsForRound(roundNumber) {
  const r = Number(roundNumber);

  if (r === 1) {
    await Student.updateMany(
      { currentRound: 1 },
      {
        mcqCompletedAt: null,
        'r1.answers': {},
        'r1.score': 0,
        'r1.submitted': false,
        'r1.submitTime': null,
      }
    );
  }

  if (r === 2) {
    await Student.updateMany(
      { currentRound: 2 },
      {
        debugCompletedAt: null,
      }
    );
  }

  if (r === 3) {
    await Student.updateMany(
      { currentRound: 3 },
      {
        codingCompletedAt: null,
        totalTimeMs: null,
      }
    );
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const sha256 = (text) =>
  crypto.createHash('sha256').update((text || '').trim()).digest('hex');

const getBulkItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  throw new Error('Bulk upload must be a JSON array or an object with an items array');
};

const extractJsonFromText = (text) => {
  const raw = (text || '').trim();
  if (!raw) throw new Error('PDF appears to be empty');

  try {
    return JSON.parse(raw);
  } catch {}

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }

  const firstArray = raw.indexOf('[');
  const lastArray = raw.lastIndexOf(']');
  if (firstArray >= 0 && lastArray > firstArray) {
    try {
      return JSON.parse(raw.slice(firstArray, lastArray + 1));
    } catch {}
  }

  const firstObj = raw.indexOf('{');
  const lastObj = raw.lastIndexOf('}');
  if (firstObj >= 0 && lastObj > firstObj) {
    try {
      return JSON.parse(raw.slice(firstObj, lastObj + 1));
    } catch {}
  }

  throw new Error('Could not parse JSON from PDF. Put JSON array in the PDF text.');
};

const parsePdfAsBulkItems = async (fileBuffer) => {
  const pdfData = await pdfParse(fileBuffer);
  const parsed = extractJsonFromText(pdfData.text || '');
  return getBulkItems(parsed);
};

const normalizeMcq = (item, index) => ({
  text: String(item.text || '').trim(),
  options: Array.isArray(item.options) ? item.options.map(opt => String(opt || '').trim()) : [],
  correct: Number(item.correct),
  difficulty: item.difficulty || 'Easy',
  points: Number(item.points ?? 1),
  order: Number(item.order ?? index),
});

const normalizeDebugProblem = (item, index) => ({
  title: String(item.title || '').trim(),
  description: String(item.description || '').trim(),
  buggyCode: String(item.buggyCode || '').trim(),
  expectedOutputHash: item.expectedOutputHash || sha256(item.expectedOutputPlain || ''),
  language: item.language || 'python',
  difficulty: item.difficulty || 'Easy',
  sampleInput: item.sampleInput || '',
  order: Number(item.order ?? index),
});

const VALID_LANGUAGES = ['python', 'cpp', 'c', 'java', 'javascript'];
const QUESTION_MANAGER_LANGUAGES = ['python', 'java', 'c', 'cpp'];

function validateProblem(type, data) {
  const errors = [];
  const partial = !!data?.__partial;
  const payload = { ...(data || {}) };
  delete payload.__partial;

  const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);
  const requiredMissing = (key, label) => {
    if (!partial && !has(key)) errors.push(`${label} is required`);
  };

  if (type === 'mcq') {
    requiredMissing('question', 'question');
    requiredMissing('options', 'options');
    requiredMissing('correctAnswer', 'correctAnswer');

    if ((!partial || has('question')) && !String(payload.question || '').trim()) {
      errors.push('question must not be empty');
    }

    if (!partial || has('options')) {
      const options = payload.options;
      const validOptions = Array.isArray(options)
        && options.length === 4
        && options.every((opt) => String(opt || '').trim().length > 0);
      if (!validOptions) {
        errors.push('options must be an array of exactly 4 non-empty strings');
      }
    }

    if (!partial || has('correctAnswer')) {
      const ca = Number(payload.correctAnswer);
      if (!Number.isInteger(ca) || ca < 0 || ca > 3) {
        errors.push('correctAnswer must be 0, 1, 2, or 3');
      }
    }

    if (has('points')) {
      const points = Number(payload.points);
      if (!Number.isFinite(points) || points <= 0) {
        errors.push('points must be a positive number');
      }
    }
  }

  if (type === 'debug') {
    requiredMissing('title', 'title');
    requiredMissing('brokenCode', 'brokenCode');
    requiredMissing('expectedOutput', 'expectedOutput');

    if ((!partial || has('title')) && !String(payload.title || '').trim()) {
      errors.push('title must not be empty');
    }
    if ((!partial || has('brokenCode')) && !String(payload.brokenCode || '').trim()) {
      errors.push('brokenCode must not be empty');
    }
    if ((!partial || has('expectedOutput')) && !String(payload.expectedOutput || '').trim()) {
      errors.push('expectedOutput must not be empty');
    }

    if (has('allowedLanguages')) {
      const langs = payload.allowedLanguages;
      const valid = Array.isArray(langs) && langs.length > 0
        && langs.every((lang) => QUESTION_MANAGER_LANGUAGES.includes(lang));
      if (!valid) {
        errors.push('allowedLanguages must include at least one valid language');
      }
    }

    if (has('points')) {
      const points = Number(payload.points);
      if (!Number.isFinite(points) || points <= 0) {
        errors.push('points must be a positive number');
      }
    }
  }

  if (type === 'coding') {
    requiredMissing('title', 'title');
    requiredMissing('description', 'description');
    requiredMissing('testCases', 'testCases');

    if ((!partial || has('title')) && !String(payload.title || '').trim()) {
      errors.push('title must not be empty');
    }
    if ((!partial || has('description')) && !String(payload.description || '').trim()) {
      errors.push('description must not be empty');
    }

    if (!partial || has('testCases')) {
      const testCases = payload.testCases;
      if (!Array.isArray(testCases) || testCases.length < 1) {
        errors.push('testCases must be an array with at least 1 item');
      } else {
        const badIndex = testCases.findIndex((tc) => {
          const input = String(tc?.input ?? '').trim();
          const output = String(tc?.output ?? '').trim();
          return !input || !output;
        });
        if (badIndex >= 0) {
          errors.push(`testCases[${badIndex}] must include non-empty input and output`);
        }
      }
    }

    if (has('allowedLanguages')) {
      const langs = payload.allowedLanguages;
      const valid = Array.isArray(langs) && langs.length > 0
        && langs.every((lang) => QUESTION_MANAGER_LANGUAGES.includes(lang));
      if (!valid) {
        errors.push('allowedLanguages must include at least one valid language');
      }
    }

    if (has('points')) {
      const points = Number(payload.points);
      if (!Number.isFinite(points) || points <= 0) {
        errors.push('points must be a positive number');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

const normalizeCodingProblem = (item, index) => ({
  title: String(item.title || '').trim(),
  difficulty: item.difficulty || 'Medium',
  description: String(item.description || '').trim(),
  constraints: item.constraints || '',
  sampleInput: item.sampleInput || '',
  sampleOutput: item.sampleOutput || '',
  tags: Array.isArray(item.tags)
    ? item.tags.map(tag => String(tag).trim()).filter(Boolean)
    : String(item.tags || '').split(',').map(tag => tag.trim()).filter(Boolean),
  allowedLanguages: Array.isArray(item.allowedLanguages) && item.allowedLanguages.length
    ? item.allowedLanguages.filter(l => VALID_LANGUAGES.includes(l))
    : VALID_LANGUAGES,
  testCases: Array.isArray(item.testCases)
    ? item.testCases.map(tc => ({
        input: tc.input || '',
        outputHash: tc.outputHash || sha256(tc.outputPlain || ''),
        isSample: !!tc.isSample,
      }))
    : [],
  order: Number(item.order ?? index),
});

// ── PUBLIC (student-accessible) ────────────────────────────────

// GET /api/problems/mcq — get all MCQs (without correct answer)
router.get('/mcq', protect, async (req, res) => {
  try {
    console.log('GET /problems/mcq called by student:', req.student._id);

    const state = await ExamState.findById('global');
    if (!state?.contestStarted) {
      return res.status(403).json({ error: 'Contest has not started yet', contestStarted: false });
    }

    // If student's round is still 0 (shouldn't happen with schema default of 1, but guard it)
    if ((req.student.currentRound || 0) === 0) {
      await Student.findByIdAndUpdate(req.student._id, { currentRound: 1 });
    }

    const questions = await MCQ.find().sort({ order: 1, createdAt: 1 });
    console.log('MCQ questions found in DB:', questions.length);

    // Strip correct answer before sending to students
    const safeQuestions = questions.map(q => ({
      _id:        q._id,
      text:       q.text,
      options:    q.options,
      difficulty: q.difficulty,
      points:     q.points,
      // NO correct field
    }));
    res.json(safeQuestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/problems/debug — get debug problems (without expectedOutputHash)
router.get('/debug', protect, async (req, res) => {
  try {
    console.log('GET /problems/debug called by student:', req.student._id);

    const state = await ExamState.findById('global');
    if (!state?.contestStarted) {
      return res.status(403).json({ error: 'Contest has not started yet', contestStarted: false });
    }
    if ((req.student.currentRound || 1) < 2)
      return res.status(403).json({ error: 'Round 2 is not yet unlocked.' });
    const problems = await DebugProblem.find().sort({ order: 1, createdAt: 1 });
    console.log('Debug problems found in DB:', problems.length);
    const safe = problems.map(p => ({
      _id:         p._id,
      title:       p.title,
      description: p.description,
      buggyCode:   p.buggyCode,
      language:    p.language,
      difficulty:  p.difficulty,
      sampleInput: p.sampleInput,
      // NO expectedOutputHash
    }));
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/problems/coding — get coding problems (without test case hashes)
router.get('/coding', protect, async (req, res) => {
  try {
    console.log('GET /problems/coding called by student:', req.student._id);

    const state = await ExamState.findById('global');
    if (!state?.contestStarted) {
      return res.status(403).json({ error: 'Contest has not started yet', contestStarted: false });
    }
    if ((req.student.currentRound || 1) < 3)
      return res.status(403).json({ error: 'Round 3 is not yet unlocked.' });
    const problems = await CodingProblem.find().sort({ order: 1, createdAt: 1 });
    console.log('Coding problems found in DB:', problems.length);
    const safe = problems.map(p => ({
      _id:             p._id,
      title:           p.title,
      difficulty:      p.difficulty,
      description:     p.description,
      constraints:     p.constraints,
      sampleInput:     p.sampleInput,
      sampleOutput:    p.sampleOutput,
      tags:            p.tags,
      allowedLanguages: p.allowedLanguages?.length ? p.allowedLanguages : VALID_LANGUAGES,
      testCaseCount:   p.testCases.length,
      // NO testCases hashes
    }));
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN ONLY ────────────────────────────────────────────────

router.get('/admin/problems/mcq', adminProtect, async (req, res) => {
  try {
    const items = await MCQ.find().sort({ createdAt: -1 });
    res.json(items.map((q) => ({
      _id: q._id,
      question: q.text,
      options: q.options,
      correctAnswer: q.correct,
      points: q.points,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/problems/mcq', adminProtect, async (req, res) => {
  try {
    const check = validateProblem('mcq', req.body);
    if (!check.valid) return res.status(400).json({ errors: check.errors });

    const created = await MCQ.create({
      text: String(req.body.question || '').trim(),
      options: req.body.options.map((opt) => String(opt || '').trim()),
      correct: Number(req.body.correctAnswer),
      points: req.body.points !== undefined ? Number(req.body.points) : 10,
    });

    res.status(201).json({
      _id: created._id,
      question: created.text,
      options: created.options,
      correctAnswer: created.correct,
      points: created.points,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/admin/problems/mcq/:id', adminProtect, async (req, res) => {
  try {
    const check = validateProblem('mcq', { ...req.body, __partial: true });
    if (!check.valid) return res.status(400).json({ errors: check.errors });

    const update = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'question')) update.text = String(req.body.question || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'options')) update.options = req.body.options.map((opt) => String(opt || '').trim());
    if (Object.prototype.hasOwnProperty.call(req.body, 'correctAnswer')) update.correct = Number(req.body.correctAnswer);
    if (Object.prototype.hasOwnProperty.call(req.body, 'points')) update.points = Number(req.body.points);

    const updated = await MCQ.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json({
      _id: updated._id,
      question: updated.text,
      options: updated.options,
      correctAnswer: updated.correct,
      points: updated.points,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/admin/problems/mcq/:id', adminProtect, async (req, res) => {
  try {
    const deleted = await MCQ.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/admin/problems/debug', adminProtect, async (req, res) => {
  try {
    const items = await DebugProblem.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/problems/debug', adminProtect, async (req, res) => {
  try {
    const check = validateProblem('debug', req.body);
    if (!check.valid) return res.status(400).json({ errors: check.errors });

    const allowedLanguages = Array.isArray(req.body.allowedLanguages) && req.body.allowedLanguages.length
      ? req.body.allowedLanguages.filter((lang) => QUESTION_MANAGER_LANGUAGES.includes(lang))
      : ['python'];

    const expectedOutput = String(req.body.expectedOutput || '').trim();
    const created = await DebugProblem.create({
      title: String(req.body.title || '').trim(),
      description: String(req.body.description || '').trim(),
      buggyCode: String(req.body.brokenCode || '').trim(),
      expectedOutput,
      expectedOutputHash: sha256(expectedOutput),
      hint: String(req.body.hint || '').trim(),
      points: req.body.points !== undefined ? Number(req.body.points) : 30,
      allowedLanguages,
      language: allowedLanguages[0] || 'python',
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/admin/problems/debug/:id', adminProtect, async (req, res) => {
  try {
    const check = validateProblem('debug', { ...req.body, __partial: true });
    if (!check.valid) return res.status(400).json({ errors: check.errors });

    const update = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'title')) update.title = String(req.body.title || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) update.description = String(req.body.description || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'brokenCode')) update.buggyCode = String(req.body.brokenCode || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'expectedOutput')) {
      const expectedOutput = String(req.body.expectedOutput || '').trim();
      update.expectedOutput = expectedOutput;
      update.expectedOutputHash = sha256(expectedOutput);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'hint')) update.hint = String(req.body.hint || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'points')) update.points = Number(req.body.points);
    if (Object.prototype.hasOwnProperty.call(req.body, 'allowedLanguages')) {
      const allowedLanguages = req.body.allowedLanguages.filter((lang) => QUESTION_MANAGER_LANGUAGES.includes(lang));
      update.allowedLanguages = allowedLanguages;
      update.language = allowedLanguages[0] || 'python';
    }

    const updated = await DebugProblem.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/admin/problems/debug/:id', adminProtect, async (req, res) => {
  try {
    const deleted = await DebugProblem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/admin/problems/coding', adminProtect, async (req, res) => {
  try {
    const items = await CodingProblem.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/problems/coding', adminProtect, async (req, res) => {
  try {
    const check = validateProblem('coding', req.body);
    if (!check.valid) return res.status(400).json({ errors: check.errors });

    const allowedLanguages = Array.isArray(req.body.allowedLanguages) && req.body.allowedLanguages.length
      ? req.body.allowedLanguages.filter((lang) => QUESTION_MANAGER_LANGUAGES.includes(lang))
      : ['python', 'cpp', 'c', 'java'];

    const created = await CodingProblem.create({
      title: String(req.body.title || '').trim(),
      description: String(req.body.description || '').trim(),
      sampleInput: String(req.body.sampleInput || ''),
      sampleOutput: String(req.body.sampleOutput || '').trim(),
      points: req.body.points !== undefined ? Number(req.body.points) : 50,
      allowedLanguages,
      testCases: req.body.testCases.map((tc, idx) => {
        const input = String(tc.input || '');
        const output = String(tc.output || '');
        return {
          input,
          outputPlain: output,
          outputHash: sha256(output),
          isSample: idx === 0,
        };
      }),
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/admin/problems/coding/:id', adminProtect, async (req, res) => {
  try {
    const check = validateProblem('coding', { ...req.body, __partial: true });
    if (!check.valid) return res.status(400).json({ errors: check.errors });

    const update = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'title')) update.title = String(req.body.title || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) update.description = String(req.body.description || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'sampleInput')) update.sampleInput = String(req.body.sampleInput || '');
    if (Object.prototype.hasOwnProperty.call(req.body, 'sampleOutput')) update.sampleOutput = String(req.body.sampleOutput || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'points')) update.points = Number(req.body.points);
    if (Object.prototype.hasOwnProperty.call(req.body, 'allowedLanguages')) {
      update.allowedLanguages = req.body.allowedLanguages.filter((lang) => QUESTION_MANAGER_LANGUAGES.includes(lang));
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'testCases')) {
      update.testCases = req.body.testCases.map((tc, idx) => {
        const input = String(tc.input || '');
        const output = String(tc.output || '');
        return {
          input,
          outputPlain: output,
          outputHash: sha256(output),
          isSample: idx === 0,
        };
      });
    }

    const updated = await CodingProblem.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/admin/problems/coding/:id', adminProtect, async (req, res) => {
  try {
    const deleted = await CodingProblem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// MCQ CRUD
router.get('/admin/mcq', adminProtect, async (req, res) => {
  res.json(await MCQ.find().sort({ order: 1 }));
});

router.post('/admin/mcq', adminProtect, async (req, res) => {
  try {
    const q = await MCQ.create(req.body);
    res.status(201).json(q);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/admin/mcq/bulk', adminProtect, async (req, res) => {
  try {
    const items = getBulkItems(req.body).map(normalizeMcq);
    const created = await MCQ.insertMany(items, { ordered: false });
    res.status(201).json({ count: created.length, items: created });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/admin/mcq/import-pdf', adminProtect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });
    const bulkItems = await parsePdfAsBulkItems(req.file.buffer);
    const items = bulkItems.map(normalizeMcq);
    const created = await MCQ.insertMany(items, { ordered: false });
    res.status(201).json({ count: created.length, items: created });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/admin/mcq/:id', adminProtect, async (req, res) => {
  try {
    const q = await MCQ.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!q) return res.status(404).json({ error: 'Not found' });
    res.json(q);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/admin/mcq/:id', adminProtect, async (req, res) => {
  await MCQ.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Debug Problem CRUD
router.get('/admin/debug', adminProtect, async (req, res) => {
  res.json(await DebugProblem.find().sort({ order: 1 }));
});

router.post('/admin/debug', adminProtect, async (req, res) => {
  try {
    // expectedOutputHash must be pre-computed by client (SHA-256)
    const p = await DebugProblem.create(req.body);
    res.status(201).json(p);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/admin/debug/bulk', adminProtect, async (req, res) => {
  try {
    const items = getBulkItems(req.body).map(normalizeDebugProblem);
    const created = await DebugProblem.insertMany(items, { ordered: false });
    res.status(201).json({ count: created.length, items: created });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/admin/debug/import-pdf', adminProtect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });
    const bulkItems = await parsePdfAsBulkItems(req.file.buffer);
    const items = bulkItems.map(normalizeDebugProblem);
    const created = await DebugProblem.insertMany(items, { ordered: false });
    res.status(201).json({ count: created.length, items: created });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/admin/debug/:id', adminProtect, async (req, res) => {
  try {
    const p = await DebugProblem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/admin/debug/:id', adminProtect, async (req, res) => {
  await DebugProblem.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Coding Problem CRUD
router.get('/admin/coding', adminProtect, async (req, res) => {
  res.json(await CodingProblem.find().sort({ order: 1 }));
});

router.post('/admin/coding', adminProtect, async (req, res) => {
  try {
    const p = await CodingProblem.create(req.body);
    res.status(201).json(p);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/admin/coding/bulk', adminProtect, async (req, res) => {
  try {
    const items = getBulkItems(req.body).map(normalizeCodingProblem);
    const created = await CodingProblem.insertMany(items, { ordered: false });
    res.status(201).json({ count: created.length, items: created });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/admin/coding/import-pdf', adminProtect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });
    const bulkItems = await parsePdfAsBulkItems(req.file.buffer);
    const items = bulkItems.map(normalizeCodingProblem);
    const created = await CodingProblem.insertMany(items, { ordered: false });
    res.status(201).json({ count: created.length, items: created });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/admin/coding/:id', adminProtect, async (req, res) => {
  try {
    const p = await CodingProblem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/admin/coding/:id', adminProtect, async (req, res) => {
  await CodingProblem.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ── JSON IMPORT ROUTES ───────────────────────────────────────
const IMPORT_MAX = 50;
const VALID_IMPORT_LANGS = ['python', 'cpp', 'c', 'java', 'javascript'];

// POST /api/problems/import/mcq
router.post('/import/mcq', adminProtect, async (req, res) => {
  try {
    const raw = req.body;
    const questions = Array.isArray(raw) ? raw : (Array.isArray(raw?.questions) ? raw.questions : null);
    if (!questions) return res.status(400).json({ error: 'Body must be { questions: [...] } or a JSON array' });
    if (questions.length === 0) return res.status(400).json({ error: 'questions array is empty' });
    if (questions.length > IMPORT_MAX) return res.status(400).json({ error: `Maximum ${IMPORT_MAX} questions per batch` });

    const valid = [];
    const errors = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !String(q.question).trim()) { errors.push({ index: i, error: 'question text is required' }); continue; }
      if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => !o || !String(o).trim())) { errors.push({ index: i, error: 'options must be an array of exactly 4 non-empty strings' }); continue; }
      const ca = Number(q.correctAnswer);
      if (!Number.isInteger(ca) || ca < 0 || ca > 3) { errors.push({ index: i, error: 'correctAnswer must be 0, 1, 2, or 3' }); continue; }
      valid.push({
        text: String(q.question).trim(),
        options: q.options.map(o => String(o).trim()),
        correct: ca,
        points: Math.max(0, Number(q.points) || 1),
        difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Easy',
        order: valid.length,
      });
    }
    const imported = valid.length > 0 ? (await MCQ.insertMany(valid, { ordered: false })).length : 0;
    res.status(201).json({ imported, failed: errors.length, errors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/problems/import/debug
router.post('/import/debug', adminProtect, async (req, res) => {
  try {
    const raw = req.body;
    const questions = Array.isArray(raw) ? raw : (Array.isArray(raw?.questions) ? raw.questions : null);
    if (!questions) return res.status(400).json({ error: 'Body must be { questions: [...] } or a JSON array' });
    if (questions.length === 0) return res.status(400).json({ error: 'questions array is empty' });
    if (questions.length > IMPORT_MAX) return res.status(400).json({ error: `Maximum ${IMPORT_MAX} questions per batch` });

    const valid = [];
    const errors = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title || !String(q.title).trim()) { errors.push({ index: i, error: 'title is required' }); continue; }
      if (!q.description || !String(q.description).trim()) { errors.push({ index: i, error: 'description is required' }); continue; }
      if (!q.brokenCode || !String(q.brokenCode).trim()) { errors.push({ index: i, error: 'brokenCode is required' }); continue; }
      if (q.expectedOutput === undefined || q.expectedOutput === null) { errors.push({ index: i, error: 'expectedOutput is required' }); continue; }
      const langs = Array.isArray(q.allowedLanguages) ? q.allowedLanguages.filter(l => VALID_IMPORT_LANGS.includes(l)) : [];
      const lang = langs.includes('python') ? 'python' : (langs[0] || 'python');
      valid.push({
        title: String(q.title).trim(),
        description: String(q.description).trim(),
        buggyCode: String(q.brokenCode).trim(),
        expectedOutputHash: sha256(String(q.expectedOutput)),
        language: lang,
        difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Easy',
        sampleInput: q.sampleInput || '',
        order: valid.length,
      });
    }
    const imported = valid.length > 0 ? (await DebugProblem.insertMany(valid, { ordered: false })).length : 0;
    res.status(201).json({ imported, failed: errors.length, errors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/problems/import/coding
router.post('/import/coding', adminProtect, async (req, res) => {
  try {
    const raw = req.body;
    const questions = Array.isArray(raw) ? raw : (Array.isArray(raw?.questions) ? raw.questions : null);
    if (!questions) return res.status(400).json({ error: 'Body must be { questions: [...] } or a JSON array' });
    if (questions.length === 0) return res.status(400).json({ error: 'questions array is empty' });
    if (questions.length > IMPORT_MAX) return res.status(400).json({ error: `Maximum ${IMPORT_MAX} questions per batch` });

    const valid = [];
    const errors = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title || !String(q.title).trim()) { errors.push({ index: i, error: 'title is required' }); continue; }
      if (!q.description || !String(q.description).trim()) { errors.push({ index: i, error: 'description is required' }); continue; }
      if (!Array.isArray(q.testCases) || q.testCases.length === 0) { errors.push({ index: i, error: 'testCases must be a non-empty array' }); continue; }
      const badTc = q.testCases.findIndex(tc => tc.input === undefined || tc.input === null || tc.output === undefined || tc.output === null);
      if (badTc >= 0) { errors.push({ index: i, error: `testCases[${badTc}]: both input and output are required` }); continue; }
      valid.push({
        title: String(q.title).trim(),
        description: String(q.description).trim(),
        constraints: q.constraints || '',
        sampleInput: q.sampleInput || '',
        sampleOutput: q.sampleOutput || '',
        tags: Array.isArray(q.tags) ? q.tags.map(t => String(t).trim()).filter(Boolean) : [],
        allowedLanguages: Array.isArray(q.allowedLanguages) && q.allowedLanguages.length
          ? q.allowedLanguages.filter(l => VALID_IMPORT_LANGS.includes(l))
          : VALID_IMPORT_LANGS,
        testCases: q.testCases.map((tc, idx) => ({
          input: String(tc.input ?? ''),
          outputHash: sha256(String(tc.output ?? '')),
          isSample: idx === 0,
        })),
        order: valid.length,
      });
    }
    const imported = valid.length > 0 ? (await CodingProblem.insertMany(valid, { ordered: false })).length : 0;
    res.status(201).json({ imported, failed: errors.length, errors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.resetStudentsForRound = resetStudentsForRound;
