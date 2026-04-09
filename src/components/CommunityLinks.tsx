import { Share2, MessageCircle, Send } from 'lucide-react';
import type { CommunityLink } from '../types/app';
import { sanitizeUrl } from '../lib/utils';

const PLATFORM_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    slack: {
        icon: <Share2 size={18} />,
        label: 'Slack',
        color: '#0A66C2',
    },
    whatsapp: {
        icon: <MessageCircle size={18} />,
        label: 'WhatsApp',
        color: '#25D366',
    },
    telegram: {
        icon: <Send size={18} />,
        label: 'Telegram',
        color: '#0088cc',
    },
};

interface CommunityLinksProps {
    links?: CommunityLink[];
}

export const CommunityLinks = ({ links }: CommunityLinksProps) => {
    if (!links || links.length === 0) return null;

    return (
        <div style={{ marginTop: 'var(--space-10)', paddingTop: 'var(--space-8)', borderTop: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                Join the Community
            </h3>
            <div style={{
                display: 'flex',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
            }}>
                {links.map((link) => {
                    const config = PLATFORM_CONFIG[link.platform];
                    if (!config) return null;

                    return (
                        <a
                            key={`${link.platform}-${link.url}`}
                            href={sanitizeUrl(link.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                padding: 'var(--space-2) var(--space-4)',
                                borderRadius: 'var(--radius-full)',
                                background: `${config.color}15`,
                                border: `1px solid ${config.color}44`,
                                color: config.color,
                                fontWeight: 600,
                                fontSize: 'var(--text-sm)',
                                textDecoration: 'none',
                                transition: 'all var(--transition-fast)',
                            }}
                            onMouseEnter={(e) => {
                                const el = e.currentTarget as HTMLAnchorElement;
                                el.style.background = `${config.color}25`;
                                el.style.borderColor = `${config.color}66`;
                            }}
                            onMouseLeave={(e) => {
                                const el = e.currentTarget as HTMLAnchorElement;
                                el.style.background = `${config.color}15`;
                                el.style.borderColor = `${config.color}44`;
                            }}
                        >
                            {config.icon}
                            {config.label}
                        </a>
                    );
                })}
            </div>
        </div>
    );
};
