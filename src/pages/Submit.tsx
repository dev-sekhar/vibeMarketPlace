import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppWindow, Link2, FileText, Image, ChevronRight, ChevronLeft,
  Check, Rocket, Info, LogIn
} from 'lucide-react';
import validationConfig from '../../config/validation-config.json';
import { useTranslation } from 'react-i18next';
import type { AppCategory } from '../types/app';
import { useVibeAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import styles from './Submit.module.css';

const CATEGORIES: AppCategory[] = [
  'Web App', 'CLI Tool', 'Productivity', 'Game', 'Developer Tool', 'Finance', 'AI Assistant',
];

const CATEGORY_TRANSLATION_KEY: Record<AppCategory, string> = {
  'Web App': 'category.webApp',
  'CLI Tool': 'category.cliTool',
  'Productivity': 'category.productivity',
  'Game': 'category.game',
  'Developer Tool': 'category.developerTool',
  'Finance': 'category.finance',
  'AI Assistant': 'category.aiAssistant',
};

interface FormData {
  appName: string;
  category: AppCategory | '';
  repoUrl: string;
  appUrl: string;
  shortDescription: string;
  longDescription: string;
  thumbnailFile: File | null;
  thumbnailPreview: string;
  tags: string;
  techStack: string;
  slackUrl: string;
  whatsappUrl: string;
  telegramUrl: string;
}

interface RepoValidationResponse {
  pass: boolean;
  errors: string[];
  warnings: string[];
  error?: string;
}

const EMPTY_FORM: FormData = {
  appName: '', category: '', repoUrl: '', appUrl: '',
  shortDescription: '', longDescription: '',
  thumbnailFile: null, thumbnailPreview: '',
  tags: '', techStack: '',
  slackUrl: '', whatsappUrl: '', telegramUrl: '',
};

const STEPS = [
  { id: 1, label: 'submit.step.appInfo', icon: AppWindow },
  { id: 2, label: 'submit.step.links', icon: Link2 },
  { id: 3, label: 'submit.step.description', icon: FileText },
  { id: 4, label: 'submit.step.media', icon: Image },
];

export const Submit = () => {
  const { t } = useTranslation();
  const { user } = useVibeAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  // Only validate if a validator URL is explicitly configured — never fall back to localhost
  const validatorBase = import.meta.env.VITE_VALIDATOR_API_URL ?? '';

  const showRepoValidationAlert = () => {
    if (form.repoUrl.trim() && !showValidationAlert) {
      setShowValidationAlert(true);
    }
  };

  const set = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // Seed community links from the user's profile on mount
  useEffect(() => {
    if (!user) return;
    setForm(prev => ({
      ...prev,
      slackUrl: (user.user_metadata?.social_slack as string | undefined) ?? '',
      whatsappUrl: (user.user_metadata?.social_whatsapp as string | undefined) ?? '',
      telegramUrl: (user.user_metadata?.social_telegram as string | undefined) ?? '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(prev => ({
      ...prev,
      thumbnailFile: file,
      thumbnailPreview: URL.createObjectURL(file),
    }));
  };

  const canProceed = (): boolean => {
    if (step === 1) return form.appName.trim().length > 2 && form.category !== '';
    if (step === 2) return form.repoUrl.trim().startsWith('http') || form.appUrl.trim().startsWith('http');
    if (step === 3) return form.shortDescription.trim().length > 0 && form.longDescription.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setSubmitError(null);
    setValidationErrors([]);
    setValidationWarnings([]);
    setShowValidationAlert(false);

    // Skip repo validation entirely when no validator API is configured
    if (validatorBase && form.repoUrl.trim()) {
      try {
        const response = await fetch(`${validatorBase}/validate-repo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: form.repoUrl.trim() }),
        });

        let validation: RepoValidationResponse;
        try {
          validation = await response.json();
        } catch (parseError) {
          setSubmitError('We couldn\'t check your repository right now. Please try again in a moment.');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          setSubmitError(validation.error ?? 'We\'re having trouble validating your repository. Please check the URL and try again.');
          setLoading(false);
          return;
        }

        if (!validation.pass) {
          setValidationErrors(validation.errors ?? ['Your repository didn\'t meet our requirements.']);
          setSubmitError('Your repository needs a few adjustments. See the details above and try again.');
          setLoading(false);
          return;
        }

        if (validation.warnings.length) {
          setValidationWarnings(validation.warnings);
        }
      } catch {
        setSubmitError('Unable to reach the repository validator. Check your internet connection and try again.');
        setLoading(false);
        return;
      }
    }

    let thumbnailUrl = '';

    // Upload thumbnail if provided
    if (form.thumbnailFile) {

      const ext = form.thumbnailFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(filePath, form.thumbnailFile, { upsert: true });

      if (uploadError) {
        setSubmitError(`Thumbnail upload failed: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(filePath);
      thumbnailUrl = urlData.publicUrl;
    }

    // Insert app record
    const slug = form.appName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    // Snapshot community links from user_metadata at submit time (fallback when profiles table absent)
    const communityLinksSnapshot = [
      form.slackUrl && { platform: 'slack', url: form.slackUrl },
      form.whatsappUrl && { platform: 'whatsapp', url: form.whatsappUrl },
      form.telegramUrl && { platform: 'telegram', url: form.telegramUrl },
    ].filter(Boolean);

    const { error: insertError } = await supabase.from('apps').insert({
      name: form.appName,
      slug: `${slug}-${Date.now()}`,
      short_description: form.shortDescription,
      long_description: form.longDescription,
      category: form.category,
      repo_url: form.repoUrl,
      app_url: form.appUrl,
      thumbnail_url: thumbnailUrl,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      tech_stack: form.techStack.split(',').map(t => t.trim()).filter(Boolean),
      community_links: communityLinksSnapshot.length > 0 ? communityLinksSnapshot : null,
      author_id: user.id,
      author_name: user.user_metadata?.full_name ?? user.email ?? 'Anonymous',
    });

    setLoading(false);

    if (insertError) {
      setSubmitError(insertError.message);
    } else {
      setSubmitted(true);
    }
  };

  // Maps raw API error/warning strings to specific human-readable messages.
  const ERROR_LABEL_MAP: [RegExp, string][] = [
    [/readme/i, 'README.md is missing — add a README.md to the root of your repository'],
    [/licen[sc]e/i, 'LICENSE file is missing — add a LICENSE file (e.g. MIT, Apache-2.0)'],
    [/gitignore/i, '.gitignore is missing — add a .gitignore file to exclude build artefacts'],
    [/source.?dir|src.?dir|no.?source/i, 'No source directory found — ensure src/, app/, or lib/ exists'],
    [/manifest|package\.json|requirements/i, 'Package manifest missing — add package.json, requirements.txt, or similar'],
    [/sensitiv|\.env|credential|secret|private.?key/i, 'Sensitive file detected — remove .env files, credentials, or private keys and rotate any exposed secrets'],
    [/size|too.?large|exceeds/i, `Repository exceeds the ${validationConfig.validations.sizeLimitMB}MB size limit — remove large binaries or use Git LFS`],
  ];

  const WARNING_LABEL_MAP: [RegExp, string][] = [
    [/contributing/i, 'No CONTRIBUTING.md — helps others understand how to contribute'],
    [/test/i, 'No test directory detected — consider adding automated tests'],
    [/ci|github.?action|workflow/i, 'No CI/CD pipeline found — consider adding GitHub Actions or similar'],
    [/lint|eslint|prettier/i, 'No linter config detected — consider adding ESLint/Prettier'],
    [/lock.?file|package-lock|yarn\.lock/i, 'No lock file found — commit package-lock.json or yarn.lock for reproducible installs'],
    [/security|SECURITY/i, 'No SECURITY.md — consider documenting your vulnerability disclosure policy'],
    [/large.?repo|repo.?large/i, 'Repository is large — consider trimming history or using Git LFS'],
  ];

  const formatValidationError = (msg: string): string => {
    for (const [pattern, label] of ERROR_LABEL_MAP) {
      if (pattern.test(msg)) return label;
    }
    return msg;
  };

  const formatValidationWarning = (msg: string): string => {
    for (const [pattern, label] of WARNING_LABEL_MAP) {
      if (pattern.test(msg)) return label;
    }
    return msg;
  };

  // Guard: require login
  if (!user) {
    return (
      <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
        <div className="glass-panel animate-slide-up" style={{ maxWidth: '440px', width: '100%', padding: 'var(--space-10)', textAlign: 'center' }}>
          <LogIn size={48} color="var(--accent-secondary)" style={{ marginBottom: 'var(--space-4)' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>
            Sign in to submit
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            You need an account to submit an app to the marketplace.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" style={{ background: 'var(--gradient-neon)', color: '#fff', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', fontWeight: 700, boxShadow: 'var(--shadow-glow)' }}>
              Sign In
            </Link>
            <Link to="/register" style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
        <div className="glass-panel animate-slide-up" style={{ maxWidth: '480px', width: '100%', padding: 'var(--space-10)', textAlign: 'center' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto var(--space-6)',
            background: 'var(--gradient-neon)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Check size={36} color="#fff" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-3)' }}>
            {t('submit.confirm.title')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{form.appName}</strong> {t('submit.confirm.message')}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'var(--gradient-neon)', color: '#fff', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', fontWeight: 700, boxShadow: 'var(--shadow-glow)', border: 'none', cursor: 'pointer' }}
            >
              {t('submit.confirm.browseMarketplace')}
            </button>
            <button
              onClick={() => { setSubmitted(false); setForm(EMPTY_FORM); setStep(1); }}
              style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', fontWeight: 600, cursor: 'pointer' }}
            >
              {t('submit.confirm.submitAnother')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {t('submit.page.title')}
          </h1>
          <p className={styles.subtitle}>
            {t('submit.page.subtitle')}
          </p>
        </div>

        {/* Step tracker */}
        <div className={styles.stepper} role="tablist">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className={styles.stepItem}>
                <div
                  className={`${styles.stepDot} ${done ? styles.done : ''} ${active ? styles.active : ''}`}
                  role="tab" aria-selected={active} aria-label={`${t('submit.step.titlePrefix')} ${s.id}: ${t(s.label)}`}
                >
                  {done ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ''}`}>{t(s.label)}</span>
                {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />}
              </div>
            );
          })}
        </div>

        <div className={`glass-panel ${styles.card}`}>
          {step === 1 && (
            <StepWrap title={t('submit.section.appInfo')}>
              <Field label={t('submit.field.appName')} hint={t('submit.field.appNameHint')}>
                <input id="submit-app-name" type="text" className={styles.input} placeholder={t('submit.placeholder.appName')} value={form.appName} onChange={e => set('appName', e.target.value)} maxLength={60} />
              </Field>
              <Field label={t('submit.field.category')} hint={t('submit.field.categoryHint')}>
                <select id="submit-category" className={styles.input} value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">{t('submit.field.categorySelect')}</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{t(CATEGORY_TRANSLATION_KEY[c])}</option>)}
                </select>
              </Field>
              <Field label={t('submit.field.techStack')} hint={t('submit.field.techStackHint')}>
                <input id="submit-tech-stack" type="text" className={styles.input} placeholder={t('submit.placeholder.techStack')} value={form.techStack} onChange={e => set('techStack', e.target.value)} />
              </Field>
              <Field label={t('submit.field.tags')} hint={t('submit.field.tagsHint')}>
                <input id="submit-tags" type="text" className={styles.input} placeholder={t('submit.placeholder.tags')} value={form.tags} onChange={e => set('tags', e.target.value)} />
              </Field>
            </StepWrap>
          )}

          {step === 2 && (
            <StepWrap title={t('submit.section.links')}>
              <Field label={t('submit.field.repoUrl')} hint={t('submit.field.repoUrlHint')}>
                <input id="submit-repo-url" type="url" className={styles.input} placeholder={t('submit.placeholder.repoUrl')} value={form.repoUrl} onChange={e => set('repoUrl', e.target.value)} onBlur={showRepoValidationAlert} />
              </Field>

              {showValidationAlert && form.repoUrl.trim() && validatorBase && (
                <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                  <h4 style={{ margin: '0 0 var(--space-3) 0', color: 'var(--text-primary)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
                    Repository Validation Checklist
                  </h4>
                  <p style={{ margin: '0 0 var(--space-3) 0', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    Your repository will be checked against these requirements at submission:
                  </p>
                  <ul style={{ margin: '0 0 var(--space-3) 0', paddingLeft: 'var(--space-4)' }}>
                    {validationConfig.validations.readmeRequired && <li style={{ marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>✅ README.md present at root</li>}
                    {validationConfig.validations.licenseRequired && <li style={{ marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>✅ LICENSE file present</li>}
                    {validationConfig.validations.sourceDirectoryRequired && <li style={{ marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>✅ Source directory found (src/, app/, lib/, etc.)</li>}
                    {validationConfig.validations.packageManifestRequired && <li style={{ marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>✅ Package manifest present (package.json, requirements.txt, etc.)</li>}
                    {validationConfig.validations.gitignoreRequired && <li style={{ marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>✅ .gitignore file present</li>}
                    {validationConfig.validations.sensitiveFilesCheck && <li style={{ marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>⚠️ No sensitive files committed (.env, credentials, private keys)</li>}
                    {validationConfig.validations.sizeLimitCheck && <li style={{ marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>⚠️ Repository under {validationConfig.validations.sizeLimitMB}MB</li>}
                  </ul>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                    <strong>Note:</strong> Failing a ✅ required check will block submission. ⚠️ warnings are shown but won't block.
                  </p>
                </div>
              )}
              <Field label={t('submit.field.appUrl')} hint={t('submit.field.appUrlHint')}>
                <input id="submit-app-url" type="url" className={styles.input} placeholder={t('submit.placeholder.appUrl')} value={form.appUrl} onChange={e => set('appUrl', e.target.value)} />
              </Field>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
                <strong>{t('submit.section.community')}</strong>
              </p>
              <div className={styles.infoBox} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Community invite links (Slack, WhatsApp, Telegram) are pulled from your{' '}
                  <a href="/profile" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)' }}>profile</a>.
                  Update them there and they will apply to all your apps.
                </p>
                {(form.slackUrl || form.whatsappUrl || form.telegramUrl) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: '100%' }}>
                    {form.slackUrl && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>🔵 Slack: {form.slackUrl}</span>}
                    {form.whatsappUrl && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>🟢 WhatsApp: {form.whatsappUrl}</span>}
                    {form.telegramUrl && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>🔷 Telegram: {form.telegramUrl}</span>}
                  </div>
                ) : (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No community links set on your profile yet.</span>
                )}
              </div>
              <div className={styles.infoBox}>
                <Info size={15} color="var(--accent-base)" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {t('submit.info.liveImmediately')}
                </p>
              </div>
            </StepWrap>
          )}

          {step === 3 && (
            <StepWrap title={t('submit.section.description')}>
              <Field label={t('submit.field.shortDescription')} hint={t('submit.field.shortDescriptionHint', { count: form.shortDescription.length })}>
                <input id="submit-short-desc" type="text" className={styles.input} placeholder={t('submit.placeholder.shortDescription')} value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} maxLength={120} />
              </Field>
              <Field label={t('submit.field.fullDescription')} hint={t('submit.field.fullDescriptionHint', { count: form.longDescription.length })}>
                <textarea id="submit-long-desc" className={`${styles.input} ${styles.textarea}`} placeholder={t('submit.placeholder.longDescription')} value={form.longDescription} onChange={e => set('longDescription', e.target.value)} rows={5} />
              </Field>
            </StepWrap>
          )}

          {step === 4 && (
            <StepWrap title={t('submit.section.media')}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
                {t('submit.media.recommendation')}
              </p>
              <label htmlFor="submit-thumbnail" className={`${styles.dropzone} ${form.thumbnailPreview ? styles.dropzoneHasImage : ''}`}>
                {form.thumbnailPreview ? (
                  <img src={form.thumbnailPreview} alt={t('submit.media.thumbnailPreviewAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }} />
                ) : (
                  <div className={styles.dropzoneInner}>
                    <Image size={36} color="var(--text-tertiary)" />
                    <p style={{ margin: 'var(--space-3) 0 var(--space-1)', fontWeight: 600 }}>{t('submit.media.dropHere')}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0 }}>{t('submit.media.uploadHelp')}</p>
                  </div>
                )}
                <input id="submit-thumbnail" type="file" accept="image/png,image/jpeg,image/webp" className={styles.fileInput} onChange={handleFile} />
              </label>
              {form.thumbnailPreview && (
                <button type="button" onClick={() => setForm(p => ({ ...p, thumbnailFile: null, thumbnailPreview: '' }))} style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-tertiary)', marginTop: 'var(--space-3)' }}>
                  {t('submit.media.removeImage')}
                </button>
              )}
            </StepWrap>
          )}

          {validationErrors.length > 0 && (
            <div className={styles.validationBox}>
              <strong>Repository validation failed — {validationErrors.length} issue{validationErrors.length > 1 ? 's' : ''} found:</strong>
              <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-4)' }}>
                {validationErrors.map((error, idx) => (
                  <li key={idx} style={{ marginBottom: 'var(--space-1)' }}>
                    ❌ {formatValidationError(error)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationWarnings.length > 0 && (
            <div className={styles.validationWarningBox}>
              <strong>Heads up — {validationWarnings.length} recommendation{validationWarnings.length > 1 ? 's' : ''}:</strong>
              <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-4)' }}>
                {validationWarnings.map((warning, idx) => (
                  <li key={idx} style={{ marginBottom: 'var(--space-1)' }}>
                    ⚠️ {formatValidationWarning(warning)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {submitError && (
            <div style={{ marginTop: 'var(--space-4)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)' }}>
              {submitError}
            </div>
          )}

          <div className={styles.nav}>
            {step > 1 ? (
              <button id="submit-back" type="button" className={styles.backBtn} onClick={() => setStep(s => s - 1)}>
                <ChevronLeft size={16} /> {t('submit.button.back')}
              </button>
            ) : <span />}

            {step < 4 ? (
              <button id="submit-next" type="button" className={styles.nextBtn} onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                {t('submit.button.next')} <ChevronRight size={16} />
              </button>
            ) : (
              <button id="submit-publish" type="button" className={styles.publishBtn} onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className={styles.spinner} /> {t('submit.button.publishing')}</> : <><Rocket size={16} /> {t('submit.button.publish')}</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StepWrap = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>{title}</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>{children}</div>
  </div>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>{label}</label>
    {children}
    {hint && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)', marginBottom: 0 }}>{hint}</p>}
  </div>
);
