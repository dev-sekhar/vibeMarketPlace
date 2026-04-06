import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GripHorizontal } from 'lucide-react';
import type { VibeApp } from '../../types/app';

interface StatsBarProps {
  apps: VibeApp[];
  paperCount?: number;
}

export const StatsBar = ({ apps, paperCount = 0 }: StatsBarProps) => {
  const { t } = useTranslation();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPos({
      x: Math.max(16, window.innerWidth - 540),
      y: Math.max(80, window.innerHeight - 160),
    });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    setIsDragging(true);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      const h = containerRef.current.offsetHeight;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - w, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - h, e.clientY - offset.current.y)),
      });
    };
    const onUp = () => {
      dragging.current = false;
      setIsDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const stats = [
    { label: t('stats.appsListed'), value: apps.length.toString() },
    { label: t('stats.creators'), value: new Set(apps.map(a => a.author.name)).size.toString() },
    { label: t('stats.totalUpvotes'), value: apps.reduce((s, a) => s + a.upvotes, 0).toLocaleString() },
    { label: t('stats.categories'), value: new Set(apps.map(a => a.category)).size.toString() },
    { label: t('stats.papers'), value: paperCount.toString() },
  ];

  return (
    <div
      ref={containerRef}
      aria-label="Platform statistics"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 900,
        userSelect: 'none',
        background: 'linear-gradient(135deg, rgba(10,3,30,0.95), rgba(25,8,60,0.95))',
        border: '1px solid rgba(168,85,247,0.55)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 0 48px rgba(168,85,247,0.40), 0 8px 40px rgba(0,0,0,0.55)',
        minWidth: 460,
        transition: isDragging ? 'none' : 'box-shadow 0.2s',
      }}
    >
      {/* ── Drag handle ── */}
      <div
        onMouseDown={onMouseDown}
        style={{
          background: 'rgba(168,85,247,0.14)',
          borderBottom: '1px solid rgba(168,85,247,0.22)',
          padding: '5px 14px',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        title="Drag to reposition"
      >
        <GripHorizontal size={14} style={{ color: 'rgba(168,85,247,0.75)', pointerEvents: 'none' }} />
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(200,160,255,0.8)',
            fontSize: 13,
            padding: '2px 6px',
            lineHeight: 1,
            borderRadius: 4,
          }}
          title={collapsed ? 'Expand stats' : 'Minimise stats'}
          aria-label={collapsed ? 'Expand stats' : 'Minimise stats'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {/* ── Stats grid ── */}
      {!collapsed && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '1px',
          background: 'rgba(168,85,247,0.18)',
        }}>
          {stats.map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: 'rgba(10,3,30,0.90)',
                padding: '14px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 800,
                background: 'var(--gradient-neon)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: 3,
              }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(200,175,255,0.72)', fontWeight: 500 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
