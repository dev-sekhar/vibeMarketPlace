import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONSENT_KEY, validRequirementsConsent, rememberRequirements, forgetRequirements } from '../../lib/requirementsConsent';
import styles from './SubmissionGate.module.css';
export function SubmissionGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const [accepted, setAccepted] = useState(() => { try { return validRequirementsConsent(sessionStorage.getItem(CONSENT_KEY)); } catch { return false; } });
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    if (!accepted && element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, [accepted]);
  const cancel = () => { forgetRequirements(); navigate('/'); };
  if (accepted) return children;
  return <div className={styles.page}>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="requirements-title" aria-describedby="requirements-intro" onCancel={event => { event.preventDefault(); cancel(); }}>
      <h1 id="requirements-title">Before you share your project</h1>
      <p id="requirements-intro">Small experiments are welcome. Share something others can understand, run and build on—not an unexplained code dump.</p>
      <ul>
        <li><strong>Public source:</strong> a public GitHub repository containing the app’s code. A live demo is optional.</li>
        <li><strong>Open-source license:</strong> full recognised text in LICENSE, LICENSE.md or LICENSE.txt, and the right to share the code.</li>
        <li><strong>Useful README:</strong> purpose, setup, usage examples, project status and known limitations.</li>
        <li><strong>Test evidence:</strong> TEST_REPORT.json tied to the tested commit, with reproducible steps and expected/actual results. Manual functional tests count.</li>
        <li><strong>Basic hygiene:</strong> a nonempty .gitignore; no committed credentials or private keys.</li>
        <li><strong>Honest submission:</strong> accurate descriptions and project status; no duplicates, misleading claims or unrelated promotion.</li>
      </ul>
      <p>Passing automated checks puts your project into a review queue. It is not a safety or quality certification. You retain ownership of your contributions.</p>
      <a href="/submission-requirements.html" target="_blank" rel="noopener noreferrer">Full requirements and test report format ↗</a>
      <label className={styles.agreement}><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />I have read these requirements and agree to submit a project that meets them.</label>
      <div className={styles.actions}><button type="button" onClick={cancel}>Not now</button><button type="button" disabled={!checked} onClick={() => { rememberRequirements(); setAccepted(true); }}>Agree and continue</button></div>
    </dialog>
  </div>;
}
