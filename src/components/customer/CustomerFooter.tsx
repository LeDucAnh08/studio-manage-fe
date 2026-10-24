import { Link } from 'react-router-dom';
import { clientPortalEnabled } from '../../config/features';
import '../../styles/customer-shell.css';

const groups = [
  {
    title: 'Hỗ trợ',
    links: [
      { to: '/services#process', label: 'Quy trình đặt dịch vụ' },
      { to: '/feedback', label: 'Gửi phản hồi' },
    ],
  },
  {
    title: 'Dịch vụ',
    links: [
      { to: '/services', label: 'Dịch vụ chụp ảnh' },
      { to: '/concepts', label: 'Concept chụp' },
      { to: '/costumes', label: 'Trang phục & phụ kiện' },
    ],
  },
  {
    title: 'Yume Studio',
    links: [
      { to: '/portfolio#about', label: 'Về studio' },
      { to: '/pricing', label: 'Báo giá' },
    ],
  },
];

export function CustomerFooter({
  minimal = false,
  account = false,
}: {
  minimal?: boolean;
  account?: boolean;
}) {
  return (
    <footer className={`customer-footer${minimal ? ' customer-footer--minimal' : ''}`}>
      <div className="customer-container customer-container--editorial">
        {account && (
          <nav className="customer-footer__account" aria-label="Khám phá và đặt dịch vụ">
            {clientPortalEnabled && <Link to="/account/bookings/new">Đặt dịch vụ</Link>}
            <Link to="/services">Dịch vụ</Link>
            <Link to="/pricing">Bảng giá</Link>
            <Link to="/account/orders">Đơn của tôi</Link>
            <Link to="/costumes">Trang phục & phụ kiện</Link>
          </nav>
        )}
        {!minimal && (
          <div className="customer-footer__groups">
            {groups.map((group) => (
              <section key={group.title}>
                <h2 className="customer-footer__heading">{group.title}</h2>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        <div className="customer-footer__legal">
          <p>© {new Date().getFullYear()} Yume Studio. Mọi quyền được bảo lưu.</p>
          {minimal && (
            <nav aria-label="Hỗ trợ khách hàng">
              <Link to="/pricing">Báo giá</Link>
              <Link to="/feedback">Gửi phản hồi</Link>
            </nav>
          )}
          {!minimal && <Link to="/portfolio#top">Yume Studio</Link>}
        </div>
      </div>
    </footer>
  );
}
