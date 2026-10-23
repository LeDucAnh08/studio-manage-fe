import { Link } from 'react-router-dom';
import '../../styles/customer-shell.css';

const groups = [
  {
    title: 'Hỗ trợ',
    links: [
      { to: '/consultation', label: 'Nhận tư vấn' },
      { to: '/portfolio#process', label: 'Quy trình đặt dịch vụ' },
      { to: '/portfolio#feedback', label: 'Gửi phản hồi' },
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
      { to: '/portfolio#contact', label: 'Liên hệ' },
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
            <Link to="/booking/start?source=account">Đặt dịch vụ</Link>
            <Link to="/portfolio#packages">Khám phá dịch vụ</Link>
            <Link to="/rental-catalog">Trang phục & phụ kiện</Link>
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
              <Link to="/consultation">Nhận tư vấn</Link>
            </nav>
          )}
          {!minimal && <Link to="/portfolio#top">Yume Studio</Link>}
        </div>
      </div>
    </footer>
  );
}
