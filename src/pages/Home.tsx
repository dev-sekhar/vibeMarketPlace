import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Hero } from '../components/Hero/Hero';
import { AppCard } from '../components/AppCard/AppCard';
import { PaperCard } from '../components/PaperCard/PaperCard';
import { supabase } from '../lib/supabaseClient';
import { useVibeAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { HOME_APPS_LIMIT, HOME_WHITEPAPERS_LIMIT } from '../config/home';
import type { VibeApp, AppCategory } from '../types/app';

type LatestPaper = { id: string; title: string; description: string; external_url: string; source: string; author_name: string; created_at: string };

const ALL_CATEGORIES: { key: AppCategory; translationKey: string }[] = [
  { key: 'Web App', translationKey: 'category.webApp' },
  { key: 'CLI Tool', translationKey: 'category.cliTool' },
  { key: 'Productivity', translationKey: 'category.productivity' },
  { key: 'Game', translationKey: 'category.game' },
  { key: 'Developer Tool', translationKey: 'category.developerTool' },
  { key: 'Finance', translationKey: 'category.finance' },
  { key: 'AI Assistant', translationKey: 'category.aiAssistant' },
];

export const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<AppCategory | null>(null);
  const [apps, setApps] = useState<VibeApp[]>([]);
  const [latestPapers, setLatestPapers] = useState<LatestPaper[]>([]);

  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const { t } = useTranslation();
  const { user } = useVibeAuth();

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const { data, error } = await supabase
          .from('apps')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching apps:', error);
          setApps([]);
        } else if (data) {
          const transformedApps: VibeApp[] = data.map(app => ({
            id: app.id,
            author_id: app.author_id,
            name: app.name,
            slug: app.slug,
            shortDescription: app.short_description,
            longDescription: app.long_description,
            thumbnail: app.thumbnail_url || '/placeholder-app.png',
            category: app.category as AppCategory,
            tags: app.tags || [],
            techStack: app.tech_stack || [],
            communityLinks: app.community_links ?? [],
            author: {
              name: app.author_name,
              avatarInitials: app.author_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
              avatarColor: `hsl(${Math.abs(app.author_name.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % 360}, 70%, 50%)`,
            },
            upvotes: app.upvotes,
            demoUrl: app.app_url,
            repoUrl: app.repo_url,
            featured: app.featured,
            createdAt: app.created_at,
          }));
          setApps(transformedApps);
        }
      } catch (error) {
        console.error('[Home] Error in fetchApps:', error);
        setApps([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchPapers = async () => {
      const { data } = await supabase
        .from('whitepapers')
        .select('id, title, description, external_url, source, author_name, created_at')
        .order('created_at', { ascending: false })
        .limit(HOME_WHITEPAPERS_LIMIT);
      setLatestPapers(data ?? []);
    };

    fetchApps();
    fetchPapers();
  }, []);

  // Fetch which apps the current user has already upvoted
  useEffect(() => {
    if (!user) { setUserUpvotes(new Set()); return; }
    supabase
      .from('upvotes')
      .select('app_id')
      .eq('user_id', user.id)
      .then(({ data }) => setUserUpvotes(new Set((data ?? []).map((r: { app_id: string }) => r.app_id))));
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return apps.filter(app => {
      const matchesSearch =
        !q ||
        app.name.toLowerCase().includes(q) ||
        app.shortDescription.toLowerCase().includes(q) ||
        app.tags.some(t => t.toLowerCase().includes(q)) ||
        app.author.name.toLowerCase().includes(q);
      const matchesCategory = !activeCategory || app.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, apps]);

  const featuredApps = useMemo(() => apps.filter(a => a.featured), [apps]);

  const isFiltering = !!searchQuery || !!activeCategory;
  // When not searching/filtering, cap display to HOME_APPS_LIMIT. When filtering, show all matches.
  const displayedApps = isFiltering || showAll ? filtered : filtered.slice(0, HOME_APPS_LIMIT);
  const hasMore = !isFiltering && !showAll && filtered.length > HOME_APPS_LIMIT;

  const handleUpvote = async (appId: string, delta: number) => {
    if (!user) return; // Must be authenticated to upvote
    const app = apps.find(a => a.id === appId);
    if (!app) return;
    const newUpvotes = app.upvotes + delta;

    // Optimistic UI update
    setApps(prev => prev.map(a => a.id === appId ? { ...a, upvotes: newUpvotes } : a));
    setUserUpvotes(prev => {
      const next = new Set(prev);
      if (delta > 0) next.add(appId); else next.delete(appId);
      return next;
    });

    try {
      let error;
      if (delta > 0) {
        // INSERT into upvotes table — trigger auto-syncs apps.upvotes
        ({ error } = await supabase.from('upvotes').insert({ app_id: appId, user_id: user.id }));
      } else {
        ({ error } = await supabase.from('upvotes').delete().eq('app_id', appId).eq('user_id', user.id));
      }
      if (error) throw error;
      window.dispatchEvent(new CustomEvent('openvibes:upvote', { detail: { delta } }));
    } catch (err) {
      console.error('Upvote error:', err);
      // Revert optimistic updates
      setApps(prev => prev.map(a => a.id === appId ? { ...a, upvotes: app.upvotes } : a));
      setUserUpvotes(prev => {
        const next = new Set(prev);
        if (delta > 0) next.delete(appId); else next.add(appId);
        return next;
      });
    }
  };

  return (
    <>
      {/* ── Hero ── */}
      <Hero onSearch={setSearchQuery} />

      {/* ── Platform Section ── */}
      <section
        style={{
          padding: 'var(--space-16) var(--space-4)',
          textAlign: 'center',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="container">
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            marginBottom: 'var(--space-4)',
          }}>
            {t('platform.title')}
          </h2>
          <p style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--text-secondary)',
            maxWidth: '900px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            {t('platform.description')}
          </p>
        </div>
      </section>

      {/* ── Latest Research — full-width strip ── */}
      {latestPapers.length > 0 && (
        <section style={{
          width: '100%',
          background: 'linear-gradient(100deg, rgba(20,8,50,0.85) 0%, rgba(50,10,90,0.75) 45%, rgba(80,15,60,0.75) 100%)',
          borderTop: '1px solid rgba(168,85,247,0.15)',
          borderBottom: '1px solid rgba(168,85,247,0.15)',
          padding: 'var(--space-6) 0',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <div className="container">
            {/* Strip header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
            }}>
              <BookOpen size={16} style={{ color: 'rgba(180,130,255,0.75)', flexShrink: 0 }} />
              <span style={{
                color: 'rgba(200,175,255,0.85)',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {t('home.latestResearch')}
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,120,220,0.28)' }} />
              <Link
                to="/whitepapers"
                style={{
                  color: 'rgba(168,130,255,0.80)',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                {t('home.viewAllPapers')} →
              </Link>
            </div>

            {/* Papers grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 'var(--space-4)',
            }}>
              {latestPapers.map(paper => (
                <PaperCard
                  key={paper.id}
                  id={paper.id}
                  title={paper.title}
                  description={paper.description ?? ''}
                  external_url={paper.external_url ?? ''}
                  source={paper.source ?? ''}
                  author_name={paper.author_name}
                  article_author_handle={(paper as any).article_author_handle ?? null}
                  is_own_article={(paper as any).is_own_article ?? false}
                  created_at={paper.created_at}
                  onClick={() => window.open(paper.external_url, '_blank', 'noopener,noreferrer')}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="container" style={{ marginTop: 'var(--space-10)' }}>
        {/* ── Featured Spotlight ── */}
        {!searchQuery && !activeCategory && !loading && featuredApps.length > 0 && (
          <section aria-label="Featured apps" style={{ marginBottom: 'var(--space-12)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 700,
                margin: 0,
              }}>
                ⚡ Featured
              </h2>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                Hand-picked by the community
              </span>
            </div>
            <div className="scroll-row">
              {featuredApps.map(app => (
                <div key={app.id} style={{ width: 'min(340px, 80vw)' }}>
                  <AppCard app={app} onUpvote={handleUpvote} initialUpvoted={userUpvotes.has(app.id)} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Category Pills ── */}
        <section
          aria-label="Filter by category"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-8)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <FilterPill
            label="All"
            id="filter-all"
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          />
          {ALL_CATEGORIES.map(cat => (
            <FilterPill
              key={cat.key}
              label={t(cat.translationKey)}
              id={`filter-${cat.key.toLowerCase().replace(/\s+/g, '-')}`}
              active={activeCategory === cat.key}
              onClick={() => setActiveCategory(prev => prev === cat.key ? null : cat.key)}
            />
          ))}
        </section>

        {/* ── Results header ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-6)',
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 0 }}>
            {searchQuery
              ? <>{t('home.resultsFor')} "<span className="text-gradient">{searchQuery}</span>"</>
              : activeCategory
                ? t(ALL_CATEGORIES.find(cat => cat.key === activeCategory)?.translationKey || '')
                : t('home.allApps')}
          </h2>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
            {isFiltering
              ? `${filtered.length} ${filtered.length === 1 ? t('home.app') : t('home.apps')}`
              : t('home.showingLatest', { limit: Math.min(HOME_APPS_LIMIT, filtered.length), total: apps.length })}
          </span>
        </div>

        {/* ── App Grid ── */}
        <section
          id="app-grid"
          aria-label="App listings"
          className="app-grid-home"
        >
          {loading ? (
            // Loading skeleton
            Array.from({ length: HOME_APPS_LIMIT }).map((_, i) => (
              <div key={i} style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  background: 'var(--bg-surface-elevated)',
                }} />
                <div style={{
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  flex: 1,
                }}>
                  <div style={{
                    height: '20px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                  }} />
                  <div style={{
                    height: '16px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    width: '80%',
                  }} />
                  <div style={{
                    height: '16px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    width: '60%',
                  }} />
                </div>
              </div>
            ))
          ) : displayedApps.length > 0 ? (
            displayedApps.map(app => <AppCard key={app.id} app={app} onUpvote={handleUpvote} initialUpvoted={userUpvotes.has(app.id)} />)
          ) : (
            <div style={{
              gridColumn: '1/-1',
              textAlign: 'center',
              padding: 'var(--space-16) 0',
              color: 'var(--text-tertiary)',
            }}>
              <p style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>🔍</p>
              <p style={{ fontSize: 'var(--text-lg)', margin: 0 }}>
                No apps found. Try a different search or{' '}
                <a href="/submit" style={{ color: 'var(--accent-secondary)' }}>submit yours!</a>
              </p>
            </div>
          )}
        </section>

        {/* ── View all apps link ── */}
        {hasMore && (
          <div style={{ textAlign: 'center', paddingBottom: 'var(--space-16)' }}>
            <button
              onClick={() => setShowAll(true)}
              style={{
                background: 'none',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--accent-secondary)',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                padding: 'var(--space-3) var(--space-6)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {t('home.viewAllApps', { count: apps.length })}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

/* ─── Shared FilterPill sub-component ─── */
interface FilterPillProps {
  label: string;
  id: string;
  active: boolean;
  onClick: () => void;
}

const FilterPill = ({ label, id, active, onClick }: FilterPillProps) => (
  <button
    id={id}
    onClick={onClick}
    style={{
      padding: 'var(--space-2) var(--space-4)',
      borderRadius: 'var(--radius-full)',
      border: `1px solid ${active ? 'var(--accent-secondary)' : 'var(--border-strong)'}`,
      background: active ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-surface-elevated)',
      color: active ? 'var(--accent-secondary)' : 'var(--text-secondary)',
      fontWeight: 600,
      fontSize: 'var(--text-sm)',
      cursor: 'pointer',
      transition: 'all var(--transition-fast)',
    }}
  >
    {label}
  </button>
);
