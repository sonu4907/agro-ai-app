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
            Sign in to preview the app's authentication UI. Google sign-in is included for future database integration.
          </p>
        </div>

        <div className="auth-cta-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
  className="auth-social-btn auth-social-google"
  type="button"
  onClick={async () => {
    try {
      await googleLogin();

      onSwitch("main");
    } catch (error: any) {
      alert(error.message);
    }
  }}
>
            <span className="auth-social-icon">G</span>
            Continue with Google
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
            🧪 Bypass Login (Demo Mode)
          </button>
        </div>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <form
  className="auth-form"
  onSubmit={async e => {
    e.preventDefault();

    try {
      await login(email, password);

      alert("Login Successful!");

      onSwitch("main");
    } catch (error: any) {
      alert(error.message);
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
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </label>

          <button className="auth-submit-btn" type="submit">
            Login
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
