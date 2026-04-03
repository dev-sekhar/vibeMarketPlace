import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Zap, Eye, EyeOff } from 'lucide-react';
import { SSOButtons } from '../components/auth/SSOButtons';
import { useVibeAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export const Login = () => {
  const { signInWithEmail } = useVibeAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await signInWithEmail(email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className={styles.page}>
      <div className={`glass-panel ${styles.card}`}>
        <div className={styles.brand}>
          <Zap color="var(--accent-secondary)" fill="var(--accent-secondary)" size={28} />
          <span>VibeMarket</span>
        </div>

        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.sub}>Sign in to your account to continue</p>

        <SSOButtons />

        <div className={styles.divider}><span>or continue with email</span></div>

        {error && (
          <div className={styles.errorBox}>{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="login-email" className={styles.label}>Email</label>
            <div className={styles.inputWrapper}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="login-password" className={styles.label}>Password</label>
              <a href="#" className={styles.forgotLink}>Forgot password?</a>
            </div>
            <div className={styles.inputWrapper}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className={styles.eyeBtn}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button id="login-submit" type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Sign In'}
          </button>
        </form>

        <p className={styles.switchText}>
          Don&apos;t have an account?{' '}
          <Link to="/register" className={styles.switchLink}>Create one</Link>
        </p>
      </div>
    </div>
  );
};
