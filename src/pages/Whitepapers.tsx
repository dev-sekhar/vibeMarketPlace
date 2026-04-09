import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Link2, CheckCircle2, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVibeAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { PaperCard } from '../components/PaperCard/PaperCard';
import { getBadge, type Badge } from '../lib/badge';
import { sanitizeUrl } from '../lib/utils';
import socialLinksConfig from '../../config/socialLinks.json';
import styles from './Submit.module.css';

interface Whitepaper {
    id: string;
    created_at: string;
    title: string;
    description: string;
    external_url: string;
    source: string;
    author_name: string;
    author_id: string;
    author_linkedin_url: string | null;
    is_own_article: boolean;
    article_author_handle: string | null;
}

interface FormData {
    title: string;
    description: string;
    url: string;
    source: string;
    isOwnArticle: boolean;
}

const SOURCES = ['Medium', 'LinkedIn', 'Dev.to', 'Substack', 'Hashnode', 'GitHub', 'Other'];

const EMPTY_FORM: FormData = { title: '', description: '', url: '', source: 'Medium', isOwnArticle: false };

const isValidUrl = (s: string) => {
    try {
        const { protocol } = new URL(s);
        return protocol === 'http:' || protocol === 'https:';
    } catch { return false; }
};

/** Detect the publishing platform from a URL. */
const detectPlatform = (url: string): string => {
    try {
        const h = new URL(url).hostname.replace('www.', '');
        if (h === 'medium.com' || h.endsWith('.medium.com')) return 'Medium';
        if (h === 'linkedin.com') return 'LinkedIn';
        if (h === 'dev.to') return 'Dev.to';
        if (h === 'substack.com' || h.endsWith('.substack.com')) return 'Substack';
        if (h === 'hashnode.com' || h.endsWith('.hashnode.dev')) return 'Hashnode';
        if (h === 'github.com') return 'GitHub';
    } catch { /* ignore */ }
    return 'Other';
};

/**
 * Best-effort extraction of the article author handle from the URL.
 * Returns a human-readable string like "@username on Medium" or null if not determinable.
 * Note: full OAuth verification is not possible client-side (Medium API deprecated,
 * LinkedIn OAuth requires a server-side token exchange). This is a self-declaration flow.
 */
const extractAuthorHandle = (url: string): string | null => {
    try {
        const u = new URL(url);
        const h = u.hostname.replace('www.', '');
        // Medium: medium.com/@username/... or username.medium.com/...
        if (h === 'medium.com') {
            const m = u.pathname.match(/^\/@([^/]+)/);
            if (m) return `@${m[1]}`;
        }
        if (h.endsWith('.medium.com') && h !== 'medium.com') {
            return `@${h.replace('.medium.com', '')}`;
        }
        // Dev.to: dev.to/username/slug
        if (h === 'dev.to') {
            const m = u.pathname.match(/^\/([^/]+)\//);
            if (m) return `@${m[1]}`;
        }
        // Substack: username.substack.com
        if (h.endsWith('.substack.com') && h !== 'substack.com') {
            return h.replace('.substack.com', '');
        }
        // Hashnode: username.hashnode.dev
        if (h.endsWith('.hashnode.dev') && h !== 'hashnode.dev') {
            return `@${h.replace('.hashnode.dev', '')}`;
        }
        // LinkedIn: /in/username/ profile pattern OR /posts/username_... post pattern
        if (h === 'linkedin.com') {
            const inMatch = u.pathname.match(/\/in\/([^/]+)/);
            if (inMatch) return inMatch[1];
            const postMatch = u.pathname.match(/\/posts\/([^_/]+)/);
            if (postMatch) return postMatch[1];
        }
    } catch { /* ignore */ }
    return null;
};

/** Maps detectPlatform() return values to socialLinks.json ids */
const PLATFORM_TO_SOCIAL_ID: Record<string, string> = {
    'Medium': 'medium',
    'LinkedIn': 'linkedin',
    'Dev.to': 'devto',
    'Hashnode': 'hashnode',
    'GitHub': 'github',
};

const enabledSocialIds = new Set(
    (socialLinksConfig as { id: string; enabled: boolean }[])
        .filter(s => s.enabled)
        .map(s => s.id)
);

export const Whitepapers = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useVibeAuth();
    const [whitepapers, setWhitepapers] = useState<Whitepaper[]>([]);
    const [authorBadges, setAuthorBadges] = useState<Record<string, Badge | null>>({});
    const [fetchLoading, setFetchLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWhitepapers = async () => {
        setFetchLoading(true);
        const { data } = await supabase
            .from('whitepapers')
            .select('id, created_at, title, description, external_url, source, author_name, author_id, author_linkedin_url, is_own_article, article_author_handle')
            .order('created_at', { ascending: false });
        const items: Whitepaper[] = data ?? [];
        setWhitepapers(items);

        // Compute badges per author (apps submitted + papers submitted)
        const authorIds = [...new Set(items.map(w => w.author_id))];
        if (authorIds.length > 0) {
            const { data: authorApps } = await supabase
                .from('apps')
                .select('author_id')
                .in('author_id', authorIds);
            const appCounts: Record<string, number> = {};
            (authorApps ?? []).forEach((a: { author_id: string }) => {
                appCounts[a.author_id] = (appCounts[a.author_id] ?? 0) + 1;
            });
            const paperCounts: Record<string, number> = {};
            items.forEach(w => {
                paperCounts[w.author_id] = (paperCounts[w.author_id] ?? 0) + 1;
            });
            const badges: Record<string, Badge | null> = {};
            authorIds.forEach(id => {
                badges[id] = getBadge((appCounts[id] ?? 0) + (paperCounts[id] ?? 0));
            });
            setAuthorBadges(badges);
        }

        setFetchLoading(false);
    };

    useEffect(() => { fetchWhitepapers(); }, []);

    // Auto-detect platform and author handle when URL changes
    const handleUrlChange = (url: string) => {
        const platform = detectPlatform(url);
        setForm(prev => ({
            ...prev,
            url,
            source: platform !== 'Other' ? platform : prev.source,
        }));
    };

    const set = (field: keyof FormData, value: string | boolean) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        if (!user) return;
        if (!form.title.trim()) { setError('Title is required.'); return; }
        if (!form.url.trim() || !isValidUrl(form.url.trim())) {
            setError('A valid URL is required.');
            return;
        }

        // ── Validation 1: profile link required for known platforms ──────────
        const platform = detectPlatform(form.url.trim());
        const socialId = PLATFORM_TO_SOCIAL_ID[platform];
        if (socialId && enabledSocialIds.has(socialId)) {
            const profileUrl = user.user_metadata?.[`social_${socialId}`] as string | undefined;
            if (!profileUrl) {
                setError(t('whitepaper.error.profileRequired', { platform }));
                return;
            }
        }

        // ── Validation 2: 24-hour cooldown after social link update ──────────
        const socialUpdatedAt = user.user_metadata?.social_links_updated_at as string | undefined;
        if (socialUpdatedAt) {
            const hoursElapsed = (Date.now() - new Date(socialUpdatedAt).getTime()) / (1000 * 60 * 60);
            if (hoursElapsed < 24) {
                const hoursLeft = Math.ceil(24 - hoursElapsed);
                setError(t('whitepaper.error.cooldown', { hours: hoursLeft }));
                return;
            }
        }

        // ── Validation 3: when claiming authorship, article handle must match profile ──
        if (form.isOwnArticle && socialId) {
            const profileUrl = user.user_metadata?.[`social_${socialId}`] as string | undefined;
            if (profileUrl) {
                const profileHandle = extractAuthorHandle(profileUrl);
                const articleHandle = extractAuthorHandle(form.url.trim());
                if (
                    profileHandle && articleHandle &&
                    profileHandle.replace('@', '').toLowerCase() !== articleHandle.replace('@', '').toLowerCase()
                ) {
                    setError(t('whitepaper.error.authorMismatch', { platform, articleHandle, profileHandle }));
                    return;
                }
            }
        }

        setLoading(true);
        setError(null);

        // Derive the stored handle from the article URL automatically
        const storedHandle = extractAuthorHandle(form.url.trim());

        const { error: insertError } = await supabase.from('whitepapers').insert({
            title: form.title.trim(),
            description: form.description.trim(),
            external_url: form.url.trim(),
            source: form.source || 'Other',
            author_id: user.id,
            author_name: user.user_metadata?.full_name ?? user.email ?? 'Anonymous',
            author_linkedin_url: socialId
                ? (user.user_metadata?.[`social_${socialId}`] as string | undefined) ?? null
                : (user.user_metadata?.social_linkedin as string | undefined) ?? null,
            is_own_article: form.isOwnArticle,
            article_author_handle: form.isOwnArticle ? storedHandle : null,
        });

        if (insertError) {
            setError(insertError.message);
        } else {
            setShowForm(false);
            setForm(EMPTY_FORM);
            fetchWhitepapers();
        }
        setLoading(false);
    };

    // Derived: author handle detected from article URL
    const detectedHandle = form.url ? extractAuthorHandle(form.url) : null;

    // Derived: profile handle for the detected platform
    const detectedPlatform = form.url ? detectPlatform(form.url) : null;
    const detectedSocialId = detectedPlatform ? PLATFORM_TO_SOCIAL_ID[detectedPlatform] : undefined;
    const profileHandleForPlatform = detectedSocialId
        ? extractAuthorHandle((user?.user_metadata?.[`social_${detectedSocialId}`] as string | undefined) ?? '')
        : null;
    const handleMatches = detectedHandle && profileHandleForPlatform
        ? detectedHandle.replace('@', '').toLowerCase() === profileHandleForPlatform.replace('@', '').toLowerCase()
        : null; // null = can't determine

    return (
        <div className={styles.page}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 var(--space-4)' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-8)', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <div>
                        <h1 className={styles.title}>{t('whitepaper.page.title')}</h1>
                        <p className={styles.subtitle}>{t('whitepaper.page.subtitle')}</p>
                    </div>
                    {!showForm && (
                        <button
                            onClick={() => {
                                if (!user) { navigate('/login'); return; }
                                setShowForm(true);
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                                background: 'var(--gradient-neon)', color: '#fff',
                                padding: 'var(--space-3) var(--space-6)',
                                borderRadius: 'var(--radius-full)', fontWeight: 700,
                                boxShadow: 'var(--shadow-glow)', border: 'none', cursor: 'pointer',
                                fontSize: 'var(--text-sm)', flexShrink: 0,
                            }}
                        >
                            <Plus size={18} />
                            {t('whitepaper.button.submitLink')}
                        </button>
                    )}
                </div>

                {/* Submit link form */}
                {showForm && (
                    <div className={`glass-panel ${styles.card}`} style={{ marginBottom: 'var(--space-10)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <Link2 size={22} color="var(--accent-secondary)" />
                                Submit an Article Link
                            </h2>
                            <button
                                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-lg)' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Article title"
                                    value={form.title}
                                    onChange={e => set('title', e.target.value)}
                                    maxLength={200}
                                />
                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                                    {form.title.length}/200
                                </p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                                    Short description
                                </label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="One line about what this article covers"
                                    value={form.description}
                                    onChange={e => set('description', e.target.value)}
                                    maxLength={300}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-4)', alignItems: 'start' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                                        External URL *
                                    </label>
                                    <input
                                        type="url"
                                        className={styles.input}
                                        placeholder="https://medium.com/..."
                                        value={form.url}
                                        onChange={e => handleUrlChange(e.target.value)}
                                    />
                                    {/* Author handle detected from URL */}
                                    {detectedHandle && (
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(168,85,247,0.9)', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <CheckCircle2 size={11} /> Detected author: <strong>{detectedHandle}</strong> on {form.source}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                                        Platform
                                    </label>
                                    <select
                                        className={styles.input}
                                        value={form.source}
                                        onChange={e => set('source', e.target.value)}
                                    >
                                        {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Authorship declaration */}
                            <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                                    Are you the author of this article?
                                </p>
                                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => set('isOwnArticle', true)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: 'var(--space-2) var(--space-4)',
                                            borderRadius: 'var(--radius-full)',
                                            border: `1px solid ${form.isOwnArticle ? 'rgba(168,85,247,0.6)' : 'var(--border-subtle)'}`,
                                            background: form.isOwnArticle ? 'rgba(168,85,247,0.15)' : 'var(--bg-surface-elevated)',
                                            color: form.isOwnArticle ? '#c084fc' : 'var(--text-secondary)',
                                            fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer',
                                        }}
                                    >
                                        <CheckCircle2 size={14} /> Yes, I wrote this
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => set('isOwnArticle', false)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: 'var(--space-2) var(--space-4)',
                                            borderRadius: 'var(--radius-full)',
                                            border: `1px solid ${!form.isOwnArticle ? 'rgba(168,85,247,0.6)' : 'var(--border-subtle)'}`,
                                            background: !form.isOwnArticle ? 'rgba(168,85,247,0.15)' : 'var(--bg-surface-elevated)',
                                            color: !form.isOwnArticle ? '#c084fc' : 'var(--text-secondary)',
                                            fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer',
                                        }}
                                    >
                                        <Share2 size={14} /> No, I'm sharing it
                                    </button>
                                </div>

                                {/* Auto-match feedback — shown when a known platform is detected */}
                                {form.isOwnArticle && detectedHandle && (
                                    <div style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {handleMatches === true && (
                                            <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <CheckCircle2 size={13} />
                                                Article by <strong>{detectedHandle}</strong> — matches your {detectedPlatform} profile. ✓
                                            </span>
                                        )}
                                        {handleMatches === false && (
                                            <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                ⚠ Article author ({detectedHandle}) doesn't match your {detectedPlatform} profile ({profileHandleForPlatform}). You cannot claim authorship.
                                            </span>
                                        )}
                                        {handleMatches === null && (
                                            <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <CheckCircle2 size={13} /> Detected author: <strong>{detectedHandle}</strong> on {form.source}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)' }}>
                                    {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null); }}
                                    style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-strong)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    {t('whitepaper.button.cancel')}
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-full)', background: 'var(--gradient-neon)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                                >
                                    {loading ? 'Submitting…' : 'Submit Link'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Articles grid */}
                {fetchLoading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-tertiary)' }}>
                        Loading articles…
                    </div>
                ) : whitepapers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-secondary)' }}>
                        <FileText size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.4 }} />
                        <p>{t('whitepaper.empty')}</p>
                    </div>
                ) : (
                    <div className="papers-grid">
                        {whitepapers.map(wp => (
                            <PaperCard
                                key={wp.id}
                                id={wp.id}
                                title={wp.title}
                                description={wp.description}
                                external_url={wp.external_url}
                                source={wp.source}
                                author_name={wp.author_name}
                                author_linkedin_url={wp.author_linkedin_url}
                                author_badge={authorBadges[wp.author_id] ?? null}
                                article_author_handle={wp.article_author_handle}
                                is_own_article={wp.is_own_article}
                                created_at={wp.created_at}
                                onClick={() => window.open(sanitizeUrl(wp.external_url), '_blank', 'noopener,noreferrer')}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

