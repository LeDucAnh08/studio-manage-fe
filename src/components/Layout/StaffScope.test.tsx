import { createPortal } from 'react-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import StaffScope from './StaffScope';
import CustomerScope from '../customer/CustomerScope';

function StaffPage() {
  return (
    <>
      <h1>Nội bộ</h1>
      <Link to="/public">Xem trang khách</Link>
      {createPortal(<p>Overlay nội bộ</p>, document.body)}
    </>
  );
}

describe('Staff theme route boundary', () => {
  it('scopes portals at the root, cleans up on customer navigation and reapplies on return', () => {
    const view = render(
      <MemoryRouter initialEntries={['/staff']}>
        <Routes>
          <Route element={<StaffScope />}>
            <Route path="/staff" element={<StaffPage />} />
          </Route>
          <Route element={<CustomerScope />}>
            <Route path="/public" element={<Link to="/staff">Về nội bộ</Link>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(document.documentElement).toHaveAttribute('data-app-surface', 'staff');
    expect(screen.getByText('Overlay nội bộ').parentElement).toBe(document.body);
    fireEvent.click(screen.getByRole('link', { name: 'Xem trang khách' }));
    expect(document.documentElement).not.toHaveAttribute('data-app-surface');
    expect(screen.queryByText('Overlay nội bộ')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Về nội bộ' }).closest('.customer-tokens'),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Về nội bộ' }));
    expect(document.documentElement).toHaveAttribute('data-app-surface', 'staff');
    view.unmount();
    expect(document.documentElement).not.toHaveAttribute('data-app-surface');
  });
});
