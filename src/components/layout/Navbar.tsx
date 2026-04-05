import { Link, useNavigate } from 'react-router-dom';
import { Globe, Zap, LogIn, LogOut, User, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVibeAuth } from '../../context/AuthContext';

const formatTimeLeft = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, signOut, loading, sessionTimeLeft, isSessionExpiring } = useVibeAuth();
  const { t, i18n } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleLanguageChange = () => {
    const languages = ['en', 'es', 'zh'];
    const currentIndex = languages.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % languages.length;
    i18n.changeLanguage(languages[nextIndex]);
  };

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: 'var(--space-3) var(--space-8)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 'var(--space-4)',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--blur-lg)',
        WebkitBackdropFilter: 'var(--blur-lg)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Brand */}
      <Link to="/" id="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
        <Zap color="var(--accent-secondary)" fill="var(--accent-secondary)" size={22} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)' }}>{t('nav.brand')}</span>
      </Link>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
        <Link to="/whitepapers" id="nav-whitepapers" style={{
          fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-full)', border: '1px solid var(--border-strong)',
          background: 'var(--bg-surface-elevated)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
          textDecoration: 'none',
        }}>
          {t('nav.whitepapers')}
        </Link>
        <button
          id="nav-lang"
          onClick={handleLanguageChange}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 'var(--space-1)',
            borderRadius: 'var(--radius-sm)',
          }}
          aria-label="Switch language"
        >
          <Globe size={16} />
          {i18n.language.toUpperCase()}
        </button>

        {!loading && user && isSessionExpiring && sessionTimeLeft !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: 'var(--text-xs)', fontWeight: 700,
            color: sessionTimeLeft < 60 ? '#f87171' : '#fbbf24',
            background: sessionTimeLeft < 60 ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.12)',
            border: `1px solid ${sessionTimeLeft < 60 ? 'rgba(239,68,68,0.4)' : 'rgba(251,191,36,0.4)'}`,
            borderRadius: 'var(--radius-full)',
            padding: '3px 10px',
            animation: sessionTimeLeft < 60 ? 'pulse 1s ease-in-out infinite' : undefined,
          }}>
            <Clock size={12} />
            Session expires in {formatTimeLeft(sessionTimeLeft)}
          </div>
        )}
        {!loading && (
          user ? (
            /* Logged-in state */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'var(--gradient-neon)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow)',
                }}>
                  <User size={16} color="#fff" />
                </div>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.user_metadata?.full_name ?? user.email?.split('@')[0]}
                </span>
              </div>
              <button
                id="nav-signout"
                onClick={handleSignOut}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                  fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-full)', border: '1px solid var(--border-strong)',
                  background: 'var(--bg-surface-elevated)', cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <LogOut size={14} />{t('nav.signOut')}
              </button>
            </>
          ) : (
            /* Logged-out state */
            <Link to="/login" id="nav-login" style={{
              fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-full)', border: '1px solid var(--border-strong)',
              background: 'var(--bg-surface-elevated)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            }}>
              <LogIn size={14} />{t('nav.login')}
            </Link>
          )
        )}
      </div>
    </nav>
  );
};
