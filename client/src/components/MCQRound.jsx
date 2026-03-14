import { useState, useEffect, useMemo } from 'react';
import { useExam } from '../hooks/useExam';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ── Constants ─────────────────────────────────────────────────
const DARK_BG   = '#0b1120';
const PANEL_BG  = '#0f172a';
const CARD_BG   = '#111e35';
const BORDER    = '#1e2d45';
const GREEN     = '#22c55e';
const OPT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Tiny icon helpers ─────────────────────────────────────────
const IcoChevronL = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);
const IcoChevronR = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);
const IcoFlag = ({ filled }) => (
  <svg className="w-3.5 h-3.5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18M3 4.5l9 4.5-9 4.5" />
  </svg>
);
const IcoCheck = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

export default function MCQRound() {
  const { mcqs } = useExam();
  const { student, setStudent } = useAuth();

  const [answers, setAnswers]       = useState({});
  const [flagged, setFlagged]       = useState(new Set());
  const [visited, setVisited]       = useState(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted]   = useState(false);
  const [score, setScore]           = useState(null);
  const [loading, setLoading]       = useState(false);

  // Shuffle questions once per mount
  const shuffled = useMemo(() => shuffle(mcqs).map(q => ({
    ...q,
    shuffledOptions: shuffle(q.options.map((o, i) => ({ text: o, origIdx: i }))),
  })), [mcqs]);

  useEffect(() => {
    if (student?.r1?.submitted) { setSubmitted(true); setScore(student.r1.score); }
  }, [student]);

  // Mark current question as visited
  useEffect(() => {
    const q = shuffled[currentIdx];
    if (q) setVisited(prev => new Set([...prev, q._id]));
  }, [currentIdx, shuffled]);

  const currentQ = shuffled[currentIdx];
  const total    = shuffled.length;
  const answered = Object.keys(answers).length;

  // ── Interactions ────────────────────────────────────────────
  const selectAnswer = (qid, origIdx) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qid]: origIdx }));
  };

  const toggleFlag = (qid) => {
    if (!qid) return;
    setFlagged(prev => {
      const s = new Set(prev);
      s.has(qid) ? s.delete(qid) : s.add(qid);
      return s;
    });
  };

  const goTo   = (i) => setCurrentIdx(Math.max(0, Math.min(total - 1, i)));
  const goPrev = () => goTo(currentIdx - 1);
  const goNext = () => goTo(currentIdx + 1);

  const handleSubmit = async (auto = false) => {
    if (submitted) return;
    if (!auto && !window.confirm(
      `Submit MCQ round?\n\nAnswered: ${answered} / ${total}\nUnanswered: ${total - answered}\n\nThis cannot be undone.`
    )) return;
    setLoading(true);
    try {
      const { data } = await api.post('/students/me/mcq-submit', { answers });
      setScore(data.score);
      setSubmitted(true);
      setStudent(prev => ({ ...prev, r1: { ...prev?.r1, score: data.score, submitted: true } }));
      toast.success(`Submitted! Score: ${data.score}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Navigator button style ───────────────────────────────────
  const navBtnStyle = (q, i) => {
    const isActive = i === currentIdx;
    if (isActive)                       return { bg: GREEN,                   text: '#0f172a', border: GREEN };
    if (answers[q._id] !== undefined)   return { bg: 'rgba(34,197,94,0.12)', text: GREEN,     border: 'rgba(34,197,94,0.4)' };
    if (flagged.has(q._id))             return { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.4)' };
    if (visited.has(q._id))             return { bg: CARD_BG,                text: '#64748b', border: BORDER };
    return                                     { bg: PANEL_BG,               text: '#334155', border: '#151f32' };
  };

  if (!shuffled.length) return (
    <div className="h-full flex items-center justify-center" style={{ background: DARK_BG, color: '#475569' }}>
      Loading questions&hellip;
    </div>
  );

  return (
    <div className="h-full flex overflow-hidden" style={{ background: DARK_BG, fontFamily: "'Inter', sans-serif" }}>

      {/* LEFT SIDEBAR — Question Navigator */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col overflow-hidden"
        style={{ background: PANEL_BG, borderRight: `1px solid ${BORDER}` }}
      >
        {/* Round info + progress */}
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: GREEN }}>Round 1 — MCQ</span>
          </div>
          <div className="text-[11px]" style={{ color: '#475569' }}>{total} questions &middot; &minus;0.25 negative marking</div>

          <div className="mt-3">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span style={{ color: '#475569' }}>Answered</span>
              <span className="font-bold" style={{ color: GREEN }}>{answered}/{total}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: BORDER }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ background: GREEN, width: total ? `${(answered / total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 pt-3 pb-2 flex flex-wrap gap-x-3 gap-y-1.5">
          {[
            { color: GREEN,     label: 'Answered' },
            { color: '#f59e0b', label: 'Flagged' },
            { color: '#475569', label: 'Visited' },
            { color: '#334155', label: 'Unseen' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm border" style={{ background: l.color + '25', borderColor: l.color }} />
              <span className="text-[10px]" style={{ color: '#475569' }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Question number grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {shuffled.map((q, i) => {
              const s = navBtnStyle(q, i);
              return (
                <button
                  key={q._id}
                  onClick={() => goTo(i)}
                  title={`Q${i + 1}${answers[q._id] !== undefined ? ' \u2014 Answered' : flagged.has(q._id) ? ' \u2014 Flagged' : ''}`}
                  className="h-9 rounded-lg text-xs font-bold border transition-all"
                  style={{ background: s.bg, color: s.text, borderColor: s.border, cursor: 'pointer' }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit / Score */}
        <div className="p-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          {!submitted ? (
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: GREEN, color: '#0f172a', cursor: 'pointer', border: 'none' }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#16a34a'; }}
              onMouseOut={e => { if (!loading) e.currentTarget.style.background = GREEN; }}
            >
              {loading ? 'Submitting\u2026' : `Submit MCQ (${answered}/${total})`}
            </button>
          ) : (
            <div className="text-center py-1">
              <div className="text-2xl font-black" style={{ color: GREEN }}>{score?.toFixed(2)}</div>
              <div className="text-[11px] mt-0.5" style={{ color: '#475569' }}>Final Score &middot; Submitted &#10003;</div>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN — Question Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Question meta bar */}
        <div
          className="flex items-center gap-4 px-7 py-3 flex-shrink-0"
          style={{ background: PANEL_BG, borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: '#475569' }}>Question</span>
            <span className="text-xl font-black" style={{ color: '#f1f5f9' }}>{currentIdx + 1}</span>
            <span className="text-sm" style={{ color: '#334155' }}>/ {total}</span>
          </div>

          {currentQ?.difficulty && (
            <span className={`diff-pill diff-${(currentQ.difficulty || 'easy').toLowerCase()}`}>
              {currentQ.difficulty}
            </span>
          )}
          {currentQ?.points && (
            <span className="text-[11px]" style={{ color: '#475569' }}>
              {currentQ.points} pt{currentQ.points !== 1 ? 's' : ''}
            </span>
          )}

          <div className="flex-1" />

          {/* Flag toggle */}
          <button
            onClick={() => toggleFlag(currentQ?._id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: currentQ && flagged.has(currentQ._id) ? 'rgba(245,158,11,0.1)' : 'transparent',
              border: `1px solid ${currentQ && flagged.has(currentQ._id) ? 'rgba(245,158,11,0.4)' : BORDER}`,
              color: currentQ && flagged.has(currentQ._id) ? '#f59e0b' : '#64748b',
              cursor: 'pointer',
            }}
          >
            <IcoFlag filled={currentQ && flagged.has(currentQ._id)} />
            {currentQ && flagged.has(currentQ._id) ? 'Flagged' : 'Flag'}
          </button>
        </div>

        {/* Question body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-7 py-7" style={{ background: DARK_BG }}>
          {currentQ ? (
            <div className="max-w-2xl mx-auto">
              {/* Question text */}
              <div
                className="rounded-2xl p-6 mb-6"
                style={{ background: PANEL_BG, border: `1px solid ${BORDER}` }}
              >
                <p className="text-[15px] leading-relaxed" style={{ color: '#e2e8f0' }}>
                  {currentQ.text}
                </p>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2.5">
                {currentQ.shuffledOptions.map((opt, oi) => {
                  const isSelected = answers[currentQ._id] === opt.origIdx;
                  return (
                    <button
                      key={opt.origIdx}
                      onClick={() => selectAnswer(currentQ._id, opt.origIdx)}
                      disabled={submitted}
                      className="flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all"
                      style={{
                        background: isSelected ? 'rgba(34,197,94,0.07)' : PANEL_BG,
                        border: `1px solid ${isSelected ? 'rgba(34,197,94,0.5)' : BORDER}`,
                        cursor: submitted ? 'default' : 'pointer',
                        outline: 'none',
                        width: '100%',
                      }}
                      onMouseOver={e => {
                        if (!isSelected && !submitted) {
                          e.currentTarget.style.borderColor = '#2a3d5c';
                          e.currentTarget.style.background = CARD_BG;
                        }
                      }}
                      onMouseOut={e => {
                        if (!isSelected && !submitted) {
                          e.currentTarget.style.borderColor = BORDER;
                          e.currentTarget.style.background = PANEL_BG;
                        }
                      }}
                    >
                      {/* Option badge */}
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          background: isSelected ? GREEN : 'transparent',
                          border: `2px solid ${isSelected ? GREEN : '#2a3d5c'}`,
                          color: isSelected ? '#0f172a' : '#64748b',
                        }}
                      >
                        {OPT_LABELS[oi]}
                      </span>

                      <span className="flex-1 text-sm leading-relaxed" style={{ color: isSelected ? '#e2e8f0' : '#8b9eb8' }}>
                        {opt.text}
                      </span>

                      {isSelected && (
                        <span style={{ color: GREEN }}><IcoCheck /></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center" style={{ color: '#475569' }}>
              No question selected
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div
          className="flex items-center gap-3 px-7 py-3 flex-shrink-0"
          style={{ background: PANEL_BG, borderTop: `1px solid ${BORDER}` }}
        >
          <button
            onClick={goPrev}
            disabled={currentIdx === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
            style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#94a3b8', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer' }}
          >
            <IcoChevronL /> Previous
          </button>

          <div className="flex-1 text-center text-xs" style={{ color: '#475569' }}>
            {answered} of {total} answered
            {flagged.size > 0 && (
              <span className="ml-2" style={{ color: '#f59e0b' }}>&middot; {flagged.size} flagged</span>
            )}
          </div>

          <button
            onClick={goNext}
            disabled={currentIdx === total - 1}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
            style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#94a3b8', cursor: currentIdx === total - 1 ? 'not-allowed' : 'pointer' }}
          >
            Next <IcoChevronR />
          </button>
        </div>
      </div>
    </div>
  );
}

