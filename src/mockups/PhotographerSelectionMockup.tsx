import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  HashRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Camera, Check, Clock3, Tag } from 'lucide-react';
import Logo from '../components/atoms/Logo';
import PhotographerPortfolio from '../components/PhotographerPortfolio';
import type { PublicPhotographer } from '../services/conceptService';
import '../index.css';
import '../styles/customer.css';
import './photographer-selection-mockup.css';

const people: PublicPhotographer[] = [
  {
    _id: 'minh-duc',
    name: 'Lê Minh Đức',
    portraitUrl: '/images/concepts/photographer-minh-duc.webp',
    title: 'Chân dung & áo dài',
    tagline: 'Tôi thích ánh sáng mềm và những khoảnh khắc tự nhiên.',
    bio: 'Chân dung và áo dài với ánh sáng mềm, đường nét thanh thoát. Hướng dẫn tạo dáng nhẹ nhàng để bạn tự tin trước ống kính.',
    story:
      'Một buổi chụp đẹp bắt đầu khi bạn cảm thấy thoải mái. Tôi cùng bạn tìm những góc chụp nhẹ nhàng, để lưu lại nét riêng và cảm xúc tự nhiên của bạn.',
    approach: [
      {
        title: 'Cùng bạn tìm góc chụp',
        description:
          'Trao đổi trước về phong cách bạn thích, hướng dẫn từng dáng nhỏ và cùng xem lại ảnh trong buổi chụp.',
      },
    ],
    concepts: [
      { _id: 'portrait', name: 'Chân dung cá nhân' },
      { _id: 'aodai', name: 'Áo dài' },
    ],
    portfolio: [
      {
        concept: 'portrait',
        url: '/images/concepts/portrait-01.webp',
        caption: 'Ánh sáng mềm và biểu cảm tự nhiên',
      },
    ],
  },
  {
    _id: 'gia-bao',
    name: 'Nguyễn Gia Bảo',
    portraitUrl: '/images/concepts/photographer-gia-bao.webp',
    title: 'Chân dung & cặp đôi',
    tagline: 'Tôi giúp bạn thoải mái để bộc lộ cảm xúc riêng.',
    bio: 'Ưu tiên cảm xúc tự nhiên trong ảnh chân dung và cặp đôi. Phối màu tinh giản, chú trọng sự gần gũi trong từng khung hình.',
    story:
      'Tôi muốn buổi chụp giống một cuộc trò chuyện. Bạn không cần biết tạo dáng trước; chúng ta sẽ bắt đầu bằng những chuyển động đơn giản và tìm cảm xúc của riêng bạn.',
    approach: [
      {
        title: 'Bắt đầu thật tự nhiên',
        description:
          'Dành thời gian trò chuyện, chọn nhịp chụp phù hợp và hướng dẫn để bạn dễ thể hiện cảm xúc.',
      },
    ],
    concepts: [
      { _id: 'portrait', name: 'Chân dung cá nhân' },
      { _id: 'couple', name: 'Cặp đôi' },
    ],
    portfolio: [
      {
        concept: 'portrait',
        url: '/images/concepts/portrait-02.webp',
        caption: 'Khoảnh khắc gần gũi trong studio',
      },
    ],
  },
];

function ProfilePreview({
  onChoose,
  timeLabel,
}: {
  onChoose: (id: string) => void;
  timeLabel: string;
}) {
  const { id } = useParams();
  const person = people.find((item) => item._id === id);
  if (!person) return <Link to="/">Quay lại chọn thợ</Link>;
  return (
    <main className="photographer-page psm-profile">
      <Link className="psm-back app-back-link" to="/">
        <ArrowLeft size={20} />
        Quay lại chọn thợ
      </Link>
      <PhotographerPortfolio
        profile={person}
        actions={
          <div className="photographer-select">
            <button className="psm-primary" onClick={() => onChoose(person._id)}>
              <Check size={20} />
              Chọn {person.name}
            </button>
            <p>Cho buổi chụp ngày 17/11/2026 · {timeLabel}</p>
          </div>
        }
      />
    </main>
  );
}

export default function PhotographerSelectionMockup() {
  const [selected, setSelected] = useState('minh-duc');
  const [time, setTime] = useState('09:00');
  const navigate = useNavigate();
  const location = useLocation();
  const person = people.find((item) => item._id === selected)!;
  const endTime = `${String(Number(time.slice(0, 2)) + 1).padStart(2, '0')}:00`;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="customer-tokens customer-ui psm">
      <header className="psm-header">
        <Link to="/" className="psm-brand">
          <Logo size={36} appearance="customer" />
          <span>Yume Studio</span>
        </Link>
        <div className="psm-header-actions">
          <Link to="/" className="psm-primary">
            Đặt lịch
          </Link>
          <a href="/login">Đăng nhập</a>
        </div>
      </header>
      <Routes>
        <Route
          path="/"
          element={
            <main className="psm-main">
              <div className="psm-topline">
                <Link to="/time" className="psm-back app-back-link">
                  <ArrowLeft size={22} />
                  Quay lại chọn thời gian
                </Link>
                <span>Chọn thợ chụp</span>
              </div>
              <h1>Chọn người kể câu chuyện của bạn</h1>
              <p className="psm-intro">Hai thợ chụp có thể nhận lịch bạn đã chọn.</p>
              <section className="psm-session" aria-label="Buổi chụp đã chọn">
                <div>
                  <Camera aria-hidden="true" />
                  <strong>Chân dung Tự nhiên</strong>
                </div>
                <div>
                  <CalendarDays aria-hidden="true" />
                  <span>
                    <strong>Thứ Ba, 17 tháng 11, 2026</strong>
                    <small>
                      {time}–{endTime}
                    </small>
                  </span>
                </div>
                <div>
                  <Clock3 aria-hidden="true" />
                  <span>60 phút</span>
                </div>
                <div>
                  <Tag aria-hidden="true" />
                  <strong>900.000 đ</strong>
                </div>
              </section>
              <section className="psm-grid" aria-label="Thợ chụp nhận lịch này">
                {people.map((item) => (
                  <article
                    key={item._id}
                    className="psm-card"
                    data-selected={selected === item._id}
                    aria-labelledby={`name-${item._id}`}
                  >
                    <img
                      className="psm-portrait"
                      src={item.portraitUrl}
                      alt={`Chân dung ${item.name}`}
                      width={900}
                      height={1125}
                    />
                    <div className="psm-identity">
                      {selected === item._id && (
                        <span className="psm-selected">
                          <Check size={20} aria-hidden="true" />
                          Đã chọn
                        </span>
                      )}
                      <h2 id={`name-${item._id}`}>{item.name}</h2>
                      <p className="psm-quote">“{item.tagline}”</p>
                      <p className="psm-specialty">
                        <Camera size={24} aria-hidden="true" />
                        {item.title}
                      </p>
                      <Link
                        className="psm-profile-link"
                        to={`/profile/${item._id}`}
                        aria-label={`Xem hồ sơ ${item.name}`}
                      >
                        Xem hồ sơ
                        <ArrowRight size={22} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))}
              </section>
              <footer className="psm-decision">
                <strong role="status">Đã chọn {person.name}</strong>
                <div>
                  <span>Tiếp theo: thông tin buổi chụp</span>
                  <Link className="psm-primary" to="/preparation">
                    Tiếp tục
                    <ArrowRight size={22} aria-hidden="true" />
                  </Link>
                </div>
              </footer>
            </main>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProfilePreview
              timeLabel={`${time}–${endTime}`}
              onChoose={(id) => {
                setSelected(id);
                navigate('/');
              }}
            />
          }
        />
        <Route
          path="/time"
          element={
            <main className="psm-secondary">
              <Link className="psm-back app-back-link" to="/">
                <ArrowLeft size={20} />
                Quay lại chọn thợ
              </Link>
              <h1>Chọn thời gian buổi chụp</h1>
              <p>Chân dung Tự nhiên · Thứ Ba, 17/11/2026 · 60 phút</p>
              <div className="psm-times" role="group" aria-label="Khung giờ chụp">
                {['09:00', '10:00', '14:00'].map((value) => (
                  <button key={value} aria-pressed={time === value} onClick={() => setTime(value)}>
                    {value}
                  </button>
                ))}
              </div>
              <button className="psm-primary" onClick={() => navigate('/')}>
                Tiếp tục chọn thợ
                <ArrowRight size={20} />
              </button>
            </main>
          }
        />
        <Route
          path="/preparation"
          element={
            <main className="psm-secondary">
              <Link className="psm-back app-back-link" to="/">
                <ArrowLeft size={20} />
                Quay lại chọn thợ
              </Link>
              <h1>Thông tin buổi chụp</h1>
              <p>
                {person.name} · 17/11/2026 · {time}–{endTime}
              </p>
              <div className="psm-form">
                <label>
                  Họ tên liên hệ
                  <input autoComplete="name" placeholder="Nhập họ tên của bạn" />
                </label>
                <label>
                  Số điện thoại
                  <input type="tel" autoComplete="tel" placeholder="Nhập số điện thoại" />
                </label>
                <label>
                  Ý tưởng buổi chụp
                  <textarea
                    placeholder="Chia sẻ phong cách và những điều bạn mong muốn…"
                    rows={4}
                  />
                </label>
              </div>
            </main>
          }
        />
      </Routes>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <PhotographerSelectionMockup />
  </HashRouter>,
);
import.meta.hot?.dispose(() => root.unmount());
