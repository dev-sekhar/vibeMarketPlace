import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { User, Save, AlertTriangle } from 'lucide-react';
import { useVibeAuth } from '../context/AuthContext';
import socialLinksConfig from '../../config/socialLinks.json';
import styles from './Profile.module.css';

interface SocialLinkConfig {
    id: string;
    label: string;
    placeholder: string;
    icon: string;
    enabled: boolean;
}

const enabledSocialLinks = (socialLinksConfig as SocialLinkConfig[]).filter(s => s.enabled);

/** Hours remaining in the 24-hour cooldown after social links were last updated. */
const getCooldownHoursLeft = (updatedAt: string | undefined): number => {
    if (!updatedAt) return 0;
    const elapsed = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60);
    return Math.max(0, 24 - elapsed);
};

export const Profile = () => {
    const { t } = useTranslation();
    const { user, updateProfile } = useVibeAuth();

    const [fullName, setFullName] = useState('');
    const [socialValues, setSocialValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    // Populate form from user metadata only when the user identity changes
    // (not on every token refresh, which would reset unsaved edits)
    const userId = user?.id;
    useEffect(() => {
        if (!user) return;
        setFullName((user.user_metadata?.full_name as string | undefined) ?? '');
        const social: Record<string, string> = {};
        for (const link of enabledSocialLinks) {
            social[link.id] = (user.user_metadata?.[`social_${link.id}`] as string | undefined) ?? '';
        }
        setSocialValues(social);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    if (!user) {
        return (
            <div className={styles.page}>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--space-16)' }}>
                    {t('profile.notLoggedIn')} <Link to="/login" style={{ color: 'var(--accent-secondary)' }}>{t('nav.login')}</Link>
                </p>
            </div>
        );
    }

    const cooldownHoursLeft = getCooldownHoursLeft(
        user.user_metadata?.social_links_updated_at as string | undefined
    );
    const cooldownHoursRounded = Math.ceil(cooldownHoursLeft);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSaved(false);

        const err = await updateProfile(fullName.trim(), socialValues);
        if (err) {
            setError(err);
        } else {
            setSaved(true);
            setTimeout(() => setSaved(false), 4000);
        }
        setSaving(false);
    };

    return (
        <div className={styles.page}>
            <div className={styles.inner}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.avatar}>
                        <User size={28} />
                    </div>
                    <div>
                        <h1 className={styles.title}>{t('profile.title')}</h1>
                        <p className={styles.subtitle}>{t('profile.subtitle')}</p>
                    </div>
                </div>

                {/* Cooldown notice */}
                {cooldownHoursLeft > 0 && (
                    <div className={styles.cooldownBanner}>
                        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                        <div>
                            <strong>{t('profile.cooldown.title')}</strong>
                            <p>{t('profile.cooldown.body', { hours: cooldownHoursRounded })}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: 'var(--space-8)' }}>
                    {/* ── Basic Info ── */}
                    <h2 className={styles.sectionHeading}>{t('profile.section.basics')}</h2>

                    <div className={styles.fieldGroup}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="p-email">{t('profile.field.email')}</label>
                            <input
                                id="p-email"
                                type="email"
                                value={user.email ?? ''}
                                readOnly
                                className={`${styles.input} ${styles.inputReadonly}`}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="p-fullname">{t('profile.field.fullName')}</label>
                            <input
                                id="p-fullname"
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder={t('profile.placeholder.fullName')}
                                className={styles.input}
                                autoComplete="name"
                            />
                        </div>
                    </div>

                    {/* ── Social Profiles ── */}
                    <h2 className={styles.sectionHeading} style={{ marginTop: 'var(--space-8)' }}>
                        {t('profile.section.social')}
                    </h2>
                    <p className={styles.hint}>{t('profile.hint.social')}</p>

                    <div className={styles.fieldGroup}>
                        {enabledSocialLinks.map(link => (
                            <div key={link.id} className={styles.field}>
                                <label className={styles.label} htmlFor={`p-${link.id}`}>{link.label}</label>
                                <input
                                    id={`p-${link.id}`}
                                    type="url"
                                    value={socialValues[link.id] ?? ''}
                                    onChange={e => setSocialValues(prev => ({ ...prev, [link.id]: e.target.value }))}
                                    placeholder={link.placeholder}
                                    className={styles.input}
                                    autoComplete="url"
                                />
                            </div>
                        ))}
                    </div>

                    {error && <p className={styles.error}>{error}</p>}
                    {saved && <p className={styles.success}>{t('profile.saved')}</p>}

                    <div className={styles.actions}>
                        <button type="submit" className={styles.saveBtn} disabled={saving}>
                            <Save size={16} />
                            {saving ? t('profile.button.saving') : t('profile.button.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
