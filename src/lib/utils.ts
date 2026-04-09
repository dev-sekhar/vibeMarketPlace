/**
 * Only allow http: and https: URL schemes.
 * Returns '#' for javascript:, data:, vbscript:, or malformed URLs.
 */
export const sanitizeUrl = (url: string | undefined | null): string => {
    if (!url) return '#';
    try {
        const { protocol } = new URL(url);
        return protocol === 'http:' || protocol === 'https:' ? url : '#';
    } catch {
        return '#';
    }
};
