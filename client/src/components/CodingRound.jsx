import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useExam } from '../hooks/useExam';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STARTER_CODE = {
  python: '# Write your solution here\n',
  java: 'import java.util.*;\nimport java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}',
  c: '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}',
};

const LANGUAGE_LABELS = {
  python: 'Python 3',
  java: 'Java',
  c: 'C',
  cpp: 'C++17',
};

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  wordWrap: 'on',
  automaticLayout: true,
  padding: { top: 12 },
  renderLineHighlight: 'line',
  quickSuggestions: false,
  parameterHints: { enabled: false },
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: 'off',
  tabCompletion: 'off',
  wordBasedSuggestions: false,
  contextmenu: false,
  tabSize: 4,
  lineNumbers: 'on',
};

const EDITOR_LOADING_STYLE = {
  height: '100%',
  background: '#1e1e1e',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#888',
  fontFamily: 'monospace',
  borderRadius: '8px',
};

function configureMonaco(monaco) {
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
  });
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
  });
}

function VerdictBadge({ verdict }) {
  const colors = {
    Accepted: 'bg-easy/15 text-easy',
    'Wrong Answer': 'bg-hard/15 text-hard',
    'Runtime Error': 'bg-accent/15 text-accent',
    'Compile Error': 'bg-[#7c7cff]/15 text-[#7c7cff]',
  };
  return <span className={`verdict-badge ${colors[verdict] || 'bg-border text-muted'}`}>{verdict}</span>;
}

export default function CodingRound({ roundType, onContestComplete }) {
  const { codingProblems, loadProblems, problemErrors, problemsLoading } = useExam();
  const { student } = useAuth();

  const problems = codingProblems;

  const [selectedId, setSelectedId] = useState(null);
  const [language, setLanguage] = useState('python');
  const [editorCodes, setEditorCodes] = useState({});
  const [stdin, setStdin] = useState('');
  const [resultTab, setResultTab] = useState('output');
  const [outputContent, setOutputContent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [contestFinished, setContestFinished] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  const cooldownRef = useRef(null);

  const selectedProblem = problems.find((p) => p._id === selectedId);
  const allowedLanguages = Array.isArray(selectedProblem?.allowedLanguages) && selectedProblem.allowedLanguages.length
    ? selectedProblem.allowedLanguages.filter((l) => Object.keys(STARTER_CODE).includes(l))
    : ['python', 'java', 'c', 'cpp'];

  const solvedIds = new Set((student?.r3?.solved || []).map((s) => s.problemId));
  const attemptedIds = new Set(Object.keys(student?.r3?.attempts || {}));

  const startCooldown = (seconds) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(Number(seconds) || 0);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  useEffect(() => {
    if (problems.length === 0) loadProblems?.();
  }, [problems.length, loadProblems]);

  useEffect(() => {
    if (problems.length > 0 && !selectedId) setSelectedId(problems[0]._id);
  }, [problems, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setEditorCodes((prev) => {
      if (typeof prev[selectedId] === 'string') return prev;
      return { ...prev, [selectedId]: STARTER_CODE.python };
    });
  }, [selectedId]);

  useEffect(() => {
    if (!selectedProblem) return;
    if (!allowedLanguages.includes(language)) {
      const next = allowedLanguages[0] || 'python';
      setLanguage(next);
      setEditorCodes((prev) => ({ ...prev, [selectedProblem._id]: STARTER_CODE[next] }));
    }
  }, [selectedProblem, allowedLanguages, language]);

  const loadSubmissions = async (pid) => {
    try {
      const { data } = await api.get(`/submissions/problem/${pid}`);
      setSubmissions(data);
    } catch {}
  };

  useEffect(() => {
    if (selectedId) loadSubmissions(selectedId);
  }, [selectedId]);

  const activeCode = selectedId ? (editorCodes[selectedId] ?? STARTER_CODE[language]) : '';

  const handleLanguageChange = (e) => {
    const nextLang = e.target.value;
    if (!selectedId) {
      setLanguage(nextLang);
      return;
    }

    const currentCode = editorCodes[selectedId] ?? STARTER_CODE[language];
    const isStarterCode = Object.values(STARTER_CODE).includes(currentCode);

    if (!isStarterCode) {
      const ok = window.confirm('Switching language will clear your code. Continue?');
      if (!ok) return;
    }

    setLanguage(nextLang);
    setEditorCodes((prev) => ({ ...prev, [selectedId]: STARTER_CODE[nextLang] }));
  };

  const buttonDisabled = isRunning || cooldown > 0;

  const handleRun = async () => {
    if (buttonDisabled) return;
    if (!selectedId) return toast.error('Select a problem first');
    if (!activeCode.trim()) return toast.error('Write some code first');

    setIsRunning(true);
    setResultTab('output');
    setOutputContent({ type: 'loading' });

    try {
      const { data } = await api.post('/exec/run', {
        code: activeCode,
        language,
        stdin: selectedProblem?.sampleInput || stdin || '',
        problemId: selectedId,
        round: 3,
      });
      setOutputContent({ type: 'run', correct: Boolean(data?.correct) });
    } catch (err) {
      if (err?.response?.data?.error === 'cooldown') {
        startCooldown(Number(err.response?.data?.waitSeconds || 5));
        toast('Please wait before submitting again');
      } else {
        setOutputContent({ type: 'run', correct: false });
        toast.error('Wrong Answer');
      }
    } finally {
      setIsRunning(false);
      startCooldown(5);
    }
  };

  const handleSubmit = async () => {
    if (buttonDisabled) return;
    if (!selectedId) return toast.error('Select a problem first');
    if (!activeCode.trim()) return toast.error('Write some code first');

    setIsRunning(true);
    setResultTab('output');
    setOutputContent({ type: 'loading' });

    try {
      const { data } = await api.post('/exec/submit', {
        problemId: selectedId,
        round: 3,
        language,
        code: activeCode,
        stdin: selectedProblem?.sampleInput || stdin || '',
      });
      setOutputContent({ type: 'submit', ...data });
      await loadSubmissions(selectedId);

      if (data.correct && data.finished) {
        setContestFinished(true);
        onContestComplete?.();
      }
    } catch (err) {
      if (err?.response?.data?.error === 'cooldown') {
        startCooldown(Number(err.response?.data?.waitSeconds || 5));
        toast('Please wait before submitting again');
      } else {
        setOutputContent({ type: 'submit', correct: false, message: 'Wrong Answer' });
        toast.error('Wrong Answer');
      }
    } finally {
      setIsRunning(false);
      startCooldown(5);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-56 flex-shrink-0 flex flex-col overflow-hidden" style={{ background: '#0d1424', borderRight: '1px solid #1e2d45' }}>
        <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#22c55e', borderBottom: '1px solid #1e2d45' }}>
          Coding Problems
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {problems.length === 0 && (
            problemErrors?.coding ? (
              <div className="p-3 text-center space-y-2">
                <p className="text-xs" style={{ color: '#f87171' }}>{problemErrors.coding}</p>
                <button onClick={loadProblems} className="text-xs px-3 py-1 rounded" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)' }}>Retry</button>
              </div>
            ) : (
              <div className="text-muted text-xs p-3 text-center">{problemsLoading ? 'Loading problems...' : 'No problems available.'}</div>
            )
          )}
          {problems.map((p, i) => (
            <div
              key={p._id}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer mb-1 transition-all"
              onClick={() => { setSelectedId(p._id); setOutputContent(null); setResultTab('output'); }}
              style={{
                background: selectedId === p._id ? 'rgba(34,197,94,0.08)' : 'transparent',
                borderLeft: `2px solid ${selectedId === p._id ? '#22c55e' : 'transparent'}`,
              }}
            >
              <span className="text-xs font-mono shrink-0 w-5" style={{ color: selectedId === p._id ? '#22c55e' : '#475569' }}>{i + 1}.</span>
              <span className="flex-1 truncate text-[13px]" style={{ color: selectedId === p._id ? '#f1f5f9' : '#8b9eb8' }}>{p.title}</span>
              {solvedIds.has(p._id) && <span style={{ color: '#22c55e' }} title="Solved">✓</span>}
              {!solvedIds.has(p._id) && attemptedIds.has(p._id) && <span style={{ color: '#ef4444' }} title="Attempted">·</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="w-[38%] flex-shrink-0 overflow-y-auto" style={{ background: '#0f172a', borderRight: '1px solid #1e2d45' }}>
        <div className="p-5">
          <h2 className="text-lg font-bold mb-4">{selectedProblem?.title || 'Select a problem'}</h2>
          <div className="text-sm leading-relaxed text-text whitespace-pre-wrap mb-4">{selectedProblem?.description || ''}</div>
          {selectedProblem?.sampleInput && (
            <div className="mb-3">
              <div className="text-xs text-muted font-semibold mb-1">Input:</div>
              <div className="code-block">{selectedProblem.sampleInput}</div>
            </div>
          )}
          {selectedProblem?.sampleOutput && (
            <div>
              <div className="text-xs text-muted font-semibold mb-1">Output:</div>
              <div className="code-block">{selectedProblem.sampleOutput}</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ background: '#0d1424', borderBottom: '1px solid #1e2d45' }}>
          <span className="text-xs text-muted truncate max-w-[220px]">{selectedProblem?.title || ''}</span>
          <select value={language} onChange={handleLanguageChange} className="bg-bg border border-border rounded px-2 py-1 text-sm text-text outline-none focus:border-accent">
            {allowedLanguages.map((l) => (
              <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
            ))}
          </select>
        </div>

        <div className="flex-[0_0_62%] min-h-[120px] relative" onContextMenu={(e) => e.preventDefault()}>
          {!editorReady && (
            <textarea
              value={activeCode}
              onChange={(e) => {
                if (!selectedId) return;
                setEditorCodes((prev) => ({ ...prev, [selectedId]: e.target.value }));
              }}
              style={{
                width: '100%',
                height: '100%',
                background: '#1e1e1e',
                color: '#d4d4d4',
                fontFamily: 'monospace',
                fontSize: '14px',
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                resize: 'none',
              }}
              placeholder="Editor loading..."
            />
          )}
          <div style={{ display: editorReady ? 'block' : 'none', height: '100%' }}>
            <Suspense fallback={<div style={EDITOR_LOADING_STYLE}>Loading editor...</div>}>
              <MonacoEditor
                height="100%"
                language={language === 'cpp' ? 'cpp' : language}
                value={activeCode}
                onChange={(value) => {
                  if (!selectedId) return;
                  setEditorCodes((prev) => ({ ...prev, [selectedId]: value || '' }));
                }}
                loading="Loading editor..."
                theme="vs-dark"
                beforeMount={configureMonaco}
                onMount={() => setEditorReady(true)}
                options={EDITOR_OPTIONS}
              />
            </Suspense>
          </div>
          {!editorReady && (
            <div className="absolute right-3 bottom-3 text-xs pointer-events-none" style={{ color: '#64748b' }}>
              Monaco loading in background...
            </div>
          )}
        </div>

        <div className="h-1 bg-border/50 flex-shrink-0" />

        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#080e1c' }}>
          <div className="flex items-center border-b border-border flex-shrink-0 px-2">
            <button className={`tab-btn ${resultTab === 'output' ? 'active' : ''}`} onClick={() => setResultTab('output')}>Output</button>
            <button className={`tab-btn ${resultTab === 'history' ? 'active' : ''}`} onClick={() => { setResultTab('history'); loadSubmissions(selectedId); }}>Submissions ({submissions.length})</button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 py-1.5">
              <span className="text-[11px] px-2 py-1 rounded border" style={{ color: '#cbd5e1', borderColor: '#334155' }}>[{LANGUAGE_LABELS[language]}]</span>
              <button className="btn-secondary text-xs py-1.5 px-3" onClick={handleRun} disabled={buttonDisabled}>
                {cooldown > 0 ? `Wait ${cooldown}s` : 'Run'}
              </button>
              <button className="btn-primary text-xs py-1.5 px-3" onClick={handleSubmit} disabled={buttonDisabled}>
                {cooldown > 0 ? `Wait ${cooldown}s` : 'Submit'}
              </button>
            </div>
          </div>

          <div className="px-3 py-2 border-b border-border/50 flex-shrink-0">
            <div className="text-xs text-muted mb-1 uppercase tracking-wide">Custom Input (stdin)</div>
            <textarea
              className="w-full bg-bg border border-border rounded text-xs font-mono text-text p-2 outline-none focus:border-accent resize-none"
              rows={2}
              placeholder="Enter custom input..."
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {resultTab === 'output' && (
              !outputContent ? (
                <div className="text-muted text-sm p-4">Run your code or submit to see results here.</div>
              ) : outputContent.type === 'loading' ? (
                <div className="flex items-center gap-3 p-4 text-muted text-sm">
                  <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full spin" />
                  <span>Processing...</span>
                </div>
              ) : outputContent.type === 'error' ? (
                <div className="text-hard text-sm p-4">Wrong Answer</div>
              ) : outputContent.type === 'run' ? (
                <div className="flex flex-col gap-3">
                  <VerdictBadge verdict={outputContent.correct ? 'Accepted' : 'Wrong Answer'} />
                  <div className={`text-sm rounded-lg p-3 border ${outputContent.correct ? 'text-easy bg-easy/10 border-easy/20' : 'text-hard bg-hard/10 border-hard/20'}`}>
                    {outputContent.correct ? 'Accepted' : 'Wrong Answer'}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <VerdictBadge verdict={outputContent.correct ? 'Accepted' : 'Wrong Answer'} />
                  <div className={`text-sm rounded-lg p-3 border ${outputContent.correct ? 'text-easy bg-easy/10 border-easy/20' : 'text-hard bg-hard/10 border-hard/20'}`}>
                    {outputContent.correct ? 'Accepted' : 'Wrong Answer'}
                  </div>
                </div>
              )
            )}

            {resultTab === 'history' && (
              !submissions.length ? (
                <div className="text-muted text-sm p-4">No submissions yet.</div>
              ) : (
                <div className="flex flex-col gap-0">
                  {submissions.map((s) => (
                    <div key={s._id} className="flex items-center gap-3 py-2.5 border-b border-border/50 text-sm">
                      <VerdictBadge verdict={s.verdict} />
                      <span className="text-muted text-xs">{LANGUAGE_LABELS[s.language] || s.language}</span>
                      <span className="text-muted text-xs ml-auto">{new Date(s.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {contestFinished && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6" style={{ background: 'rgba(9, 20, 12, 0.96)' }}>
          <div className="w-full max-w-xl rounded-2xl border p-8 text-center" style={{ background: '#052e16', borderColor: 'rgba(34,197,94,0.45)' }}>
            <div className="text-5xl mb-4">🏆</div>
            <h1 className="text-3xl font-extrabold mb-3" style={{ color: '#bbf7d0' }}>You have completed the contest!</h1>
            <p className="text-sm mb-1" style={{ color: '#dcfce7' }}>Your time has been recorded.</p>
            <p className="text-sm" style={{ color: '#cbd5e1' }}>Results will be announced by the organiser.</p>
          </div>
        </div>
      )}
    </div>
  );
}
