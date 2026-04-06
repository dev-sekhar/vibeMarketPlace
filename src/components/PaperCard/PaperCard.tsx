import { BookOpen, ExternalLink, User } from 'lucide-react';
import styles from './PaperCard.module.css';

interface PaperCardProps {
    id: string;
    title: string;
    description: string;
    external_url: string;
    source: string;
    author_name: string;
    created_at: string;
    onClick: () => void;
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const PaperCard = ({ title, description, source, author_name, created_at, onClick }: PaperCardProps) => {
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

                {/* Author */}
                <div className={styles.author}>
                    <div className={styles.avatar}>
                        <User size={13} color="#fff" />
                    </div>
                    <span className={styles.authorName}>{author_name}</span>
                </div>
            </div>
        </article>
    );
};
