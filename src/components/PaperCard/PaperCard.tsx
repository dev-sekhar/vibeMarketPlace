import { BookOpen, ExternalLink, User, PenLine, Share2 } from 'lucide-react';
import styles from './PaperCard.module.css';

interface PaperCardProps {
    id: string;
    title: string;
    description: string;
    external_url: string;
    source: string;
    author_name: string;
    article_author_handle?: string | null;
    is_own_article?: boolean;
    created_at: string;
    onClick: () => void;
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const PaperCard = ({ title, description, source, author_name, article_author_handle, is_own_article, created_at, onClick }: PaperCardProps) => {
    return (
        <article className={styles.card} onClick={onClick}>
            {/* Thumbnail */}
            <div className={styles.thumbnailWrapper}>
                <BookOpen size={72} className={styles.thumbIcon} color="rgba(168,85,247,0.9)" />
                <div className={styles.thumbInitials}>
                    <span className={styles.thumbTitle}>{title}</span>
                </div>
                {source && (
                    <div className={styles.readingBadge}>
                        {source}
                    </div>
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

                {/* Title */}
                <h3 className={styles.title}>{title}</h3>

                {/* Description */}
                {description && (
                    <p className={styles.description}>{description}</p>
                )}

                {/* Author row */}
                <div className={styles.author}>
                    <div className={styles.avatar}>
                        <User size={13} color="#fff" />
                    </div>
                    {is_own_article && article_author_handle ? (
                        <span className={styles.authorName}>
                            {article_author_handle}
                            <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#a78bfa', fontWeight: 600 }}>
                                <PenLine size={9} /> Author
                            </span>
                        </span>
                    ) : (
                        <span className={styles.authorName}>
                            {author_name}
                            <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                <Share2 size={9} /> Shared
                            </span>
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
};
