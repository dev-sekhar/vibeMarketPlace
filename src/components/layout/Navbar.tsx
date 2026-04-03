import { Link, useLocation } from 'react-router-dom';
import { Search, Globe, Zap } from 'lucide-react';

export const Navbar = () => {
  const location = useLocation();

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: 'var(--space-3) var(--space-8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--blur-lg)',
        WebkitBackdropFilter: 'var(--blur-lg)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* ── Brand ── */}
      <Link
        to="/"
        id="nav-brand"
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}
      >
        <Zap color="var(--accent-secondary)" fill="var(--accent-secondary)" size={22} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
          VibeMarket
        </span>
      </Link>

      {/* ── Search (hidden on auth pages) ── */}
      {!['/login', '/register'].includes(location.pathname) && (
        <div style={{
          flex: 1, maxWidth: '460px',
          display: 'flex', alignItems: 'center',
          position: 'relative',
        }}>
          <Search
            size={16}
            color="var(--text-tertiary)"
            style={{ position: 'absolute', left: 'var(--space-3)', pointerEvents: 'none' }}
          />
          <input
            id="nav-search"
            type="search"
            placeholder="Search apps…"
            aria-label="Search all apps"
            style={{
              width: '100%',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: 'var(--space-2) var(--space-4) var(--space-2) 2.25rem',
              borderRadius: 'var(--radius-full)',
              outline: 'none',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-primary)',
              transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--accent-secondary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.2)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      )}

      {/* ── Right Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
        {/* Language toggler */}
        <button
          id="nav-lang"
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 500,
          }}
          aria-label="Switch language"
        >
          <Globe size={16} />
          EN
        </button>

        {/* Auth links */}
        <Link
          to="/login"
          id="nav-login"
          style={{
            fontSize: 'var(--text-sm)', fontWeight: 600,
            color: 'var(--text-secondary)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-surface-elevated)',
            transition: 'color var(--transition-fast), border-color var(--transition-fast)',
          }}
        >
          Sign In
        </Link>

        {/* Submit CTA */}
        <Link
          to="/submit"
          id="nav-submit"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
            background: 'var(--gradient-neon)', color: '#fff',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-full)',
            fontWeight: 700, fontSize: 'var(--text-sm)',
            boxShadow: 'var(--shadow-glow)',
            transition: 'opacity var(--transition-fast), transform var(--transition-fast)',
          }}
        >
          Submit App
        </Link>
      </div>
    </nav>
  );
};
