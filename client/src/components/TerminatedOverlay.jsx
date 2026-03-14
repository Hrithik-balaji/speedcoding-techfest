import { useState } from 'react';

export default function TerminatedOverlay({ reason, time, rollNo, onReinstate }) {
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await onReinstate(rollNo, code);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Contact invigilator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(20,0,0,0.97)] z-[9998] flex flex-col items-center justify-center gap-5">
      <div className="text-6xl">🚫</div>
      <div className="text-3xl font-extrabold text-hard">Session Terminated</div>
      <div className="text-muted text-center max-w-md">Reason: {reason}</div>
      <div className="text-[#555] text-sm">{time}</div>
      <div className="panel p-6 w-full max-w-sm mt-2">
        <div className="text-sm text-center mb-4">Contact your invigilator for re-entry</div>
        <input
          className="input-field mb-3"
          type="password"
          placeholder="Enter invigilator code"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {error && <div className="text-hard text-xs mb-2">{error}</div>}
        <button onClick={handleSubmit} className="btn-primary w-full" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify & Re-enter'}
        </button>
      </div>
    </div>
  );
}
