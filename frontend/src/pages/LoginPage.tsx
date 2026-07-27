import { useState } from 'react'
import { login, googleLogin } from "../services/authService";
import { useAuth } from "../context/AuthContext";

interface LoginPageProps {
  onSwitch: (mode: 'main' | 'login' | 'signup') => void
}

export default function LoginPage({ onSwitch }: LoginPageProps) {
  const { loginAsDemo } = useAuth();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-login">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <img src="/3d_plant.jpg" alt="AgroAI 3D Plant" className="animated-3d-plant" style={{ maxWidth: '150px', margin: '0' }} />
        </div>
        <div className="auth-header">
          <div>
            <p className="auth-label">Welcome Back</p>
            <h2 className="auth-title">Login to AgroAI</h2>
          </div>
          <p className="auth-subtitle">
            Sign in to access your smart farm telemetry, AI plant doctor, and recovery logs.
          </p>
        </div>

        {errorMsg && (
          <div className="inline-error" style={{ marginBottom: '16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>
            <span>⚠️ {errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="err-dismiss" style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', marginLeft: 'auto', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        <div className="auth-cta-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <button
            className="auth-social-btn"
            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            type="button"
            onClick={() => {
              loginAsDemo();
              onSwitch("main");
            }}
          >
            🧪 Quick Access (Demo Mode)
          </button>
        </div>

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>

        <form
          className="auth-form"
          onSubmit={async e => {
            e.preventDefault();
            if (!email || !password) {
              setErrorMsg("Please enter both email and password.");
              return;
            }

            setErrorMsg(null);
            setLoading(true);
            try {
              await login(email, password);
              onSwitch("main");
            } catch (error: any) {
              setErrorMsg(error.message);
            } finally {
              setLoading(false);
            }
          }}
        >
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

          <button className="auth-submit-btn" type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <div className="auth-footer-note">
          <span>Don't have an account?</span>
          <button className="auth-link-btn" type="button" onClick={() => onSwitch('signup')}>
            Create one now
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
