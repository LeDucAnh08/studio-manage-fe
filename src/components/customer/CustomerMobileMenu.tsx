import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { CustomerButton } from './CustomerButton';
import '../../styles/customer-menu.css';

export function CustomerMobileMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname, search, hash } = useLocation();
  useEffect(() => setOpen(false), [pathname, search, hash]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1128px)');
    const closeOnResize = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener('change', closeOnResize);
    return () => desktop.removeEventListener('change', closeOnResize);
  }, []);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <CustomerButton
          variant="secondary"
          className="customer-menu__trigger"
          aria-label="Mở menu điều hướng"
        >
          <Menu aria-hidden="true" />
        </CustomerButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="customer-menu__overlay" />
        <Dialog.Content
          className="customer-menu customer-tokens"
          aria-describedby={undefined}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a[href], button')) setOpen(false);
          }}
        >
          <div className="customer-menu__heading">
            <Dialog.Title>Điều hướng</Dialog.Title>
            <Dialog.Close asChild>
              <CustomerButton variant="text" aria-label="Đóng menu điều hướng">
                <X aria-hidden="true" />
              </CustomerButton>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
