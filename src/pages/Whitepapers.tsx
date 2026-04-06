import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVibeAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { PaperCard } from '../components/PaperCard/PaperCard';
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
}

interface FormData {
    title: string;
    description: string;
    url: string;
    source: string;
}

const SOURCES = ['Medium', 'LinkedIn', 'Dev.to', 'Substack', 'Hashnode', 'GitHub', 'Other'];

const EMPTY_FORM: FormData = { title: '', description: '', url: '', source: 'Medium' };

const isValidUrl = (s: string) => { try { return Boolean(new URL(s)); } catch { return false; } };

export const Whitepapers = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useVibeAuth();
    const [whitepapers, setWhitepapers] = useState<Whitepaper[]>([]);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWhitepapers = async () => {
        setFetchLoading(true);
        const { data } = await supabase
            .from('whitepapers')
            .select('id, created_at, title, description, external_url, source, author_name, author_id')
            .order('created_at', { ascending: false });
        setWhitepapers(data ?? []);
        setFetchLoading(false);
    };

    useEffect(() => { fetchWhitepapers(); }, []);

    const set = (field: keyof FormData, value: string) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        if (!user) return;
        if (!form.title.trim()) { setError('Title is required.'); return; }
        if (!form.url.trim() || !isValidUrl(form.url.trim())) {
            setError('A valid URL is required.');
            return;
        }
        setLoading(true);
        setError(null);

        const { error: insertError } = await supabase.from('whitepapers').insert({
            title: form.title.trim(),
            description: form.description.trim(),
            external_url: form.url.trim(),
            source: form.source || 'Other',
            author_id: user.id,
            author_name: user.user_metadata?.full_name ?? user.email ?? 'Anonymous',
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
                            Submit a Link
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
                                        onChange={e => set('url', e.target.value)}
                                    />
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
                                created_at={wp.created_at}
                                onClick={() => window.open(wp.external_url, '_blank', 'noopener,noreferrer')}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

