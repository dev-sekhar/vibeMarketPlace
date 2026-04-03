import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppWindow, Link2, FileText, Image, ChevronRight, ChevronLeft,
  Check, Rocket, Info, LogIn
} from 'lucide-react';
import type { AppCategory } from '../types/app';
import { useVibeAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import styles from './Submit.module.css';

const CATEGORIES: AppCategory[] = [
  'Web App', 'CLI Tool', 'Productivity', 'Game', 'Developer Tool', 'Finance', 'AI Assistant',
];

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
}

const EMPTY_FORM: FormData = {
  appName: '', category: '', repoUrl: '', appUrl: '',
  shortDescription: '', longDescription: '',
  thumbnailFile: null, thumbnailPreview: '',
  tags: '', techStack: '',
};

const STEPS = [
  { id: 1, label: 'App Info', icon: AppWindow },
  { id: 2, label: 'Links', icon: Link2 },
  { id: 3, label: 'Description', icon: FileText },
  { id: 4, label: 'Media', icon: Image },
];

export const Submit = () => {
  const { user } = useVibeAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

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
            🚀 You&apos;re live!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{form.appName}</strong> has been published to the marketplace.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'var(--gradient-neon)', color: '#fff', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', fontWeight: 700, boxShadow: 'var(--shadow-glow)', border: 'none', cursor: 'pointer' }}
            >
              Browse Marketplace
            </button>
            <button
              onClick={() => { setSubmitted(false); setForm(EMPTY_FORM); setStep(1); }}
              style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-full)', fontWeight: 600, cursor: 'pointer' }}
            >
              Submit Another
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
            Submit Your <span className="text-gradient">Vibe-Coded App</span>
          </h1>
          <p className={styles.subtitle}>
            Share what you've built with the community. Apps go live immediately.
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
                  role="tab" aria-selected={active} aria-label={`Step ${s.id}: ${s.label}`}
                >
                  {done ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ''}`}>{s.label}</span>
                {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />}
              </div>
            );
          })}
        </div>

        <div className={`glass-panel ${styles.card}`}>
          {step === 1 && (
            <StepWrap title="Tell us about your app">
              <Field label="App Name *" hint="Keep it catchy and memorable">
                <input id="submit-app-name" type="text" className={styles.input} placeholder="e.g. ReviewBot AI" value={form.appName} onChange={e => set('appName', e.target.value)} maxLength={60} />
              </Field>
              <Field label="Category *" hint="Pick the best fit">
                <select id="submit-category" className={styles.input} value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">Select a category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Tech Stack" hint="Comma-separated (e.g. React, TypeScript, Supabase)">
                <input id="submit-tech-stack" type="text" className={styles.input} placeholder="React, TypeScript, OpenAI API" value={form.techStack} onChange={e => set('techStack', e.target.value)} />
              </Field>
              <Field label="Tags" hint="Comma-separated keywords for discovery">
                <input id="submit-tags" type="text" className={styles.input} placeholder="AI, Productivity, Open Source" value={form.tags} onChange={e => set('tags', e.target.value)} />
              </Field>
            </StepWrap>
          )}

          {step === 2 && (
            <StepWrap title="Where can people find it?">
              <Field label="Repository URL *" hint="GitHub, GitLab, or any public repo">
                <input id="submit-repo-url" type="url" className={styles.input} placeholder="https://github.com/your/project" value={form.repoUrl} onChange={e => set('repoUrl', e.target.value)} />
              </Field>
              <Field label="Live App URL" hint="Link to the deployed demo (optional)">
                <input id="submit-app-url" type="url" className={styles.input} placeholder="https://your-app.vercel.app" value={form.appUrl} onChange={e => set('appUrl', e.target.value)} />
              </Field>
              <div className={styles.infoBox}>
                <Info size={15} color="var(--accent-base)" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Your app goes live <strong style={{ color: 'var(--text-primary)' }}>immediately</strong> via our post-moderation model.
                </p>
              </div>
            </StepWrap>
          )}

          {step === 3 && (
            <StepWrap title="Describe what you built">
              <Field label="Short Description *" hint={`One punchy line. ${form.shortDescription.length}/120 chars`}>
                <input id="submit-short-desc" type="text" className={styles.input} placeholder="AI-powered code reviewer that gives inline suggestions…" value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} maxLength={120} />
              </Field>
              <Field label="Full Description *" hint={`${form.longDescription.length} chars — aim for 100+`}>
                <textarea id="submit-long-desc" className={`${styles.input} ${styles.textarea}`} placeholder="Describe what your app does, why you built it, and what makes it special…" value={form.longDescription} onChange={e => set('longDescription', e.target.value)} rows={5} />
              </Field>
            </StepWrap>
          )}

          {step === 4 && (
            <StepWrap title="Upload a thumbnail">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
                Recommended: <strong style={{ color: 'var(--text-primary)' }}>1280×720</strong> (16:9).
              </p>
              <label htmlFor="submit-thumbnail" className={`${styles.dropzone} ${form.thumbnailPreview ? styles.dropzoneHasImage : ''}`}>
                {form.thumbnailPreview ? (
                  <img src={form.thumbnailPreview} alt="Thumbnail preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }} />
                ) : (
                  <div className={styles.dropzoneInner}>
                    <Image size={36} color="var(--text-tertiary)" />
                    <p style={{ margin: 'var(--space-3) 0 var(--space-1)', fontWeight: 600 }}>Drop your image here</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0 }}>PNG, JPG, WebP up to 5 MB</p>
                  </div>
                )}
                <input id="submit-thumbnail" type="file" accept="image/png,image/jpeg,image/webp" className={styles.fileInput} onChange={handleFile} />
              </label>
              {form.thumbnailPreview && (
                <button type="button" onClick={() => setForm(p => ({ ...p, thumbnailFile: null, thumbnailPreview: '' }))} style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-tertiary)', marginTop: 'var(--space-3)' }}>
                  Remove image
                </button>
              )}
            </StepWrap>
          )}

          {submitError && (
            <div style={{ marginTop: 'var(--space-4)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)' }}>
              {submitError}
            </div>
          )}

          <div className={styles.nav}>
            {step > 1 ? (
              <button id="submit-back" type="button" className={styles.backBtn} onClick={() => setStep(s => s - 1)}>
                <ChevronLeft size={16} /> Back
              </button>
            ) : <span />}

            {step < 4 ? (
              <button id="submit-next" type="button" className={styles.nextBtn} onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button id="submit-publish" type="button" className={styles.publishBtn} onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className={styles.spinner} /> Publishing…</> : <><Rocket size={16} /> Publish App</>}
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
