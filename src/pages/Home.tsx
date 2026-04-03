import { useState, useMemo, useEffect } from 'react';
import { Hero } from '../components/Hero/Hero';
import { StatsBar } from '../components/StatsBar/StatsBar';
import { AppCard } from '../components/AppCard/AppCard';
import { MOCK_APPS } from '../data/mockApps';
import { supabase } from '../lib/supabaseClient';
import type { VibeApp, AppCategory } from '../types/app';

const ALL_CATEGORIES: AppCategory[] = [
  'Web App', 'CLI Tool', 'Productivity', 'Game', 'Developer Tool', 'Finance', 'AI Assistant',
];

export const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<AppCategory | null>(null);
  const [apps, setApps] = useState<VibeApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const { data, error } = await supabase
          .from('apps')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching apps:', error);
          // Fallback to mock data if Supabase fails
          setApps(MOCK_APPS);
        } else if (data) {
          // Transform Supabase data to VibeApp format
          const transformedApps: VibeApp[] = data.map(app => ({
              id: app.id,
              name: app.name,
              slug: app.slug,
              shortDescription: app.short_description,
              longDescription: app.long_description,
              thumbnail: app.thumbnail_url || '/placeholder-app.png',
              category: app.category as AppCategory,
              tags: app.tags || [],
              techStack: app.tech_stack || [],
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
        console.error('Error fetching apps:', error);
        setApps(MOCK_APPS);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, []);

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

  return (
    <>
      {/* ── Hero ── */}
      <Hero onSearch={setSearchQuery} />

      <div className="container">
        {/* ── Stats Bar ── */}
        <StatsBar />

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
                  <AppCard app={app} />
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
              key={cat}
              label={cat}
              id={`filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(prev => prev === cat ? null : cat)}
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
              ? <>Results for "<span className="text-gradient">{searchQuery}</span>"</>
              : activeCategory
                ? activeCategory
                : 'All Apps'}
          </h2>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
            {filtered.length} {filtered.length === 1 ? 'app' : 'apps'}
          </span>
        </div>

        {/* ── App Grid ── */}
        <section
          id="app-grid"
          aria-label="App listings"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--space-6)',
            paddingBottom: 'var(--space-16)',
          }}
        >
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, i) => (
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
          ) : filtered.length > 0 ? (
            filtered.map(app => <AppCard key={app.id} app={app} />)
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
