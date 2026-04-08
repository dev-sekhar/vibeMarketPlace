import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ExternalLink, Code2, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VibeApp, CommunityLink } from '../../types/app';
import { supabase } from '../../lib/supabaseClient';
import styles from './AppCard.module.css';

interface AppCardProps {
  app: VibeApp;
  onUpvote?: (appId: string, delta: number) => void;
  initialUpvoted?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Developer Tool': '#3b82f6',
  'Productivity': '#10b981',
  'Web App': '#a855f7',
  'Game': '#f59e0b',
  'AI Assistant': '#ec4899',
  'Finance': '#06b6d4',
  'CLI Tool': '#64748b',
};

export const AppCard = ({ app, onUpvote, initialUpvoted = false }: AppCardProps) => {
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [votes, setVotes] = useState(app.upvotes);
  const [communityLinks, setCommunityLinks] = useState<CommunityLink[]>(app.communityLinks ?? []);
  const { t } = useTranslation();
  const categoryColor = CATEGORY_COLORS[app.category] ?? '#6e6e77';

  // Sync when parent resolves async upvote data or reverts an optimistic update
  useEffect(() => { setUpvoted(initialUpvoted); }, [initialUpvoted]);
  useEffect(() => { setVotes(app.upvotes); }, [app.upvotes]);

  // Fetch community links live from the author's profile
  useEffect(() => {
    console.log(`[Profile:1] app="${app.name}" author_id="${app.author_id}"`);
    if (!app.author_id) {
      console.log(`[Profile:2] SKIP — no author_id`);
      return;
    }
    console.log(`[Profile:3] Querying profiles table for user_id=${app.author_id}`);
    supabase
      .from('profiles')
      .select('slack_url, whatsapp_url, telegram_url')
      .eq('user_id', app.author_id)
      .maybeSingle()
      .then(({ data: profile, error }) => {
        console.log(`[Profile:4] Raw result:`, { profile, error });
        if (error) { console.log(`[Profile:5] ERROR:`, error.message, error.code); return; }
        if (!profile) { console.log(`[Profile:5] No row found for user_id=${app.author_id}`); return; }
        const links: CommunityLink[] = [
          profile.slack_url && { platform: 'slack' as const, url: profile.slack_url },
          profile.whatsapp_url && { platform: 'whatsapp' as const, url: profile.whatsapp_url },
          profile.telegram_url && { platform: 'telegram' as const, url: profile.telegram_url },
        ].filter(Boolean) as CommunityLink[];
        console.log(`[Profile:6] Links built:`, links);
        setCommunityLinks(links);
        console.log(`[Profile:7] setCommunityLinks called with ${links.length} link(s)`);
      });
  }, [app.author_id]);

  console.log(`[AppCard] Rendering ${app.name} with thumbnail: ${app.thumbnail}`);

  const handleUpvote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = upvoted ? -1 : 1;
    setUpvoted(prev => !prev);
    setVotes(prev => prev + delta);
    onUpvote?.(app.id, delta);
  };

  return (
    <article className={styles.card}>
      {/* Thumbnail */}
      <div className={styles.thumbnailWrapper}>
        <img
          src={app.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTIxMjE3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2E2YTZiNyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}
          alt={`${app.name} screenshot`}
          className={styles.thumbnail}
          onError={(e) => console.error(`[AppCard] Image failed to load for ${app.name}:`, e.currentTarget.src)}
          onLoad={() => console.log(`[AppCard] Image loaded successfully for ${app.name}`)}
        />
        {app.featured && (
          <span className={styles.featuredBadge}>⚡ Featured</span>
        )}
        <div className={styles.thumbnailOverlay}>
          {app.demoUrl && (
            <a
              href={app.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.overlayBtn}
              aria-label={`${t('appCard.liveDemo')} of ${app.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={16} />
              {t('appCard.liveDemo')}
            </a>
          )}
          <a
            href={app.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.overlayBtn}
            aria-label={`${t('appCard.source')} of ${app.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Code2 size={16} />
            {t('appCard.source')}
          </a>
        </div>
      </div>

      {/* Body - wrapped in Link */}
      <Link to={`/app/${app.slug}`} style={{ textDecoration: 'none', display: 'contents' }}>
        <div className={styles.body}>
          {/* Category + Upvote */}
          <div className={styles.meta}>
            <span
              className={styles.category}
              style={{ color: categoryColor, borderColor: `${categoryColor}44`, background: `${categoryColor}11` }}
            >
              {app.category}
            </span>
            <button
              className={`${styles.upvoteBtn} ${upvoted ? styles.upvoted : ''}`}
              onClick={handleUpvote}
              aria-label={t('appCard.upvote', { name: app.name })}
              aria-pressed={upvoted}
            >
              <ArrowUp size={14} />
              <span>{votes}</span>
            </button>
          </div>

          {/* Title + Description */}
          <h3 className={styles.title}>{app.name}</h3>
          <p className={styles.description}>{app.shortDescription}</p>

          {/* Tags */}
          {app.tags.length > 0 && (
            <div className={styles.tags}>
              <Tag size={12} color="var(--text-tertiary)" />
              {app.tags.slice(0, 3).map(tag => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}

          {/* Tech stack badges */}
          {app.techStack.length > 0 && (
            <div className={styles.techBadges}>
              {app.techStack.slice(0, 4).map(tech => (
                <span key={tech} className={styles.techBadge}>{tech}</span>
              ))}
            </div>
          )}

          {/* Author */}
          <div className={styles.author}>
            <span
              className={styles.avatar}
              style={{ background: app.author.avatarColor }}
              aria-label={app.author.name}
            >
              {app.author.avatarInitials}
            </span>
            <span className={styles.authorName}>{app.author.name}</span>
            {communityLinks.length > 0 && (
              <div className={styles.communityLinks} onClick={e => e.preventDefault()}>
                {communityLinks.map((link: CommunityLink) => {
                  const cfg: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
                    slack: { icon: <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg>, label: 'Slack', color: '#E01E5A' },
                    whatsapp: { icon: <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>, label: 'WhatsApp', color: '#25D366' },
                    telegram: { icon: <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>, label: 'Telegram', color: '#0088cc' },
                  };
                  const c = cfg[link.platform];
                  if (!c) return null;
                  return (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.communityIcon}
                      style={{ color: c.color, borderColor: `${c.color}44`, background: `${c.color}18` }}
                      aria-label={`Join ${c.label}`}
                      title={`Join ${c.label}`}
                      onClick={e => e.stopPropagation()}
                    >
                      {c.icon}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
};
