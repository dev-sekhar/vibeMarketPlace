import { Link, useNavigate } from 'react-router-dom';
import { Globe, Zap, LogIn, LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVibeAuth } from '../../context/AuthContext';

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useVibeAuth();
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

        <Link to="/submit" id="nav-submit" style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
          background: 'var(--gradient-neon)', color: '#fff',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 'var(--text-sm)',
          boxShadow: 'var(--shadow-glow)',
        }}>
          {t('nav.submitApp')}
        </Link>
      </div>
    </nav>
  );
};
