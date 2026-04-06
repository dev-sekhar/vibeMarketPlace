import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Search, X, Eye } from 'lucide-react';
import { TEMPLATES, TEMPLATE_CATEGORIES, type DevTemplate } from '../lib/templates';
import { Button } from '../components/ui/Button';

// ── Colour mapping per category ──────────────────────────────────────────────
const CATEGORY_COLORS: Record<DevTemplate['category'], string> = {
    readme: '#38bdf8',
    gitignore: '#a78bfa',
    license: '#fb923c',
    contributing: '#34d399',
    env: '#fbbf24',
    structure: '#f472b6',
};

const CATEGORY_ICONS: Record<DevTemplate['category'], string> = {
    readme: '📄',
    gitignore: '🚫',
    license: '⚖️',
    contributing: '🤝',
    env: '🔑',
    structure: '🗂️',
};

// ── Download helper ───────────────────────────────────────────────────────────
function downloadTemplate(template: DevTemplate) {
    const blob = new Blob([template.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({
    template,
    onClose,
}: {
    template: DevTemplate;
    onClose: () => void;
}) {
    const color = CATEGORY_COLORS[template.category];
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${template.name}`}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 200,
                background: 'rgba(0,0,0,0.72)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                padding: 'var(--space-8) var(--space-4)',
                overflowY: 'auto',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid ${color}44`,
                    borderRadius: 'var(--radius-2xl)',
                    width: '100%', maxWidth: '760px',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: `0 0 40px ${color}22`,
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 'var(--space-5) var(--space-6)',
                    borderBottom: '1px solid var(--border-subtle)',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span style={{ fontSize: '1.4rem' }}>{CATEGORY_ICONS[template.category]}</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                                {template.name}
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                {template.filename}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => downloadTemplate(template)}
                            style={{ background: color, boxShadow: `0 0 20px ${color}66` }}
                        >
                            <Download size={14} />
                            Download
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            iconOnly
                            onClick={onClose}
                            aria-label="Close preview"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                </div>
                {/* Code content */}
                <pre style={{
                    margin: 0,
                    padding: 'var(--space-6)',
                    fontFamily: "'Fira Code', 'Cascadia Code', 'Courier New', monospace",
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.7,
                    color: 'var(--text-secondary)',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                }}>
                    {template.content}
                </pre>
            </div>
        </div>
    );
}

// ── Template card ─────────────────────────────────────────────────────────────
function TemplateCard({
    template,
    onPreview,
}: {
    template: DevTemplate;
    onPreview: (t: DevTemplate) => void;
}) {
    const color = CATEGORY_COLORS[template.category];
    return (
        <div
            className="glass-panel"
            style={{
                padding: 'var(--space-5)',
                display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
                border: `1px solid var(--border-subtle)`,
                borderTop: `2px solid ${color}`,
                transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${color}88`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${color}18`;
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)';
                (e.currentTarget as HTMLDivElement).style.borderTopColor = color;
                (e.currentTarget as HTMLDivElement).style.boxShadow = '';
            }}
        >
            {/* Icon + filename */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{
                    width: '42px', height: '42px', borderRadius: 'var(--radius-lg)',
                    background: `${color}18`, border: `1px solid ${color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem', flexShrink: 0,
                }}>
                    {CATEGORY_ICONS[template.category]}
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                        {template.name}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: color, fontFamily: 'monospace', fontWeight: 600 }}>
                        {template.filename}
                    </div>
                </div>
            </div>

            {/* Description */}
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                {template.description}
            </p>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                {template.tags.map(tag => (
                    <span key={tag} style={{
                        fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-full)',
                        padding: '1px 8px',
                    }}>
                        #{tag}
                    </span>
                ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => downloadTemplate(template)}
                    style={{ background: color, flex: 1, boxShadow: `0 0 20px ${color}66` }}
                >
                    <Download size={14} />
                    Download
                </Button>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onPreview(template)}
                    style={{ background: color, color: '#fff', boxShadow: 'none' }}
                >
                    <Eye size={14} />
                    Preview
                </Button>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function Templates() {
    const { t } = useTranslation();
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [query, setQuery] = useState('');
    const [preview, setPreview] = useState<DevTemplate | null>(null);

    const filtered = TEMPLATES.filter(tpl => {
        const matchesCategory = activeCategory === 'all' || tpl.category === activeCategory;
        const q = query.toLowerCase();
        const matchesQuery = !q || (
            tpl.name.toLowerCase().includes(q) ||
            tpl.description.toLowerCase().includes(q) ||
            tpl.filename.toLowerCase().includes(q) ||
            tpl.tags.some(tag => tag.includes(q))
        );
        return matchesCategory && matchesQuery;
    });

    return (
        <div className="container animate-fade-in" style={{ padding: 'var(--space-8) var(--space-4) var(--space-16)' }}>
            {/* ── Header ── */}
            <div style={{ marginBottom: 'var(--space-8)', maxWidth: '680px' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                    fontSize: 'var(--text-xs)', fontWeight: 700,
                    color: 'var(--accent-secondary)', background: 'rgba(34,211,238,0.1)',
                    border: '1px solid rgba(34,211,238,0.3)',
                    borderRadius: 'var(--radius-full)', padding: '2px 12px',
                    marginBottom: 'var(--space-4)',
                }}>
                    <FileText size={12} />
                    {t('templates.eyebrow')}
                </div>
                <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginBottom: 'var(--space-3)', lineHeight: 1.15 }}>
                    {t('templates.title')}
                </h1>
                <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {t('templates.subtitle')}
                </p>
            </div>

            {/* ── Search + Filters ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                {/* Search bar */}
                <div style={{ position: 'relative', maxWidth: '480px' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute', left: 'var(--space-3)', top: '50%',
                            transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none',
                        }}
                    />
                    <input
                        type="text"
                        placeholder={t('templates.search.placeholder')}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
                            borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)',
                            fontSize: 'var(--text-sm)', padding: 'var(--space-3) var(--space-3) var(--space-3) var(--space-8)',
                            outline: 'none',
                        }}
                        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent-base)'; }}
                        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-strong)'; }}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            aria-label="Clear search"
                            style={{
                                position: 'absolute', right: 'var(--space-3)', top: '50%',
                                transform: 'translateY(-50%)', background: 'none', border: 'none',
                                cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex',
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Category pills */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {TEMPLATE_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            style={{
                                padding: 'var(--space-2) var(--space-4)',
                                borderRadius: 'var(--radius-full)',
                                border: `1px solid ${activeCategory === cat.id ? 'var(--accent-base)' : 'var(--border-strong)'}`,
                                background: activeCategory === cat.id ? 'var(--accent-base)' : 'var(--bg-surface-elevated)',
                                color: activeCategory === cat.id ? '#fff' : 'var(--text-secondary)',
                                fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                            }}
                        >
                            {cat.id !== 'all' && <span style={{ marginRight: '4px' }}>{CATEGORY_ICONS[cat.id as DevTemplate['category']]}</span>}
                            {t(`templates.category.${cat.id}`, { defaultValue: cat.label })}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Results count ── */}
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
                {filtered.length} {filtered.length === 1 ? t('templates.result') : t('templates.results')}
                {query && <> {t('templates.forQuery')} "<strong style={{ color: 'var(--text-secondary)' }}>{query}</strong>"</>}
            </p>

            {/* ── Grid ── */}
            {filtered.length > 0 ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 'var(--space-4)',
                }}>
                    {filtered.map(tpl => (
                        <TemplateCard key={tpl.id} template={tpl} onPreview={setPreview} />
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-4)' }}>
                    <p style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>🗂️</p>
                    <h2 style={{ marginBottom: 'var(--space-2)' }}>{t('templates.empty.title')}</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>{t('templates.empty.body')}</p>
                </div>
            )}

            {/* ── Preview modal ── */}
            {preview && <PreviewModal template={preview} onClose={() => setPreview(null)} />}
        </div>
    );
}
