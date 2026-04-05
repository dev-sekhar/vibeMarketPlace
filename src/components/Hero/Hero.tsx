import { useState, useRef } from 'react';
import { Search, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface HeroProps {
  onSearch: (query: string) => void;
}

export const Hero = ({ onSearch }: HeroProps) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <section
      aria-label="Hero"
      id="hero"
      style={{
        position: 'relative',
        textAlign: 'center',
        padding: 'var(--space-8) var(--space-4)',
        overflow: 'visible',
        minHeight: '25vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 'var(--space-12)',
      }}
    >
      {/* Animated background orbs */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute',
          top: '-80px', left: '10%',
          width: '480px', height: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 70%)',
          animation: 'floatOrb 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          top: '-40px', right: '8%',
          width: '380px', height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
          animation: 'floatOrb 11s ease-in-out infinite 2s',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-60px', left: '40%',
          width: '300px', height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 70%)',
          animation: 'floatOrb 9s ease-in-out infinite 1s',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Eyebrow label */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          background: 'rgba(168, 85, 247, 0.1)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: 'var(--radius-full)',
          padding: '4px 14px',
          marginBottom: 'var(--space-2)',
        }}>
          <Sparkles size={14} color="var(--accent-secondary)" />
          <span style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--accent-secondary)',
            letterSpacing: '0.06em',
          }}>
            {t('hero.eyebrow')}
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(2.8rem, 7vw, 5rem)',
          lineHeight: 1.08,
          marginBottom: 'var(--space-2)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.03em',
        }}>
          {t('hero.headline')}
        </h1>

        {/* Sub-headline */}
        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, var(--text-xl))',
          color: 'var(--text-secondary)',
          maxWidth: '580px',
          margin: '0 auto var(--space-4)',
          lineHeight: 1.6,
        }}>
          {t('hero.subheadline')}
        </p>

        {/* Hero Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          maxWidth: '560px',
          margin: '0 auto',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-full)',
          padding: 'var(--space-3) var(--space-4)',
          gap: 'var(--space-3)',
          boxShadow: '0 0 0 0 transparent',
          transition: 'box-shadow var(--transition-fast), border-color var(--transition-fast)',
        }}
          onFocus={() => {
            (document.querySelector('#hero-search-wrapper') as HTMLElement)?.style.setProperty('box-shadow', '0 0 0 3px rgba(168, 85, 247, 0.25)');
          }}
          id="hero-search-wrapper"
        >
          <Search size={20} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            id="hero-search"
            type="search"
            value={query}
            onChange={handleChange}
            placeholder={t('hero.search.placeholder')}
            aria-label="Search apps"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-base)',
              fontFamily: 'var(--font-primary)',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); onSearch(''); inputRef.current?.focus(); }}
              style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}
              aria-label={t('hero.search.clear')}
            >
              ✕
            </button>
          )}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap', marginTop: 'var(--space-6)' }}>
          <Link
            to="/submit"
            id="hero-submit-cta"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
              background: 'var(--gradient-neon)', color: '#fff',
              padding: 'var(--space-3) var(--space-6)',
              borderRadius: 'var(--radius-full)', fontWeight: 700,
              fontSize: 'var(--text-base)', boxShadow: 'var(--shadow-glow)',
              textDecoration: 'none', transition: 'transform var(--transition-fast)',
            }}
          >
            {t('hero.cta.submit')}
            <ArrowRight size={16} />
          </Link>
          <a
            href="#app-grid"
            id="hero-explore-cta"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
              padding: 'var(--space-3) var(--space-6)',
              borderRadius: 'var(--radius-full)', fontWeight: 600,
              fontSize: 'var(--text-base)', textDecoration: 'none',
              transition: 'border-color var(--transition-fast), background var(--transition-fast)',
            }}
          >
            {t('hero.cta.explore')}
          </a>
        </div>
      </div>
    </section>
  );
};
