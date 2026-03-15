export default function EliminatedOverlay({ round = 1 }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6" style={{ background: 'rgba(5, 10, 25, 0.97)' }}>
      <div className="w-full max-w-xl rounded-2xl border p-8 text-center" style={{ background: '#0f172a', borderColor: 'rgba(100,116,139,0.35)' }}>
        <div className="text-xs uppercase tracking-[0.2em] font-bold mb-2" style={{ color: '#22c55e' }}>
          ⚡ Speeding Coding
        </div>
        <div className="text-5xl mb-4">🛑</div>
        <h1 className="text-3xl font-extrabold mb-3" style={{ color: '#e2e8f0' }}>
          You did not qualify for the next round
        </h1>
        <p className="text-sm mb-2" style={{ color: '#94a3b8' }}>
          Eliminated in Round {Number(round || 1)}
        </p>
        <p className="text-sm" style={{ color: '#cbd5e1' }}>
          Thank you for participating in Speeding Coding!
        </p>
      </div>
    </div>
  );
}
