import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, LogIn, ArrowLeft, Clock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVibeAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { RichTextEditor } from '../components/RichTextEditor/RichTextEditor';
import styles from './Submit.module.css';

interface Whitepaper {
    id: string;
    created_at: string;
    title: string;
    description: string;
    content: string;
    content_type: string;
    author_name: string;
    author_id: string;
}

interface FormData {
    title: string;
    description: string;
    content: string;
    appId: string;
}

const EMPTY_FORM: FormData = {
    title: '',
    description: '',
    content: '',
    appId: '',
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const readingMinutes = (html: string) => {
    const text = html.replace(/<[^>]+>/g, '');
    return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
};

export const Whitepapers = () => {
    const { t } = useTranslation();
    const { user } = useVibeAuth();
    const [whitepapers, setWhitepapers] = useState<Whitepaper[]>([]);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [selected, setSelected] = useState<Whitepaper | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [publishingStage, setPublishingStage] = useState('');
    const [publishingPercent, setPublishingPercent] = useState(0);

    const fetchWhitepapers = async () => {
        setFetchLoading(true);
        const { data } = await supabase
            .from('whitepapers')
            .select('id, created_at, title, description, content, content_type, author_name, author_id')
            .order('created_at', { ascending: false });
        setWhitepapers(data ?? []);
        setFetchLoading(false);
    };

    useEffect(() => { fetchWhitepapers(); }, []);

    const set = (field: keyof FormData, value: string) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        if (!user) return;
        if (!form.title.trim() || !form.content.trim()) {
            setError('Title and content are required.');
            return;
        }

        setLoading(true);
        setError(null);
        setPublishingStage(t('whitepaper.progress.preparing'));
        setPublishingPercent(10);

        const progressTimer = window.setInterval(() => {
            setPublishingPercent(prev => Math.min(prev + 5, 90));
        }, 250);

        setPublishingStage(t('whitepaper.progress.saving'));

        const { error: insertError } = await supabase.from('whitepapers').insert({
            title: form.title,
            description: form.description,
            content: form.content,
            content_type: 'html',
            author_id: user.id,
            author_name: user.user_metadata?.full_name ?? user.email ?? 'Anonymous',
            app_id: form.appId || null,
        });

        if (insertError) {
            setError(insertError.message);
            setPublishingStage('');
            setPublishingPercent(0);
        } else {
            setPublishingStage(t('whitepaper.progress.finalizing'));
            setPublishingPercent(95);
            await new Promise(resolve => setTimeout(resolve, 300));
            setPublishingPercent(100);
            setShowForm(false);
            setForm(EMPTY_FORM);
            fetchWhitepapers();
        }

        window.clearInterval(progressTimer);
        setLoading(false);
    };

    // ── Full reading view ──
    if (selected) {
        return (
            <div style={{ minHeight: 'calc(100vh - 80px)', padding: 'var(--space-10) var(--space-4) var(--space-16)' }}>
                <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                    <button
                        onClick={() => setSelected(null)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                            background: 'none', border: 'none', color: 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600,
                            marginBottom: 'var(--space-8)', padding: 0,
                        }}
                    >
                        <ArrowLeft size={16} /> Back to all articles
                    </button>

                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em',
                        marginBottom: 'var(--space-4)',
                    }}>
                        {selected.title}
                    </h1>

                    {selected.description && (
                        <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
                            {selected.description}
                        </p>
                    )}

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                        paddingBottom: 'var(--space-6)',
                        borderBottom: '1px solid var(--border-subtle)',
                        marginBottom: 'var(--space-8)',
                        flexWrap: 'wrap',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'var(--gradient-neon)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <User size={16} color="#fff" />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{selected.author_name}</span>
                        </div>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                            {formatDate(selected.created_at)}
                        </span>
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)',
                        }}>
                            <Clock size={13} />
                            {readingMinutes(selected.content)} min read
                        </span>
                    </div>

                    <article
                        className="whitepaper-article"
                        dangerouslySetInnerHTML={{ __html: selected.content }}
                        style={{
                            fontFamily: 'var(--font-primary)', fontSize: 'clamp(1rem, 1.5vw, 1.125rem)',
                            lineHeight: 1.8, color: 'var(--text-primary)',
                        }}
                    />
                </div>
            </div>
        );
    }

    // ── Login guard ──
    if (!user) {
        return (
            <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
                <div className="glass-panel animate-slide-up" style={{ maxWidth: '440px', width: '100%', padding: 'var(--space-10)', textAlign: 'center' }}>
                    <LogIn size={48} color="var(--accent-secondary)" style={{ marginBottom: 'var(--space-4)' }} />
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>
                        {t('whitepaper.requireLogin')}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
                        {t('whitepaper.requireLoginDesc')}
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/login" style={{ background: 'var(--gradient-neon)', color: '#fff', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', fontWeight: 700, boxShadow: 'var(--shadow-glow)' }}>
                            Sign In
                        </Link>
                        <Link to="/" style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                            Back Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 var(--space-4)' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-8)', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <div>
                        <h1 className={styles.title}>{t('whitepaper.page.title')}</h1>
                        <p className={styles.subtitle}>{t('whitepaper.page.subtitle')}</p>
                    </div>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
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
                            {t('whitepaper.button.publish')}
                        </button>
                    )}
                </div>

                {/* Write form */}
                {showForm && (
                    <div className={`glass-panel ${styles.card}`} style={{ marginBottom: 'var(--space-10)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
                                {t('whitepaper.form.title')}
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
                                    {t('whitepaper.field.title')} *
                                </label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder={t('whitepaper.placeholder.title')}
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
                                    {t('whitepaper.field.description')}
                                </label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder={t('whitepaper.placeholder.description')}
                                    value={form.description}
                                    onChange={e => set('description', e.target.value)}
                                    maxLength={500}
                                />
                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                                    {form.description.length}/500
                                </p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                                    {t('whitepaper.field.content')} *
                                </label>
                                <RichTextEditor
                                    content={form.content}
                                    onChange={html => set('content', html)}
                                    placeholder="Tell your story… Add text, images, and videos."
                                />
                            </div>

                            {error && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)' }}>
                                    {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null); setPublishingStage(''); setPublishingPercent(0); }}
                                    style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-strong)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    {t('whitepaper.button.cancel')}
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-full)', background: 'var(--gradient-neon)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                                >
                                    {loading ? t('whitepaper.button.publishing') : t('whitepaper.button.publish')}
                                </button>
                            </div>

                            {loading && (
                                <div style={{ marginTop: 'var(--space-5)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{publishingStage}</span>
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{publishingPercent}%</span>
                                    </div>
                                    <div style={{ height: '10px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                        <div style={{ width: `${publishingPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', transition: 'width 0.25s ease' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Articles list */}
                {fetchLoading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-tertiary)' }}>
                        Loading articles…
                    </div>
                ) : whitepapers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-secondary)' }}>
                        <FileText size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.4 }} />
                        <p>{t('whitepaper.empty')}</p>
                        {!showForm && (
                            <button
                                onClick={() => setShowForm(true)}
                                style={{ marginTop: 'var(--space-4)', padding: 'var(--space-2) var(--space-6)', background: 'var(--gradient-neon)', color: '#fff', borderRadius: 'var(--radius-full)', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                            >
                                {t('whitepaper.button.publishFirst')}
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        {whitepapers.map(wp => (
                            <article
                                key={wp.id}
                                onClick={() => setSelected(wp)}
                                style={{
                                    padding: 'var(--space-6) 0',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    cursor: 'pointer',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto',
                                    gap: 'var(--space-4)',
                                    alignItems: 'start',
                                    transition: 'opacity var(--transition-fast)',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                            >
                                <div>
                                    {/* Author + date */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--gradient-neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <User size={12} color="#fff" />
                                        </div>
                                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>{wp.author_name}</span>
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>·</span>
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{formatDate(wp.created_at)}</span>
                                    </div>

                                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.05rem, 2vw, 1.3rem)', fontWeight: 700, lineHeight: 1.3, marginBottom: 'var(--space-2)', letterSpacing: '-0.01em' }}>
                                        {wp.title}
                                    </h2>

                                    {wp.description && (
                                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-3)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {wp.description}
                                        </p>
                                    )}

                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                                        <Clock size={11} />
                                        {readingMinutes(wp.content)} min read
                                    </span>
                                </div>

                                <FileText size={40} style={{ opacity: 0.15, marginTop: 4, flexShrink: 0 }} />
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

