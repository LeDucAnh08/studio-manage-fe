import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui';
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

const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`;
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
const fieldClass = 'min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const MAX_REQUEST_DURATION = 7 * 24 * 60 * 60 * 1000;

type WizardErrors = Partial<Record<'packageId' | 'className' | 'contactName' | 'phone' | 'members' | 'startAt' | 'endAt' | 'location' | 'note', string>>;

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
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
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
    () => draft.comparedPackageIds.map((id) => packages.find((item) => item._id === id)).filter((item): item is Package => !!item),
    [draft.comparedPackageIds, packages],
  );
  const bookingContext = [
    draft.source ? `Nguồn: ${sourceLabels[draft.source] || 'Website Yume Studio'}` : '',
    draft.concept ? `Concept tham khảo: ${draft.concept}` : '',
    draft.itemId ? `Trang phục/phụ kiện tham khảo: ${draft.itemName || draft.itemId} (mã ${draft.itemId})` : '',
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
      setSubmitError('Yêu cầu đặt dịch vụ cần tài khoản khách hàng. Hãy đăng xuất rồi đăng nhập tài khoản khách hàng.');
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
    <div className="mx-auto max-w-6xl space-y-7 px-4 py-7 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={backTo} className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {location.pathname === '/booking/start' ? 'Quay lại Yume Studio' : 'Quay lại dịch vụ của tôi'}
        </Link>
        <Link to={accountPath} className="inline-flex min-h-11 items-center rounded-md px-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {user?.roles.includes(6) ? 'Dịch vụ của tôi' : 'Tài khoản'}
        </Link>
      </div>

      <header className="max-w-3xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Yume Studio · Chụp kỷ yếu</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bắt đầu kế hoạch buổi chụp</h1>
        <p className="max-w-2xl text-muted-foreground">
          Chọn gói, cho studio biết thông tin lớp và thời gian mong muốn. Gửi yêu cầu hoàn toàn miễn phí; lịch và giá cuối cùng chỉ được chốt sau khi hai bên xác nhận.
        </p>
      </header>

      <ol aria-label="Các bước gửi yêu cầu" className="grid grid-cols-3 gap-2">
        {['Chọn dịch vụ', 'Lớp & thời gian', 'Kiểm tra yêu cầu'].map((label, index) => {
          const step = (index + 1) as BookingDraft['step'];
          const active = draft.step === step;
          const complete = draft.step > step;
          return (
            <li key={label} aria-current={active ? 'step' : undefined} className={`min-h-14 rounded-xl border p-3 text-sm ${active ? 'border-primary bg-primary/5 text-foreground' : 'text-muted-foreground'}`}>
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {complete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step}
              </span>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">Bước {step}</span>
            </li>
          );
        })}
      </ol>

      {bookingContext.length > 0 && (
        <aside className="rounded-2xl border border-primary/20 bg-primary/5 p-4" aria-labelledby="booking-context-title">
          <h2 id="booking-context-title" className="font-semibold">Bạn đang tham khảo</h2>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {bookingContext.map((entry) => <li key={entry}>{entry}</li>)}
          </ul>
          {draft.itemId && <p className="mt-2 text-xs text-muted-foreground">Trang phục hoặc phụ kiện chỉ được ghi nhận để tham khảo; studio sẽ xác nhận tình trạng trước khi chốt.</p>}
        </aside>
      )}

      {draft.step === 1 && (
        <section aria-labelledby="package-step-title" className="space-y-5">
          <div>
            <h2 id="package-step-title" className="text-xl font-semibold">Chọn gói chụp phù hợp</h2>
            <p className="mt-1 text-sm text-muted-foreground">Giá hiển thị là giá tham khảo mỗi thành viên. Studio sẽ gửi báo giá chính thức sau khi hiểu rõ nhu cầu của lớp.</p>
          </div>
          {loadingPackages ? (
            <p role="status" className="rounded-xl border p-5 text-sm text-muted-foreground">Đang tải các gói dịch vụ…</p>
          ) : packageError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
              <p>{packageError}</p>
              <Button className="mt-3" variant="outline" onClick={loadPackages}>Thử tải lại</Button>
            </div>
          ) : packages.length === 0 ? (
            <div className="rounded-xl border p-6">
              <p className="font-semibold">Hiện chưa có gói dịch vụ để chọn.</p>
              <p className="mt-1 text-sm text-muted-foreground">Liên hệ Yume để được tư vấn về buổi chụp của lớp.</p>
              <a href="tel:0869318118" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Gọi 0869318118</a>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {packages.map((item) => {
                  const selected = draft.packageId === item._id;
                  const compared = draft.comparedPackageIds.includes(item._id);
                  return (
                    <article key={item._id} className={`flex flex-col rounded-2xl border bg-card p-5 shadow-sm ${selected ? 'border-primary ring-1 ring-primary' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {item.isPopular && <span className="text-xs font-semibold uppercase tracking-wide text-primary">Được yêu thích</span>}
                          <h3 className="mt-1 text-lg font-semibold">{item.name}</h3>
                        </div>
                        {selected && <Check className="mt-1 h-5 w-5 shrink-0 text-primary" aria-label="Đang chọn" />}
                      </div>
                      <p className="mt-4 text-2xl font-bold">{money(item.pricePerMember)}<span className="ml-1 text-sm font-normal text-muted-foreground">/ người · tham khảo</span></p>
                      {item.description && <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>}
                      <dl className="mt-4 flex-1 space-y-2 border-t pt-4 text-sm">
                        {item.duration && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Thời lượng</dt><dd className="text-right">{durationLabel[item.duration]}</dd></div>}
                        {item.studentsPerCrew != null && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Quy mô ekip</dt><dd className="text-right">{item.studentsPerCrew} học sinh / thợ</dd></div>}
                        {item.costumes?.length ? <div><dt className="text-muted-foreground">Trang phục</dt><dd className="mt-1">{item.costumes.map((costume) => costume.name).join(', ')}</dd></div> : null}
                        {item.editingScope && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Chỉnh sửa</dt><dd className="text-right">{editingLabel[item.editingScope]}</dd></div>}
                        {item.deliveryDays != null && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Bàn giao dự kiến</dt><dd className="text-right">Trong {item.deliveryDays} ngày</dd></div>}
                      </dl>
                      <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        <Button type="button" variant={selected ? 'default' : 'outline'} className="min-h-11" aria-pressed={selected} onClick={() => { updateDraft({ packageId: item._id }); setErrors({}); }}>
                          {selected ? 'Đang chọn' : 'Chọn gói'}
                        </Button>
                        <Button type="button" variant="ghost" className="min-h-11" aria-pressed={compared} onClick={() => toggleComparison(item._id)}>
                          {compared ? 'Bỏ so sánh' : 'So sánh gói'}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {comparisonPackages.length > 0 && (
                <section className="overflow-hidden rounded-2xl border bg-card" aria-labelledby="compare-title">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
                    <div><h3 id="compare-title" className="font-semibold">So sánh gói dịch vụ</h3><p className="text-xs text-muted-foreground">Tối đa 3 gói · giá tham khảo, chưa phải báo giá cuối cùng</p></div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => updateDraft({ comparedPackageIds: [] })}>Xóa lựa chọn</Button>
                  </div>
                  <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-3">
                    {comparisonPackages.map((item) => (
                      <div key={item._id} className="space-y-2 p-4 text-sm">
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-lg font-bold">{money(item.pricePerMember)} <span className="text-xs font-normal text-muted-foreground">/ người</span></p>
                        <p className="text-muted-foreground">{item.duration ? durationLabel[item.duration] : 'Thời lượng trao đổi với studio'}</p>
                        <p className="text-muted-foreground">{item.costumes?.length ? item.costumes.map((c) => c.name).join(', ') : 'Trang phục trao đổi với studio'}</p>
                        <Button type="button" size="sm" variant={draft.packageId === item._id ? 'default' : 'outline'} onClick={() => updateDraft({ packageId: item._id })}>{draft.packageId === item._id ? 'Gói đang chọn' : 'Chọn gói này'}</Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
          {errors.packageId && <p role="alert" className="text-sm text-destructive">{errors.packageId}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" className="min-h-11" disabled={loadingPackages || packages.length === 0} onClick={() => continueFrom(1)}>Tiếp tục <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </section>
      )}

      {draft.step === 2 && (
        <section className="space-y-5" aria-labelledby="details-step-title">
          <div><h2 id="details-step-title" className="text-xl font-semibold">Cho Yume biết về lớp mình</h2><p className="mt-1 text-sm text-muted-foreground">Thông tin này giúp studio kiểm tra khả năng phục vụ và liên hệ với bạn.</p></div>
          <div className="grid gap-5 rounded-2xl border bg-card p-4 sm:grid-cols-2 sm:p-6">
            <Field id="className" label="Tên lớp / nhóm" error={errors.className}>
              <Input id="className" autoComplete="organization" maxLength={120} placeholder="Ví dụ: 12A1" value={draft.className} className={fieldClass} aria-invalid={!!errors.className} onChange={(event) => updateDraft({ className: event.target.value })} />
            </Field>
            <Field id="school" label="Trường" >
              <Input id="school" autoComplete="organization-title" maxLength={160} placeholder="Tên trường (không bắt buộc)" value={draft.school} className={fieldClass} onChange={(event) => updateDraft({ school: event.target.value })} />
            </Field>
            <Field id="contactName" label="Họ tên người liên hệ" error={errors.contactName}>
              <Input id="contactName" autoComplete="name" maxLength={100} value={draft.contactName} className={fieldClass} aria-invalid={!!errors.contactName} onChange={(event) => updateDraft({ contactName: event.target.value })} />
            </Field>
            <Field id="phone" label="Số điện thoại" error={errors.phone}>
              <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={25} value={draft.phone} className={fieldClass} aria-invalid={!!errors.phone} onChange={(event) => updateDraft({ phone: event.target.value })} />
            </Field>
            <Field id="members" label="Số thành viên dự kiến" error={errors.members}>
              <Input id="members" type="number" inputMode="numeric" min={1} max={1000} value={draft.members} className={fieldClass} aria-invalid={!!errors.members} onChange={(event) => updateDraft({ members: Number(event.target.value) })} />
            </Field>
            <Field id="location" label="Địa điểm mong muốn" error={errors.location}>
              <Input id="location" autoComplete="street-address" maxLength={300} placeholder="Trường, studio hoặc địa điểm dự kiến" value={draft.location} className={fieldClass} aria-invalid={!!errors.location} onChange={(event) => updateDraft({ location: event.target.value })} />
            </Field>
            <Field id="startAt" label="Ngày và giờ bắt đầu mong muốn (giờ Việt Nam)" error={errors.startAt}>
              <Input id="startAt" type="datetime-local" min={minimumTime} value={draft.startAt} className={fieldClass} aria-invalid={!!errors.startAt} onChange={(event) => updateDraft({ startAt: event.target.value })} />
            </Field>
            <Field id="endAt" label="Ngày và giờ kết thúc mong muốn (giờ Việt Nam)" error={errors.endAt}>
              <Input id="endAt" type="datetime-local" min={draft.startAt || minimumTime} value={draft.endAt} className={fieldClass} aria-invalid={!!errors.endAt} onChange={(event) => updateDraft({ endAt: event.target.value })} />
            </Field>
            <p className="sm:col-span-2 -mt-3 text-xs text-muted-foreground">Lịch được ghi nhận theo múi giờ Việt Nam (UTC+7).</p>
            <Field id="note" label="Điều Yume nên biết thêm" error={errors.note}>
              <Textarea id="note" rows={4} maxLength={2000} placeholder="Phong cách mong muốn, concept, lưu ý của lớp…" value={draft.note} className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-invalid={!!errors.note} onChange={(event) => updateDraft({ note: event.target.value })} />
            </Field>
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => goToStep(1)}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />Quay lại</Button>
            <Button type="button" className="min-h-11" onClick={() => continueFrom(2)}>Xem lại yêu cầu <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </section>
      )}

      {draft.step === 3 && (
        <section className="space-y-5" aria-labelledby="review-step-title">
          <div><h2 id="review-step-title" className="text-xl font-semibold">Kiểm tra trước khi gửi</h2><p className="mt-1 text-sm text-muted-foreground">Yêu cầu này chưa giữ lịch, chưa xác nhận dịch vụ và chưa thu tiền.</p></div>
          <div className="grid gap-5 lg:grid-cols-[1fr_19rem]">
            <div className="space-y-4">
              <section className="rounded-2xl border bg-card p-5">
                <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">Gói chụp</h3><Button type="button" variant="link" onClick={() => goToStep(1)}>Sửa</Button></div>
                <p className="mt-2 text-lg font-semibold">{selectedPackage?.name || 'Chưa chọn gói'}</p>
                {selectedPackage?.description && <p className="mt-1 text-sm text-muted-foreground">{selectedPackage.description}</p>}
                {selectedPackage && <p className="mt-2 text-sm">{money(selectedPackage.pricePerMember)} / người · {selectedPackage.duration ? durationLabel[selectedPackage.duration] : 'Thời lượng trao đổi với studio'}</p>}
                {bookingContext.length > 0 && <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{bookingContext.map((item) => <li key={item}>{item}</li>)}</ul>}
              </section>
              <section className="rounded-2xl border bg-card p-5">
                <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">Lớp & người liên hệ</h3><Button type="button" variant="link" onClick={() => goToStep(2)}>Sửa</Button></div>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted-foreground">Lớp / nhóm</dt><dd className="font-medium">{draft.className}</dd></div>
                  {draft.school && <div><dt className="text-muted-foreground">Trường</dt><dd className="font-medium">{draft.school}</dd></div>}
                  <div><dt className="text-muted-foreground">Người liên hệ</dt><dd className="font-medium">{draft.contactName}</dd></div>
                  <div><dt className="text-muted-foreground">Điện thoại</dt><dd className="font-medium">{draft.phone}</dd></div>
                  <div><dt className="text-muted-foreground">Quy mô dự kiến</dt><dd className="font-medium">{draft.members} thành viên</dd></div>
                  <div><dt className="text-muted-foreground">Địa điểm</dt><dd className="font-medium">{draft.location}</dd></div>
                  <div><dt className="text-muted-foreground">Bắt đầu</dt><dd className="font-medium">{date(draft.startAt)}</dd></div>
                  <div><dt className="text-muted-foreground">Kết thúc</dt><dd className="font-medium">{date(draft.endAt)}</dd></div>
                </dl>
                {draft.note && <p className="mt-4 whitespace-pre-wrap border-t pt-3 text-sm">{draft.note}</p>}
              </section>
            </div>
            <aside className="h-fit rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <h3 className="font-semibold">Ước tính tham khảo</h3>
              <p className="mt-3 text-sm text-muted-foreground">{selectedPackage ? `${money(selectedPackage.pricePerMember)} × ${draft.members} thành viên` : 'Chọn gói để xem ước tính'}</p>
              <p className="mt-1 text-2xl font-bold">{selectedPackage ? money(selectedPackage.pricePerMember * draft.members) : '—'}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Đây chỉ là ước tính theo đơn giá công khai. Báo giá cuối cùng có thể thay đổi theo yêu cầu, lịch chụp và nội dung dịch vụ hai bên thống nhất.</p>
            </aside>
          </div>
          {submitError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{submitError}</p>}
          {!user && <p className="rounded-xl border bg-muted/40 p-4 text-sm">Bạn cần đăng nhập hoặc tạo tài khoản khách hàng ngay trước khi gửi yêu cầu. Bản nháp này sẽ được giữ lại.</p>}
          {user && !isClient && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{submitError || 'Tài khoản hiện tại không có quyền gửi yêu cầu khách hàng.'}</p>}
          <div className="flex flex-wrap justify-between gap-3">
            <Button type="button" variant="outline" className="min-h-11" disabled={submitting} onClick={() => goToStep(2)}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />Sửa thông tin</Button>
            <div className="flex flex-wrap gap-3">
              {!user && <Link to="/register" state={returnTo ? { from: returnTo } : undefined} className="inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold hover:bg-muted">Tạo tài khoản</Link>}
                  <Button type="button" className="min-h-11" disabled={submitting || loadingPackages} onClick={submit}>
                {submitting ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Đang gửi…</> : user ? 'Gửi yêu cầu tới Yume' : 'Đăng nhập để gửi'}
              </Button>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">Không cần thanh toán ở bước gửi yêu cầu. Studio sẽ phản hồi trong giờ làm việc.</p>
        </section>
      )}
    </div>
  );
}
