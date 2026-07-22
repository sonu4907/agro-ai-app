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
            Build your future login flow now. Google authentication is prepared for later database connection.
          </p>
        </div>

        <div className="auth-cta-row">
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
        </div>

        <div className="auth-divider">
          <span>or sign up with email</span>
        </div>

        <form
  className="auth-form"
  onSubmit={async e => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      await signup(name, email, password);

      alert("Account created successfully!");

      onSwitch("main");
    } catch (error: any) {
      alert(error.message);
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
            />
          </label>
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
          <label className="form-field">
            <span>Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
            />
          </label>

          <button className="auth-submit-btn" type="submit">
            Sign up
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
