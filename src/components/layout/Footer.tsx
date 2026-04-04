import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const footerLinks = [
  { label: 'footer.browseApps', to: '/' },
  { label: 'footer.submitApp', to: '/submit' },
  { label: 'footer.signIn', to: '/login' },
  { label: 'footer.register', to: '/register' },
];

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      padding: 'var(--space-8) 0',
      background: 'var(--bg-surface)',
    }}>
      <div className="container" style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-6)',
      }}>
        {/* Brand */}
        <div>
          <Link to="/" style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'var(--text-lg)', display: 'block', marginBottom: 'var(--space-2)',
          }}>
            VibeMarket
          </Link>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
            Built with{' '}
            <Heart size={12} color="var(--accent-tertiary)" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
            {' '}by the open source community.
          </p>
        </div>

        {/* Nav links */}
        <nav aria-label="Footer navigation" style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          {footerLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', fontWeight: 500, transition: 'color var(--transition-fast)' }}
            >
              {t(l.label)}
            </Link>
          ))}
        </nav>

        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0 }}>
          © {new Date().getFullYear()} VibeMarket · Open Source
        </p>
      </div>
    </footer>
  );
};
