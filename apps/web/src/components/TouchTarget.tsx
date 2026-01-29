import { type ReactNode, type ComponentPropsWithoutRef } from 'react';

/**
 * Props for the TouchTarget component.
 * Enforces minimum tap target size for accessibility compliance.
 */
export interface TouchTargetProps {
  /** Content to render inside the touch target */
  children: ReactNode;
  /** Additional CSS classes to apply */
  className?: string;
  /** HTML element type to render (default: 'div') */
  as?: 'button' | 'a' | 'div';
}

/** Combined props for button variant */
type ButtonTargetProps = TouchTargetProps & {
  as: 'button';
} & Omit<ComponentPropsWithoutRef<'button'>, keyof TouchTargetProps>;

/** Combined props for anchor variant */
type AnchorTargetProps = TouchTargetProps & {
  as: 'a';
} & Omit<ComponentPropsWithoutRef<'a'>, keyof TouchTargetProps>;

/** Combined props for div variant */
type DivTargetProps = TouchTargetProps & {
  as?: 'div';
} & Omit<ComponentPropsWithoutRef<'div'>, keyof TouchTargetProps>;

/** Union type of all possible TouchTarget prop combinations */
type TouchTargetAllProps = ButtonTargetProps | AnchorTargetProps | DivTargetProps;

/**
 * TouchTarget - Accessible wrapper ensuring minimum tap target size.
 *
 * Enforces 44x44px minimum touch target following iOS Human Interface Guidelines
 * and Android Material Design specs. Prevents accidental double-tap zoom and
 * centers child content for optimal touch interaction.
 *
 * @example
 * ```tsx
 * // Wrap a small icon button
 * <TouchTarget as="button" onClick={handleClick}>
 *   <Icon size={16} />
 * </TouchTarget>
 *
 * // Wrap a link with custom classes
 * <TouchTarget as="a" href="/path" className="text-blue-600 hover:text-blue-700">
 *   <span>Small Link Text</span>
 * </TouchTarget>
 *
 * // Wrap any interactive element
 * <TouchTarget className="rounded-lg hover:bg-slate-100">
 *   <SmallInteractiveElement />
 * </TouchTarget>
 * ```
 *
 * @remarks
 * **Accessibility Guidelines Referenced:**
 * - iOS: 44x44pt minimum tap target (Human Interface Guidelines)
 * - Android: 48x48dp minimum tap target (Material Design)
 * - W3C: WCAG 2.5.5 Target Size (Level AAA) - 44×44 CSS pixels
 *
 * @param props - Component props including children, className, and polymorphic 'as' prop
 * @returns A wrapper element enforcing minimum touch target dimensions
 */
export function TouchTarget(props: TouchTargetAllProps) {
  const { children, className = '', as: Component = 'div', ...rest } = props;

  const baseClasses = 'inline-flex items-center justify-center min-w-[44px] min-h-[44px] touch-manipulation';
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  if (Component === 'button') {
    return (
      <button
        className={combinedClasses}
        type="button"
        {...(rest as ComponentPropsWithoutRef<'button'>)}
      >
        {children}
      </button>
    );
  }

  if (Component === 'a') {
    return (
      <a
        className={combinedClasses}
        {...(rest as ComponentPropsWithoutRef<'a'>)}
      >
        {children}
      </a>
    );
  }

  return (
    <div
      className={combinedClasses}
      {...(rest as ComponentPropsWithoutRef<'div'>)}
    >
      {children}
    </div>
  );
}
