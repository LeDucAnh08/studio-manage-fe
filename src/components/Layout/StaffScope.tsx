import { useLayoutEffect } from 'react';
import { Outlet } from 'react-router-dom';
import '../../styles/admin-staff.css';

export default function StaffScope() {
  useLayoutEffect(() => {
    // Root scope also reaches Radix portals mounted under body.
    const root = document.documentElement;
    const previous = root.getAttribute('data-app-surface');
    root.setAttribute('data-app-surface', 'staff');
    return () => {
      if (previous === null) root.removeAttribute('data-app-surface');
      else root.setAttribute('data-app-surface', previous);
    };
  }, []);

  return <Outlet />;
}
