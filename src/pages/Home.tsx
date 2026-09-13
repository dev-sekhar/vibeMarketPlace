import { uniqueArticles } from '../lib/articlePolicy';
import { filterApps } from '../lib/appDirectory';
import { useState, useMemo, useEffect } from 'react';
import './Directory.css';
import { sourceAtRevision } from '../lib/submissionPolicy';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, LayoutGrid } from 'lucide-react';
import { Hero } from '../components/Hero/Hero';
import { AppCard } from '../components/AppCard/AppCard';
import { PaperCard } from '../components/PaperCard/PaperCard';
import { supabase } from '../lib/supabaseClient';
import { useVibeAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { HOME_APPS_LIMIT, HOME_WHITEPAPERS_LIMIT } from '../config/home';
import type { VibeApp, AppCategory } from '../types/app';

type LatestPaper = { id: string; title: string; description: string; external_url: string; source: string; author_name: string; created_at: string; article_author_name?: string; article_author_handle?: string; is_own_article?: boolean };

const ALL_CATEGORIES: { key: AppCategory; translationKey: string }[] = [
  { key: 'Web App', translationKey: 'category.webApp' },
  { key: 'CLI Tool', translationKey: 'category.cliTool' },
  { key: 'Productivity', translationKey: 'category.productivity' },
  { key: 'Game', translationKey: 'category.game' },
  { key: 'Developer Tool', translationKey: 'category.developerTool' },
  { key: 'Finance', translationKey: 'category.finance' },
  { key: 'AI Assistant', translationKey: 'category.aiAssistant' },
];

export const Home = ({ directory = false }: { directory?: boolean }) => {
  const [params, setParams] = useSearchParams();
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };
  const [homeSearch, setHomeSearch] = useState('');
  const searchQuery = directory ? params.get('q') || '' : homeSearch;
  const setSearchQuery = (value: string) => directory ? updateFilter('q', value) : setHomeSearch(value);
  const [homeCategory, setHomeCategory] = useState<AppCategory | null>(null);
  const activeCategory = directory ? params.get('category') : homeCategory;
  const setActiveCategory = (value: AppCategory | null) => directory ? updateFilter('category', value || '') : setHomeCategory(value);
  const [apps, setApps] = useState<VibeApp[]>([]);
  const [latestPapers, setLatestPapers] = useState<LatestPaper[]>([]);

  const [loading, setLoading] = useState(true);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const { t } = useTranslation();
  const { user } = useVibeAuth();

  useEffect(() => {
    const fetchApps = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const data = [];
        for (let offset = 0; ; offset += 500) {
          const { data: batch, error } = await supabase.from('apps').select('*')
            .order('created_at', { ascending: false }).order('id')
            .range(offset, offset + 499);
          if (error) throw error;
          data.push(...(batch || []));
          if (!batch || batch.length < 500) break;
        }
        {
          const transformedApps: VibeApp[] = data.map(app => ({
            id: app.id,
            author_id: app.author_id,
            name: app.name,
            slug: app.slug,
            shortDescription: app.short_description,
            longDescription: app.long_description,
            thumbnail: app.thumbnail_url || '',
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
            repoUrl: sourceAtRevision(app.repo_url, app.validated_commit),
            projectStatus: app.project_status,
            validatedCommit: app.validated_commit,
            featured: app.featured,
            createdAt: app.created_at,
          }));
          setApps(transformedApps);
        }
      } catch (error) {
        console.error('[Home] Error in fetchApps:', error);
        setLoadError(true);
        setApps([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchPapers = async () => {
      const { data } = await supabase
        .from('whitepapers')
        .select('id, title, description, external_url, source, author_name, created_at, article_author_handle, is_own_article, article_author_name')
        .order('created_at', { ascending: false })
        .limit(HOME_WHITEPAPERS_LIMIT);
      setLatestPapers(uniqueArticles(data ?? []));
    };

    fetchApps();
    if (!directory) fetchPapers();
  }, [directory, retry]);

  // Fetch which apps the current user has already upvoted
  useEffect(() => {
    if (!user) { setUserUpvotes(new Set()); return; }
    supabase
      .from('upvotes')
      .select('app_id')
      .eq('user_id', user.id)
      .then(({ data }) => setUserUpvotes(new Set((data ?? []).map((r: { app_id: string }) => r.app_id))));
  }, [user]);

  const filtered = useMemo(() => filterApps(apps, searchQuery, activeCategory, directory, params), [apps, searchQuery, activeCategory, directory, params]);

  const featuredApps = useMemo(() => apps.filter(a => a.featured), [apps]);

  const isFiltering = !!searchQuery || !!activeCategory;
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));
  const requestedPage = Number(params.get('page'));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(pageCount, Math.max(1, requestedPage)) : 1;
  const displayedApps = directory ? filtered.slice((page - 1) * 12, page * 12) : filtered.slice(0, HOME_APPS_LIMIT);
  const directoryParams = new URLSearchParams();
  if (searchQuery) directoryParams.set('q', searchQuery);
  if (activeCategory) directoryParams.set('category', activeCategory);
  const directoryUrl = '/apps' + (directoryParams.size ? '?' + directoryParams : '');

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
      {!directory && <Hero onSearch={setSearchQuery} />}

      {/* ── Platform Section ── */}
      {!directory && <section
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
      </section>}

      {/* ── Latest Research — full-width strip ── */}
      {!directory && latestPapers.length > 0 && (
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
            <ListingHeader title={t('home.latestResearch')} to="/whitepapers" linkText={t('home.viewAllPapers')} icon={BookOpen} />

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
                  article_author_name={paper.article_author_name}
                  article_author_handle={paper.article_author_handle ?? null}
                  is_own_article={paper.is_own_article ?? false}
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
        {!directory && !searchQuery && !activeCategory && !loading && featuredApps.length > 0 && (
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

        {directory && <>
          <h1>Explore open-source apps</h1>
          <p>Discover projects to try, learn from, and contribute to.</p>
          <div className="directory-filters">
            <label>Search<input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="App, creator, tag, or technology" /></label>
            <label>Project status<select value={params.get('status') || ''} onChange={e => updateFilter('status', e.target.value)}>
              <option value="">All statuses</option><option value="experimental">Experimental</option><option value="usable">Usable</option><option value="maintained">Maintained</option><option value="unspecified">Not specified</option>
            </select></label>
            <label>Sort by<select value={params.get('sort') || 'latest'} onChange={e => updateFilter('sort', e.target.value)}>
              <option value="latest">Newest first</option><option value="votes">Most upvoted</option><option value="name">Name A–Z</option>
            </select></label>
            <label><input type="checkbox" checked={params.get('demo') === 'yes'} onChange={e => updateFilter('demo', e.target.checked ? 'yes' : '')} /> Has a live demo</label>
            <button type="button" onClick={() => setParams({})}>Clear filters</button>
          </div>
        </>}
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
              onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
            />
          ))}
        </section>

        {!directory && <ListingHeader title={t('home.latestApps', 'Latest Apps')} to={directoryUrl} linkText={t('home.viewAllPapers')} icon={LayoutGrid} />}
        {/* Search details and result counts sit below the section header. */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-6)',
        }}>
          {(directory || isFiltering) && <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 0 }}>
            {searchQuery
              ? <>{t('home.resultsFor')} "<span className="text-gradient">{searchQuery}</span>"</>
              : activeCategory
                ? t(ALL_CATEGORIES.find(cat => cat.key === activeCategory)?.translationKey || '')
                : t('home.allApps')}
          </h2>}
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
            {directory || isFiltering
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
          {loadError ? <div role="alert"><p>Apps could not be loaded. Please try again.</p><button onClick={() => setRetry(n => n + 1)}>Retry</button></div> : loading ? (
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

        {directory && !loading && !loadError && filtered.length > 0 && <nav aria-label="Apps pagination" className="directory-pagination">
          <button disabled={page === 1} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(page - 1)); setParams(next); }}>Previous</button>
          <span aria-live="polite">Page {page} of {pageCount}</span>
          <button disabled={page === pageCount} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(page + 1)); setParams(next); }}>Next</button>
        </nav>}
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

const ListingHeader = ({ title, to, linkText, icon: Icon }: { title: string; to: string; linkText: string; icon: typeof BookOpen }) => (
  <div className="listing-header">
    <Icon size={16} className="listing-header-icon" aria-hidden="true" />
    <h2>{title}</h2>
    <div className="listing-header-line" aria-hidden="true" />
    <Link to={to}>{linkText}</Link>
  </div>
);
