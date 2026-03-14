import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useExam } from '../hooks/useExam';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import toast from 'react-hot-toast';

const LANG_CONFIG = {
  cpp:        { name: 'C++17',      monacoLang: 'cpp',        starter: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution\n    return 0;\n}' },
  python:     { name: 'Python 3',   monacoLang: 'python',     starter: 'import sys\ninput = sys.stdin.readline\n\n# Write your solution\n' },
  java:       { name: 'Java 11',    monacoLang: 'java',       starter: 'import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution\n    }\n}' },
  javascript: { name: 'JavaScript', monacoLang: 'javascript', starter: 'const lines = require("fs").readFileSync("/dev/stdin","utf8").trim().split("\\n");\n// Write your solution\n' },
};

function VerdictBadge({ verdict }) {
  const colors = {
    'Accepted':             'bg-easy/15 text-easy',
    'Wrong Answer':         'bg-hard/15 text-hard',
    'Runtime Error':        'bg-accent/15 text-accent',
    'Compile Error':        'bg-[#7c7cff]/15 text-[#7c7cff]',
    'Time Limit Exceeded':  'bg-hard/15 text-hard',
  };
  return <span className={`verdict-badge ${colors[verdict] || 'bg-border text-muted'}`}>{verdict}</span>;
}

function ProblemStatement({ problem, roundType }) {
  if (!problem) return (
    <div className="p-6 text-muted text-sm flex items-center justify-center h-full">
      Select a problem from the list
    </div>
  );

  const diffClass = `diff-${problem.difficulty?.toLowerCase()}`;

  return (
    <div className="p-5 slide-up">
      <div className="flex items-start gap-3 mb-4 flex-wrap">
        <h2 className="text-lg font-bold flex-1">{problem.title}</h2>
        <span className={`diff-pill ${diffClass}`}>{problem.difficulty}</span>
      </div>
      <div className="text-sm leading-relaxed text-text whitespace-pre-wrap mb-5">
        {problem.description}
      </div>
      {problem.constraints && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Constraints</div>
          <div className="code-block text-xs">{problem.constraints}</div>
        </div>
      )}
      {problem.sampleInput && (
        <div className="mb-4">
          <div className="text-sm font-semibold mb-2">Example</div>
          <div className="bg-bg border border-border rounded-lg p-3">
            <div className="mb-2">
              <div className="text-xs text-muted font-semibold mb-1">Input:</div>
              <div className="code-block">{problem.sampleInput}</div>
            </div>
            {problem.sampleOutput && (
              <div>
                <div className="text-xs text-muted font-semibold mb-1">Output:</div>
                <div className="code-block">{problem.sampleOutput}</div>
              </div>
            )}
          </div>
        </div>
      )}
      {problem.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {problem.tags.map(t => <span key={t} className="tag-pill">{t}</span>)}
        </div>
      )}
      {roundType === 'debug' && (
        <div className="mt-4 bg-accent/5 border border-accent/20 rounded-lg p-3">
          <div className="text-xs text-accent font-semibold mb-1">🐛 Debug Challenge</div>
          <div className="text-xs text-muted">The buggy code is pre-loaded in the editor. Find and fix the bug, then submit.</div>
        </div>
      )}
    </div>
  );
}

export default function CodingRound({ roundType }) {
  const { debugProblems, codingProblems } = useExam();
  const { student } = useAuth();
  const problems = roundType === 'debug' ? debugProblems : codingProblems;
  const roundNum = roundType === 'debug' ? 2 : 3;

  const [selectedId, setSelectedId]   = useState(null);
  const [lang, setLang]               = useState(roundType === 'debug' ? 'python' : 'cpp');
  const [editorCodes, setEditorCodes] = useState({});
  const [stdin, setStdin]             = useState('');
  const [resultTab, setResultTab]     = useState('output');
  const [outputContent, setOutputContent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [running, setRunning]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const editorRef = useRef(null);

  // Solved set from student state
  const solvedIds = new Set(
    (student?.[`r${roundNum}`]?.solved || []).map(s => s.problemId)
  );
  const attemptedIds = new Set(
    Object.keys(student?.[`r${roundNum}`]?.attempts || {})
  );

  // Select first problem on load
  useEffect(() => {
    if (problems.length > 0 && !selectedId) {
      setSelectedId(problems[0]._id);
    }
  }, [problems]);

  const selectedProblem = problems.find(p => p._id === selectedId);

  const getCurrentCode = () => {
    if (!selectedId) return '';
    return editorCodes[selectedId]?.[lang] || getStarterCode();
  };

  const getStarterCode = () => {
    if (roundType === 'debug' && selectedProblem?.buggyCode) return selectedProblem.buggyCode;
    return LANG_CONFIG[lang]?.starter || '';
  };

  const handleEditorChange = (value) => {
    if (!selectedId) return;
    setEditorCodes(prev => ({
      ...prev,
      [selectedId]: { ...(prev[selectedId] || {}), [lang]: value },
    }));
  };

  const handleSelectProblem = (id) => {
    setSelectedId(id);
    setOutputContent(null);
    setResultTab('output');
    loadSubmissions(id);
  };

  const handleLangChange = (e) => {
    const newLang = e.target.value;
    // Save current before switching
    setLang(newLang);
  };

  const loadSubmissions = async (pid) => {
    try {
      const { data } = await api.get(`/submissions/problem/${pid}`);
      setSubmissions(data);
    } catch {}
  };

  useEffect(() => {
    if (selectedId) loadSubmissions(selectedId);
  }, [selectedId]);

  const handleRun = async () => {
    if (running || submitting) return;
    if (!selectedId) return toast.error('Select a problem first');
    const code = getCurrentCode();
    if (!code.trim()) return toast.error('Write some code first');
    setRunning(true);
    setResultTab('output');
    setOutputContent({ type: 'loading' });
    try {
      const { data } = await api.post('/exec/run', {
        code,
        language: lang,
        stdin,
        problemId: selectedId,
        round: roundNum,
      });
      setOutputContent({ type: 'run', ...data });
    } catch (err) {
      const message = err.response?.data?.error || 'Execution failed';
      setOutputContent({ type: 'error', message });
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    const code = getCurrentCode();
    if (!code.trim()) return toast.error('Write some code first');
    if (!selectedId)  return toast.error('Select a problem first');
    setSubmitting(true);
    setResultTab('output');
    setOutputContent({ type: 'loading' });
    try {
      const { data } = await api.post('/exec/submit', {
        problemId: selectedId,
        round: roundNum,
        language: lang,
        code,
      });
      setOutputContent({ type: 'submit', ...data });
      loadSubmissions(selectedId);
      if (data.verdict === 'Accepted') {
        toast.success('✅ Accepted! All test cases passed!');
      } else {
        toast.error(`❌ ${data.verdict}${data.penaltyAdded ? ` (+${data.penaltyAdded} min penalty)` : ''}`);
      }
    } catch (err) {
      setOutputContent({ type: 'error', message: err.response?.data?.error || 'Submit failed' });
      toast.error('Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Ctrl+Enter to submit
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, lang, editorCodes, stdin]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Problem list sidebar */}
      <div
        className="w-56 flex-shrink-0 flex flex-col overflow-hidden"
        style={{ background: '#0d1424', borderRight: '1px solid #1e2d45' }}
      >
        <div
          className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: '#22c55e', borderBottom: '1px solid #1e2d45' }}
        >
          {roundType === 'debug' ? 'Debug Problems' : 'Coding Problems'}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {problems.map((p, i) => {
            const isSolved    = solvedIds.has(p._id);
            const isAttempted = attemptedIds.has(p._id) && !isSolved;
            const isActive    = selectedId === p._id;
            return (
              <div
                key={p._id}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer mb-1 transition-all"
                onClick={() => handleSelectProblem(p._id)}
                style={{
                  background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
                  borderLeft: `2px solid ${isActive ? '#22c55e' : 'transparent'}`,
                }}
                onMouseOver={e => { if (!isActive) e.currentTarget.style.background = '#111e35'; }}
                onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span
                  className="text-xs font-mono shrink-0 w-5"
                  style={{ color: isActive ? '#22c55e' : '#475569' }}
                >{i + 1}.</span>
                <span
                  className="flex-1 truncate text-[13px]"
                  style={{ color: isActive ? '#f1f5f9' : '#8b9eb8' }}
                >{p.title}</span>
                {isSolved    && <span style={{ color: '#22c55e' }} title="Solved">✓</span>}
                {isAttempted && <span style={{ color: '#ef4444' }} title="Attempted">·</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Problem statement */}
      <div
        className="w-[38%] flex-shrink-0 overflow-y-auto"
        style={{ background: '#0f172a', borderRight: '1px solid #1e2d45' }}
      >
        <ProblemStatement problem={selectedProblem} roundType={roundType} />
      </div>

      {/* Editor + Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor toolbar */}
        <div
          className="flex items-center justify-between px-3 py-2 flex-shrink-0"
          style={{ background: '#0d1424', borderBottom: '1px solid #1e2d45' }}
        >
          <select
            value={lang}
            onChange={handleLangChange}
            className="bg-bg border border-border rounded px-2 py-1 text-sm text-text outline-none focus:border-accent"
          >
            {Object.entries(LANG_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.name}</option>
            ))}
          </select>
          <span className="text-xs text-muted truncate max-w-[200px]">{selectedProblem?.title || ''}</span>
        </div>

        {/* Monaco Editor */}
        <div className="flex-[0_0_62%] min-h-[120px]" onContextMenu={(e) => e.preventDefault()}>
          <Editor
            height="100%"
            language={LANG_CONFIG[lang]?.monacoLang || 'cpp'}
            value={getCurrentCode()}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              padding: { top: 12, bottom: 12 },
              lineNumbers: 'on',
              bracketPairColorization: { enabled: true },
              contextmenu: false,
            }}
            onMount={e => { editorRef.current = e; }}
          />
        </div>

        {/* Resizer hint */}
        <div className="h-1 bg-border/50 flex-shrink-0" />

        {/* Result panel */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#080e1c' }}>
          {/* Tabs + Actions */}
          <div className="flex items-center border-b border-border flex-shrink-0 px-2">
            <button
              className={`tab-btn ${resultTab === 'output' ? 'active' : ''}`}
              onClick={() => setResultTab('output')}
            >Output</button>
            <button
              className={`tab-btn ${resultTab === 'history' ? 'active' : ''}`}
              onClick={() => { setResultTab('history'); loadSubmissions(selectedId); }}
            >Submissions ({submissions.length})</button>
            <div className="flex-1" />
            <div className="flex gap-2 py-1.5">
              <button
                className="btn-secondary text-xs py-1.5 px-3"
                onClick={handleRun}
                disabled={running || submitting}
              >
                {running ? '⏳ Running...' : '▶ Run Code'}
              </button>
              <button
                className="btn-primary text-xs py-1.5 px-3"
                onClick={handleSubmit}
                disabled={running || submitting}
                title="Ctrl+Enter"
              >
                {submitting ? '⏳ Judging...' : 'Submit'}
              </button>
            </div>
          </div>

          {/* Stdin */}
          <div className="px-3 py-2 border-b border-border/50 flex-shrink-0">
            <div className="text-xs text-muted mb-1 uppercase tracking-wide">Custom Input (stdin)</div>
            <textarea
              className="w-full bg-bg border border-border rounded text-xs font-mono text-text p-2 outline-none focus:border-accent resize-none"
              rows={2}
              placeholder="Enter custom input..."
              value={stdin}
              onChange={e => setStdin(e.target.value)}
            />
          </div>

          {/* Output content */}
          <div className="flex-1 overflow-y-auto p-3">
            {resultTab === 'output' && <OutputPanel content={outputContent} />}
            {resultTab === 'history' && <HistoryPanel submissions={submissions} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function OutputPanel({ content }) {
  if (!content) return <div className="text-muted text-sm p-4">Run your code or submit to see results here.</div>;

  if (content.type === 'loading') return (
    <div className="flex items-center gap-3 p-4 text-muted text-sm">
      <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full spin" />
      <span>Processing<span className="pulse-dot ml-1">.</span><span className="pulse-dot" style={{animationDelay:'0.2s'}}>.</span><span className="pulse-dot" style={{animationDelay:'0.4s'}}>.</span></span>
    </div>
  );

  if (content.type === 'error') return (
    <div className="text-hard text-sm p-4">{content.message}</div>
  );

  if (content.type === 'run') {
    const hasCompileErr = !!content.compileErr;
    const hasStderr     = !!content.stderr;
    const verdict       = hasCompileErr ? 'Compile Error' : hasStderr ? 'Runtime Error' : 'Success';
    return (
      <div className="flex flex-col gap-3">
        <VerdictBadge verdict={verdict} />
        {content.compileErr && (
          <div>
            <div className="text-xs text-muted mb-1">Compile Error</div>
            <div className="code-block text-[#7c7cff]">{content.compileErr}</div>
          </div>
        )}
        {content.stdout && (
          <div>
            <div className="text-xs text-muted mb-1">Output</div>
            <div className="code-block">{content.stdout}</div>
          </div>
        )}
        {content.stderr && !hasCompileErr && (
          <div>
            <div className="text-xs text-muted mb-1">Stderr</div>
            <div className="code-block text-accent">{content.stderr}</div>
          </div>
        )}
        {!content.stdout && !content.stderr && !content.compileErr && (
          <div className="text-muted text-sm">No output produced.</div>
        )}
      </div>
    );
  }

  if (content.type === 'submit') {
    const isAC = content.verdict === 'Accepted';
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <VerdictBadge verdict={content.verdict} />
          {content.totalCount > 0 && (
            <span className="text-sm text-muted">
              Test cases: <span className={`font-semibold ${isAC ? 'text-easy' : 'text-hard'}`}>
                {content.passedCount}/{content.totalCount}
              </span>
            </span>
          )}
          {content.penaltyAdded > 0 && (
            <span className="text-xs text-hard">+{content.penaltyAdded} min penalty</span>
          )}
        </div>

        {content.tcResults?.map((tc, i) => (
          <div key={i} className="bg-bg border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`font-semibold text-sm ${tc.ok ? 'text-easy' : 'text-hard'}`}>
                {tc.ok ? '✓' : '✗'} Test {i + 1}
              </span>
              <VerdictBadge verdict={tc.ok ? 'Accepted' : 'Wrong Answer'} />
            </div>
            {tc.stdout && (
              <div className="text-xs text-muted">
                Output: <span className={`font-mono ${tc.ok ? 'text-easy' : 'text-hard'}`}>
                  {(tc.stdout || '').substring(0, 200)}
                </span>
              </div>
            )}
            {tc.stderr && <div className="text-xs text-accent font-mono mt-1">{tc.stderr.substring(0, 200)}</div>}
          </div>
        ))}

        {content.stdout && (
          <div>
            <div className="text-xs text-muted mb-1">Output</div>
            <div className="code-block">{content.stdout}</div>
          </div>
        )}
        {content.compileErr && (
          <div>
            <div className="text-xs text-muted mb-1">Compile Error</div>
            <div className="code-block text-[#7c7cff]">{content.compileErr}</div>
          </div>
        )}
      </div>
    );
  }
  return null;
}

function HistoryPanel({ submissions }) {
  if (!submissions.length) return <div className="text-muted text-sm p-4">No submissions yet.</div>;
  const colors = { 'Accepted': 'text-easy bg-easy/15', 'Wrong Answer': 'text-hard bg-hard/15', 'Runtime Error': 'text-accent bg-accent/15', 'Compile Error': 'text-[#7c7cff] bg-[#7c7cff]/15' };

  return (
    <div className="flex flex-col gap-0">
      {submissions.map(s => (
        <div key={s._id} className="flex items-center gap-3 py-2.5 border-b border-border/50 text-sm">
          <span className={`verdict-badge ${colors[s.verdict] || 'text-muted bg-border'} text-xs`}>{s.verdict}</span>
          <span className="text-muted text-xs">{LANG_CONFIG[s.language]?.name || s.language}</span>
          {s.totalCount > 0 && <span className="text-muted text-xs">{s.passedCount}/{s.totalCount}</span>}
          <span className="text-muted text-xs ml-auto">{new Date(s.createdAt).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}
