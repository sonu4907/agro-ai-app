import { useState } from 'react'
import { signup, googleLogin } from "../services/authService";

interface SignupPageProps {
  onSwitch: (mode: 'main' | 'login' | 'signup') => void
}

export default function SignupPage({ onSwitch }: SignupPageProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-signup">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <img src="/3d_plant.jpg" alt="AgroAI 3D Plant" className="animated-3d-plant" style={{ maxWidth: '150px', margin: '0' }} />
        </div>
        <div className="auth-header">
          <div>
            <p className="auth-label">Join AgroAI</p>
            <h2 className="auth-title">Create your account</h2>
          </div>
          <p className="auth-subtitle">
            Sign up to save your crop recovery history and sync telemetry across devices.
          </p>
        </div>

        {errorMsg && (
          <div className="inline-error" style={{ marginBottom: '16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>
            <span>⚠️ {errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="err-dismiss" style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', marginLeft: 'auto', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        <div className="auth-cta-row">
          <button
            className="auth-social-btn auth-social-google"
            type="button"
            disabled={loading}
            onClick={async () => {
              setErrorMsg(null);
              setLoading(true);
              try {
                const user = await googleLogin();
                if (user) {
                  onSwitch("main");
                }
              } catch (error: any) {
                setErrorMsg(error.message);
              } finally {
                setLoading(false);
              }
            }}
          >
            <span className="auth-social-icon">G</span>
            {loading ? "Signing up..." : "Continue with Google"}
          </button>
        </div>

        <div className="auth-divider">
          <span>or sign up with email</span>
        </div>

        <form
          className="auth-form"
          onSubmit={async e => {
            e.preventDefault();

            if (password !== confirmPassword) {
              setErrorMsg("Passwords do not match");
              return;
            }

            if (password.length < 6) {
              setErrorMsg("Password must be at least 6 characters long.");
              return;
            }

            setErrorMsg(null);
            setLoading(true);
            try {
              await signup(name, email, password);
              onSwitch("main");
            } catch (error: any) {
              setErrorMsg(error.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="form-field">
            <span>Full Name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>
          <label className="form-field">
            <span>Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </label>

          <button className="auth-submit-btn" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating Account..." : "Sign up"}
          </button>
        </form>

        <div className="auth-footer-note">
          <span>Already have an account?</span>
          <button className="auth-link-btn" type="button" onClick={() => onSwitch('login')}>
            Sign in
          </button>
        </div>
        <div className="auth-footer-note auth-footer-secondary">
          <button className="auth-back-btn" type="button" onClick={() => onSwitch('main')}>
            Back to app
          </button>
        </div>
      </div>
    </div>
  )
}
