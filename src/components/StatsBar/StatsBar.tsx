import type { VibeApp } from '../../types/app';

interface StatsBarProps {
  apps: VibeApp[];
}

export const StatsBar = ({ apps }: StatsBarProps) => {
  const stats = [
    { label: 'Apps Listed', value: apps.length.toString() },
    { label: 'Creators', value: new Set(apps.map(a => a.author.name)).size.toString() },
    { label: 'Total Upvotes', value: apps.reduce((s, a) => s + a.upvotes, 0).toLocaleString() },
    { label: 'Categories', value: new Set(apps.map(a => a.category)).size.toString() },
  ];

  return (
  <div
    aria-label="Platform statistics"
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: '1px',
      background: 'var(--border-subtle)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      marginBottom: 'var(--space-12)',
    }}
  >
    {stats.map(({ label, value }) => (
      <div
        key={label}
        style={{
          background: 'var(--bg-surface)',
          padding: 'var(--space-6) var(--space-4)',
          textAlign: 'center',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 800,
          background: 'var(--gradient-neon)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 'var(--space-1)',
        }}>
          {value}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', fontWeight: 500 }}>
          {label}
        </div>
      </div>
    ))}
  </div>
);
};
