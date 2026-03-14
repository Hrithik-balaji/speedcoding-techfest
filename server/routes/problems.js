const router = require('express').Router();
const crypto = require('crypto');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { protect, adminProtect } = require('../middleware/auth');
const { MCQ, DebugProblem, CodingProblem } = require('../models/Problem');

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
    const questions = await MCQ.find().sort({ order: 1, createdAt: 1 });
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
    const problems = await DebugProblem.find().sort({ order: 1, createdAt: 1 });
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
    const problems = await CodingProblem.find().sort({ order: 1, createdAt: 1 });
    const safe = problems.map(p => ({
      _id:          p._id,
      title:        p.title,
      difficulty:   p.difficulty,
      description:  p.description,
      constraints:  p.constraints,
      sampleInput:  p.sampleInput,
      sampleOutput: p.sampleOutput,
      tags:         p.tags,
      testCaseCount: p.testCases.length,
      // NO testCases hashes
    }));
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN ONLY ────────────────────────────────────────────────

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

module.exports = router;
