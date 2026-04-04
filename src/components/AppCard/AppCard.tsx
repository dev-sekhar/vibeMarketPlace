import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ExternalLink, Code2, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VibeApp } from '../../types/app';
import styles from './AppCard.module.css';

interface AppCardProps {
  app: VibeApp;
  onUpvote?: (appId: string, delta: number) => void;
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

export const AppCard = ({ app, onUpvote }: AppCardProps) => {
  const [upvoted, setUpvoted] = useState(false);
  const [votes, setVotes] = useState(app.upvotes);
  const { t } = useTranslation();
  const categoryColor = CATEGORY_COLORS[app.category] ?? '#6e6e77';

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
          <div className={styles.tags}>
            <Tag size={12} color="var(--text-tertiary)" />
            {app.tags.slice(0, 3).map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>

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
          </div>
        </div>
      </Link>
    </article>
  );
};
