import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ExternalLink, Code2, Tag } from 'lucide-react';
import type { VibeApp } from '../../types/app';
import styles from './AppCard.module.css';

interface AppCardProps {
  app: VibeApp;
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

export const AppCard = ({ app }: AppCardProps) => {
  const [upvoted, setUpvoted] = useState(false);
  const [votes, setVotes] = useState(app.upvotes);
  const categoryColor = CATEGORY_COLORS[app.category] ?? '#6e6e77';

  const handleUpvote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUpvoted(prev => !prev);
    setVotes(prev => prev + (upvoted ? -1 : 1));
  };

  return (
    <article className={styles.card}>
      {/* Thumbnail */}
      <div className={styles.thumbnailWrapper}>
        <img
          src={app.thumbnail}
          alt={`${app.name} screenshot`}
          className={styles.thumbnail}
          loading="lazy"
        />
        {app.featured && (
          <span className={styles.featuredBadge}>⚡ Featured</span>
        )}
        <div className={styles.thumbnailOverlay}>
          <a
            href={app.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.overlayBtn}
            aria-label={`Live demo of ${app.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={16} />
            Live Demo
          </a>
          <a
            href={app.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.overlayBtn}
            aria-label={`Source code of ${app.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Code2 size={16} />
            Source
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
              aria-label={`Upvote ${app.name}`}
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
