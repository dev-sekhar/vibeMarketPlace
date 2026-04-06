import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useVibeAuth } from '../../context/AuthContext';
import socialLinksConfig from '../../../config/socialLinks.json';
import styles from './OnboardingModal.module.css';

interface SocialLinkConfig {
    id: string;
    label: string;
    placeholder: string;
    icon: string;
    enabled: boolean;
}

const enabledSocialLinks = (socialLinksConfig as SocialLinkConfig[]).filter(s => s.enabled);

export const OnboardingModal = () => {
    const { t } = useTranslation();
    const { user } = useVibeAuth();

    const [fullName, setFullName] = useState(
        (user?.user_metadata?.full_name as string | undefined) ?? ''
    );
    const [socialValues, setSocialValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        for (const link of enabledSocialLinks) {
            initial[link.id] = (user?.user_metadata?.[`social_${link.id}`] as string | undefined) ?? '';
        }
        return initial;
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!user || user.user_metadata?.profile_complete === true) return null;

    const handleSkip = async () => {
        // Mark profile as complete even without filling in details
        await supabase.auth.updateUser({ data: { profile_complete: true } });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const socialData: Record<string, string> = {};
        for (const link of enabledSocialLinks) {
            const val = socialValues[link.id]?.trim();
            if (val) socialData[`social_${link.id}`] = val;
        }

        const { error: updateError } = await supabase.auth.updateUser({
            data: {
                full_name: fullName.trim() || user.user_metadata?.full_name,
                ...socialData,
                profile_complete: true,
            },
        });

        if (updateError) {
            setError(updateError.message);
            setSaving(false);
        }
        // Modal disappears automatically because `profile_complete` is now true
        // and the component re-checks user metadata on re-render
    };

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.iconWrap}>
                        <User size={24} />
                    </div>
                    <div>
                        <h2 id="onboarding-title" className={styles.title}>{t('onboarding.title')}</h2>
                        <p className={styles.subtitle}>{t('onboarding.subtitle')}</p>
                    </div>
                    <button className={styles.closeBtn} onClick={handleSkip} aria-label="Skip">
                        <X size={20} />
                    </button>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Email — readonly */}
                    <div className={styles.field}>
                        <label className={styles.label}>{t('onboarding.field.email')}</label>
                        <input
                            type="email"
                            value={user.email ?? ''}
                            readOnly
                            className={`${styles.input} ${styles.inputReadonly}`}
                        />
                    </div>

                    {/* Full name */}
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="ob-fullname">{t('onboarding.field.fullName')}</label>
                        <input
                            id="ob-fullname"
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder={t('onboarding.placeholder.fullName')}
                            className={styles.input}
                            autoComplete="name"
                        />
                    </div>

                    {/* Dynamic social links */}
                    {enabledSocialLinks.map(link => (
                        <div key={link.id} className={styles.field}>
                            <label className={styles.label} htmlFor={`ob-${link.id}`}>{link.label}</label>
                            <input
                                id={`ob-${link.id}`}
                                type="url"
                                value={socialValues[link.id]}
                                onChange={e => setSocialValues(prev => ({ ...prev, [link.id]: e.target.value }))}
                                placeholder={link.placeholder}
                                className={styles.input}
                                autoComplete="url"
                            />
                        </div>
                    ))}

                    <div className={styles.actions}>
                        <button type="button" className={styles.skipBtn} onClick={handleSkip}>
                            {t('onboarding.button.skip')}
                        </button>
                        <button type="submit" className={styles.saveBtn} disabled={saving}>
                            {saving ? t('onboarding.button.saving') : t('onboarding.button.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
