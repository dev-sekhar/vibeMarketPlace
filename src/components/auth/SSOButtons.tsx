import { useVibeAuth } from '../../context/AuthContext';
import styles from './SSOButtons.module.css';

// Inline SVGs for brand icons (not in lucide-react)
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.1-.4-4.6H24v8.7h13.2c-.6 3-2.3 5.5-5 7.2v6h8c4.7-4.3 7.3-10.7 7.3-17.3z"/>
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-8-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.1 0-11.2-4.1-13-9.6H3v6.2C7 42.8 15 48 24 48z"/>
    <path fill="#FBBC05" d="M11 28.9c-.5-1.4-.8-2.9-.8-4.4s.3-3 .8-4.4v-6.2H3A24 24 0 000 24c0 3.9.9 7.5 2.5 10.8L11 28.9z"/>
    <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.4 30.5 0 24 0 15 0 7 5.2 3 13.2l8 6.2c1.8-5.5 6.9-9.9 13-9.9z"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58v-2.17c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

interface SSOButtonsProps {
  label?: string;
}

export const SSOButtons = ({ label = 'sign-in' }: SSOButtonsProps) => {
  const { signInWithGoogle, signInWithGitHub } = useVibeAuth();

  return (
    <div className={styles.ssoRow}>
      <button
        id={`sso-google-${label}`}
        type="button"
        className={styles.ssoBtn}
        onClick={signInWithGoogle}
      >
        <GoogleIcon />
        Continue with Google
      </button>
      <button
        id={`sso-github-${label}`}
        type="button"
        className={styles.ssoBtn}
        onClick={signInWithGitHub}
      >
        <GitHubIcon />
        Continue with GitHub
      </button>
    </div>
  );
};
