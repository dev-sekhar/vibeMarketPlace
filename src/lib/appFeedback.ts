import { publicName } from './articlePolicy';
import { containsCitationProfanity } from './citationLanguage';

export const FEEDBACK_KINDS = ['bug','feature','improvement'] as const;
export const FEEDBACK_STATUSES = ['open','planned','in_progress','completed','closed'] as const;
export const FEEDBACK_PAGE_SIZE = 12;
export interface FeedbackDraft {
    display_name: string;
    kind: string;
    title: string;
    description: string;
}
export interface AppFeedbackItem extends FeedbackDraft {
    id: string;
    app_id: string;
    user_id: string;
    status: string;
    vote_count: number;
    created_at: string;
    updated_at: string;
}

/** Translation key, so the same validation applies in every UI language. */
export function feedbackError(draft: FeedbackDraft): string | null {
    if ([draft.display_name,draft.title,draft.description].some(containsCitationProfanity)) return 'feedback.errors.language';
    if (publicName(draft.display_name).length < 2 || draft.display_name.trim().length > 100) return 'feedback.errors.name';
    if (!FEEDBACK_KINDS.some(kind => kind === draft.kind)) return 'feedback.errors.kind';
    if (draft.title.trim().length < 5 || draft.title.trim().length > 120) return 'feedback.errors.title';
    if (draft.description.trim().length < 30 || draft.description.trim().length > 3000) return 'feedback.errors.description';
    return null;
}

export function feedbackSaveError(error: {message?:string;code?:string}): string {
    if (error.message?.includes('FEEDBACK_PROFANITY')) return 'feedback.errors.language';
    if (error.code === '23505') return 'feedback.errors.duplicateVote';
    return 'feedback.errors.save';
}
