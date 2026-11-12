import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { Bell, Camera, GraduationCap, Shirt, UserRound } from 'lucide-react';
import { toast } from 'react-toastify';
import Logo from '../components/atoms/Logo';
import { CustomerContainer } from '../components/customer/CustomerContainer';
import { CustomerMobileMenu } from '../components/customer/CustomerMobileMenu';
import { CustomerButton } from '../components/customer/CustomerButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { DepositCheckout } from '../components/customer/DepositCheckout';
import '../index.css';
import '../styles/customer.css';
import '../styles/customer-orders-workspace.css';

type Service = 'rental' | 'concept' | 'yearbook';
type PreviewState = 'waiting' | 'partial' | 'paid' | 'expired';
const services = {
  rental: {
    label: 'Thuê trang phục',
    icon: Shirt,
    title: 'Áo dài hồng phấn tay lỡ',
    description: '3 bộ · Cỡ M · 2 ngày thuê',
    totalLabel: 'Tổng tiền thuê',
    total: 690000,
    deposit: 207000,
    reference: 'RENT8D43F1C90A72B65E',
    shortId: 'YT-261121-008',
    fields: [
      ['Ngày nhận', '21/11/2026'],
      ['Ngày trả', '22/11/2026'],
      ['Nhận & trả tại', 'Yume Studio'],
    ],
    confirm: 'Trang phục được giữ ngay khi hệ thống nhận đủ cọc.',
    remainingNote: 'Thanh toán trước khi nhận trang phục.',
  },
  concept: {
    label: 'Chụp concept',
    icon: Camera,
    title: 'Chân dung Tự nhiên',
    description: 'Concept Tự nhiên · 1 người',
    totalLabel: 'Tổng giá gói',
    total: 900000,
    deposit: 270000,
    reference: 'CONC4E53A1C90A72B65F',
    shortId: 'YC-261114-012',
    fields: [
      ['Ngày chụp', '14/11/2026'],
      ['Khung giờ', '14:00–15:00'],
      ['Thợ chụp', 'Lê Minh Đức'],
    ],
    confirm: 'Lịch chụp được xác nhận ngay khi hệ thống nhận đủ cọc.',
    remainingNote: 'Thanh toán theo tiến độ trong hồ sơ đơn.',
  },
  yearbook: {
    label: 'Chụp kỉ yếu',
    icon: GraduationCap,
    title: 'Kỷ yếu Sân trường',
    description: 'Lớp 12A1 · 35 thành viên',
    totalLabel: 'Tổng giá gói',
    total: 10500000,
    deposit: 3150000,
    reference: 'YUME6B42D1C90A72B65A',
    shortId: 'YK-261122-006',
    fields: [
      ['Ngày chụp', '22/11/2026'],
      ['Khung giờ', '07:00–11:00'],
      ['Địa điểm', 'Sân trường'],
    ],
    confirm: 'Lịch chụp được xác nhận ngay khi hệ thống nhận đủ cọc.',
    remainingNote: 'Thanh toán theo tiến độ trong hồ sơ đơn.',
  },
} as const;
const stateLabels: Record<PreviewState, string> = {
  waiting: 'Chờ thanh toán',
  partial: 'Đã nhận một phần',
  paid: 'Đã nhận đủ cọc',
  expired: 'Hết hạn thanh toán',
};
const bank = { name: 'MBBank', holder: 'YUME STUDIO', account: '012345678900' };
const navbarLinks = [
  { href: '/concept-booking', label: 'Chụp concept' },
  { href: '/account/bookings/new', label: 'Chụp kỉ yếu' },
  { href: '/costumes', label: 'Trang phục' },
  { href: '/pricing', label: 'Bảng giá' },
  { href: '/account/orders', label: 'Đơn của tôi' },
];
const deadlineKey = (service: Service) => `yume-unified-deposit-mockup-v2:${service}`;
function getDeadline(service: Service, reset = false) {
  const saved = Number(sessionStorage.getItem(deadlineKey(service)));
  const deadline = !reset && saved > 0 ? saved : Date.now() + 15 * 60000;
  sessionStorage.setItem(deadlineKey(service), String(deadline));
  return deadline;
}
const params = new URLSearchParams(location.search);
const serviceParam = params.get('service') || '';
const stateParam = params.get('state') || '';
const initialService: Service = Object.prototype.hasOwnProperty.call(services, serviceParam)
  ? (serviceParam as Service)
  : 'rental';
const initialState: PreviewState = Object.prototype.hasOwnProperty.call(stateLabels, stateParam)
  ? (stateParam as PreviewState)
  : 'waiting';

export function DepositPaymentMockup() {
  const service = initialService;
  const item = services[service];
  const [deadline] = useState(() =>
    initialState === 'expired' ? Date.now() - 1000 : getDeadline(service),
  );
  const paid = initialState === 'paid';
  const received = paid
    ? item.deposit
    : initialState === 'partial'
      ? Math.floor(item.deposit / 2)
      : 0;
  const showToast = (message: string) => toast.info(message);
  return (
    <div className="customer-ui customer-tokens customer-shell">
      <header className="customer-header customer-header--public customer-header--notifications">
        <CustomerContainer className="customer-header__row">
          <a href="/account/orders" className="customer-brand">
            <Logo size={36} appearance="customer" />
            <span className="customer-brand__name">Yume Studio</span>
          </a>
          <nav className="customer-header__nav" aria-label="Tài khoản khách hàng">
            {navbarLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="customer-nav-link"
                aria-current={link.href === '/account/orders' ? 'page' : undefined}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="customer-header__utilities">
            <div className="customer-header__booking" />
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="customer-orders-notifications__trigger"
                  aria-label="Thông báo"
                >
                  <Bell size={22} aria-hidden="true" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="customer-ui customer-tokens customer-orders-notifications"
                  align="end"
                  sideOffset={12}
                  collisionPadding={16}
                  aria-label="Thông báo của bạn"
                >
                  <header>
                    <h2>Thông báo</h2>
                  </header>
                  <p>Chưa có thông báo mới.</p>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="customer-nav-link customer-header__account"
                  aria-label="Tài khoản"
                  title="Tài khoản"
                >
                  <UserRound size={22} aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="customer-tokens customer-account-menu"
              >
                <DropdownMenuItem asChild className="customer-account-menu__item">
                  <a href="/account/profile">Hồ sơ</a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="customer-account-menu__item"
                  onSelect={() => showToast('Bản duyệt không thay đổi phiên đăng nhập của bạn.')}
                >
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CustomerMobileMenu>
            <p className="customer-menu__username">Nguyễn Mai Anh</p>
            <nav aria-label="Điều hướng chính trên điện thoại" className="customer-menu__links">
              {navbarLinks.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
              <a href="/account/profile">Hồ sơ</a>
            </nav>
            <CustomerButton
              variant="secondary"
              onClick={() => showToast('Bản duyệt không thay đổi phiên đăng nhập của bạn.')}
            >
              Đăng xuất
            </CustomerButton>
          </CustomerMobileMenu>
        </CustomerContainer>
      </header>
      <CustomerContainer as="main" className="customer-shell__main customer-shell__main--account">
        <DepositCheckout
          service={service}
          orderId={item.shortId}
          title={item.title}
          description={item.description}
          fields={[
            ...item.fields.map(([label, value]): [string, string] => [label, value]),
            ['Người liên hệ', 'Nguyễn Mai Anh'],
          ]}
          total={item.total}
          totalLabel={item.totalLabel}
          deposit={item.deposit}
          depositNote="Cọc trước 30% · Được trừ vào tổng tiền"
          remaining={item.total - item.deposit}
          remainingNote={item.remainingNote}
          confirmation={item.confirm}
          payment={{
            provider: 'sepay',
            mode: 'sandbox',
            reference: item.reference,
            bankName: bank.name,
            accountName: bank.holder,
            accountNumber: bank.account,
            amount: item.deposit - received,
            depositRequired: item.deposit,
            expiresAt: new Date(deadline).toISOString(),
            status: paid ? 'paid' : 'pending',
            qrUrl: '/mockups/deposit-qr-preview.png',
            downloadUrl: '/mockups/deposit-qr-preview.png',
          }}
          state={paid ? 'paid' : initialState === 'expired' ? 'expired' : undefined}
          backTo="/account/orders"
          backLabel="Đơn của tôi"
          profileTo="/account/orders"
          restartTo={
            service === 'rental'
              ? '/costumes'
              : service === 'concept'
                ? '/concept-booking'
                : '/account/bookings/new'
          }
          onReload={() => window.location.reload()}
        />
      </CustomerContainer>
    </div>
  );
}
const root = createRoot(document.getElementById('root')!);
root.render(
  <BrowserRouter>
    <DepositPaymentMockup />
  </BrowserRouter>,
);
import.meta.hot?.dispose(() => root.unmount());
