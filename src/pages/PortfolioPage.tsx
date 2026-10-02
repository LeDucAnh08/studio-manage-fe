import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import tnv07899 from '../assets/images/TNV07899.webp';
import tnv00048 from '../assets/images/TNV00048.webp';
import tnv00817 from '../assets/images/TNV00817.webp';
import tnv03816 from '../assets/images/TNV03816.webp';
import tnv05927 from '../assets/images/TNV05927.webp';
import tnv06047 from '../assets/images/TNV06047.webp';
import hdz07441 from '../assets/images/HDZ07441.webp';
import may01381 from '../assets/images/MAY01381.webp';
import pbi00061 from '../assets/images/PBI00061.webp';
import pbi01583 from '../assets/images/PBI01583.webp';
import pbi01850 from '../assets/images/PBI01850.webp';
import tnv00451 from '../assets/images/TNV00451.webp';
import tnv06242 from '../assets/images/TNV06242.webp';
import { toast } from 'react-toastify';
import Logo from '../components/atoms/Logo';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import { useTheme } from '../context/ThemeContext';
import { customerService } from '../services/customerService';
import { feedbackService } from '../services/feedbackService';
import { packageService } from '../services/packageService';
import type { Package } from '../types';

/* ── Static content ──────────────────────────── */

const AboutImage = [
  tnv03816,
  tnv05927,
  tnv07899,
  tnv00817,
  tnv06047,
  hdz07441,
  pbi00061,
  may01381,
  pbi01583,
  pbi01850,
  tnv00451,
  tnv06242,
];
const services = [
  {
    icon: '📷',
    title: 'Chụp ảnh kỷ yếu',
    desc: 'Lưu giữ trọn vẹn năm cuối cấp với những khung hình điện ảnh, concept đa dạng phù hợp từng lớp.',
  },
  {
    icon: '🎬',
    title: 'Quay phim',
    desc: 'Video kỷ yếu chuẩn điện ảnh 4K, dựng theo phong cách MV cùng âm nhạc và màu phim chuyên nghiệp.',
  },
  {
    icon: '🖌️',
    title: 'Hậu kỳ & in ấn',
    desc: 'Ảnh được blend màu chuyên nghiệp, chỉnh sửa theo yêu cầu. Album in cao cấp với giấy ảnh chất lượng, thiết kế tinh tế.',
  },
  {
    icon: '👔',
    title: 'Trang phục',
    desc: 'Hơn 200 mẫu trang phục: cử nhân, áo dài, học sinh, vintage, cosplay… phù hợp đa dạng concept.',
  },
  {
    icon: '🎨',
    title: 'Trang trí & đạo cụ',
    desc: 'Cung cấp các đạo cụ, phông nền, và trang trí phù hợp với từng concept chụp.',
  },
  {
    icon: '💡',
    title: 'Tư vấn & lên ý tưởng',
    desc: 'Đội ngũ tư vấn giàu kinh nghiệm hỗ trợ lớp lên ý tưởng concept, lựa chọn trang phục và địa điểm chụp phù hợp.',
  },
];

const concepts = [
  { tag: 'Cử nhân', tone: 'from-amber-400 to-orange-500', icon: '🎓' },
  { tag: 'Áo dài Việt', tone: 'from-rose-400 to-pink-500', icon: '👘' },
  { tag: 'Cinematic', tone: 'from-cyan-400 to-blue-500', icon: '🎬' },
  { tag: 'Học đường', tone: 'from-emerald-400 to-teal-500', icon: '🏫' },
  { tag: 'Outdoor', tone: 'from-lime-400 to-green-500', icon: '🌿' },
];

const steps = [
  {
    n: '01',
    title: 'Tư vấn & chốt concept',
    desc: 'Lắng nghe ý tưởng của lớp, đề xuất concept – địa điểm – trang phục phù hợp ngân sách.',
  },
  {
    n: '02',
    title: 'Lên lịch & chuẩn bị',
    desc: 'Khảo sát địa điểm, chuẩn bị trang phục, đạo cụ, ekip. Phụ huynh có thể theo dõi lịch chụp online.',
  },
  {
    n: '03',
    title: 'Buổi chụp & quay',
    desc: 'Ekip 3-4 người (photographer, quay phim) đồng hành cùng lớp xuyên suốt.',
  },
  {
    n: '04',
    title: 'Hậu kỳ & bàn giao',
    desc: 'Chỉnh sửa màu theo yêu cầu, bàn giao ảnh và video sau khoảng 1-2 tuần sau buổi chụp.',
  },
];

const durationLabel: Record<NonNullable<Package['duration']>, string> = {
  full_day: 'Buổi chụp full day (1 ngày)',
  half_day: 'Buổi chụp 1/2 ngày',
  two_thirds_day: 'Buổi chụp 2/3 ngày',
};

const editingScopeLabel: Record<NonNullable<Package['editingScope']>, string> = {
  full: 'Hậu kỳ blend màu toàn bộ ảnh',
  partial: 'Hậu kỳ blend màu ảnh chọn lọc',
};

const formatVnd = (n: number) =>
  `${n.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ / bạn`;

interface PackageDisplay {
  id: string;
  name: string;
  price: string;
  note: string;
  items: string[];
  featured: boolean;
}

const toDisplay = (list: Package[]): PackageDisplay[] => {
  if (!list.length) return [];
  // Featured = first package explicitly marked isPopular by admin
  const featuredId = list.find((p) => p.isPopular)?._id;
  return list.map((p) => {
    const items: string[] = [];
    if (p.duration) items.push(durationLabel[p.duration]);
    if (p.crewRatio) items.push(`Ekip: ${p.crewRatio}`);
    if (p.studentsPerCrew) items.push(`${p.studentsPerCrew} bạn / ekip`);
    if (p.editingScope) items.push(editingScopeLabel[p.editingScope]);
    if (p.deliveryDays) items.push(`Bàn giao trong ${p.deliveryDays} ngày`);
    if (p.costumes && p.costumes.length) {
      const names = p.costumes.map((c) => c?.name?.trim()).filter((n): n is string => Boolean(n));
      if (names.length) {
        items.push(`Trang phục: ${names.join(', ')}`);
      } else {
        items.push(`${p.costumes.length} loại trang phục đi kèm`);
      }
    }
    if (!items.length) items.push('Liên hệ Yume để biết thêm chi tiết');
    return {
      id: p._id,
      name: p.name,
      price: p.pricePerMember > 0 ? formatVnd(p.pricePerMember) : 'Liên hệ',
      note: p.description?.trim() || 'Báo giá tham khảo, tư vấn riêng theo lớp',
      items,
      featured: p._id === featuredId,
    };
  });
};

const testimonials = [
  {
    name: 'Lớp 12A1 – THPT Phan Đình Phùng',
    role: 'Hà Nội',
    rating: 5,
    quote:
      'Ekip cực kỳ chuyên nghiệp, ảnh ra siêu đẹp và đúng concept tụi mình mong muốn. Cả lớp đều thích!',
  },
  {
    name: 'Lớp K65 – ĐH Bách Khoa',
    role: 'Hà Nội',
    rating: 5,
    quote:
      'Bọn mình book gói trọn gói, video kỷ yếu xem đi xem lại không chán. Cảm ơn Yume rất nhiều!',
  },
  {
    name: 'Lớp 12A5 – THPT Chu Văn An',
    role: 'Hà Nội',
    rating: 5,
    quote:
      'Makeup xinh, ekip nhiệt tình hỗ trợ pose dáng. Album in chất lượng giấy đẹp, đáng đồng tiền.',
  },
];

/* ── Helpers ─────────────────────────────────── */

interface FeedbackForm {
  phone: string;
  crewRating: number;
  albumRating: number;
  crewDesc: string;
  albumDesc: string;
  suggestion: string;
}

const initialForm: FeedbackForm = {
  phone: '',
  crewRating: 5,
  albumRating: 5,
  crewDesc: '',
  albumDesc: '',
  suggestion: '',
};

/* ── Page ────────────────────────────────────── */

const PortfolioPage = () => {
  const { hash } = useLocation();
  const { isDark } = useTheme();
  const [classCount, setClassCount] = useState<number | null>(null);
  const [schoolCount, setSchoolCount] = useState<number | null>(null);
  const [pkgList, setPkgList] = useState<Package[] | null>(null);
  const [pkgError, setPkgError] = useState('');
  const [form, setForm] = useState<FeedbackForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!hash) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash, pkgList]);

  // Fetch real stats from public API
  useEffect(() => {
    customerService
      .listPublic()
      .then((list) => {
        setClassCount(list.length);
        const schools = new Set(list.map((c) => (c.school || '').trim()).filter(Boolean));
        setSchoolCount(schools.size);
      })
      .catch(() => {
        setClassCount(0);
        setSchoolCount(0);
      });
  }, []);

  const loadPackages = useCallback(async () => {
    setPkgList(null);
    setPkgError('');
    try {
      setPkgList(await packageService.listPublic());
    } catch {
      setPkgError('Không tải được bảng giá. Vui lòng thử lại hoặc liên hệ studio để được tư vấn.');
    }
  }, []);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const displayPackages = useMemo<PackageDisplay[]>(() => {
    if (pkgList === null) return [];
    const mapped = toDisplay(pkgList);
    return mapped.length ? mapped : [];
  }, [pkgList]);

  const stats = useMemo(
    () => [
      { num: classCount !== null ? `${classCount}+` : '—', label: 'Lớp đã đồng hành' },
      { num: schoolCount !== null ? `${schoolCount}+` : '—', label: 'Trường đối tác' },
      { num: '50K+', label: 'Khung hình đã chụp' },
      { num: '5+', label: 'Năm kinh nghiệm' },
    ],
    [classCount, schoolCount],
  );

  const handleSubmitFeedback = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.crewDesc.trim() || !form.albumDesc.trim()) {
      toast.warn('Vui lòng chia sẻ cảm nhận về ekip và album.');
      return;
    }
    setSubmitting(true);
    try {
      await feedbackService.submit({
        phone: form.phone || undefined,
        crewFeedback: { rating: form.crewRating, description: form.crewDesc.trim() },
        albumFeedback: { rating: form.albumRating, description: form.albumDesc.trim() },
        suggestion: form.suggestion || undefined,
      });
      setSubmitted(true);
      setForm(initialForm);
      toast.success('Cảm ơn bạn đã gửi cảm nhận tới Yume!');
    } catch {
      toast.error('Không gửi được cảm nhận, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicSiteLayout source="portfolio">
      {/* ── Hero ─────────────────────────────────── */}
      <section id="top" className="relative scroll-mt-32 overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-28">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 20% 20%, rgba(245,158,11,0.18), transparent 60%), radial-gradient(circle at 80% 80%, rgba(34,211,238,0.18), transparent 60%), linear-gradient(180deg, #0a0a12 0%, #0c1a2e 100%)'
              : 'radial-gradient(circle at 20% 20%, rgba(245,158,11,0.18), transparent 60%), radial-gradient(circle at 80% 80%, rgba(34,211,238,0.18), transparent 60%), linear-gradient(180deg, #fff7ed 0%, #ecfeff 100%)',
          }}
        />
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-amber-200/40 dark:bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-cyan-200/40 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: text */}
          <div className="text-center lg:text-left">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase text-amber-700 bg-amber-100/80 border border-amber-200 dark:text-amber-300 dark:bg-amber-400/10 dark:border-amber-400/30">
              Studio chụp ảnh kỷ yếu chuyên nghiệp
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1]">
              <span className="text-gradient">Lưu giữ thanh xuân</span>
              <br />
              <span className="text-slate-800 dark:text-white">qua từng khung hình</span>
            </h1>
            <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Yume Studio đồng hành cùng các lớp 12, sinh viên năm cuối tạo nên những bộ ảnh và
              video kỷ yếu chuẩn điện ảnh – nơi mỗi nụ cười, mỗi cái ôm đều trở thành kỷ niệm không
              bao giờ phai.
            </p>
            <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-4">
              <Link
                to="/booking/start?source=portfolio"
                className="inline-flex items-center px-6 py-3 rounded-full text-sm sm:text-base font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }}
              >
                Bắt đầu đặt lịch
              </Link>
              <Link
                to="/consultation"
                className="inline-flex items-center px-6 py-3 rounded-full text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-100 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-amber-300 hover:text-amber-600 transition"
              >
                Nhận tư vấn
              </Link>
              <Link
                to="/costumes"
                className="inline-flex items-center px-6 py-3 rounded-full text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-100 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-amber-300 hover:text-amber-600 transition"
              >
                Tra cứu trang phục
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((f) => (
                <div
                  key={f.label}
                  className="rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur border border-white dark:border-white/10 shadow-sm py-4"
                >
                  <div className="text-xl sm:text-2xl font-extrabold text-gradient px-2">
                    {f.num}
                  </div>
                  <div className="mt-1 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 px-2">
                    {f.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: photo collage (auto-rotating) */}
          <HeroCollage />
        </div>
      </section>

      {/* ── About ────────────────────────────────── */}
      <section id="about" className="scroll-mt-32 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Về Yume Studio
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Mỗi bộ ảnh là một câu chuyện</h2>
            <p className="mt-5 text-slate-600 dark:text-slate-300 leading-relaxed">
              Chúng tôi không chỉ chụp ảnh – chúng tôi kể lại tuổi 18 của bạn bằng ngôn ngữ điện
              ảnh. Từ ánh sáng, màu sắc đến từng khoảnh khắc tự nhiên nhất, Yume Studio biến buổi
              chụp kỷ yếu thành một ngày đáng nhớ trong đời.
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
              Hơn 5 năm đồng hành cùng các lớp và sinh viên trên khắp cả nước, chúng tôi tự hào là
              studio được nhiều trường lựa chọn nhờ sự chỉn chu trong từng tiểu tiết.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Ekip 5–8 người, tận tâm trong từng buổi chụp',
                'Concept đa dạng, cập nhật xu hướng mới mỗi mùa',
                'Trả ảnh đúng hẹn, chỉnh sửa theo yêu cầu',
                'Hệ thống quản lý lịch & trang phục online minh bạch',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-slate-700 dark:text-slate-300"
                >
                  <span className="mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 text-xs font-bold flex-shrink-0">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div
              className="aspect-[4/5] rounded-3xl shadow-xl overflow-hidden flex items-center justify-center relative"
              style={{
                background:
                  'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(34,211,238,0.18) 100%)',
              }}
            >
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 gap-2 p-3">
                {AboutImage.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, hsl(${(i * 30) % 360}, 70%, 70%), hsl(${
                        (i * 30 + 60) % 360
                      }, 70%, 60%))`,
                      opacity: 0.7,
                    }}
                  >
                    <img
                      src={AboutImage[i]}
                      alt="TNV03816"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
              <div className="relative z-10">
                <Logo size={120} />
              </div>
            </div>
            <div className="absolute -bottom-20 -left-20 bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-5 max-w-[200px] hidden sm:block border border-slate-100 dark:border-white/10">
              <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Khách hàng hài lòng
              </div>
              <div className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                98%
              </div>
            </div>
            <div className="absolute -top-20 -right-20 bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-5 hidden sm:block border border-slate-100 dark:border-white/10">
              <div className="flex -space-x-2">
                <div className="w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-400/40 border-2 border-white dark:border-slate-900" />
                <div className="w-9 h-9 rounded-full bg-cyan-200 dark:bg-cyan-400/40 border-2 border-white dark:border-slate-900" />
                <div className="w-9 h-9 rounded-full bg-pink-200 dark:bg-pink-400/40 border-2 border-white dark:border-slate-900" />
              </div>
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Hàng trăm lớp đã chọn
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────── */}
      <section id="services" className="scroll-mt-32 bg-slate-50 py-20 dark:bg-slate-900/50 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Dịch vụ
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">
              Trọn gói cho ngày kỷ yếu hoàn hảo
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Từ chụp ảnh, quay phim đến trang phục và hậu kỳ, Yume Studio cung cấp giải pháp toàn
              diện để biến ngày kỷ yếu của bạn thành một trải nghiệm đáng nhớ và trọn vẹn nhất.
            </p>
          </div>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div
                key={s.title}
                className="group rounded-2xl bg-white dark:bg-slate-900 p-7 border border-slate-100 dark:border-white/5 hover:border-amber-200 dark:hover:border-amber-400/40 shadow-sm hover:shadow-lg hover:-translate-y-1 transition"
              >
                <div className="text-4xl">{s.icon}</div>
                <h3 className="mt-4 text-lg font-semibold group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Concepts / Gallery ───────────────────── */}
      <section id="gallery" className="scroll-mt-32 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Concept nổi bật
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">
              Đa dạng phong cách – chọn “chất” riêng cho lớp
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {concepts.map((c) => (
              <Link
                key={c.tag}
                to={`/booking/start?source=concepts&concept=${encodeURIComponent(c.tag)}`}
                aria-label={`Chọn concept ${c.tag} và bắt đầu đặt lịch`}
                className={`group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br ${c.tone} shadow-md hover:shadow-2xl hover:-translate-y-1 transition cursor-pointer`}
              >
                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-80">
                  {c.icon}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="text-white font-bold text-lg drop-shadow">{c.tag}</div>
                  <div className="text-white/80 text-xs mt-0.5">Chọn concept →</div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              to="/consultation"
              className="inline-flex items-center text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Nhận tư vấn về concept →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Process ──────────────────────────────── */}
      <section id="process" className="scroll-mt-32 bg-slate-50 py-20 dark:bg-slate-900/50 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Quy trình
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">4 bước – nhẹ nhàng, minh bạch</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 hover:shadow-lg transition"
              >
                <div className="text-4xl font-extrabold text-gradient">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Packages ─────────────────────────────── */}
      <section id="packages" className="scroll-mt-32 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Báo giá
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Gói dịch vụ phù hợp mọi lớp</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Báo giá tham khảo. Yume sẽ tư vấn riêng cho từng lớp dựa trên concept và quy mô.
            </p>
          </div>
          {pkgList === null ? (
            pkgError ? (
              <div
                className="mx-auto mt-10 flex max-w-2xl flex-col items-start gap-4 rounded-2xl border border-rose-300/50 bg-rose-50 p-6 dark:border-rose-400/20 dark:bg-rose-400/5 sm:flex-row sm:items-center sm:justify-between"
                role="alert"
              >
                <div>
                  <h3 className="font-semibold text-rose-800 dark:text-rose-200">
                    Chưa thể tải bảng giá
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{pkgError}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadPackages()}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-semibold hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    Thử lại
                  </button>
                  <Link
                    to="/consultation"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-900"
                  >
                    Nhận tư vấn
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-14" role="status" aria-live="polite" aria-label="Đang tải gói dịch vụ">
                <div className="grid gap-6 md:grid-cols-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} aria-hidden="true" className="min-h-80 animate-pulse rounded-3xl border border-slate-200 bg-slate-100 p-8 motion-reduce:animate-none dark:border-white/10 dark:bg-white/5">
                      <div className="h-4 w-28 rounded bg-slate-300 dark:bg-white/10" />
                      <div className="mt-5 h-9 w-40 rounded bg-slate-300 dark:bg-white/10" />
                      <div className="mt-4 h-3 w-full rounded bg-slate-300 dark:bg-white/10" />
                      <div className="mt-3 h-3 w-4/5 rounded bg-slate-300 dark:bg-white/10" />
                      <div className="mt-10 h-11 rounded-full bg-slate-300 dark:bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : displayPackages.length === 0 ? (
            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-10">
              <h3 className="text-xl font-semibold">Bảng giá đang được cập nhật</h3>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Chia sẻ quy mô lớp và ý tưởng chụp với studio để nhận gợi ý gói phù hợp trong thời gian này.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  to="/consultation"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-500 px-5 font-semibold text-amber-800 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-200 dark:hover:bg-amber-400/10"
                >
                  Nhận tư vấn
                </Link>
                <Link
                  to="/booking/start?source=pricing"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-900"
                >
                  Bắt đầu đặt lịch
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-14 grid gap-6 md:grid-cols-3">
            {displayPackages.map((p) => (
              <div
                key={p.id}
                className={`relative h-full flex flex-col rounded-3xl p-8 border transition ${
                  p.featured
                    ? 'border-transparent text-white shadow-2xl md:scale-[1.03]'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 shadow-sm hover:shadow-lg'
                }`}
                style={
                  p.featured
                    ? { background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }
                    : undefined
                }
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-amber-700 text-xs font-bold shadow">
                    PHỔ BIẾN
                  </span>
                )}
                <div className="text-sm font-semibold uppercase tracking-wider opacity-80">
                  {p.name}
                </div>
                <div className="mt-3 text-3xl sm:text-4xl font-extrabold">{p.price}</div>
                <div
                  className={`mt-1 text-sm ${
                    p.featured ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {p.note}
                </div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-start gap-2">
                      <span className={p.featured ? 'text-white' : 'text-amber-500'}>✓</span>
                      <span
                        className={
                          p.featured ? 'text-white/95' : 'text-slate-700 dark:text-slate-300'
                        }
                      >
                        {it}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-col gap-3 pt-8">
                  <Link
                    to={`/booking/start?source=pricing&package=${encodeURIComponent(p.id)}`}
                    className={`inline-flex w-full justify-center items-center px-5 py-3 rounded-full text-sm font-semibold transition ${
                      p.featured
                        ? 'bg-white text-amber-700 hover:bg-amber-50'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                    }`}
                  >
                    Bắt đầu đặt lịch
                  </Link>
                  <Link
                    to="/consultation"
                    className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 motion-reduce:transition-none ${
                      p.featured
                        ? 'border-white/70 text-white hover:bg-white/15'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Nhận tư vấn
                  </Link>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────── */}
      <section className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Cảm nhận khách hàng
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Lớp đã chụp cùng Yume nói gì?</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="rounded-2xl bg-white dark:bg-slate-900 p-7 border border-slate-100 dark:border-white/5 shadow-sm flex flex-col"
              >
                <div className="text-amber-500 text-xl">
                  {'★'.repeat(t.rating)}
                  <span className="text-slate-200 dark:text-white/10">
                    {'★'.repeat(5 - t.rating)}
                  </span>
                </div>
                <blockquote className="mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }}
                  />
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mini feedback form (uses real /public/feedback API) ────── */}
      <section id="feedback" className="scroll-mt-32 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Chia sẻ cảm nhận
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">
              Đã chụp cùng Yume? Hãy cho chúng mình biết!
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Cảm nhận của bạn là động lực để Yume hoàn thiện mỗi ngày.
            </p>
          </div>

          {submitted ? (
            <div className="mt-10 rounded-3xl p-10 text-center border border-amber-200 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/10">
              <div className="text-5xl">🎉</div>
              <h3 className="mt-3 text-xl font-bold">Đã nhận cảm nhận của bạn!</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Cảm ơn bạn rất nhiều. Yume sẽ tiếp tục nỗ lực để mang đến những trải nghiệm tốt hơn.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-6 inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold border border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-400/10 transition"
              >
                Gửi cảm nhận khác
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmitFeedback}
              className="mt-10 rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-lg space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold mb-2">Số điện thoại (tuỳ chọn)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="VD: 098 765 4321"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <RatingField
                  label="Đánh giá ekip chụp"
                  value={form.crewRating}
                  onChange={(v) => setForm({ ...form, crewRating: v })}
                />
                <RatingField
                  label="Đánh giá album / video"
                  value={form.albumRating}
                  onChange={(v) => setForm({ ...form, albumRating: v })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Cảm nhận về ekip <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.crewDesc}
                  onChange={(e) => setForm({ ...form, crewDesc: e.target.value })}
                  placeholder="Photographer, makeup, stylist… đã hỗ trợ bạn ra sao?"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400 transition resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Cảm nhận về album / video <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.albumDesc}
                  onChange={(e) => setForm({ ...form, albumDesc: e.target.value })}
                  placeholder="Chất lượng ảnh, màu sắc, layout, video…"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400 transition resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Góp ý thêm cho Yume</label>
                <textarea
                  rows={2}
                  value={form.suggestion}
                  onChange={(e) => setForm({ ...form, suggestion: e.target.value })}
                  placeholder="Yume cần cải thiện điều gì?"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400 transition resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Link
                  to="/feedback"
                  className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Mở trang phản hồi đầy đủ →
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center px-7 py-3 rounded-full text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition"
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }}
                >
                  {submitting ? 'Đang gửi...' : 'Gửi cảm nhận'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── Contact CTA ──────────────────────────── */}
      <section id="contact" className="scroll-mt-32 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div
            className="relative rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-white blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold">Bạn cần tư vấn về buổi chụp?</h2>
              <p className="mt-4 text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
                Chọn kênh liên hệ để trao đổi về concept, quy mô lớp và ngân sách dự kiến.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  to="/booking/start?source=portfolio"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-amber-800 shadow-md transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-amber-500 motion-reduce:transition-none"
                >
                  Bắt đầu đặt lịch
                </Link>
                <a
                  href="tel:0869318118"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm sm:text-base font-semibold text-amber-700 bg-white hover:bg-amber-50 shadow-md transition"
                >
                  Gọi 0869318118
                </a>
                <a
                  href="mailto:hello@yumestudio.vn"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm sm:text-base font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/40 backdrop-blur transition"
                >
                  Email hello@yumestudio.vn
                </a>
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm sm:text-base font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/40 backdrop-blur transition"
                >
                  Facebook / Zalo
                </a>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-white/90">
                <span>📍 Hà Nội, Việt Nam</span>
                <span>🕒 T2 – CN: 8:00 – 20:00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </PublicSiteLayout>
  );
};

/* ── Sub-components ──────────────────────────── */

const heroCards = [
  { bg: `url(${tnv00817}) center / cover no-repeat` },
  { bg: `url(${tnv00048}) center / cover no-repeat` },
  { bg: `url(${tnv07899}) center / cover no-repeat` },
];

// 3 positions arranged in a circle around the collage (more spaced apart).
// `z` is animated as translateZ so cards smoothly recede / come forward
// instead of snapping their stacking order — fixes the "jump-down" glitch
// when the front card moves out of the way.
const heroSlots = [
  // top-right (mid depth)
  { x: 160, y: -170, rotate: 8, scale: 0.98, z: -40 },
  // bottom-center (front)
  { x: 20, y: 100, rotate: 0, scale: 1.08, z: 40 },
  // left (back)
  { x: -200, y: -30, rotate: -10, scale: 0.92, z: -80 },
];

const HeroCollage = () => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setOffset((o) => (o + 1) % heroCards.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-[520px] hidden lg:block">
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative w-[520px] h-[460px]"
          style={{ perspective: 1400, transformStyle: 'preserve-3d' }}
        >
          {heroCards.map((card, i) => {
            const slot = heroSlots[(i + offset) % heroSlots.length];
            const W = 232;
            const H = 288;
            return (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 rounded-3xl shadow-2xl overflow-hidden"
                style={{
                  width: W,
                  height: H,
                  background: card.bg,
                  transform: `translate3d(calc(-50% + ${slot.x}px), calc(-50% + ${slot.y}px), ${slot.z}px) rotate(${slot.rotate}deg) scale(${slot.scale})`,
                  // Long, gentle easing for very smooth circular motion
                  transition: 'transform 1500ms cubic-bezier(0.65, 0, 0.35, 1)',
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                  transformStyle: 'preserve-3d',
                }}
              ></div>
            );
          })}
        </div>
      </div>
      <div className="absolute -bottom-2 left-4 z-50">
        <div className="relative">
          {/* Two ripples — synced with badge pulse so each ripple fires exactly
              at the moments the badge reaches its smallest (scale 1) and
              largest (scale 1.04) size. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl border border-amber-400/50 yume-ripple"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl border border-amber-400/50 yume-ripple"
            style={{ animationDelay: '1.8s' }}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 border border-slate-100 dark:border-white/10 yume-pulse">
            <div className="text-2xl">⭐</div>
            <div>
              <div className="text-sm font-bold">4.9 / 5</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Trên 500+ đánh giá</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RatingField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div>
    <label className="block text-sm font-semibold mb-2">{label}</label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-3xl transition hover:scale-110 ${
            n <= value ? 'text-amber-500' : 'text-slate-300 dark:text-white/15'
          }`}
          aria-label={`${n} sao`}
        >
          ★
        </button>
      ))}
    </div>
  </div>
);

export default PortfolioPage;
