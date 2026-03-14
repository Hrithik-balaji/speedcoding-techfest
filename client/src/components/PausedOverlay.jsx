export default function PausedOverlay() {
  return (
    <div
      className="fixed inset-0 z-[8888] flex flex-col items-center justify-center gap-6"
      style={{ background: 'rgba(5,9,26,0.96)', backdropFilter: 'blur(6px)' }}
    >
      {/* Pulsing ring */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute w-24 h-24 rounded-full animate-ping opacity-20"
          style={{ background: '#f59e0b' }}
        />
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.12)', border: '2px solid rgba(245,158,11,0.3)' }}
        >
          <svg className="w-10 h-10" style={{ color: '#f59e0b' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-black mb-2" style={{ color: '#f1f5f9' }}>Contest Paused</div>
        <div className="text-sm" style={{ color: '#64748b' }}>Please wait for the invigilator to resume the exam.</div>
      </div>

      <div
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
      >
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
        Timer paused by admin
      </div>
    </div>
  );
}
