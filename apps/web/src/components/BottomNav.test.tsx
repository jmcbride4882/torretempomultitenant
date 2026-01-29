import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test-utils';
import { BottomNav, type BottomNavItem } from './BottomNav';
import { Role } from '@torre-tempo/shared';

describe('BottomNav', () => {
  const mockNavItems: BottomNavItem[] = [
    { path: '/app/dashboard', label: 'Dashboard', icon: 'home', roles: [Role.EMPLOYEE] },
    { path: '/app/clock', label: 'Clock', icon: 'clock', roles: [Role.EMPLOYEE] },
    { path: '/app/approvals', label: 'Approvals', icon: 'check', roles: [Role.MANAGER] },
    { path: '/app/reports', label: 'Reports', icon: 'document', roles: [Role.MANAGER] },
  ];

  it('renders navigation items', () => {
    const onNavigate = vi.fn();
    render(
      <BottomNav
        navItems={mockNavItems}
        currentPath="/app/dashboard"
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Clock')).toBeInTheDocument();
    expect(screen.getByText('Approvals')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    const onNavigate = vi.fn();
    render(
      <BottomNav
        navItems={mockNavItems}
        currentPath="/app/dashboard"
        onNavigate={onNavigate}
      />
    );

    const dashboardButton = screen.getByText('Dashboard').closest('button');
    expect(dashboardButton).toHaveClass('bg-blue-50');
    expect(dashboardButton).toHaveClass('text-blue-700');
    expect(dashboardButton).toHaveAttribute('aria-current', 'page');
  });

  it('does not highlight inactive navigation items', () => {
    const onNavigate = vi.fn();
    render(
      <BottomNav
        navItems={mockNavItems}
        currentPath="/app/dashboard"
        onNavigate={onNavigate}
      />
    );

    const clockButton = screen.getByText('Clock').closest('button');
    expect(clockButton).not.toHaveClass('bg-blue-50');
    expect(clockButton).toHaveClass('text-slate-500');
    expect(clockButton).not.toHaveAttribute('aria-current');
  });

  it('calls onNavigate when item clicked', async () => {
    const onNavigate = vi.fn();
    const { user } = render(
      <BottomNav
        navItems={mockNavItems}
        currentPath="/app/dashboard"
        onNavigate={onNavigate}
      />
    );

    await user.click(screen.getByText('Clock'));
    expect(onNavigate).toHaveBeenCalledWith('/app/clock');
  });

  it('calls onNavigate with correct path for each item', async () => {
    const onNavigate = vi.fn();
    const { user } = render(
      <BottomNav
        navItems={mockNavItems}
        currentPath="/app/dashboard"
        onNavigate={onNavigate}
      />
    );

    await user.click(screen.getByText('Approvals'));
    expect(onNavigate).toHaveBeenCalledWith('/app/approvals');

    await user.click(screen.getByText('Reports'));
    expect(onNavigate).toHaveBeenCalledWith('/app/reports');
  });

  it('renders with maximum 5 items', () => {
    const manyItems: BottomNavItem[] = [
      { path: '/app/1', label: 'Item 1', icon: 'home', roles: [Role.EMPLOYEE] },
      { path: '/app/2', label: 'Item 2', icon: 'clock', roles: [Role.EMPLOYEE] },
      { path: '/app/3', label: 'Item 3', icon: 'check', roles: [Role.EMPLOYEE] },
      { path: '/app/4', label: 'Item 4', icon: 'document', roles: [Role.EMPLOYEE] },
      { path: '/app/5', label: 'Item 5', icon: 'location', roles: [Role.EMPLOYEE] },
      { path: '/app/6', label: 'Item 6', icon: 'user', roles: [Role.EMPLOYEE] },
    ];

    const onNavigate = vi.fn();
    render(
      <BottomNav
        navItems={manyItems}
        currentPath="/app/1"
        onNavigate={onNavigate}
      />
    );

    // Should only render first 5 items
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 5')).toBeInTheDocument();
    expect(screen.queryByText('Item 6')).not.toBeInTheDocument();
  });

  it('handles empty navItems array', () => {
    const onNavigate = vi.fn();
    render(
      <BottomNav
        navItems={[]}
        currentPath="/app/dashboard"
        onNavigate={onNavigate}
      />
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav.querySelectorAll('button')).toHaveLength(0);
  });

  it('renders with correct accessibility attributes', () => {
    const onNavigate = vi.fn();
    render(
      <BottomNav
        navItems={mockNavItems}
        currentPath="/app/dashboard"
        onNavigate={onNavigate}
      />
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Mobile navigation');

    const activeButton = screen.getByText('Dashboard').closest('button');
    expect(activeButton).toHaveAttribute('aria-current', 'page');
  });

  it('renders correct icon for each navigation item', () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <BottomNav
        navItems={mockNavItems}
        currentPath="/app/dashboard"
        onNavigate={onNavigate}
      />
    );

    // Each button should have an SVG icon
    const buttons = container.querySelectorAll('button');
    buttons.forEach((button: Element) => {
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('applies hover styles correctly', () => {
    const onNavigate = vi.fn();
    render(
      <BottomNav
        navItems={mockNavItems}
        currentPath="/app/dashboard"
        onNavigate={onNavigate}
      />
    );

    const clockButton = screen.getByText('Clock').closest('button');
    expect(clockButton).toHaveClass('hover:bg-slate-50');
    expect(clockButton).toHaveClass('active:bg-slate-100');
  });

  it('handles different active paths correctly', () => {
    const onNavigate = vi.fn();
    const { rerender } = render(
      <BottomNav
        navItems={mockNavItems}
        currentPath="/app/dashboard"
        onNavigate={onNavigate}
      />
    );

    // Check Dashboard is active
    let dashboardButton = screen.getByText('Dashboard').closest('button');
    expect(dashboardButton).toHaveAttribute('aria-current', 'page');

    // Rerender with different active path
    rerender(
      <BottomNav
        navItems={mockNavItems}
        currentPath="/app/clock"
        onNavigate={onNavigate}
      />
    );

    // Check Clock is now active
    const clockButton = screen.getByText('Clock').closest('button');
    expect(clockButton).toHaveAttribute('aria-current', 'page');

    // Check Dashboard is no longer active
    dashboardButton = screen.getByText('Dashboard').closest('button');
    expect(dashboardButton).not.toHaveAttribute('aria-current');
  });
});
