export default function Footer() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '4px 16px',
        textAlign: 'center',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.22)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 9998,
        letterSpacing: '0.04em',
        fontFamily: 'monospace',
      }}
    >
      © {new Date().getFullYear()} Hrithik Balaji · ⚡ Speeding Coding
    </div>
  )
}
