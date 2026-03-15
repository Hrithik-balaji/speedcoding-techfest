import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const LANG_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
];

const DEFAULTS = {
  mcq: {
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 10,
  },
  debug: {
    title: '',
    description: '',
    brokenCode: '',
    expectedOutput: '',
    hint: '',
    points: 30,
    allowedLanguages: ['python'],
  },
  coding: {
    title: '',
    description: '',
    sampleInput: '',
    sampleOutput: '',
    points: 50,
    allowedLanguages: ['python', 'cpp', 'c', 'java'],
    testCases: [{ input: '', output: '' }],
  },
};

function normalizeInitial(type, question) {
  if (!question) return DEFAULTS[type];
  if (type === 'mcq') {
    return {
      question: question.question || '',
      options: Array.isArray(question.options) && question.options.length === 4
        ? question.options
        : ['', '', '', ''],
      correctAnswer: Number(question.correctAnswer ?? 0),
      points: Number(question.points ?? 10),
    };
  }
  if (type === 'debug') {
    return {
      title: question.title || '',
      description: question.description || '',
      brokenCode: question.buggyCode || question.brokenCode || '',
      expectedOutput: question.expectedOutput || '',
      hint: question.hint || '',
      points: Number(question.points ?? 30),
      allowedLanguages: Array.isArray(question.allowedLanguages) && question.allowedLanguages.length
        ? question.allowedLanguages
        : ['python'],
    };
  }

  const testCases = Array.isArray(question.testCases) && question.testCases.length
    ? question.testCases.map((tc) => ({
        input: tc.input || '',
        output: tc.outputPlain || tc.output || '',
      }))
    : [{ input: '', output: '' }];

  return {
    title: question.title || '',
    description: question.description || '',
    sampleInput: question.sampleInput || '',
    sampleOutput: question.sampleOutput || '',
    points: Number(question.points ?? 50),
    allowedLanguages: Array.isArray(question.allowedLanguages) && question.allowedLanguages.length
      ? question.allowedLanguages
      : ['python', 'cpp', 'c', 'java'],
    testCases,
  };
}

function validate(type, form) {
  const errors = {};
  if (type === 'mcq') {
    if (!form.question.trim()) errors.question = 'Question text is required';
    form.options.forEach((opt, idx) => {
      if (!String(opt || '').trim()) errors[`option-${idx}`] = `Option ${String.fromCharCode(65 + idx)} is required`;
    });
    const ca = Number(form.correctAnswer);
    if (!Number.isInteger(ca) || ca < 0 || ca > 3) errors.correctAnswer = 'Select a valid correct answer';
    if (!Number.isFinite(Number(form.points)) || Number(form.points) <= 0) errors.points = 'Points must be a positive number';
  }

  if (type === 'debug') {
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.brokenCode.trim()) errors.brokenCode = 'Broken code is required';
    if (!form.expectedOutput.trim()) errors.expectedOutput = 'Expected output is required';
    if (!Array.isArray(form.allowedLanguages) || !form.allowedLanguages.length) errors.allowedLanguages = 'Select at least one language';
    if (!Number.isFinite(Number(form.points)) || Number(form.points) <= 0) errors.points = 'Points must be a positive number';
  }

  if (type === 'coding') {
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.description.trim()) errors.description = 'Description is required';
    if (!form.sampleInput.trim()) errors.sampleInput = 'Sample input is required';
    if (!form.sampleOutput.trim()) errors.sampleOutput = 'Sample output is required';
    if (!Array.isArray(form.allowedLanguages) || !form.allowedLanguages.length) errors.allowedLanguages = 'Select at least one language';
    if (!Number.isFinite(Number(form.points)) || Number(form.points) <= 0) errors.points = 'Points must be a positive number';

    if (!Array.isArray(form.testCases) || form.testCases.length < 1) {
      errors.testCases = 'At least one test case is required';
    } else {
      form.testCases.forEach((tc, idx) => {
        if (!String(tc.input || '').trim()) errors[`tc-input-${idx}`] = 'Input is required';
        if (!String(tc.output || '').trim()) errors[`tc-output-${idx}`] = 'Expected output is required';
      });
    }
  }

  return errors;
}

export default function QuestionModal({
  open,
  type,
  editingQuestion,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(DEFAULTS.mcq);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isEdit = !!editingQuestion;
  const initialForm = useMemo(() => normalizeInitial(type || 'mcq', editingQuestion), [type, editingQuestion]);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm);
    setErrors({});
    setSaving(false);
    setShowDiscardConfirm(false);
  }, [open, initialForm]);

  if (!open || !type) return null;

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const toggleLang = (lang) => {
    const current = Array.isArray(form.allowedLanguages) ? form.allowedLanguages : [];
    const next = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang];
    setForm((prev) => ({ ...prev, allowedLanguages: next }));
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const setTestCase = (idx, key, value) => {
    setForm((prev) => ({
      ...prev,
      testCases: prev.testCases.map((tc, tcIdx) => (tcIdx === idx ? { ...tc, [key]: value } : tc)),
    }));
  };

  const payload = () => {
    if (type === 'mcq') {
      return {
        question: form.question.trim(),
        options: form.options.map((opt) => String(opt || '').trim()),
        correctAnswer: Number(form.correctAnswer),
        points: Number(form.points),
      };
    }

    if (type === 'debug') {
      return {
        title: form.title.trim(),
        description: form.description,
        brokenCode: form.brokenCode,
        expectedOutput: form.expectedOutput,
        hint: form.hint,
        points: Number(form.points),
        allowedLanguages: form.allowedLanguages,
      };
    }

    return {
      title: form.title.trim(),
      description: form.description,
      sampleInput: form.sampleInput,
      sampleOutput: form.sampleOutput,
      points: Number(form.points),
      allowedLanguages: form.allowedLanguages,
      testCases: form.testCases.map((tc) => ({
        input: tc.input,
        output: tc.output,
      })),
    };
  };

  const save = async () => {
    const formErrors = validate(type, form);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setSaving(true);
    try {
      const endpoint = isEdit
        ? `/problems/admin/problems/${type}/${editingQuestion._id}`
        : `/problems/admin/problems/${type}`;
      const method = isEdit ? api.patch : api.post;
      const { data } = await method(endpoint, payload());
      toast.success('Question saved successfully');
      onSaved(type, data);
      onClose();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length) {
        toast.error(serverErrors[0]);
      } else {
        toast.error('Failed to save question. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100">{isEdit ? 'Edit' : 'Add'} {type.toUpperCase()} Question</h3>
            <p className="text-xs text-slate-400 mt-1">Fill the fields below and save changes.</p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="w-8 h-8 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            X
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {type === 'mcq' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Question text</label>
                <textarea
                  value={form.question}
                  onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                  rows={3}
                />
                {errors.question && <p className="text-xs text-red-400 mt-1">{errors.question}</p>}
              </div>

              {['A', 'B', 'C', 'D'].map((label, idx) => (
                <div key={label}>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Option {label}</label>
                  <input
                    value={form.options[idx] || ''}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      options: prev.options.map((opt, optIdx) => (optIdx === idx ? e.target.value : opt)),
                    }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                  {errors[`option-${idx}`] && <p className="text-xs text-red-400 mt-1">{errors[`option-${idx}`]}</p>}
                </div>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Correct Answer</label>
                  <select
                    value={form.correctAnswer}
                    onChange={(e) => setForm((prev) => ({ ...prev, correctAnswer: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                  >
                    <option value={0}>Option A</option>
                    <option value={1}>Option B</option>
                    <option value={2}>Option C</option>
                    <option value={3}>Option D</option>
                  </select>
                  {errors.correctAnswer && <p className="text-xs text-red-400 mt-1">{errors.correctAnswer}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Points</label>
                  <input
                    type="number"
                    min="1"
                    value={form.points}
                    onChange={(e) => setForm((prev) => ({ ...prev, points: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                  {errors.points && <p className="text-xs text-red-400 mt-1">{errors.points}</p>}
                </div>
              </div>
            </>
          )}

          {type === 'debug' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Broken Code</label>
                <textarea
                  rows={8}
                  value={form.brokenCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, brokenCode: e.target.value }))}
                  className="w-full min-h-[150px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 font-mono outline-none"
                />
                {errors.brokenCode && <p className="text-xs text-red-400 mt-1">{errors.brokenCode}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Expected Output</label>
                  <input
                    value={form.expectedOutput}
                    onChange={(e) => setForm((prev) => ({ ...prev, expectedOutput: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                  {errors.expectedOutput && <p className="text-xs text-red-400 mt-1">{errors.expectedOutput}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hint</label>
                  <input
                    value={form.hint}
                    onChange={(e) => setForm((prev) => ({ ...prev, hint: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Allowed Languages</label>
                <div className="flex flex-wrap gap-3">
                  {LANG_OPTIONS.map((lang) => (
                    <label key={lang.value} className="inline-flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={form.allowedLanguages.includes(lang.value)}
                        onChange={() => toggleLang(lang.value)}
                        className="w-4 h-4 accent-green-500"
                      />
                      {lang.label}
                    </label>
                  ))}
                </div>
                {errors.allowedLanguages && <p className="text-xs text-red-400 mt-1">{errors.allowedLanguages}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Points</label>
                <input
                  type="number"
                  min="1"
                  value={form.points}
                  onChange={(e) => setForm((prev) => ({ ...prev, points: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                {errors.points && <p className="text-xs text-red-400 mt-1">{errors.points}</p>}
              </div>
            </>
          )}

          {type === 'coding' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea
                  rows={6}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full min-h-[120px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Sample Input</label>
                <textarea
                  rows={4}
                  value={form.sampleInput}
                  onChange={(e) => setForm((prev) => ({ ...prev, sampleInput: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 font-mono outline-none"
                />
                {errors.sampleInput && <p className="text-xs text-red-400 mt-1">{errors.sampleInput}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Sample Output</label>
                  <input
                    value={form.sampleOutput}
                    onChange={(e) => setForm((prev) => ({ ...prev, sampleOutput: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                  {errors.sampleOutput && <p className="text-xs text-red-400 mt-1">{errors.sampleOutput}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Points</label>
                  <input
                    type="number"
                    min="1"
                    value={form.points}
                    onChange={(e) => setForm((prev) => ({ ...prev, points: e.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                  {errors.points && <p className="text-xs text-red-400 mt-1">{errors.points}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Allowed Languages</label>
                <div className="flex flex-wrap gap-3">
                  {LANG_OPTIONS.map((lang) => (
                    <label key={lang.value} className="inline-flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={form.allowedLanguages.includes(lang.value)}
                        onChange={() => toggleLang(lang.value)}
                        className="w-4 h-4 accent-green-500"
                      />
                      {lang.label}
                    </label>
                  ))}
                </div>
                {errors.allowedLanguages && <p className="text-xs text-red-400 mt-1">{errors.allowedLanguages}</p>}
              </div>

              <div className="rounded-xl border border-slate-700 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-200">Test Cases</h4>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, testCases: [...prev.testCases, { input: '', output: '' }] }))}
                    className="px-2 py-1 rounded-lg border border-emerald-500/35 text-emerald-300 text-xs font-semibold"
                  >
                    Add Test Case
                  </button>
                </div>

                <div className="space-y-3">
                  {form.testCases.map((tc, idx) => (
                    <div key={`${idx}-${form.testCases.length}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-start">
                      <div>
                        <textarea
                          rows={3}
                          value={tc.input}
                          onChange={(e) => setTestCase(idx, 'input', e.target.value)}
                          placeholder="Input"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 font-mono outline-none"
                        />
                        {errors[`tc-input-${idx}`] && <p className="text-xs text-red-400 mt-1">{errors[`tc-input-${idx}`]}</p>}
                      </div>

                      <div>
                        <input
                          value={tc.output}
                          onChange={(e) => setTestCase(idx, 'output', e.target.value)}
                          placeholder="Expected Output"
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                        />
                        {errors[`tc-output-${idx}`] && <p className="text-xs text-red-400 mt-1">{errors[`tc-output-${idx}`]}</p>}
                      </div>

                      <button
                        type="button"
                        disabled={form.testCases.length === 1}
                        onClick={() => {
                          if (form.testCases.length === 1) return;
                          setForm((prev) => ({
                            ...prev,
                            testCases: prev.testCases.filter((_, tcIdx) => tcIdx !== idx),
                          }));
                        }}
                        className="px-2 py-2 rounded-lg border border-red-500/35 text-red-300 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                {errors.testCases && <p className="text-xs text-red-400 mt-2">{errors.testCases}</p>}
              </div>
            </>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-2 rounded-lg border border-slate-700 text-sm font-semibold text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="px-3 py-2 rounded-lg border border-emerald-500/35 text-sm font-semibold text-emerald-200 bg-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {showDiscardConfirm && (
          <div className="fixed inset-0 bg-black/70 z-[130] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm text-slate-200">Discard changes?</p>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-red-500/35 text-xs font-semibold text-red-200 bg-red-500/15"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
