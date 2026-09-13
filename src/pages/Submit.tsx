import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppWindow, Link2, FileText, Image, ChevronRight, ChevronLeft,
  Check, Rocket, Info, LogIn
} from 'lucide-react';
import { canonicalRepoUrl, isWebUrl, submissionErrors } from '../lib/submissionPolicy';
import { forgetRequirements } from '../lib/requirementsConsent';
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
  const { user, loading: authLoading } = useVibeAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [projectStatus, setProjectStatus] = useState('experimental');
  const [sharingConsent, setSharingConsent] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const validatorBase = (import.meta.env.VITE_VALIDATOR_API_URL ?? '').replace(/\/$/, '');

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
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setSubmitError('Use a PNG, JPEG or WebP image up to 5 MB.'); return; }
    setSubmitError(null);
    setForm(prev => ({
      ...prev,
      thumbnailFile: file,
      thumbnailPreview: URL.createObjectURL(file),
    }));
  };

  const canProceed = (): boolean => {
    if (step === 1) return form.appName.trim().length > 2 && form.category !== '';
    if (step === 2) { try { canonicalRepoUrl(form.repoUrl); return !form.appUrl.trim() || isWebUrl(form.appUrl.trim()); } catch { return false; } }
    if (step === 3) return form.shortDescription.trim().length >= 20 && form.longDescription.trim().length >= 80;
    return true;
  };

  const handleSubmit = async () => {
    if (!user || loading) return;
    setSubmitError(null); setValidationErrors([]); setValidationWarnings([]);
    if (!validatorBase) { setSubmitError('Submissions are temporarily unavailable while our review service is configured.'); return; }
    const payload = {
      name: form.appName, category: form.category, repo_url: form.repoUrl.trim(), app_url: form.appUrl.trim(),
      short_description: form.shortDescription, long_description: form.longDescription,
      project_status: projectStatus, sharing_consent: sharingConsent,
      tags: form.tags.split(',').map(v => v.trim()).filter(Boolean),
      tech_stack: form.techStack.split(',').map(v => v.trim()).filter(Boolean),
      community_links: [
        form.slackUrl && { platform: 'slack', url: form.slackUrl },
        form.whatsappUrl && { platform: 'whatsapp', url: form.whatsappUrl },
        form.telegramUrl && { platform: 'telegram', url: form.telegramUrl },
      ].filter(Boolean),
      thumbnail_url: '',
    };
    const errors = submissionErrors(payload);
    if (errors.length) { setValidationErrors(errors); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in again before submitting.');
      if (form.thumbnailFile) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(form.thumbnailFile.type) || form.thumbnailFile.size > 5 * 1024 * 1024) throw new Error('Use a PNG, JPEG or WebP image up to 5 MB.');
        const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[form.thumbnailFile.type];
        const filePath = user.id + '/' + crypto.randomUUID() + '.' + ext;
        const { error } = await supabase.storage.from('thumbnails').upload(filePath, form.thumbnailFile);
        if (error) throw new Error('Thumbnail upload failed. Please try again.');
        payload.thumbnail_url = supabase.storage.from('thumbnails').getPublicUrl(filePath).data.publicUrl;
      }
      const response = await fetch(validatorBase + '/submit-app', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(120000),
      });
      const result = await response.json();
      if (Array.isArray(result.warnings)) setValidationWarnings(result.warnings);
      if (!response.ok) {
        if (Array.isArray(result.errors)) setValidationErrors(result.errors);
        throw new Error(result.error ?? 'Submission did not meet the requirements. See the details below.');
      }
      if (result.status !== 'pending_review') throw new Error('Unexpected submission response. Please check before retrying.');
      forgetRequirements();
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Submission unavailable. Please retry.');
    } finally { setLoading(false); }
  };

  // Guard: require login
  if (authLoading) return <p role="status" style={{ padding: '40px' }}>Restoring your sign-in session…</p>;
  if (!user) {
    return (
      <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
        <div className="glass-panel animate-slide-up" style={{ maxWidth: '440px', width: '100%', padding: 'var(--space-10)', textAlign: 'center' }}>
          <LogIn size={48} color="var(--accent-secondary)" style={{ marginBottom: 'var(--space-4)' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>
            Sign in to submit
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            Share projects you have the right to release as open source. A public GitHub repo, recognised license, useful README and test evidence are required. Submissions are reviewed before publication.
          </p>
          <p><a href="/submission-requirements.html" target="_blank" rel="noopener noreferrer">Read submission requirements</a></p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login?next=/submit" style={{ background: 'var(--gradient-neon)', color: '#fff', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', fontWeight: 700, boxShadow: 'var(--shadow-glow)' }}>
              Sign In
            </Link>
            <Link to="/register?next=/submit" style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
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
            Submitted for review
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{form.appName}</strong> is awaiting review. Automated checks establish documentation eligibility, not a safety or quality certification.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'var(--gradient-neon)', color: '#fff', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', fontWeight: 700, boxShadow: 'var(--shadow-glow)', border: 'none', cursor: 'pointer' }}
            >
              {t('submit.confirm.browseMarketplace')}
            </button>
            <button
              onClick={() => { forgetRequirements(); window.location.assign('/submit'); }}
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
            Share a project others can understand, run and build on. Small experiments are welcome; unexplained code dumps are not.
          </p>
        </div>

        <div className={styles.infoBox} style={{ display: 'block', marginBottom: 'var(--space-5)' }}>
          <strong>Built something useful? Share it as open source.</strong>
          <p>Public GitHub source, a recognised license, README with setup/usage/limitations, and a revision-linked TEST_REPORT.json are required. A live demo is optional. Every new submission awaits review.</p>
          <a href="/submission-requirements.html" target="_blank" rel="noopener noreferrer">Requirements and test report format</a>
        </div>
        {/* Step tracker */}
        {!validatorBase && <p role="alert">Submissions are temporarily unavailable while our review service is configured.</p>}
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
              <Field label="Project status" hint="Be clear about what works and what is unfinished.">
                <select className={styles.input} aria-label="Project status" value={projectStatus} onChange={e => setProjectStatus(e.target.value)}>
                  <option value="experimental">Experimental</option><option value="usable">Usable</option><option value="maintained">Maintained</option>
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
              <Field label={t('submit.field.repoUrl')} hint="Required: public https://github.com/owner/repository. GitHub is currently the supported validation provider.">
                <input id="submit-repo-url" type="url" className={styles.input} placeholder={t('submit.placeholder.repoUrl')} value={form.repoUrl} onChange={e => set('repoUrl', e.target.value)} />
              </Field>

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
                  Projects are checked and held for review before publication. Duplicate repositories and misleading or unrelated promotional submissions are not accepted.
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
<label style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <input type="checkbox" checked={sharingConsent} onChange={e => setSharingConsent(e.target.checked)} />
                I have the right to share this code under its stated open-source license. My description and test evidence are accurate, and I have disclosed known limitations. I retain ownership of my contributions.
              </label>
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
                    ❌ {error}
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
                    ⚠️ {warning}
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
              <button id="submit-publish" type="button" className={styles.publishBtn} onClick={handleSubmit} disabled={loading || !sharingConsent || !validatorBase}>
                {loading ? <><span className={styles.spinner} /> {t('submit.button.publishing')}</> : <><Rocket size={16} /> Submit for review</>}
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
