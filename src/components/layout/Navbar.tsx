import { Link, useNavigate } from 'react-router-dom';
import { Globe, Zap, LogIn, LogOut, User, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useVibeAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getBadge } from '../../lib/badge';

const formatTimeLeft = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};



export const Navbar = () => {
  const navigate = useNavigate();
  const { user, signOut, loading, sessionTimeLeft, isSessionExpiring } = useVibeAuth();
  const { t, i18n } = useTranslation();
  const [appCount, setAppCount] = useState<number>(0);
  const [userPaperCount, setUserPaperCount] = useState<number>(0);

  useEffect(() => {
    if (!user) { setAppCount(0); setUserPaperCount(0); return; }
    Promise.all([
      supabase.from('apps').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
      supabase.from('whitepapers').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
    ]).then(([{ count: ac }, { count: pc }]) => {
      setAppCount(ac ?? 0);
      setUserPaperCount(pc ?? 0);
    });
  }, [user?.id]);

  const [globalStats, setGlobalStats] = useState({ apps: 0, creators: 0, upvotes: 0, categories: 0, papers: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from('apps').select('author_name, upvotes, category'),
      supabase.from('whitepapers').select('id', { count: 'exact', head: true }),
    ]).then(([{ data }, { count }]) => {
      if (data) {
        setGlobalStats({
          apps: data.length,
          creators: new Set(data.map((a: { author_name: string }) => a.author_name)).size,
          upvotes: data.reduce((s: number, a: { upvotes: number }) => s + (a.upvotes ?? 0), 0),
          categories: new Set(data.map((a: { category: string }) => a.category)).size,
          papers: count ?? 0,
        });
      }
    });
  }, []);

  // Keep upvote total in sync when Home.tsx persists an upvote
  useEffect(() => {
    const handler = (e: Event) => {
      const { delta } = (e as CustomEvent<{ delta: number }>).detail;
      setGlobalStats(prev => ({ ...prev, upvotes: prev.upvotes + delta }));
    };
    window.addEventListener('openvibes:upvote', handler);
    return () => window.removeEventListener('openvibes:upvote', handler);
  }, []);

  const badge = getBadge(appCount + userPaperCount);

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
      {/* Left: Brand + inline stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', flexShrink: 0 }}>
        <Link to="/" id="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
          <Zap color="var(--accent-secondary)" fill="var(--accent-secondary)" size={22} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)' }}>{t('nav.brand')}</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', flexShrink: 0 }}>
          <span><strong>{globalStats.apps}</strong>&thinsp;{t('stats.appsListed')}</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span><strong>{globalStats.papers}</strong>&thinsp;{t('stats.papers')}</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span><strong>{globalStats.creators}</strong>&thinsp;{t('stats.creators')}</span>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
        <Link to="/whitepapers" id="nav-whitepapers" style={{
          fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-full)', border: '1px solid var(--border-strong)',
          background: 'var(--bg-surface-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-1)',
          textDecoration: 'none',
          minWidth: '196px',
          boxSizing: 'border-box',
        }}>
          {t('nav.whitepapers')}
        </Link>
        <Link to="/templates" id="nav-templates" style={{
          fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-full)', border: '1px solid var(--border-strong)',
          background: 'var(--bg-surface-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-1)',
          textDecoration: 'none',
          minWidth: '132px',
          boxSizing: 'border-box',
        }}>
          {t('nav.templates')}
        </Link>
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
                <Link
                  to="/profile"
                  id="nav-profile"
                  title={t('nav.profile')}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--gradient-neon)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'var(--shadow-glow)',
                    flexShrink: 0,
                  }}
                >
                  <User size={16} color="#fff" />
                </Link>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.user_metadata?.full_name ?? user.email?.split('@')[0]}
                </span>
                {badge && (
                  <span
                    title={`${badge.label} — ${badge.description}`}
                    style={{
                      fontSize: 'var(--text-xs)', fontWeight: 700,
                      color: badge.textColor,
                      background: badge.color,
                      border: `1px solid ${badge.borderColor}`,
                      borderRadius: 'var(--radius-full)',
                      padding: '1px 8px',
                      cursor: 'default',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {badge.emoji} {badge.label}
                  </span>
                )}
              </div>
              <button
                id="nav-signout"
                onClick={handleSignOut}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-1)',
                  fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-full)', border: '1px solid var(--border-strong)',
                  background: 'var(--bg-surface-elevated)', cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  minWidth: '116px',
                  boxSizing: 'border-box',
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
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-1)',
              minWidth: '88px',
              boxSizing: 'border-box',
            }}>
              <LogIn size={14} />{t('nav.login')}
            </Link>
          )
        )}
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
      </div>
    </nav>
  );
};
