import { ExternalLink, User, PenLine, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './PaperCard.module.css';
import { sanitizeUrl } from '../../lib/utils';

interface AuthorBadge {
    emoji: string;
    label: string;
    textColor: string;
    color: string;
    borderColor: string;
    description: string;
}

interface PaperCardProps {
    id: string;
    title: string;
    description: string;
    external_url: string;
    source: string;
    author_name: string;
    author_linkedin_url?: string | null;
    author_badge?: AuthorBadge | null;
    article_author_handle?: string | null;
    is_own_article?: boolean;
    created_at: string;
    onClick: () => void;
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

/** Official platform SVG logos */
const PlatformLogo = ({ source, size = 18 }: { source: string; size?: number }) => {
    switch (source.toLowerCase()) {
        case 'linkedin':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-label="LinkedIn">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
            );
        case 'medium':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-label="Medium">
                    <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
                </svg>
            );
        case 'github':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-label="GitHub">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
            );
        case 'dev.to':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-label="DEV.to">
                    <path d="M7.42 10.05c-.18-.16-.46-.23-.84-.23H6l.02 2.44.04 2.45.56-.02c.41 0 .63-.07.83-.26.24-.24.26-.36.26-2.2 0-1.91-.02-1.96-.29-2.18zM0 4.94v14.12h24V4.94H0zM8.56 15.3c-.44.58-1.06.77-2.53.77H4.71V8.53h1.4c1.67 0 2.16.18 2.6.9.27.43.29.6.32 2.57.05 2.23-.02 2.73-.47 3.3zm5.09-5.47h-2.47v1.77h1.52v1.28l-.72.04-.75.03v1.77l1.22.03 1.2.04v1.28h-1.6c-1.53 0-1.6-.01-1.87-.3l-.3-.28v-3.16c0-3.02.01-3.18.25-3.48.23-.31.25-.31 1.88-.31h1.64v1.28zm4.68 5.45c-.17.43-.64.79-1 .79-.18 0-.45-.15-.67-.39-.32-.32-.45-.63-.82-2.08l-.9-3.39-.45-1.67h.76c.4 0 .75.02.75.05 0 .06 1.16 4.54 1.26 4.83.04.15.32-.7.73-2.3l.66-2.52.74-.04c.4-.02.73 0 .73.04 0 .14-1.67 6.38-1.8 6.68z" />
                </svg>
            );
        case 'substack':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-label="Substack">
                    <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
                </svg>
            );
        default:
            return <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em' }}>{source}</span>;
    }
};

const getPlatformBg = (source: string): string => {
    switch (source.toLowerCase()) {
        case 'linkedin': return '#0A66C2';
        case 'medium': return '#1A1A1A';
        case 'github': return '#24292E';
        case 'dev.to': return '#0a0a0a';
        case 'substack': return '#FF6719';
        case 'hashnode': return '#2962FF';
        default: return 'rgba(0,0,0,0.55)';
    }
};

/**
 * Derives the platform profile URL from the article URL.
 * Falls back to the stored author_linkedin_url for LinkedIn if available.
 */
const getAuthorProfileUrl = (externalUrl: string, authorLinkedinUrl?: string | null): string | null => {
    if (authorLinkedinUrl) return authorLinkedinUrl;
    try {
        const u = new URL(externalUrl);
        const h = u.hostname.replace('www.', '');
        if (h === 'medium.com') {
            const m = u.pathname.match(/^\/@([^/]+)/);
            if (m) return `https://medium.com/@${m[1]}`;
        }
        if (h.endsWith('.medium.com') && h !== 'medium.com') return `https://${h}`;
        if (h === 'dev.to') {
            const m = u.pathname.match(/^\/([^/]+)\//);
            if (m) return `https://dev.to/${m[1]}`;
        }
        if (h === 'github.com') {
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length >= 1) return `https://github.com/${parts[0]}`;
        }
        if (h === 'linkedin.com') {
            const inM = u.pathname.match(/\/in\/([^/]+)/);
            if (inM) return `https://www.linkedin.com/in/${inM[1]}/`;
            const postM = u.pathname.match(/\/posts\/([^_/]+)/);
            if (postM) return `https://www.linkedin.com/in/${postM[1]}/`;
        }
        if (h.endsWith('.substack.com') && h !== 'substack.com') return `https://${h}`;
        if (h.endsWith('.hashnode.dev') && h !== 'hashnode.dev') return `https://${h}`;
    } catch { /* ignore */ }
    return null;
};

export const PaperCard = ({ title, description, external_url, source, author_name, author_linkedin_url, author_badge, article_author_handle, is_own_article, created_at, onClick }: PaperCardProps) => {
    // For both own and shared articles: use stored profile URL first, then derive from article URL
    const profileUrl = getAuthorProfileUrl(external_url, author_linkedin_url);
    const [previewImg, setPreviewImg] = useState<string | null>(null);

    useEffect(() => {
        const safeUrl = sanitizeUrl(external_url);
        if (safeUrl === '#') return;
        let cancelled = false;
        fetch(`https://api.microlink.io?url=${encodeURIComponent(safeUrl)}`)
            .then(r => {
                if (!r.ok) return null;
                return r.json();
            })
            .then(data => {
                if (cancelled || !data) return;
                const img: string | undefined = data?.data?.image?.url ?? data?.data?.screenshot?.url ?? data?.data?.logo?.url;
                if (img) setPreviewImg(img);
            })
            .catch(() => { /* fall back to gradient */ });
        return () => { cancelled = true; };
    }, [external_url]);

    return (
        <article className={styles.card} onClick={onClick}>
            {/* Thumbnail — OG preview image when available, gradient fallback */}
            <div className={styles.thumbnailWrapper}>
                {/* OG preview image */}
                {previewImg && (
                    <img
                        src={previewImg}
                        alt=""
                        className={styles.previewImg}
                        aria-hidden="true"
                    />
                )}
                {/* Dark overlay — stronger when preview image present */}
                <div className={previewImg ? styles.overlayDark : styles.overlayGradient} />
                {/* Title text */}
                <div className={styles.thumbContent}>
                    <span className={styles.thumbTitle}>{title}</span>
                </div>
                {/* Platform logo badge — clickable, opens article */}
                {source && (
                    <a
                        href={sanitizeUrl(external_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className={styles.platformBadge}
                        style={{ background: getPlatformBg(source) }}
                        aria-label={`Open on ${source}`}
                        title={`Open on ${source}`}
                    >
                        <PlatformLogo source={source} size={18} />
                    </a>
                )}
                <div className={styles.thumbnailOverlay}>
                    <button className={styles.overlayBtn} onClick={onClick}>
                        <ExternalLink size={15} />
                        Open Article
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className={styles.body}>
                {/* Meta row */}
                <div className={styles.meta}>
                    <span className={styles.typeBadge}>Research</span>
                    <span className={styles.dateBadge}>{formatDate(created_at)}</span>
                </div>

                {/* Description */}
                {description && (
                    <p className={styles.description}>{description}</p>
                )}

                {/* Author row — name is a link to their profile when available */}
                <div className={styles.author}>
                    <div className={styles.avatar}>
                        <User size={13} color="#fff" />
                    </div>
                    {is_own_article ? (
                        profileUrl ? (
                            <a
                                href={profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className={styles.authorLink}
                            >
                                {article_author_handle ?? author_name}
                                <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#a78bfa', fontWeight: 600 }}>
                                    <PenLine size={9} /> Author
                                </span>
                            </a>
                        ) : (
                            <span className={styles.authorName}>
                                {article_author_handle ?? author_name}
                                <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#a78bfa', fontWeight: 600 }}>
                                    <PenLine size={9} /> Author
                                </span>
                            </span>
                        )
                    ) : profileUrl ? (
                        <a
                            href={profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className={styles.authorLink}
                        >
                            {author_name}
                            <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                <Share2 size={9} /> Shared
                            </span>
                        </a>
                    ) : (
                        <span className={styles.authorName}>
                            {author_name}
                            <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                <Share2 size={9} /> Shared
                            </span>
                        </span>
                    )}
                    {author_badge && (
                        <span
                            title={`${author_badge.label} — ${author_badge.description}`}
                            style={{
                                fontSize: '10px', fontWeight: 700,
                                color: author_badge.textColor,
                                background: author_badge.color,
                                border: `1px solid ${author_badge.borderColor}`,
                                borderRadius: 'var(--radius-full)',
                                padding: '1px 7px',
                                whiteSpace: 'nowrap',
                                marginLeft: 'auto',
                                flexShrink: 0,
                            }}
                        >
                            {author_badge.emoji} {author_badge.label}
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
};
