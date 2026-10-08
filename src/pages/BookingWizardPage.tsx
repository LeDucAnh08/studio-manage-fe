import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { CustomerButton as Button } from '@/components/customer/CustomerButton';
import {
  CustomerFormField,
  CustomerInput as Input,
  CustomerTextarea as Textarea,
} from '@/components/customer/CustomerFields';
import { CustomerSurface } from '@/components/customer/CustomerSurface';
import { CustomerPrice } from '@/components/customer/CustomerPrice';
import { CustomerPackageCard } from '@/components/customer/CustomerPackageCard';
import '../styles/customer-portfolio.css';
import { bookingService } from '../services/bookingService';
import { packageService } from '../services/packageService';
import {
  clearBookingDraft,
  createIdempotencyKey,
  createBookingDraft,
  readBookingDraft,
  writeBookingDraft,
  type BookingDraft,
} from '../services/bookingDraft';
import { useAuth } from '../context/AuthContext';
import { safeBookingReturnTo } from '../utils/returnTo';
import type { Package } from '../types';

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const parseVietnamDateTime = (value: string) => new Date(`${value}:00+07:00`).getTime();
const date = (value: string) => {
  const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? parseVietnamDateTime(value)
    : new Date(value).getTime();
  return value && Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: VN_TIME_ZONE,
      })
    : 'Chưa chọn';
};
const vietnamDateTimeInput = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
};
const durationLabel: Record<NonNullable<Package['duration']>, string> = {
  full_day: 'Trọn ngày',
  half_day: 'Nửa ngày',
  two_thirds_day: '2/3 ngày',
};
const editingLabel: Record<NonNullable<Package['editingScope']>, string> = {
  full: 'Chỉnh sửa toàn bộ ảnh',
  partial: 'Chỉnh sửa một phần ảnh',
};
const sourceLabels: Record<string, string> = {
  portfolio: 'Trang giới thiệu',
  pricing: 'Bảng giá',
  concepts: 'Concept',
  costumes: 'Danh mục trang phục',
};
const errorText = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
  'Chưa gửi được yêu cầu. Thông tin của bạn vẫn được lưu, hãy thử lại.';
const MAX_REQUEST_DURATION = 7 * 24 * 60 * 60 * 1000;

type WizardErrors = Partial<
  Record<
    | 'packageId'
    | 'className'
    | 'contactName'
    | 'phone'
    | 'members'
    | 'startAt'
    | 'endAt'
    | 'location'
    | 'note',
    string
  >
>;

function getInitialDraft(
  userId: string | null,
  name: string | undefined,
  context: Pick<BookingDraft, 'packageId' | 'source' | 'concept' | 'itemId' | 'itemName'>,
  canResume: boolean,
) {
  const saved = readBookingDraft();
  if (canResume && saved && (!saved.ownerId || saved.ownerId === userId)) {
    return {
      ...saved,
      ownerId: saved.ownerId || userId,
      contactName: saved.contactName || name || '',
      packageId: context.packageId || saved.packageId,
      source: context.source || saved.source,
      concept: context.concept || saved.concept,
      itemId: context.itemId || saved.itemId,
      itemName: context.itemName || saved.itemName,
    };
  }
  const draft = createBookingDraft(userId);
  draft.contactName = name || '';
  Object.assign(draft, context);
  return draft;
}

function validateStepOne(draft: BookingDraft, packages: Package[]): WizardErrors {
  return packages.some((item) => item._id === draft.packageId)
    ? {}
    : { packageId: 'Vui lòng chọn một gói dịch vụ còn khả dụng.' };
}

function validateStepTwo(draft: BookingDraft): WizardErrors {
  const errors: WizardErrors = {};
  if (!draft.className.trim()) errors.className = 'Nhập tên lớp hoặc nhóm.';
  if (!draft.contactName.trim()) errors.contactName = 'Nhập tên người liên hệ.';
  if (!/^[+\d() .-]{8,25}$/.test(draft.phone.trim())) errors.phone = 'Nhập số điện thoại hợp lệ.';
  if (!Number.isInteger(draft.members) || draft.members < 1 || draft.members > 1000) {
    errors.members = 'Số thành viên từ 1 đến 1.000.';
  }
  const start = parseVietnamDateTime(draft.startAt);
  const end = parseVietnamDateTime(draft.endAt);
  if (!draft.startAt || !Number.isFinite(start) || start <= Date.now()) {
    errors.startAt = 'Chọn thời gian bắt đầu trong tương lai.';
  }
  if (!draft.endAt || !Number.isFinite(end) || end <= start) {
    errors.endAt = 'Thời gian kết thúc phải sau lúc bắt đầu.';
  } else if (end - start > MAX_REQUEST_DURATION) {
    errors.endAt = 'Khoảng thời gian yêu cầu không được dài quá 7 ngày.';
  }
  if (!draft.location.trim()) errors.location = 'Nhập địa điểm mong muốn.';
  if (draft.note.length > 2000) errors.note = 'Ghi chú tối đa 2.000 ký tự.';
  return errors;
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <CustomerFormField label={label} htmlFor={id} error={error}>
      {children}
    </CustomerFormField>
  );
}

export default function BookingWizardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [draft, setDraft] = useState(() =>
    getInitialDraft(
      user?.roles.includes(6) ? user._id : null,
      user?.name,
      {
        packageId: params.get('package')?.slice(0, 100) || '',
        source: params.get('source')?.slice(0, 40) || '',
        concept: params.get('concept')?.slice(0, 100) || '',
        itemId: params.get('item')?.slice(0, 100) || '',
        itemName: params.get('itemName')?.slice(0, 150) || '',
      },
      !user || user.roles.includes(6),
    ),
  );
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [packageError, setPackageError] = useState('');
  const [errors, setErrors] = useState<WizardErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const [minimumTime] = useState(() => vietnamDateTimeInput(new Date(Date.now() + 5 * 60_000)));

  const loadPackages = useCallback(() => {
    setLoadingPackages(true);
    setPackageError('');
    packageService
      .listPublic()
      .then((items) => setPackages(items))
      .catch((error: unknown) => setPackageError(errorText(error)))
      .finally(() => setLoadingPackages(false));
  }, []);

  useEffect(() => loadPackages(), [loadPackages]);
  useEffect(() => {
    if (!submittedRef.current) writeBookingDraft(draft);
  }, [draft]);

  const selectedPackage = packages.find((item) => item._id === draft.packageId);
  const comparisonPackages = useMemo(
    () =>
      draft.comparedPackageIds
        .map((id) => packages.find((item) => item._id === id))
        .filter((item): item is Package => !!item),
    [draft.comparedPackageIds, packages],
  );
  const bookingContext = [
    draft.source ? `Nguồn: ${sourceLabels[draft.source] || 'Website Yume Studio'}` : '',
    draft.concept ? `Concept tham khảo: ${draft.concept}` : '',
    draft.itemId
      ? `Trang phục/phụ kiện tham khảo: ${draft.itemName || draft.itemId} (mã ${draft.itemId})`
      : '',
  ].filter(Boolean);
  const isClient = !!user?.roles.includes(6);
  const accountPath = user ? '/account/bookings' : '/login';
  const returnTo = safeBookingReturnTo(`${location.pathname}${location.search}${location.hash}`);

  const updateDraft = (patch: Partial<BookingDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const goToStep = (step: BookingDraft['step']) => {
    setErrors({});
    setSubmitError('');
    updateDraft({ step });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const continueFrom = (step: 1 | 2) => {
    const nextErrors = step === 1 ? validateStepOne(draft, packages) : validateStepTwo(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    goToStep((step + 1) as BookingDraft['step']);
  };

  const toggleComparison = (id: string) => {
    const exists = draft.comparedPackageIds.includes(id);
    if (!exists && draft.comparedPackageIds.length >= 3) {
      setErrors({ packageId: 'Bạn có thể so sánh tối đa 3 gói cùng lúc.' });
      return;
    }
    setErrors({});
    updateDraft({
      comparedPackageIds: exists
        ? draft.comparedPackageIds.filter((item) => item !== id)
        : [...draft.comparedPackageIds, id],
    });
  };

  const submit = async () => {
    if (loadingPackages) return;
    const validation = { ...validateStepOne(draft, packages), ...validateStepTwo(draft) };
    if (Object.keys(validation).length) {
      setErrors(validation);
      const firstStep = validation.packageId ? 1 : 2;
      updateDraft({ step: firstStep });
      window.setTimeout(() => document.getElementById(Object.keys(validation)[0])?.focus(), 0);
      return;
    }
    if (!user) {
      if (returnTo) navigate('/login', { state: { from: returnTo } });
      else navigate('/login');
      return;
    }
    if (!isClient) {
      setSubmitError(
        'Yêu cầu đặt dịch vụ cần tài khoản khách hàng. Hãy đăng xuất rồi đăng nhập tài khoản khách hàng.',
      );
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    const context = [
      ...bookingContext,
      selectedPackage ? `Gói dịch vụ: ${selectedPackage.name}` : '',
    ].filter(Boolean);
    const payload = {
      packageId: draft.packageId,
      contactName: draft.contactName.trim(),
      phone: draft.phone.trim(),
      members: draft.members,
      startAt: new Date(parseVietnamDateTime(draft.startAt)).toISOString(),
      endAt: new Date(parseVietnamDateTime(draft.endAt)).toISOString(),
      location: draft.location.trim(),
      className: draft.className.trim(),
      school: draft.school.trim(),
      note: [...context, draft.note.trim()].filter(Boolean).join('\n\n').slice(0, 2000),
    };
    const fingerprint = JSON.stringify(payload);
    const idempotencyKey = draft.submissionFingerprint
      ? draft.submissionFingerprint === fingerprint
        ? draft.idempotencyKey
        : createIdempotencyKey()
      : draft.idempotencyKey;
    const attemptedDraft = {
      ...draft,
      ownerId: user._id,
      idempotencyKey,
      submissionFingerprint: fingerprint,
    };
    setDraft(attemptedDraft);
    writeBookingDraft(attemptedDraft);
    try {
      const result = await bookingService.create(payload, idempotencyKey);
      submittedRef.current = true;
      clearBookingDraft();
      navigate(`/account/bookings/${result._id}`);
    } catch (error) {
      setSubmitError(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const backTo = location.pathname === '/booking/start' ? '/portfolio#top' : accountPath;

  return (
    <div className="customer-wizard">
      <nav aria-label="Điều hướng yêu cầu" className="customer-wizard__navigation">
        <Button asChild variant="text">
          <Link to={backTo}>
            <ArrowLeft aria-hidden="true" />
            {location.pathname === '/booking/start'
              ? 'Quay lại Yume Studio'
              : 'Quay lại dịch vụ của tôi'}
          </Link>
        </Button>
        <Button asChild variant="text">
          <Link to={accountPath}>{user?.roles.includes(6) ? 'Dịch vụ của tôi' : 'Tài khoản'}</Link>
        </Button>
      </nav>

      <header className="customer-wizard__intro">
        <p className="customer-portfolio__eyebrow">Yume Studio · Chụp kỷ yếu</p>
        <h1 className="customer-page-title">Bắt đầu kế hoạch buổi chụp</h1>
        <p className="customer-copy">
          Chọn gói, cho studio biết thông tin lớp và thời gian mong muốn. Gửi yêu cầu hoàn toàn miễn
          phí; lịch và giá cuối cùng chỉ được chốt sau khi hai bên xác nhận.
        </p>
      </header>

      <ol aria-label="Các bước gửi yêu cầu" className="customer-wizard__steps">
        {['Chọn dịch vụ', 'Lớp & thời gian', 'Kiểm tra yêu cầu'].map((label, index) => {
          const step = (index + 1) as BookingDraft['step'];
          const active = draft.step === step;
          const complete = draft.step > step;
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className={active ? 'is-active' : undefined}
            >
              <span className="customer-wizard__step-number">
                {complete ? <Check aria-hidden="true" /> : step}
              </span>
              <span className="customer-wizard__step-label">{label}</span>
              <span className="customer-wizard__step-short">Bước {step}</span>
            </li>
          );
        })}
      </ol>

      {bookingContext.length > 0 && (
        <CustomerSurface as="div" padding="compact" className="customer-wizard__context">
          <aside aria-labelledby="booking-context-title">
            <h2 id="booking-context-title" className="customer-wizard__title">
              Bạn đang tham khảo
            </h2>
            <ul className="customer-wizard__context-list">
              {bookingContext.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
            {draft.itemId && (
              <p className="customer-caption">
                Trang phục hoặc phụ kiện chỉ được ghi nhận để tham khảo; studio sẽ xác nhận tình
                trạng trước khi chốt.
              </p>
            )}
          </aside>
        </CustomerSurface>
      )}

      {draft.step === 1 && (
        <section aria-labelledby="package-step-title" className="customer-wizard__section">
          <div className="customer-wizard__section-intro">
            <h2 id="package-step-title" className="customer-section-title">
              Chọn gói chụp phù hợp
            </h2>
            <p className="customer-caption">
              Giá hiển thị là giá tham khảo mỗi thành viên. Studio sẽ gửi báo giá chính thức sau khi
              hiểu rõ nhu cầu của lớp.
            </p>
          </div>
          {loadingPackages ? (
            <CustomerSurface padding="compact">
              <p role="status" className="customer-caption">
                Đang tải các gói dịch vụ…
              </p>
            </CustomerSurface>
          ) : packageError ? (
            <CustomerSurface padding="compact" className="customer-wizard__state">
              <p role="alert" className="customer-wizard__error">
                {packageError}
              </p>
              <Button type="button" variant="secondary" onClick={loadPackages}>
                Thử lại
              </Button>
            </CustomerSurface>
          ) : packages.length === 0 ? (
            <CustomerSurface className="customer-wizard__state">
              <h3 className="customer-wizard__title">Studio đang cập nhật các gói dịch vụ</h3>
              <p className="customer-caption">
                Bạn có thể liên hệ để được tư vấn trước khi gửi yêu cầu.
              </p>
              <Button asChild>
                <a href="tel:0869318118">Gọi 0869318118</a>
              </Button>
            </CustomerSurface>
          ) : (
            <>
              <div className="customer-wizard__packages">
                {packages.map((item) => {
                  const selected = draft.packageId === item._id;
                  const compared = draft.comparedPackageIds.includes(item._id);
                  return (
                    <CustomerPackageCard
                      key={item._id}
                      name={item.name}
                      featured={item.isPopular}
                      selected={selected}
                      price={
                        <CustomerPrice amount={item.pricePerMember} unit="/ người · tham khảo" />
                      }
                      note={item.description}
                      actions={
                        <>
                          <Button
                            type="button"
                            variant={selected ? 'primary' : 'secondary'}
                            aria-pressed={selected}
                            onClick={() => {
                              updateDraft({ packageId: item._id });
                              setErrors({});
                            }}
                          >
                            {selected ? 'Đang chọn' : 'Chọn gói'}
                          </Button>
                          <Button
                            type="button"
                            variant="text"
                            aria-pressed={compared}
                            onClick={() => toggleComparison(item._id)}
                          >
                            {compared ? 'Bỏ so sánh' : 'So sánh gói'}
                          </Button>
                        </>
                      }
                    >
                      <dl>
                        {item.duration && (
                          <div>
                            <dt>Thời lượng</dt>
                            <dd>{durationLabel[item.duration]}</dd>
                          </div>
                        )}
                        {item.studentsPerCrew != null && (
                          <div>
                            <dt>Quy mô ekip</dt>
                            <dd>{item.studentsPerCrew} học sinh / thợ</dd>
                          </div>
                        )}
                        {item.costumes?.length ? (
                          <div>
                            <dt>Trang phục</dt>
                            <dd>{item.costumes.map((costume) => costume.name).join(', ')}</dd>
                          </div>
                        ) : null}
                        {item.editingScope && (
                          <div>
                            <dt>Chỉnh sửa</dt>
                            <dd>{editingLabel[item.editingScope]}</dd>
                          </div>
                        )}
                        {item.deliveryDays != null && (
                          <div>
                            <dt>Bàn giao dự kiến</dt>
                            <dd>Trong {item.deliveryDays} ngày</dd>
                          </div>
                        )}
                      </dl>
                    </CustomerPackageCard>
                  );
                })}
              </div>
              {comparisonPackages.length > 0 && (
                <CustomerSurface
                  aria-labelledby="compare-title"
                  className="customer-wizard__comparison"
                >
                  <div className="customer-wizard__heading-row">
                    <div>
                      <h3 id="compare-title" className="customer-wizard__title">
                        So sánh gói dịch vụ
                      </h3>
                      <p className="customer-caption">
                        Tối đa 3 gói · giá tham khảo, chưa phải báo giá cuối cùng
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="text"
                      onClick={() => updateDraft({ comparedPackageIds: [] })}
                    >
                      Xóa lựa chọn
                    </Button>
                  </div>
                  <div className="customer-wizard__comparison-grid">
                    {comparisonPackages.map((item) => (
                      <div key={item._id} className="customer-wizard__comparison-item">
                        <h4 className="customer-wizard__title">{item.name}</h4>
                        <CustomerPrice amount={item.pricePerMember} unit="/ người" />
                        <p className="customer-caption">
                          {item.duration
                            ? durationLabel[item.duration]
                            : 'Thời lượng trao đổi với studio'}
                        </p>
                        <p className="customer-caption">
                          {item.costumes?.length
                            ? item.costumes.map((c) => c.name).join(', ')
                            : 'Trang phục trao đổi với studio'}
                        </p>
                        <Button
                          type="button"
                          variant={draft.packageId === item._id ? 'primary' : 'secondary'}
                          onClick={() => updateDraft({ packageId: item._id })}
                        >
                          {draft.packageId === item._id ? 'Gói đang chọn' : 'Chọn gói này'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CustomerSurface>
              )}
            </>
          )}
          {errors.packageId && (
            <p role="alert" className="customer-wizard__error">
              {errors.packageId}
            </p>
          )}
          <div className="customer-wizard__actions customer-wizard__actions--end">
            <Button
              type="button"
              disabled={loadingPackages || packages.length === 0}
              onClick={() => continueFrom(1)}
            >
              Tiếp tục <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </section>
      )}

      {draft.step === 2 && (
        <section className="customer-wizard__section" aria-labelledby="details-step-title">
          <div className="customer-wizard__section-intro">
            <h2 id="details-step-title" className="customer-section-title">
              Cho Yume biết về lớp mình
            </h2>
            <p className="customer-caption">
              Thông tin này giúp studio kiểm tra khả năng phục vụ và liên hệ với bạn.
            </p>
          </div>
          <CustomerSurface className="customer-wizard__fields">
            <Field id="className" label="Tên lớp / nhóm" error={errors.className}>
              <Input
                id="className"
                autoComplete="organization"
                maxLength={120}
                placeholder="Ví dụ: 12A1"
                value={draft.className}
                aria-invalid={!!errors.className}
                onChange={(event) => updateDraft({ className: event.target.value })}
              />
            </Field>
            <Field id="school" label="Trường">
              <Input
                id="school"
                autoComplete="organization-title"
                maxLength={160}
                placeholder="Tên trường (không bắt buộc)"
                value={draft.school}
                onChange={(event) => updateDraft({ school: event.target.value })}
              />
            </Field>
            <Field id="contactName" label="Họ tên người liên hệ" error={errors.contactName}>
              <Input
                id="contactName"
                autoComplete="name"
                maxLength={100}
                value={draft.contactName}
                aria-invalid={!!errors.contactName}
                onChange={(event) => updateDraft({ contactName: event.target.value })}
              />
            </Field>
            <Field id="phone" label="Số điện thoại" error={errors.phone}>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={25}
                value={draft.phone}
                aria-invalid={!!errors.phone}
                onChange={(event) => updateDraft({ phone: event.target.value })}
              />
            </Field>
            <Field id="members" label="Số thành viên dự kiến" error={errors.members}>
              <Input
                id="members"
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                value={draft.members}
                aria-invalid={!!errors.members}
                onChange={(event) => updateDraft({ members: Number(event.target.value) })}
              />
            </Field>
            <Field id="location" label="Địa điểm mong muốn" error={errors.location}>
              <Input
                id="location"
                autoComplete="street-address"
                maxLength={300}
                placeholder="Trường, studio hoặc địa điểm dự kiến"
                value={draft.location}
                aria-invalid={!!errors.location}
                onChange={(event) => updateDraft({ location: event.target.value })}
              />
            </Field>
            <Field
              id="startAt"
              label="Ngày và giờ bắt đầu mong muốn (giờ Việt Nam)"
              error={errors.startAt}
            >
              <Input
                id="startAt"
                type="datetime-local"
                min={minimumTime}
                value={draft.startAt}
                aria-invalid={!!errors.startAt}
                onChange={(event) => updateDraft({ startAt: event.target.value })}
              />
            </Field>
            <Field
              id="endAt"
              label="Ngày và giờ kết thúc mong muốn (giờ Việt Nam)"
              error={errors.endAt}
            >
              <Input
                id="endAt"
                type="datetime-local"
                min={draft.startAt || minimumTime}
                value={draft.endAt}
                aria-invalid={!!errors.endAt}
                onChange={(event) => updateDraft({ endAt: event.target.value })}
              />
            </Field>
            <p className="customer-caption customer-wizard__field-wide">
              Lịch được ghi nhận theo múi giờ Việt Nam (UTC+7).
            </p>
            <div className="customer-wizard__field-wide">
              <Field id="note" label="Điều Yume nên biết thêm" error={errors.note}>
                <Textarea
                  id="note"
                  rows={4}
                  maxLength={2000}
                  placeholder="Phong cách mong muốn, concept, lưu ý của lớp…"
                  value={draft.note}
                  aria-invalid={!!errors.note}
                  onChange={(event) => updateDraft({ note: event.target.value })}
                />
              </Field>
            </div>
          </CustomerSurface>
          <div className="customer-wizard__actions">
            <Button type="button" variant="secondary" onClick={() => goToStep(1)}>
              <ArrowLeft aria-hidden="true" /> Quay lại
            </Button>
            <Button type="button" onClick={() => continueFrom(2)}>
              Xem lại yêu cầu <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </section>
      )}

      {draft.step === 3 && (
        <section className="customer-wizard__section" aria-labelledby="review-step-title">
          <div className="customer-wizard__section-intro">
            <h2 id="review-step-title" className="customer-section-title">
              Kiểm tra trước khi gửi
            </h2>
            <p className="customer-caption">
              Yêu cầu này chưa giữ lịch, chưa xác nhận dịch vụ và chưa thu tiền.
            </p>
          </div>
          <div className="customer-wizard__review">
            <div className="customer-wizard__review-content">
              <CustomerSurface>
                <div className="customer-wizard__heading-row">
                  <h3 className="customer-wizard__title">Gói chụp</h3>
                  <Button type="button" variant="text" onClick={() => goToStep(1)}>
                    Sửa
                  </Button>
                </div>
                <p className="customer-wizard__title">{selectedPackage?.name || 'Chưa chọn gói'}</p>
                {selectedPackage?.description && (
                  <p className="customer-caption">{selectedPackage.description}</p>
                )}
                {selectedPackage && (
                  <div className="customer-wizard__package-summary">
                    <CustomerPrice amount={selectedPackage.pricePerMember} unit="/ người" />
                    <p className="customer-caption">
                      {selectedPackage.duration
                        ? durationLabel[selectedPackage.duration]
                        : 'Thời lượng trao đổi với studio'}
                    </p>
                  </div>
                )}
                {bookingContext.length > 0 && (
                  <ul className="customer-wizard__context-list">
                    {bookingContext.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </CustomerSurface>
              <CustomerSurface>
                <div className="customer-wizard__heading-row">
                  <h3 className="customer-wizard__title">Lớp & người liên hệ</h3>
                  <Button type="button" variant="text" onClick={() => goToStep(2)}>
                    Sửa
                  </Button>
                </div>
                <dl className="customer-wizard__details">
                  <div>
                    <dt>Lớp / nhóm</dt>
                    <dd>{draft.className}</dd>
                  </div>
                  {draft.school && (
                    <div>
                      <dt>Trường</dt>
                      <dd>{draft.school}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Người liên hệ</dt>
                    <dd>{draft.contactName}</dd>
                  </div>
                  <div>
                    <dt>Điện thoại</dt>
                    <dd>{draft.phone}</dd>
                  </div>
                  <div>
                    <dt>Quy mô dự kiến</dt>
                    <dd>{draft.members} thành viên</dd>
                  </div>
                  <div>
                    <dt>Địa điểm</dt>
                    <dd>{draft.location}</dd>
                  </div>
                  <div>
                    <dt>Bắt đầu</dt>
                    <dd>{date(draft.startAt)}</dd>
                  </div>
                  <div>
                    <dt>Kết thúc</dt>
                    <dd>{date(draft.endAt)}</dd>
                  </div>
                </dl>
                {draft.note && <p className="customer-wizard__note">{draft.note}</p>}
              </CustomerSurface>
            </div>
            <CustomerSurface as="div" className="customer-wizard__estimate">
              <aside aria-labelledby="booking-estimate-title">
                <h3 id="booking-estimate-title" className="customer-wizard__title">
                  Ước tính tham khảo
                </h3>
                {selectedPackage ? (
                  <>
                    <div className="customer-wizard__estimate-formula">
                      <CustomerPrice amount={selectedPackage.pricePerMember} />
                      <span className="customer-caption">× {draft.members} thành viên</span>
                    </div>
                    <CustomerPrice
                      amount={selectedPackage.pricePerMember * draft.members}
                      emphasis="total"
                    />
                  </>
                ) : (
                  <>
                    <p className="customer-caption">Chọn gói để xem ước tính</p>
                    <p>—</p>
                  </>
                )}
                <p className="customer-caption">
                  Đây chỉ là ước tính theo đơn giá công khai. Báo giá cuối cùng có thể thay đổi theo
                  yêu cầu, lịch chụp và nội dung dịch vụ hai bên thống nhất.
                </p>
              </aside>
            </CustomerSurface>
          </div>
          {submitError && (
            <CustomerSurface padding="compact">
              <p role="alert" className="customer-wizard__error">
                {submitError}
              </p>
            </CustomerSurface>
          )}
          {!user && (
            <CustomerSurface padding="compact">
              <p className="customer-caption">
                Bạn cần đăng nhập hoặc tạo tài khoản khách hàng ngay trước khi gửi yêu cầu. Bản nháp
                này sẽ được giữ lại.
              </p>
            </CustomerSurface>
          )}
          {user && !isClient && (
            <CustomerSurface padding="compact">
              <p role="alert" className="customer-wizard__error">
                {submitError || 'Tài khoản hiện tại không có quyền gửi yêu cầu khách hàng.'}
              </p>
            </CustomerSurface>
          )}
          <div className="customer-wizard__actions">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => goToStep(2)}
            >
              <ArrowLeft aria-hidden="true" /> Sửa thông tin
            </Button>
            <div className="customer-wizard__actions-group">
              {!user && (
                <Button asChild variant="secondary">
                  <Link to="/register" state={returnTo ? { from: returnTo } : undefined}>
                    Tạo tài khoản
                  </Link>
                </Button>
              )}
              <Button type="button" disabled={submitting || loadingPackages} onClick={submit}>
                {submitting ? (
                  <>
                    <LoaderCircle className="animate-spin" aria-hidden="true" /> Đang gửi…
                  </>
                ) : user ? (
                  'Gửi yêu cầu tới Yume'
                ) : (
                  'Đăng nhập để gửi'
                )}
              </Button>
            </div>
          </div>
          <p className="customer-caption customer-wizard__footnote">
            Không cần thanh toán ở bước gửi yêu cầu. Studio sẽ phản hồi trong giờ làm việc.
          </p>
        </section>
      )}
    </div>
  );
}
