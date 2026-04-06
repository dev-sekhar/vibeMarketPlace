import type { ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

function cls(variant: Variant, size: Size, iconOnly: boolean, extra = '') {
    return [styles.btn, styles[variant], styles[size], iconOnly ? styles.iconOnly : '', extra]
        .filter(Boolean)
        .join(' ');
}

// ── <Button> for <button> elements ──────────────────────────────────────────

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    iconOnly?: boolean;
}

export function Button({
    variant = 'secondary',
    size = 'md',
    iconOnly = false,
    className = '',
    type = 'button',
    ...props
}: ButtonProps) {
    return <button type={type} className={cls(variant, size, iconOnly, className)} {...props} />;
}

// ── <ButtonLink> for React Router <Link> ────────────────────────────────────

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
    variant?: Variant;
    size?: Size;
    iconOnly?: boolean;
}

export function ButtonLink({
    variant = 'primary',
    size = 'md',
    iconOnly = false,
    className = '',
    ...props
}: ButtonLinkProps) {
    return <Link className={cls(variant, size, iconOnly, className as string)} {...props} />;
}

// ── <ButtonAnchor> for plain <a> elements ────────────────────────────────────

export interface ButtonAnchorProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    variant?: Variant;
    size?: Size;
    iconOnly?: boolean;
}

export function ButtonAnchor({
    variant = 'secondary',
    size = 'md',
    iconOnly = false,
    className = '',
    ...props
}: ButtonAnchorProps) {
    return <a className={cls(variant, size, iconOnly, className)} {...props} />;
}
