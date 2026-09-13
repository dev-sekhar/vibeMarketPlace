import { publicName } from './articlePolicy';
export const RECOMMENDATIONS = {
  recommend: 'Recommend', mixed: 'Mixed experience', not_recommended: 'Would not recommend',
} as const;
export interface CitationDraft {
  display_name: string;
  use_case: string;
  feedback: string;
  recommendation: string;
  evidence_url: string;
  has_used: boolean;
}
export interface Citation extends Omit<CitationDraft, 'evidence_url'> {
  evidence_url: string | null;
  id: string;
  app_id: string;
  user_id: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}
export function citationError(draft: CitationDraft): string | null {
  if (publicName(draft.display_name).length < 2 || draft.display_name.trim().length > 100) return 'Enter a public name of 2–100 characters, without an email address.';
  if (draft.use_case.trim().length < 20 || draft.use_case.trim().length > 500) return 'Describe how you used the app in 20–500 characters.';
  if (draft.feedback.trim().length < 30 || draft.feedback.trim().length > 2000) return 'Share useful feedback in 30–2,000 characters.';
  if (!Object.hasOwn(RECOMMENDATIONS, draft.recommendation)) return 'Choose a recommendation.';
  const url = draft.evidence_url.trim();
  if (url && (url.length > 2048 || !/^https:\/\/[A-Za-z0-9.-]+(:[0-9]+)?([/?#][^\s\\]*)?$/.test(url))) return 'Use a full HTTPS link without embedded credentials.';
  if (!draft.has_used) return 'Confirm that you have personally used this app.';
  return null;
}
