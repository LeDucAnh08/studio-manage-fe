import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '../types';
import PortfolioPage from './PortfolioPage';

const auth = vi.hoisted(() => ({
  user: { roles: [1] } as User | null,
  isAuthenticated: true,
  logout: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../config/features', () => ({ clientPortalEnabled: true, conceptBookingEnabled: true }));
vi.mock('../services/customerService', () => ({
  customerService: { portfolioStats: vi.fn().mockResolvedValue({ classes: 28, schools: 12 }) },
}));

describe('Portfolio session navigation', () => {
  it('removes all service links and both navigation menus when the session ends', async () => {
    const view = render(
      <MemoryRouter>
        <PortfolioPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('28+')).toBeInTheDocument());
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở menu điều hướng' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tra cứu trang phục' })).toHaveAttribute(
      'href',
      '/costumes',
    );
    expect(screen.getByRole('link', { name: 'Gửi phản hồi' })).toBeInTheDocument();

    auth.user = null;
    auth.isAuthenticated = false;
    view.rerender(
      <MemoryRouter>
        <PortfolioPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /Lưu giữ thanh xuân/ })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mở menu điều hướng' })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Đăng nhập' }),
    ).toBeInTheDocument();
    for (const link of screen.getAllByRole('link')) {
      expect(['#main-content', '/portfolio', '/login']).toContain(link.getAttribute('href'));
    }
  });
});
