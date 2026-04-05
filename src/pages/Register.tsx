import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Zap, Eye, EyeOff, MapPin } from 'lucide-react';
import { SSOButtons } from '../components/auth/SSOButtons';
import { useVibeAuth } from '../context/AuthContext';
import type { GeoData } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import styles from './Auth.module.css';

export const Register = () => {
  const { signUpWithEmail } = useVibeAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [geoLabel, setGeoLabel] = useState<string | null>(null);

  // Silently request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Round to ~1 km precision — avoids storing an exact address
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lng = Math.round(pos.coords.longitude * 100) / 100;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          const region = data.address?.state || '';
          const country = data.address?.country || '';
          const countryCode = (data.address?.country_code || '').toUpperCase();
          setGeoData({ city, region, country, countryCode, lat, lng });
          setGeoLabel([city, countryCode].filter(Boolean).join(', ') || country);
        } catch {
          // Silently ignore — geolocation is best-effort
        }
      },
      () => { } // User denied or unavailable — no error shown
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await signUpWithEmail(name, email, password, geoData ?? undefined);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={`glass-panel ${styles.card}`} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📬</div>
          <h2 className={styles.heading}>{t('register.checkInbox')}</h2>
          <p className={styles.sub}>{t('register.confirmationMessage', { email })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={`glass-panel ${styles.card}`}>
        <div className={styles.brand}>
          <Zap color="var(--accent-secondary)" fill="var(--accent-secondary)" size={28} />
          <span>VibeMarket</span>
        </div>

        <h1 className={styles.heading}>{t('register.title')}</h1>
        <p className={styles.sub}>{t('register.subtitle')}</p>

        <SSOButtons label="register" />

        <div className={styles.divider}><span>{t('register.orEmail')}</span></div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="register-name" className={styles.label}>{t('register.displayName')}</label>
            <div className={styles.inputWrapper}>
              <User size={16} className={styles.inputIcon} />
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('register.placeholder.name')}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="register-email" className={styles.label}>{t('register.email')}</label>
            <div className={styles.inputWrapper}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('register.placeholder.email')}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="register-password" className={styles.label}>{t('register.password')}</label>
            <div className={styles.inputWrapper}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="register-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('register.placeholder.password')}
                className={styles.input}
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className={styles.eyeBtn}
                aria-label={showPw ? t('register.hidePassword') : t('register.showPassword')}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '0 0 var(--space-4)' }}>
            {t('register.terms')}
          </p>

          {geoLabel && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 10px',
              marginBottom: 'var(--space-3)',
            }}>
              <MapPin size={11} color="var(--accent-secondary)" />
              Location detected: {geoLabel}
            </div>
          )}

          <button id="register-submit" type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : t('register.createAccount')}
          </button>
        </form>

        <p className={styles.switchText}>
          {t('register.hasAccount')}{' '}
          <Link to="/login" className={styles.switchLink}>{t('register.signIn')}</Link>
        </p>
      </div>
    </div>
  );
};
