import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import Footer from '../components/Footer';

// ── Inline SVG icon components ────────────────────────────────
const IcoUser = () => (
  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);
const IcoId = () => (
  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
  </svg>
);
const IcoLock = () => (
  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);
const IcoBldg = () => (
  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);
const IcoPhone = () => (
  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z" />
  </svg>
);
const IcoDept = () => (
  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zm9.75-9.75A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);
const IcoEyeOpen = () => (
  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IcoEyeOff = () => (
  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);
const IcoCheck = () => (
  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const IcoSpinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);
const IcoBolt = () => (
  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// ── Reusable input wrapper ────────────────────────────────────
function Field({ label, icon, error, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#64748b] tracking-wide uppercase mb-1.5">{label}</label>
      <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-[11px] bg-white transition-all
        ${error
          ? 'border-red-400 ring-2 ring-red-100'
          : 'border-[#e2e8f0] focus-within:border-[#22c55e] focus-within:ring-2 focus-within:ring-[#22c55e]/10'
        }`}>
        {icon && <span className="text-[#94a3b8] shrink-0">{icon}</span>}
        {children}
      </div>
      {error && <p className="mt-1.5 text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  );
}

// ── Shared base input styles ──────────────────────────────────
const inputCls = 'flex-1 bg-transparent text-[14px] text-[#0f172a] placeholder-[#b0bbc9] outline-none min-w-0';

export default function LoginPage() {
  const [form, setForm] = useState({
    name: '',
    rollNo: '',
    college: '',
    phoneNumber: '',
    department: '',
    password: '',
    currentPassword: '',
  });
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const { login, register } = useAuth();
  const navigate  = useNavigate();

  useEffect(() => {
    const remembered = localStorage.getItem('sc_remember_roll');
    if (remembered) {
      setForm(prev => ({ ...prev, rollNo: remembered.toUpperCase() }));
    }
  }, []);

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.rollNo.trim()) e.rollNo = 'Roll number is required';
    if (!form.password)      e.password = 'Password is required';
    if (mode === 'register') {
      if (!form.name.trim())       e.name = 'Full name is required';
      if (!form.college.trim())    e.college = 'College is required';
      if (!form.department.trim()) e.department = 'Department is required';
      if (!/^\d{10,15}$/.test(form.phoneNumber)) e.phoneNumber = 'Enter a valid 10–15 digit number';
      if (!form.currentPassword)                 e.currentPassword = 'Please confirm your password';
      else if (form.password !== form.currentPassword) e.currentPassword = 'Passwords do not match';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      if (mode === 'register') {
        await register({
          name: form.name.trim(),
          rollNo: form.rollNo.trim(),
          college: form.college.trim(),
          phoneNumber: form.phoneNumber.trim(),
          department: form.department.trim(),
          password: form.password,
          currentPassword: form.currentPassword,
        });
        toast.success('Registration successful. Welcome!');
      } else {
        if (rememberMe) {
          localStorage.setItem('sc_remember_roll', form.rollNo.trim());
        } else {
          localStorage.removeItem('sc_remember_roll');
        }
        const loggedInStudent = await login({
          rollNo: form.rollNo.trim(),
          password: form.password,
        });

        localStorage.removeItem('terminated');
        localStorage.removeItem('terminatedReason');
        sessionStorage.removeItem('sc_terminated');

        if (loggedInStudent?.terminated === true && Number(loggedInStudent?.currentRound || 0) > 0) {
          navigate('/exam');
          return;
        }

        if (loggedInStudent?.terminated === false) {
          navigate('/exam');
          return;
        }

        if (Number(loggedInStudent?.currentRound || 0) === 0) {
          navigate('/exam');
          return;
        }
      }
      navigate('/exam');
    } catch (err) {
      toast.error(err.response?.data?.error || `${mode === 'register' ? 'Registration' : 'Login'} failed. Try again.`);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => { setMode(m); setErrors({}); setShowPassword(false); setShowConfirm(false); };

  // ── Feature list for left panel ──────────────────────────────
  const features = [
    { icon: '⚡', text: 'Real-time contest timer' },
    { icon: '🏆', text: 'Live leaderboard rankings' },
    { icon: '🔒', text: 'Secure session management' },
    { icon: '🧠', text: 'Multi-round exam structure' },
  ];

  return (
    <div className="fixed inset-0 overflow-auto" style={{ fontFamily: "'Inter', sans-serif", background: '#f1f5f9' }}>
      <div className="min-h-full flex">

        {/* ══ LEFT — HERO PANEL ══════════════════════════════════ */}
        <div
          className="hidden lg:flex flex-col justify-between relative overflow-hidden shrink-0"
          style={{
            width: '46%',
            background: 'linear-gradient(150deg, #05091a 0%, #0a1530 35%, #071840 65%, #060e28 100%)',
          }}
        >
          {/* Dot-grid texture */}
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* Ambient glows */}
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.13) 0%, transparent 65%)' }} />
          <div className="absolute bottom-0 right-[-60px] w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 65%)' }} />
          <div className="absolute top-1/2 right-8 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 65%)' }} />

          {/* Decorative ring circles */}
          <div className="absolute top-20 right-16 w-52 h-52 rounded-full border border-white/[0.04]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border border-white/[0.03]" />
          <div className="absolute bottom-24 left-10 w-36 h-36 rounded-full border border-white/[0.04]" />

          {/* Top logo */}
          <div className="relative z-10 px-12 pt-12">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#22c55e] flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 20px rgba(34,197,94,0.4)' }}>
                <IcoBolt />
              </div>
              <span className="text-white font-extrabold text-sm tracking-[0.18em] uppercase">Speeding Coding</span>
            </div>
          </div>

          {/* Main copy */}
          <div className="relative z-10 px-12">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-white/60 text-[11px] font-medium tracking-widest uppercase">Built for serious coding rounds</span>
            </div>

            <h1 className="text-[3.1rem] font-black text-white leading-[1.04] tracking-tight">
              Speeding Coding<br />
              <span style={{ color: '#22c55e' }}>Community</span>
            </h1>

            <p className="text-white/50 text-lg mt-5 leading-relaxed">
              Practice. Compete.<br />Grow faster together.
            </p>

            {/* Features */}
            <div className="mt-10 flex flex-col gap-3.5">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-base shrink-0 group-hover:border-[#22c55e]/30 transition-colors">
                    {f.icon}
                  </div>
                  <span className="text-white/45 text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom note */}
          <div className="relative z-10 px-12 pb-10">
            <div className="h-px bg-white/[0.06] mb-5" />
            <p className="text-white/25 text-[11px] tracking-wide">Secure session-based contest platform · © 2026</p>
          </div>
        </div>

        {/* ══ RIGHT — FORM PANEL ═════════════════════════════════ */}
        <div className="flex-1 flex items-center justify-center bg-white overflow-auto p-6 sm:p-10">
          <div className="w-full max-w-[440px] py-6">

            {/* Mobile-only logo */}
            <div className="flex lg:hidden items-center gap-2 mb-8">
              <div className="h-7 w-7 rounded-lg bg-[#22c55e] flex items-center justify-center">
                <IcoBolt />
              </div>
              <span className="text-[#0f172a] font-extrabold text-sm tracking-[0.18em] uppercase">Speeding Coding</span>
            </div>

            {/* Page heading */}
            <div className="mb-8">
              <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-2" style={{ color: '#22c55e' }}>
                Student Portal
              </p>
              <h2 className="text-[1.875rem] font-black text-[#0b1324] leading-tight">
                {mode === 'login' ? 'Welcome back 👋' : 'Create your account'}
              </h2>
              <p className="text-[#94a3b8] mt-2 text-sm">
                {mode === 'login'
                  ? 'Sign in to continue your session.'
                  : 'Register to join the exam platform.'}
              </p>
            </div>

            {/* ── Tab switcher ── */}
            <div className="flex border-b border-[#e8ecf3] mb-8">
              {[
                { id: 'login',    label: 'Login' },
                { id: 'register', label: 'Register' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchMode(t.id)}
                  className={`relative pb-3 mr-8 text-sm font-bold transition-colors
                    ${mode === t.id ? 'text-[#0f172a]' : 'text-[#b0bbc9] hover:text-[#64748b]'}`}
                >
                  {t.label}
                  {mode === t.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#22c55e' }} />
                  )}
                </button>
              ))}
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

              {/* Register-only fields */}
              {mode === 'register' && (
                <div className="flex flex-col gap-4 slide-up">
                  <Field label="Full Name" icon={<IcoUser />} error={errors.name}>
                    <input
                      className={inputCls}
                      type="text"
                      placeholder="Your full name"
                      value={form.name}
                      onChange={e => setField('name', e.target.value)}
                      autoComplete="off"
                      autoFocus
                    />
                  </Field>

                  <Field label="College" icon={<IcoBldg />} error={errors.college}>
                    <input
                      className={inputCls}
                      type="text"
                      placeholder="Your college name"
                      value={form.college}
                      onChange={e => setField('college', e.target.value)}
                      autoComplete="off"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Phone" icon={<IcoPhone />} error={errors.phoneNumber}>
                      <input
                        className={inputCls}
                        type="tel"
                        placeholder="10-digit"
                        value={form.phoneNumber}
                        onChange={e => setField('phoneNumber', e.target.value.replace(/[^\d]/g, ''))}
                        autoComplete="off"
                      />
                    </Field>

                    <Field label="Department" icon={<IcoDept />} error={errors.department}>
                      <input
                        className={inputCls}
                        type="text"
                        placeholder="CSE, ECE…"
                        value={form.department}
                        onChange={e => setField('department', e.target.value)}
                        autoComplete="off"
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* Roll number */}
              <Field label="Roll Number" icon={<IcoId />} error={errors.rollNo}>
                <input
                  className={inputCls}
                  type="text"
                  placeholder="e.g. CS2024001"
                  value={form.rollNo}
                  onChange={e => setField('rollNo', e.target.value.toUpperCase())}
                  autoComplete="off"
                  autoFocus={mode === 'login'}
                />
              </Field>

              {/* Password */}
              <Field label="Password" icon={<IcoLock />} error={errors.password}>
                <input
                  className={inputCls}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="text-[#b0bbc9] hover:text-[#64748b] shrink-0 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <IcoEyeOpen /> : <IcoEyeOff />}
                </button>
              </Field>

              {/* Confirm password (register only) */}
              {mode === 'register' && (
                <div className="slide-up">
                  <Field label="Confirm Password" icon={<IcoLock />} error={errors.currentPassword}>
                    <input
                      className={inputCls}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={form.currentPassword}
                      onChange={e => setField('currentPassword', e.target.value)}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="text-[#b0bbc9] hover:text-[#64748b] shrink-0 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <IcoEyeOpen /> : <IcoEyeOff />}
                    </button>
                  </Field>
                </div>
              )}

              {/* Remember me + forgot password (login only) */}
              {mode === 'login' && (
                <div className="flex items-center justify-between pt-0.5">
                  <label
                    className="flex items-center gap-2.5 cursor-pointer select-none group"
                    onClick={() => setRememberMe(v => !v)}
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all
                        ${rememberMe
                          ? 'border-[#22c55e] bg-[#22c55e]'
                          : 'border-[#cbd5e1] bg-white group-hover:border-[#22c55e]'}`}
                    >
                      {rememberMe && <IcoCheck />}
                    </div>
                    <span className="text-sm text-[#475569]">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => toast('Contact your invigilator to reset your password.', { icon: '🔑' })}
                    className="text-sm font-semibold transition-colors"
                    style={{ color: '#22c55e' }}
                    onMouseOver={e => e.currentTarget.style.color = '#16a34a'}
                    onMouseOut={e => e.currentTarget.style.color = '#22c55e'}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3.5 rounded-xl font-bold text-[15px] text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1a3050 100%)',
                  boxShadow: '0 4px 20px rgba(15,23,42,0.25)',
                }}
                onMouseOver={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, #1e293b 0%, #22437a 100%)'; }}
                onMouseOut={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, #0f172a 0%, #1a3050 100%)'; }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <IcoSpinner />
                    {mode === 'register' ? 'Creating account…' : 'Signing in…'}
                  </span>
                ) : (
                  mode === 'register' ? 'Create account →' : 'Sign in →'
                )}
              </button>
            </form>

            {/* Admin link */}
            <div className="mt-7 pt-6 border-t border-[#f1f5f9] text-center">
              <span className="text-sm text-[#94a3b8]">Invigilator?</span>{' '}
              <a
                href="/admin"
                className="text-sm font-bold text-[#0f172a] transition-colors"
                onMouseOver={e => e.currentTarget.style.color = '#22c55e'}
                onMouseOut={e => e.currentTarget.style.color = '#0f172a'}
              >
                Open Admin Panel →
              </a>
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
}
