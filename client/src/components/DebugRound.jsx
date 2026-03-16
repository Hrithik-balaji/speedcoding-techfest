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

const VERDICT_COLORS = {
  Accepted: 'bg-easy/15 text-easy',
  'Wrong Answer': 'bg-hard/15 text-hard',
  'Runtime Error': 'bg-accent/15 text-accent',
  'Compile Error': 'bg-[#7c7cff]/15 text-[#7c7cff]',
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
  return (
    <span className={`verdict-badge ${VERDICT_COLORS[verdict] || 'bg-border text-muted'}`}>
      {verdict}
    </span>
  );
}

function OutputPanel({ content }) {
  if (!content) {
    return <div className="text-muted text-sm p-4">Run your code or submit to see results here.</div>;
  }

  if (content.type === 'loading') {
    return (
      <div className="flex items-center gap-3 p-4 text-muted text-sm">
        <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full spin" />
        <span>Processing...</span>
      </div>
    );
  }

  if (content.type === 'error') {
    return <div className="text-hard text-sm p-4">{content.message}</div>;
  }

  if (content.type === 'run') {
    const verdict = content.correct ? 'Accepted' : 'Wrong Answer';
    return (
      <div className="flex flex-col gap-3">
        <VerdictBadge verdict={verdict} />
        <div className={`text-sm rounded-lg p-3 border ${content.correct ? 'text-easy bg-easy/10 border-easy/20' : 'text-hard bg-hard/10 border-hard/20'}`}>
          {content.correct ? 'Accepted' : 'Wrong Answer'}
        </div>
      </div>
    );
  }

  if (content.type === 'submit') {
    const isAC = !!content.correct;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <VerdictBadge verdict={isAC ? 'Accepted' : 'Wrong Answer'} />
        </div>
        {isAC ? (
          <div className="text-sm text-easy bg-easy/10 border border-easy/20 rounded-lg p-3">
            Problem solved! {Number(content.solvedCount || 0) > 0 ? `(${content.solvedCount}/${content.needed || 2})` : ''}
          </div>
        ) : (
          <div className="text-sm text-hard bg-hard/10 border border-hard/20 rounded-lg p-3">
            {content.message || 'Incorrect output. Try again.'}
          </div>
        )}
      </div>
    );
  }

  return null;
}

function HistoryPanel({ submissions }) {
  if (!submissions.length) {
    return <div className="text-muted text-sm p-4">No submissions yet.</div>;
  }

  return (
    <div className="flex flex-col gap-0">
      {submissions.map((s) => (
        <div key={s._id} className="flex items-center gap-3 py-2.5 border-b border-border/50 text-sm">
          <span className={`verdict-badge ${VERDICT_COLORS[s.verdict] || 'text-muted bg-border'} text-xs`}>
            {s.verdict}
          </span>
          <span className="text-muted text-xs">{LANGUAGE_LABELS[s.language] || s.language}</span>
          <span className="text-muted text-xs ml-auto">{new Date(s.createdAt).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function DebugRound({ onRoundComplete }) {
  const { debugProblems, loadProblems, problemErrors, problemsLoading } = useExam();
  const { student, setStudent } = useAuth();

  const [selectedId, setSelectedId] = useState(null);
  const [editorCodes, setEditorCodes] = useState({});
  const [stdin, setStdin] = useState('');
  const [resultTab, setResultTab] = useState('output');
  const [outputContent, setOutputContent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [solvedProgress, setSolvedProgress] = useState(Number(student?.debugSolvedCount || 0));
  const [language, setLanguage] = useState('python');
  const [editorReady, setEditorReady] = useState(false);

  const cooldownRef = useRef(null);

  const selectedProblem = debugProblems.find((p) => p._id === selectedId);
  const allowedLanguages = ['python', 'java', 'c', 'cpp'];
  const selectorEnabled = true;

  const getActiveCode = () => {
    if (!selectedId) return '';
    return editorCodes[selectedId] || STARTER_CODE[language];
  };

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
    if (debugProblems.length === 0) loadProblems?.();
  }, [debugProblems.length, loadProblems]);

  useEffect(() => {
    if (debugProblems.length > 0 && !selectedId) {
      setSelectedId(debugProblems[0]._id);
    }
  }, [debugProblems, selectedId]);

  useEffect(() => {
    setSolvedProgress(Number(student?.debugSolvedCount || 0));
  }, [student]);

  useEffect(() => {
    if (!selectedId || !selectedProblem) return;
    setEditorCodes((prev) => {
      if (typeof prev[selectedId] === 'string') return prev;
      return { ...prev, [selectedId]: selectedProblem.buggyCode || STARTER_CODE.python };
    });
  }, [selectedId, selectedProblem]);

  useEffect(() => {
    if (!selectedProblem) return;
    if (!allowedLanguages.includes(language)) {
      setLanguage(allowedLanguages[0] || 'python');
      setEditorCodes((prev) => ({
        ...prev,
        [selectedProblem._id]: selectedProblem?.buggyCode || STARTER_CODE[allowedLanguages[0] || 'python'],
      }));
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

  const onEditorChange = (value) => {
    if (!selectedId) return;
    setEditorCodes((prev) => ({ ...prev, [selectedId]: value || '' }));
  };

  const handleSelectProblem = (id) => {
    setSelectedId(id);
    setOutputContent(null);
    setResultTab('output');
  };

  const handleLanguageChange = (e) => {
    const nextLang = e.target.value;
    if (!selectedId || !selectedProblem) {
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
    setEditorCodes((prev) => ({
      ...prev,
      [selectedId]: selectedProblem?.buggyCode && nextLang === 'python'
        ? selectedProblem.buggyCode
        : STARTER_CODE[nextLang],
    }));
  };

  const buttonDisabled = isRunning || cooldown > 0;

  const handleRun = async () => {
    if (buttonDisabled) return;
    if (!selectedId) return toast.error('Select a problem first');

    const code = getActiveCode();
    if (!code.trim()) return toast.error('Write some code first');

    setIsRunning(true);
    setResultTab('output');
    setOutputContent({ type: 'loading' });

    try {
      const { data } = await api.post('/exec/run', {
        code,
        language,
        stdin: selectedProblem?.sampleInput || stdin || '',
        problemId: selectedId,
        round: 2,
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

    const code = getActiveCode();
    if (!code.trim()) return toast.error('Write some code first');

    setIsRunning(true);
    setResultTab('output');
    setOutputContent({ type: 'loading' });

    try {
      const { data } = await api.post('/exec/submit', {
        problemId: selectedId,
        round: 2,
        language,
        code,
        stdin: selectedProblem?.sampleInput || stdin || '',
      });

      setOutputContent({ type: 'submit', ...data });
      await loadSubmissions(selectedId);

      if (data.correct) {
        if (data.promoted) {
          setSolvedProgress(2);
          setStudent((prev) => ({ ...prev, debugSolvedCount: 2 }));
          onRoundComplete?.(3);
        } else {
          setSolvedProgress(Number(data.solvedCount || solvedProgress));
          setStudent((prev) => ({ ...prev, debugSolvedCount: Number(data.solvedCount || prev?.debugSolvedCount || 0) }));
        }
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
        <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#f97316', borderBottom: '1px solid #1e2d45' }}>
          Debug Problems
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {debugProblems.length === 0 && (
            problemErrors?.debug ? (
              <div className="p-3 text-center space-y-2">
                <p className="text-xs" style={{ color: '#f87171' }}>{problemErrors.debug}</p>
                <button onClick={loadProblems} className="text-xs px-3 py-1 rounded" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.35)' }}>Retry</button>
              </div>
            ) : (
              <div className="text-muted text-xs p-3 text-center flex items-center justify-center gap-2">
                {problemsLoading ? 'Loading problems...' : 'No problems available.'}
              </div>
            )
          )}
          {debugProblems.map((p, i) => (
            <div
              key={p._id}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer mb-1 transition-all"
              onClick={() => handleSelectProblem(p._id)}
              style={{
                background: selectedId === p._id ? 'rgba(249,115,22,0.08)' : 'transparent',
                borderLeft: `2px solid ${selectedId === p._id ? '#f97316' : 'transparent'}`,
              }}
            >
              <span className="text-xs font-mono shrink-0 w-5" style={{ color: selectedId === p._id ? '#f97316' : '#475569' }}>{i + 1}.</span>
              <span className="flex-1 truncate text-[13px]" style={{ color: selectedId === p._id ? '#f1f5f9' : '#8b9eb8' }}>{p.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-[36%] flex-shrink-0 overflow-y-auto" style={{ background: '#0f172a', borderRight: '1px solid #1e2d45' }}>
        <div className="p-5">
          <h2 className="text-lg font-bold mb-4">{selectedProblem?.title || 'Select a problem'}</h2>
          <p className="text-sm leading-relaxed text-text whitespace-pre-wrap">{selectedProblem?.description || ''}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 py-2 text-sm font-semibold" style={{ background: '#0d1424', color: '#fbbf24', borderBottom: '1px solid #1e2d45' }}>
          Debugging challenges: {Math.min(2, Number(solvedProgress || 0))} / 2 solved
        </div>

        <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ background: '#0d1424', borderBottom: '1px solid #1e2d45' }}>
          <select
            value={language}
            onChange={handleLanguageChange}
            disabled={!selectorEnabled}
            title={!selectorEnabled ? 'This problem is Python only' : ''}
            className="bg-bg border border-border rounded px-2 py-1 text-sm text-text outline-none focus:border-accent disabled:opacity-60"
          >
            {selectorEnabled
              ? allowedLanguages.map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)
              : <option value="python">Python 3</option>}
          </select>
          <span className="text-xs text-muted truncate max-w-[240px]">{selectedProblem?.title || ''}</span>
        </div>

        <div className="flex-[0_0_55%] min-h-[120px] relative" onContextMenu={(e) => e.preventDefault()}>
          {!editorReady && (
            <textarea
              value={getActiveCode()}
              onChange={(e) => onEditorChange(e.target.value)}
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
                value={getActiveCode()}
                onChange={onEditorChange}
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
            {resultTab === 'output' && <OutputPanel content={outputContent} />}
            {resultTab === 'history' && <HistoryPanel submissions={submissions} />}
          </div>
        </div>
      </div>
    </div>
  );
}
