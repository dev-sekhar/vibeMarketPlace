import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Code2, ArrowUp, Tag, Layers, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { CommunityLinks } from '../components/CommunityLinks';
import type { VibeApp } from '../types/app';

const CATEGORY_COLORS: Record<string, string> = {
  'Developer Tool': '#3b82f6',
  'Productivity': '#10b981',
  'Web App': '#a855f7',
  'Game': '#f59e0b',
  'AI Assistant': '#ec4899',
  'Finance': '#06b6d4',
  'CLI Tool': '#64748b',
};

export const AppDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [app, setApp] = useState<VibeApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [upvoted, setUpvoted] = useState(false);
  const [votes, setVotes] = useState(0);

  useEffect(() => {
    const fetchApp = async () => {
      if (!slug) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Failed to fetch app:', error);
        setApp(null);
      } else if (data) {
        const mapped: VibeApp = {
          id: data.id,
          name: data.name,
          slug: data.slug,
          shortDescription: data.short_description,
          longDescription: data.long_description,
          thumbnail: data.thumbnail_url || '/placeholder-app.png',
          category: data.category as VibeApp['category'],
          tags: data.tags || [],
          techStack: data.tech_stack || [],
          communityLinks: data.community_links || [],
          author: {
            name: data.author_name || 'Unknown',
            avatarInitials: (data.author_name || 'U').split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2),
            avatarColor: `hsl(${Math.abs((data.author_name || 'Unknown').split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % 360}, 70%, 50%)`,
          },
          upvotes: data.upvotes || 0,
          demoUrl: data.app_url,
          repoUrl: data.repo_url,
          featured: data.featured || false,
          createdAt: data.created_at,
        };

        setApp(mapped);
        setVotes(mapped.upvotes);
      }
      setLoading(false);
    };

    fetchApp();
  }, [slug]);

  if (loading) {
    return <div className="container" style={{ padding: 'var(--space-8)' }}>{t('appDetail.loading')}</div>;
  }

  if (!app) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
        <p style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>🔍</p>
        <h1 style={{ marginBottom: 'var(--space-4)' }}>{t('appDetail.notFound')}</h1>
        <Link to="/" style={{ color: 'var(--accent-secondary)' }}>{t('appDetail.back')}</Link>
      </div>
    );
  }

  const categoryColor = CATEGORY_COLORS[app.category] ?? '#6e6e77';

  const handleUpvote = () => {
    setUpvoted(prev => !prev);
    setVotes(prev => prev + (upvoted ? -1 : 1));
  };

  return (
    <div className="container animate-fade-in" style={{ padding: 'var(--space-8) var(--space-4) var(--space-16)' }}>

      {/* ── Back link ── */}
      <Link
        to="/"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
          color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 500,
          marginBottom: 'var(--space-8)',
          transition: 'color var(--transition-fast)',
        }}
      >
        <ArrowLeft size={16} />
        {t('appDetail.back')}
      </Link>

      {/* ── Hero Screenshot ── */}
      <div style={{
        width: '100%',
        borderRadius: 'var(--radius-2xl)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        marginBottom: 'var(--space-8)',
        aspectRatio: '16 / 7',
        background: 'var(--bg-surface-elevated)',
      }}>
        <img
          src={app.thumbnail}
          alt={`${app.name} screenshot`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* ── Two-column layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 300px',
        gap: 'var(--space-8)',
        alignItems: 'start',
      }}>

        {/* ── LEFT: Main content ── */}
        <div>
          {/* Category + title */}
          <span style={{
            fontSize: 'var(--text-xs)', fontWeight: 700,
            color: categoryColor, background: `${categoryColor}15`,
            border: `1px solid ${categoryColor}44`,
            padding: '2px 12px', borderRadius: 'var(--radius-full)',
            display: 'inline-block', marginBottom: 'var(--space-4)',
          }}>
            {app.category}
          </span>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginBottom: 'var(--space-2)', lineHeight: 1.15 }}>
            {app.name}
          </h1>
          <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
            {app.shortDescription}
          </p>

          {/* What it does */}
          <Section icon={<Layers size={20} color="var(--accent-base)" />} title={t('appDetail.whatItDoes')}>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>
              {app.longDescription}
            </p>
          </Section>

          {/* How to use */}
          <Section icon={<Users size={20} color="var(--accent-secondary)" />} title={t('appDetail.howToUse')}>
            <ol style={{ color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: 'var(--space-6)', margin: 0 }}>
              <li>Click <strong style={{ color: 'var(--text-primary)' }}>Live Demo</strong> to try it in your browser instantly — no sign-up required.</li>
              <li>Explore the source code on GitHub to understand how it was vibe-coded.</li>
              <li>Fork the repository and customise it with your own AI prompt engineering.</li>
            </ol>
          </Section>

          {/* Tech Stack */}
          <Section icon={<Tag size={20} color="var(--accent-tertiary)" />} title={t('appDetail.techStack')}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {app.techStack.map(tech => (
                <span
                  key={tech}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-strong)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </Section>

          {/* Tags */}
          <Section icon={<Tag size={20} color="var(--text-tertiary)" />} title={t('appDetail.tags')}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {app.tags.map(tag => (
                <span key={tag} style={{
                  padding: '2px 12px', borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
                  background: 'var(--bg-surface)',
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          </Section>

          {/* Community Links */}
          <CommunityLinks links={app.communityLinks} />
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', position: 'sticky', top: '80px' }}>
          {/* Action Buttons */}
          <a
            href={app.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            id={`detail-demo-${app.id}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
              background: 'var(--gradient-neon)', color: '#fff',
              padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
              fontWeight: 700, fontSize: 'var(--text-base)', boxShadow: 'var(--shadow-glow)',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={18} />
            {t('appDetail.liveDemo')}
          </a>
          <a
            href={app.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            id={`detail-source-${app.id}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
              background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
              fontWeight: 600, fontSize: 'var(--text-base)',
              textDecoration: 'none',
            }}
          >
            <Code2 size={18} />
            {t('appDetail.sourceCode')}
          </a>

          {/* Upvote */}
          <button
            id={`detail-upvote-${app.id}`}
            onClick={handleUpvote}
            aria-pressed={upvoted}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
              border: `1px solid ${upvoted ? 'var(--accent-base)' : 'var(--border-strong)'}`,
              background: upvoted ? 'rgba(59,130,246,0.12)' : 'var(--bg-surface-elevated)',
              color: upvoted ? 'var(--accent-base)' : 'var(--text-secondary)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700, fontSize: 'var(--text-base)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <ArrowUp size={18} />
            {upvoted ? t('appDetail.upvoted') : t('appDetail.upvote')} · {votes}
          </button>

          {/* App meta card */}
          <div className="glass-panel" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <MetaRow label={t('appDetail.creator')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: app.author.avatarColor, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#fff',
                }}>
                  {app.author.avatarInitials}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                  {app.author.name}
                </span>
              </div>
            </MetaRow>
            <MetaRow label={t('appDetail.category')}>
              <span style={{ color: categoryColor, fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                {app.category}
              </span>
            </MetaRow>
            <MetaRow label={t('appDetail.published')}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                {new Date(app.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </MetaRow>
          </div>

          {/* Share to LinkedIn */}
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(app.demoUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            id={`detail-share-linkedin-${app.id}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
              background: '#0a66c2', color: '#fff',
              padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
              fontWeight: 600, fontSize: 'var(--text-sm)',
              textDecoration: 'none',
            }}
          >
            {t('appDetail.shareLinkedIn')}
          </a>
        </aside>
      </div>
    </div>
  );
};

/* ── Small helper components ── */
const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 'var(--space-8)' }}>
    <h2 style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
      fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)',
    }}>
      {icon}{title}
    </h2>
    {children}
  </div>
);

const MetaRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </span>
    {children}
  </div>
);
