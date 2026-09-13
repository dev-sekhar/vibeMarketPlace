// Reviewed, deliberately bounded vocabulary. Keep server enforcement in sync with
// scripts/generate-citation-language.ts; a word filter is not full moderation.
export const CITATION_PROFANITY_MESSAGE = 'Please remove profanity from your public name, use case and feedback before publishing.';
export const CITATION_BLOCKED_WORDS = [
    'fuck', 'fucks', 'fucked', 'fucking', 'fucker', 'fuckers', 'motherfucker', 'motherfuckers',
    'shit', 'shits', 'shitty', 'bullshit', 'horseshit',
    'bitch', 'bitches', 'bitching', 'asshole', 'assholes', 'arsehole', 'arseholes',
    'bastard', 'bastards', 'cunt', 'cunts', 'dickhead', 'dickheads',
    'wanker', 'wankers', 'bollocks', 'dumbass', 'dumbasses', 'piss', 'pissed', 'pissing', 'damn', 'damned', 'crap',
    'mierda', 'joder', 'puta', 'puto', 'cabron', 'cabrón', 'coño',
] as const;
export const CITATION_BLOCKED_PHRASES = ['他妈的', '操你妈', '傻逼', '傻屄', '王八蛋'];
const substitutions: Record<string, string> = { a: '[a@4]', e: '[e3]', i: '[i1!]', o: '[o0]', s: '[s5$]', t: '[t7]' };
const gap = '[^a-z0-9]*';
const words = CITATION_BLOCKED_WORDS.map(word => [...word].map(letter => `${substitutions[letter] ?? letter}+`).join(gap));
// ASCII word boundaries avoid the classic substring problem (e.g. Scunthorpe).
// Common Chinese phrases have no space-delimited word boundaries.
export const CITATION_PROFANITY_PATTERN = `(^|[^a-z0-9])(${words.join('|')})([^a-z0-9]|$)|${CITATION_BLOCKED_PHRASES.join('|')}`;
const pattern = new RegExp(CITATION_PROFANITY_PATTERN, 'i');

export function containsCitationProfanity(text: string): boolean {
    return pattern.test(text.normalize('NFKC'));
}

export function citationSaveError(error: { message?: string; code?: string }): string {
    if (error.message?.includes('CITATION_PROFANITY')) return CITATION_PROFANITY_MESSAGE;
    if (error.code === '23505') return 'You already have a citation for this app. Refresh to edit it.';
    return 'Your citation could not be saved. Please try again.';
}
