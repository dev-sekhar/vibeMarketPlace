import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Download, Eye, FileText, Search, Terminal, X } from 'lucide-react';
import { TEMPLATES, TEMPLATE_CATEGORIES } from '../lib/templates';
import { filterResources, resourceDownloadName, RESOURCE_KINDS } from '../lib/resourceTypes';
import type { DevResource, ResourceKind } from '../lib/resourceTypes';
import styles from './Templates.module.css';

const icons = { guides: BookOpen, instructions: Terminal, templates: FileText };

function downloadResource(resource: DevResource) {
    const url = URL.createObjectURL(new Blob([resource.content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = resourceDownloadName(resource);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

// A deliberately small renderer for our authored guide blocks, never raw HTML.
// File templates and agent instructions always remain literal source text.
function GuideContent({ content }: { content: string }) {
    return <div className={styles.guide}>{content.trim().split(/\n\s*\n/).map((block, index) => {
        const lines = block.split('\n');
        if (block.startsWith('# ')) return <h2 key={index}>{block.slice(2)}</h2>;
        if (block.startsWith('## ')) return <h3 key={index}>{block.slice(3)}</h3>;
        if (lines.every(line => line.startsWith('- '))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{line.slice(2)}</li>)}</ul>;
        if (lines.every(line => /^\d+\. /.test(line))) return <ol key={index}>{lines.map((line, i) => <li key={i}>{line.replace(/^\d+\. /, '')}</li>)}</ol>;
        if (lines[0].startsWith('|') && lines[1]?.includes('---')) {
            const cells = (line: string) => line.split('|').slice(1, -1).map(cell => cell.trim());
            return <div key={index} className={styles.tableScroll}><table><thead><tr>{cells(lines[0]).map((cell, i) => <th key={i}>{cell}</th>)}</tr></thead><tbody>{lines.slice(2).map((line, i) => <tr key={i}>{cells(line).map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
        }
        return <p key={index}>{block}</p>;
    })}</div>;
}

function ResourcePreview({ resource, onClose }: { resource: DevResource; onClose: () => void }) {
    const { t } = useTranslation();
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);
    return <dialog ref={dialog} className={styles.preview} aria-labelledby="resource-preview-title" onCancel={onClose}
        onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
        <div className={styles.previewInner}>
            <header className={styles.previewHeader}>
                <div><span className={styles.eyebrow}>{t(`resources.tabs.${resource.kind}`)}</span><h2 id="resource-preview-title">{resource.name}</h2></div>
                <button type="button" className={styles.iconButton} onClick={onClose} aria-label={t('resources.close')}><X size={20} /></button>
            </header>
            <p className={styles.note}>{resource.guidance}</p>
            <p className={styles.location}>{t(resource.kind === 'guides' ? 'resources.referenceFile' : 'resources.saveAs')} <code>{resource.filename}</code></p>
            <button type="button" className={styles.action} onClick={() => downloadResource(resource)}><Download size={16} /> {t('resources.download')}</button>
            {resource.kind === 'guides' ? <GuideContent content={resource.content} /> : <pre className={styles.source}>{resource.content}</pre>}
        </div>
    </dialog>;
}

function ResourceCard({ resource, onOpen }: { resource: DevResource; onOpen: (resource: DevResource) => void }) {
    const { t } = useTranslation();
    const Icon = icons[resource.kind];
    return <article className={styles.card}>
        <Icon className={styles.resourceIcon} size={24} aria-hidden="true" />
        <h3>{resource.name}</h3>
        <span className={styles.audience}>{t(`resources.audience.${resource.audience}`)}</span>
        <p>{resource.description}</p>
        <p className={styles.cardGuidance}>{resource.guidance}</p>
        {resource.kind !== 'guides' && <p className={styles.location}>{t('resources.saveAs')} <code>{resource.filename}</code></p>}
        <div className={styles.actions}>
            <button type="button" className={styles.action} onClick={() => onOpen(resource)}><Eye size={16} /> {t(resource.kind === 'guides' ? 'resources.read' : 'resources.preview')}</button>
            {resource.kind !== 'guides' && <button type="button" className={styles.secondaryAction} onClick={() => downloadResource(resource)}><Download size={16} /> {t('resources.download')}</button>}
        </div>
    </article>;
}

export function Templates() {
    const { t } = useTranslation();
    const [kind, setKind] = useState<ResourceKind>('guides');
    const [category, setCategory] = useState('all');
    const [query, setQuery] = useState('');
    const [preview, setPreview] = useState<DevResource | null>(null);
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    const filtered = filterResources(TEMPLATES, kind, category, query);
    const categories = TEMPLATE_CATEGORIES.filter(item => item.id === 'all' || TEMPLATES.some(resource => resource.kind === kind && resource.category === item.id));

    const selectKind = (next: ResourceKind) => {
        setKind(next);
        setCategory('all');
        setQuery('');
        setPreview(null);
    };
    const navigateTabs = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let next: number;
        switch (event.key) {
            case 'ArrowRight': next = (index + 1) % RESOURCE_KINDS.length; break;
            case 'ArrowLeft': next = (index + RESOURCE_KINDS.length - 1) % RESOURCE_KINDS.length; break;
            case 'Home': next = 0; break;
            case 'End': next = RESOURCE_KINDS.length - 1; break;
            default: return;
        }
        event.preventDefault();
        selectKind(RESOURCE_KINDS[next]);
        tabs.current[next]?.focus();
    };

    return <div className={`container ${styles.page}`}>
        <header className={styles.pageHeader}>
            <span className={styles.eyebrow}>{t('templates.eyebrow')}</span>
            <h1>{t('resources.title')}</h1>
            <p>{t('resources.subtitle')}</p>
        </header>
        <div className={styles.tabs} role="tablist" aria-label={t('resources.tabLabel')}>
            {RESOURCE_KINDS.map((item, index) => <button key={item} ref={element => { tabs.current[index] = element; }}
                type="button" role="tab" id={`resource-tab-${item}`} aria-selected={kind === item} aria-controls={`resource-panel-${item}`}
                tabIndex={kind === item ? 0 : -1} onClick={() => selectKind(item)} onKeyDown={event => navigateTabs(event, index)}>
                {t(`resources.tabs.${item}`)} <span>{TEMPLATES.filter(resource => resource.kind === item).length}</span>
            </button>)}
        </div>
        {RESOURCE_KINDS.map(item => <section key={item} id={`resource-panel-${item}`} role="tabpanel" aria-labelledby={`resource-tab-${item}`} hidden={kind !== item} tabIndex={0}>
            {kind === item && <>
                <div className={styles.intro}><h2>{t(`resources.intro.${kind}.title`)}</h2><p>{t(`resources.intro.${kind}.body`)}</p>
                    <p className={styles.note}>{t('resources.aiDistinction')}</p><p className={styles.language}>{t('resources.language')}</p>
                </div>
                <div className={styles.filters}>
                    <label className={styles.search}><Search size={18} aria-hidden="true" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('resources.search')} aria-label={t('resources.search')} /></label>
                    <label>{t('resources.topic')}<select value={category} onChange={event => setCategory(event.target.value)}>
                        {categories.map(topic => <option key={topic.id} value={topic.id}>{topic.id === 'all' ? t('resources.allTopics') : t(`templates.category.${topic.id}`, { defaultValue: topic.label })}</option>)}
                    </select></label>
                </div>
                <p role="status" className={styles.resultCount}>{t('resources.results', { count: filtered.length })}</p>
                {filtered.length ? <div className={styles.grid}>{filtered.map(resource => <ResourceCard key={resource.id} resource={resource} onOpen={setPreview} />)}</div>
                    : <div className={styles.empty}><h3>{t('resources.empty')}</h3><p>{t('resources.emptyHelp')}</p><button type="button" className={styles.action} onClick={() => { setQuery(''); setCategory('all'); }}>{t('resources.reset')}</button></div>}
            </>}
        </section>)}
        {preview && <ResourcePreview resource={preview} onClose={() => setPreview(null)} />}
    </div>;
}
