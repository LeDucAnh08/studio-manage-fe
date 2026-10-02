import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Layout from './Layout';
import ClientLayout from './ClientLayout';

vi.mock('./Sidebar', () => ({ default: () => <aside aria-label="Menu quản trị" /> }));
vi.mock('../atoms', () => ({ Logo: () => <span aria-hidden="true" /> }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Khách thử' }, logout: vi.fn() }),
}));

describe('layout breadcrumbs', () => {
  it('renders a customer detail breadcrumb above the admin page content', () => {
    render(
      <MemoryRouter initialEntries={['/customers/class-123']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="customers/:id" element={<p>Nội dung khách hàng</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const breadcrumb = screen.getByRole('navigation', { name: 'Đường dẫn' });
    expect(breadcrumb).toHaveTextContent('Khách hàng');
    expect(breadcrumb).toHaveTextContent('Chi tiết khách hàng');
    expect(screen.getByRole('link', { name: 'Khách hàng' })).toHaveAttribute('href', '/customers');
    expect(breadcrumb.compareDocumentPosition(screen.getByText('Nội dung khách hàng'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('does not render the admin breadcrumb in the client layout', () => {
    render(
      <MemoryRouter initialEntries={['/account/bookings']}>
        <Routes>
          <Route path="/account" element={<ClientLayout />}>
            <Route path="bookings" element={<p>Booking của khách</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('navigation', { name: 'Đường dẫn' })).not.toBeInTheDocument();
    expect(screen.getByText('Booking của khách')).toBeInTheDocument();
  });
});
