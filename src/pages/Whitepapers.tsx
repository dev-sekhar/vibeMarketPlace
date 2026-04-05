import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVibeAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import styles from './Submit.module.css';

interface FormData {
    title: string;
    description: string;
    content: string;
    contentType: 'markdown' | 'html';
    appId: string;
}

const EMPTY_FORM: FormData = {
    title: '',
    description: '',
    content: '',
    contentType: 'markdown',
    appId: '',
};

export const Whitepapers = () => {
    const { t } = useTranslation();
    const { user } = useVibeAuth();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [publishingStage, setPublishingStage] = useState('');
    const [publishingPercent, setPublishingPercent] = useState(0);

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
            content_type: form.contentType,
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
            // Optionally refetch whitepapers
        }

        window.clearInterval(progressTimer);
        setLoading(false);
    };

    // Guard: require login
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
            <div className={styles.inner}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                    <div>
                        <h1 className={styles.title}>
                            {t('whitepaper.page.title')}
                        </h1>
                        <p className={styles.subtitle}>
                            {t('whitepaper.page.subtitle')}
                        </p>
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
                                fontSize: 'var(--text-sm)',
                            }}
                        >
                            <Plus size={18} />
                            {t('whitepaper.button.publish')}
                        </button>
                    )}
                </div>

                {showForm && (
                    <div className={`glass-panel ${styles.card}`} style={{ marginBottom: 'var(--space-8)' }}>
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
                                    {t('whitepaper.field.description')} *
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
                                <textarea
                                    className={`${styles.input} ${styles.textarea}`}
                                    placeholder={t('whitepaper.placeholder.content')}
                                    value={form.content}
                                    onChange={e => set('content', e.target.value)}
                                    rows={10}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                                    {t('whitepaper.field.format')}
                                </label>
                                <select
                                    className={styles.input}
                                    value={form.contentType}
                                    onChange={e => set('contentType', e.target.value as 'markdown' | 'html')}
                                >
                                    <option value="markdown">Markdown</option>
                                    <option value="html">HTML</option>
                                </select>
                            </div>

                            {error && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)' }}>
                                    {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null); setPublishingStage(''); setPublishingPercent(0); }}
                                    style={{
                                        padding: 'var(--space-2) var(--space-4)',
                                        borderRadius: 'var(--radius-full)',
                                        border: '1px solid var(--border-strong)',
                                        background: 'var(--bg-surface-elevated)',
                                        color: 'var(--text-primary)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t('whitepaper.button.cancel')}
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    style={{
                                        padding: 'var(--space-2) var(--space-4)',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'var(--gradient-neon)',
                                        color: '#fff',
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                        opacity: loading ? 0.7 : 1,
                                    }}
                                >
                                    {loading ? t('whitepaper.button.publishing') : t('whitepaper.button.publish')}
                                </button>
                            </div>

                            {loading && (
                                <div style={{ marginTop: 'var(--space-5)' }}>
                                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                                        {t('whitepaper.progress.note')}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>
                                            {publishingStage}
                                        </span>
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                                            {publishingPercent}%
                                        </span>
                                    </div>
                                    <div style={{ height: '10px', width: '100%', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                        <div style={{ width: `${publishingPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', transition: 'width 0.25s ease' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!showForm && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-secondary)' }}>
                        <FileText size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.5 }} />
                        <p>{t('whitepaper.empty')}</p>
                        <button
                            onClick={() => setShowForm(true)}
                            style={{
                                marginTop: 'var(--space-4)',
                                padding: 'var(--space-2) var(--space-4)',
                                background: 'var(--gradient-neon)',
                                color: '#fff',
                                borderRadius: 'var(--radius-full)',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {t('whitepaper.button.publishFirst')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
