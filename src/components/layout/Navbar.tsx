import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Globe, Zap, LogIn, LogOut, User } from 'lucide-react';
import { useVibeAuth } from '../../context/AuthContext';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useVibeAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isAuthPage = ['/login', '/register'].includes(location.pathname);

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
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)' }}>VibeMarket</span>
      </Link>

      {/* Search — hidden on auth pages */}
      {!isAuthPage && (
        <div style={{ flex: 1, maxWidth: '460px', display: 'flex', alignItems: 'center', position: 'relative' }}>
          <Search size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: 'var(--space-3)', pointerEvents: 'none' }} />
          <input
            id="nav-search"
            type="search"
            placeholder="Search apps…"
            aria-label="Search all apps"
            style={{
              width: '100%', background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
              padding: 'var(--space-2) var(--space-4) var(--space-2) 2.25rem',
              borderRadius: 'var(--radius-full)', outline: 'none',
              fontSize: 'var(--text-sm)', fontFamily: 'var(--font-primary)',
              transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-secondary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.2)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>
      )}

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
        <button id="nav-lang" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 500 }} aria-label="Switch language">
          <Globe size={16} />EN
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
                <LogOut size={14} />Sign Out
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
              <LogIn size={14} />Sign In
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
          Submit App
        </Link>
      </div>
    </nav>
  );
};
