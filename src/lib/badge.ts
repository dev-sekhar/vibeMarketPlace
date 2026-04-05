export interface Badge {
    tier: 'newcomer' | 'builder' | 'maker' | 'champion' | 'legend';
    label: string;
    emoji: string;
    minApps: number;
    color: string;
    borderColor: string;
    textColor: string;
    description: string;
}

/**
 * Badge tiers — inspired by Stack Overflow, themed for vibe coders.
 * Ordered ascending by minApps so getBadge() can walk from the top.
 */
export const BADGES: Badge[] = [
    {
        tier: 'newcomer',
        label: 'Newcomer',
        emoji: '🥉',
        minApps: 1,
        color: 'rgba(205,127,50,0.15)',
        borderColor: 'rgba(205,127,50,0.5)',
        textColor: '#cd7f32',
        description: 'Submitted their first vibe-coded app',
    },
    {
        tier: 'builder',
        label: 'Builder',
        emoji: '🥈',
        minApps: 3,
        color: 'rgba(160,166,176,0.15)',
        borderColor: 'rgba(160,166,176,0.5)',
        textColor: '#a0a6b0',
        description: 'Submitted 3+ vibe-coded apps',
    },
    {
        tier: 'maker',
        label: 'Maker',
        emoji: '🥇',
        minApps: 5,
        color: 'rgba(255,185,0,0.15)',
        borderColor: 'rgba(255,185,0,0.5)',
        textColor: '#ffb900',
        description: 'Submitted 5+ vibe-coded apps',
    },
    {
        tier: 'champion',
        label: 'Vibe Champion',
        emoji: '💎',
        minApps: 10,
        color: 'rgba(56,189,248,0.15)',
        borderColor: 'rgba(56,189,248,0.5)',
        textColor: '#38bdf8',
        description: 'Submitted 10+ vibe-coded apps',
    },
    {
        tier: 'legend',
        label: 'Vibe Legend',
        emoji: '🌟',
        minApps: 20,
        color: 'rgba(167,139,250,0.15)',
        borderColor: 'rgba(167,139,250,0.5)',
        textColor: '#a78bfa',
        description: 'Submitted 20+ vibe-coded apps',
    },
];

/** Returns the highest badge the user qualifies for, or null if they have no apps. */
export function getBadge(appCount: number): Badge | null {
    if (appCount <= 0) return null;
    for (let i = BADGES.length - 1; i >= 0; i--) {
        if (appCount >= BADGES[i].minApps) return BADGES[i];
    }
    return null;
}

/** Returns the next badge tier the user is working towards, or null if already at max. */
export function getNextBadge(appCount: number): Badge | null {
    for (const badge of BADGES) {
        if (appCount < badge.minApps) return badge;
    }
    return null; // already at max
}
