import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, CirclePlus, Minus, Plus, Trash2 } from 'lucide-react';
import {
  OrderButton as Button,
  OrderInput as Input,
  OrderTextarea as Textarea,
  OrderSelect,
} from '../components/customer/CustomerOrderControls';
import { useCustomerAppearance } from '../components/customer/CustomerAppearance';
import { CustomerPrice } from '../components/customer/CustomerPrice';
import '../styles/customer-orders.css';
import '../styles/customer-rental-form.css';
import { useAuth } from '../context/AuthContext';
import { costumeService } from '../services/costumeService';
import {
  rentalService,
  rentalError,
  rentalMoney,
  type RentalRequest,
} from '../services/rentalService';
import { RENTAL_DRAFT_KEY, clearRentalDraft } from '../services/rentalDraft';
import { createWorkflowRequestId } from '../services/bookingWorkflowService';
import type { RentalCatalogItem } from '../types';
import { rentalDayCount, validateRentalPeriod, vietnamToday } from '../utils/rentalPeriod';

type Draft = Omit<RentalRequest, 'lines'> & {
  lines: Array<{ costumeId: string; size: string; quantity: string }>;
  preview: boolean;
  ownerId: string | null;
  requestKey?: string;
  signature?: string;
};
const empty = (ownerId: string | null): Draft => ({
  ownerId,
  contactName: '',
  phone: '',
  note: '',
  receiveDate: '',
  returnDate: '',
  lines: [{ costumeId: '', size: '', quantity: '1' }],
  preview: false,
});
export default function NewRentalPage() {
  const formId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const customer = useCustomerAppearance();
  const ContentTag = customer ? 'section' : 'main';
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const appliedCatalogItem = useRef('');
  const [draft, setDraft] = useState<Draft>(() => {
    const incomingPeriod = {
      receiveDate: params.get('receiveDate') ?? '',
      returnDate: params.get('returnDate') ?? '',
    };
    try {
      const saved = JSON.parse(sessionStorage.getItem(RENTAL_DRAFT_KEY) || 'null') as Draft | null;
      if (saved && (!saved.ownerId || saved.ownerId === user?._id) && Array.isArray(saved.lines)) {
        const period =
          params.has('receiveDate') || params.has('returnDate') ? incomingPeriod : saved;
        return {
          ...saved,
          receiveDate: period.receiveDate,
          returnDate: period.returnDate,
          preview:
            period.receiveDate !== saved.receiveDate || period.returnDate !== saved.returnDate
              ? false
              : saved.preview,
        };
      }
    } catch {
      clearRentalDraft();
    }
    return {
      ...empty(user?._id ?? null),
      ...incomingPeriod,
      lines: [{ costumeId: params.get('item') ?? '', size: '', quantity: '1' }],
    };
  });
  const [catalog, setCatalog] = useState<RentalCatalogItem[]>([]);
  const [catalogRange, setCatalogRange] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const periodError = validateRentalPeriod(draft.receiveDate, draft.returnDate);
  const catalogParams = new URLSearchParams();
  if (draft.receiveDate) catalogParams.set('receiveDate', draft.receiveDate);
  if (draft.returnDate) catalogParams.set('returnDate', draft.returnDate);
  const catalogPath = '/costumes' + (catalogParams.size ? `?${catalogParams}` : '');
  const days = rentalDayCount(draft.receiveDate, draft.returnDate);
  const range = `${draft.receiveDate}:${draft.returnDate}`;
  const catalogReady = !periodError && catalogRange === range && !loading && !catalogError;
  useEffect(() => {
    let active = true;
    setCatalogRange('');
    setCatalogError('');
    if (periodError) {
      setLoading(false);
      return;
    }
    setLoading(true);
    costumeService
      .getPublicCatalog({ receiveDate: draft.receiveDate, returnDate: draft.returnDate })
      .then((items) => {
        if (active) {
          setCatalog(items);
          setCatalogRange(range);
        }
      })
      .catch((e) => {
        if (active) setCatalogError(rentalError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [draft.receiveDate, draft.returnDate, periodError, range, retry]);
  useEffect(() => {
    sessionStorage.setItem(
      RENTAL_DRAFT_KEY,
      JSON.stringify({ ...draft, ownerId: user?._id ?? draft.ownerId }),
    );
  }, [draft, user?._id]);
  useEffect(() => {
    const item = params.get('item');
    if (!item || item === appliedCatalogItem.current || !catalog.some((row) => row._id === item))
      return;
    appliedCatalogItem.current = item;
    const adding = params.get('add') === '1';
    if (!adding && draft.lines.some((row) => row.costumeId === item)) return;
    const emptyIndex = draft.lines.findIndex((row) => !row.costumeId);
    if (emptyIndex < 0 && draft.lines.length >= 30) {
      setError('Yêu cầu thuê tối đa 30 dòng. Hãy bỏ bớt một món trước khi chọn thêm mẫu.');
      return;
    }
    const selection = { costumeId: item, size: '', quantity: '1' };
    setDraft((current) => ({
      ...current,
      preview: false,
      lines:
        emptyIndex >= 0
          ? current.lines.map((row, index) => (index === emptyIndex ? selection : row))
          : [...current.lines, selection],
    }));
    if (adding) {
      // Consume the selection so refreshing does not append the same item again.
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete('item');
          next.delete('add');
          return next;
        },
        { replace: true },
      );
    }
  }, [catalog, params, draft.lines, setParams]);
  const patch = (value: Partial<Draft>) => {
    setError('');
    setDraft((current) => ({ ...current, ...value }));
  };
  const rowPatch = (index: number, value: Partial<Draft['lines'][number]>) =>
    patch({
      lines: draft.lines.map((row, position) => (position === index ? { ...row, ...value } : row)),
    });
  const addRentalItem = () => {
    const next = { ...draft, ownerId: user?._id ?? draft.ownerId, preview: false };
    sessionStorage.setItem(RENTAL_DRAFT_KEY, JSON.stringify(next));
    const params = new URLSearchParams(catalogParams);
    params.set('add', '1');
    navigate(`/costumes?${params}`);
  };
  const changePeriod = (name: 'receiveDate' | 'returnDate', value: string) => {
    const next = { receiveDate: draft.receiveDate, returnDate: draft.returnDate, [name]: value };
    patch({ ...next, preview: false });
    setParams(
      (current) => {
        current.set('receiveDate', next.receiveDate);
        current.set('returnDate', next.returnDate);
        return current;
      },
      { replace: true },
    );
  };
  const lineEstimate = (row: Draft['lines'][number]) => {
    const rate = catalog.find((item) => item._id === row.costumeId)?.rentalDailyPrice;
    const quantity = Number(row.quantity);
    return typeof rate === 'number' &&
      rate > 0 &&
      Number.isSafeInteger(quantity) &&
      quantity > 0 &&
      days
      ? rate * quantity * days
      : null;
  };
  const rowAvailability = (row: Draft['lines'][number], index: number) => {
    const item = catalog.find((value) => value._id === row.costumeId);
    const available = item?.availableBySize?.[row.size] ?? 0;
    const inOtherRows = draft.lines.reduce(
      (sum, other, position) =>
        position !== index && other.costumeId === row.costumeId && other.size === row.size
          ? sum + (Number(other.quantity) || 0)
          : sum,
      0,
    );
    return Math.max(0, available - inOtherRows);
  };
  const selectionError = !catalogReady
    ? periodError || 'Đang kiểm tra hàng còn trống cho kỳ thuê.'
    : draft.lines.some((row, index) => {
          const quantity = Number(row.quantity);
          return (
            !row.costumeId ||
            !row.size ||
            !Number.isSafeInteger(quantity) ||
            quantity < 1 ||
            quantity > rowAvailability(row, index)
          );
        })
      ? 'Kiểm tra lại mẫu, kích cỡ và số lượng còn trống trong kỳ thuê đã chọn.'
      : '';
  const estimate =
    catalogReady && days && draft.lines.every((row) => lineEstimate(row) !== null)
      ? draft.lines.reduce((sum, row) => sum + (lineEstimate(row) ?? 0), 0)
      : null;
  const estimateContent = (
    <p className={customer ? 'customer-rental-form__estimate' : undefined}>
      {customer ? 'Tạm tính:' : 'Tiền thuê dự kiến:'}{' '}
      {estimate === null ? (
        'Studio sẽ báo giá theo ngày cho các mẫu chưa có giá.'
      ) : customer ? (
        <CustomerPrice amount={estimate} emphasis="total" />
      ) : (
        rentalMoney(estimate)
      )}
      {estimate !== null && (
        <span className={customer ? 'sr-only' : 'block text-sm text-muted-foreground'}>
          Giá/ngày × số lượng × {days} ngày. Chưa bao gồm cọc và phát sinh.
        </span>
      )}
    </p>
  );
  const payload = (): RentalRequest => ({
    contactName: draft.contactName.trim(),
    phone: draft.phone.trim(),
    note: draft.note.trim(),
    receiveDate: draft.receiveDate,
    returnDate: draft.returnDate,
    lines: draft.lines.map((row) => ({
      costumeId: row.costumeId,
      size: row.size,
      quantity: Number(row.quantity),
    })),
  });
  const submit = async () => {
    if (selectionError) {
      setError(selectionError);
      return;
    }
    if (!user) {
      const returnParams = new URLSearchParams(params);
      returnParams.set('receiveDate', draft.receiveDate);
      returnParams.set('returnDate', draft.returnDate);
      navigate(`/login?returnTo=${encodeURIComponent(`/rental/start?${returnParams}`)}`);
      return;
    }
    if (!user.roles.includes(6)) {
      setError('Hãy dùng tài khoản khách hàng để gửi yêu cầu thuê.');
      return;
    }
    const data = payload();
    const signature = JSON.stringify(data);
    const requestKey =
      draft.signature === signature && draft.requestKey
        ? draft.requestKey
        : createWorkflowRequestId();
    patch({ signature, requestKey });
    setBusy(true);
    try {
      const order = await rentalService.create(data, requestKey);
      clearRentalDraft();
      navigate(`/account/rentals/${order._id}`);
    } catch (e) {
      setError(rentalError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ContentTag
      className={
        customer
          ? 'customer-orders customer-orders--rental-form customer-rental-form'
          : 'mx-auto max-w-3xl space-y-6 px-4 py-8'
      }
    >
      <div className={customer ? 'customer-rental-form__layout' : undefined}>
        <div className={customer ? 'customer-rental-form__main' : undefined}>
          <header className={customer ? 'customer-rental-form__header' : undefined}>
            <Link className={customer ? 'customer-link' : 'text-sm text-primary'} to={catalogPath}>
              {customer ? (
                <>
                  <ArrowLeft size={16} aria-hidden="true" /> Danh mục trang phục
                </>
              ) : periodError ? (
                '← Chọn thời gian và mẫu thuê'
              ) : (
                '← Đổi thời gian hoặc chọn mẫu'
              )}
            </Link>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className={customer ? 'customer-page-title mt-4' : 'mt-4 text-3xl font-bold'}
            >
              Thông tin thuê trang phục
            </h1>
            <p className="mt-2 text-muted-foreground">
              Chọn mẫu, nhập số lượng và để lại thông tin liên hệ.
            </p>
          </header>
          {error && (
            <p
              role="alert"
              className={
                customer
                  ? 'customer-order-error'
                  : 'rounded-xl border border-destructive/30 p-4 text-destructive'
              }
            >
              {error}
            </p>
          )}
          {customer ? (
            <section className="customer-rental-form__period" aria-label="Kỳ thuê">
              <CalendarDays size={24} aria-hidden="true" />
              <label className="customer-order-field" htmlFor="rental-receive-date">
                Ngày nhận
                <Input
                  id="rental-receive-date"
                  type="date"
                  min={vietnamToday()}
                  value={draft.receiveDate}
                  aria-invalid={!!periodError}
                  onChange={(event) => changePeriod('receiveDate', event.target.value)}
                />
              </label>
              <label className="customer-order-field" htmlFor="rental-return-date">
                Ngày trả
                <Input
                  id="rental-return-date"
                  type="date"
                  min={draft.receiveDate || vietnamToday()}
                  value={draft.returnDate}
                  aria-invalid={!!periodError}
                  onChange={(event) => changePeriod('returnDate', event.target.value)}
                />
              </label>
              <div className="customer-rental-form__period-count">
                {periodError ? (
                  <p role="alert" className="customer-error">
                    {periodError}
                  </p>
                ) : (
                  <>
                    <strong>{days} ngày thuê</strong>
                    <span>Tính cả ngày nhận và ngày trả.</span>
                  </>
                )}
              </div>
            </section>
          ) : (
            <section
              aria-label={periodError ? 'Kỳ thuê' : 'Kỳ thuê đã chọn'}
              className={
                customer
                  ? 'customer-rental-form__period'
                  : 'grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2'
              }
            >
              <div className={customer ? 'customer-rental-form__period-title' : 'sm:col-span-2'}>
                <CalendarDays aria-hidden="true" size={24} />
                <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
                  {periodError ? 'Chưa chọn kỳ thuê hợp lệ' : 'Kỳ thuê đã chọn'}
                </h2>
              </div>
              {periodError ? (
                <p
                  role="alert"
                  className={
                    customer
                      ? 'customer-order-span-full customer-error'
                      : 'sm:col-span-2 text-destructive'
                  }
                >
                  {periodError}
                </p>
              ) : (
                <>
                  <dl
                    className={
                      customer
                        ? 'customer-rental-form__period-dates'
                        : 'grid gap-4 sm:col-span-2 sm:grid-cols-2'
                    }
                  >
                    <div>
                      <dt className="text-sm text-muted-foreground">Ngày nhận</dt>
                      <dd>
                        <time dateTime={draft.receiveDate}>
                          {draft.receiveDate.split('-').reverse().join('/')}
                        </time>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Ngày trả</dt>
                      <dd>
                        <time dateTime={draft.returnDate}>
                          {draft.returnDate.split('-').reverse().join('/')}
                        </time>
                      </dd>
                    </div>
                  </dl>
                  <p
                    className={
                      customer
                        ? 'customer-rental-form__period-count'
                        : 'sm:col-span-2 text-sm text-muted-foreground'
                    }
                  >
                    {days} ngày thuê; tính cả ngày nhận và ngày trả.
                  </p>
                </>
              )}
            </section>
          )}
          {periodError ? null : loading || (!catalogReady && !catalogError) ? (
            <p role="status">Đang kiểm tra mẫu còn trống…</p>
          ) : catalogError || !catalog.length ? (
            <section className={customer ? 'customer-order-surface' : 'rounded-xl border p-5'}>
              <p role={catalogError ? 'alert' : undefined}>
                {catalogError ||
                  'Không còn mẫu phù hợp trong kỳ thuê đã chọn. Hãy thử khoảng ngày khác.'}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setCatalogError('');
                  setRetry((value) => value + 1);
                }}
              >
                Tải lại danh mục
              </Button>
            </section>
          ) : draft.preview ? (
            <section
              className={
                customer ? 'customer-order-surface' : 'space-y-4 rounded-2xl border bg-card p-5'
              }
            >
              <h2 className={customer ? 'customer-section-title' : 'text-xl font-semibold'}>
                Kiểm tra yêu cầu thuê
              </h2>
              <ul className="space-y-2">
                {draft.lines.map((row, index) => (
                  <li key={index}>
                    {catalog.find((item) => item._id === row.costumeId)?.name ??
                      'Mẫu chưa xác định'}{' '}
                    · cỡ {row.size} · {row.quantity} món
                  </li>
                ))}
              </ul>
              <p>
                Ngày nhận: {draft.receiveDate} · Ngày trả: {draft.returnDate} · {days} ngày
              </p>
              {!customer && estimateContent}
              {selectionError && <p role="alert">{selectionError}</p>}
              <p>
                {draft.contactName} · {draft.phone}
              </p>
              <p className="whitespace-pre-wrap break-words">{draft.note}</p>
              <p className="text-sm text-muted-foreground">
                Giá cuối cùng, cọc và điều kiện hoàn cọc sẽ nằm trong báo giá cần bạn đồng ý.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" disabled={busy} onClick={() => patch({ preview: false })}>
                  Chỉnh sửa yêu cầu
                </Button>
                <Button disabled={busy || !!selectionError} onClick={() => void submit()}>
                  {busy ? 'Đang gửi…' : user ? 'Gửi yêu cầu thuê' : 'Đăng nhập để gửi yêu cầu thuê'}
                </Button>
              </div>
            </section>
          ) : (
            <form
              id={formId}
              className={customer ? 'customer-rental-form__body' : 'space-y-6'}
              onSubmit={(event) => {
                event.preventDefault();
                if (selectionError) {
                  setError(selectionError);
                  return;
                }
                patch({ preview: true });
              }}
            >
              <section
                className={
                  customer
                    ? 'customer-rental-form__items'
                    : 'space-y-4 rounded-2xl border bg-card p-5'
                }
              >
                <h2
                  className={
                    customer
                      ? 'customer-section-title customer-rental-form__section-title'
                      : 'text-lg font-semibold'
                  }
                >
                  Danh sách món thuê
                </h2>
                {customer && (
                  <div className="customer-rental-form__column-headings" aria-hidden="true">
                    <span>Mẫu thuê</span>
                    <span>Kích cỡ</span>
                    <span>Số lượng</span>
                    <span>Giá thuê/ngày</span>
                    <span>Tiền thuê</span>
                    <span />
                  </div>
                )}
                {draft.lines.map((row, index) => {
                  const item = catalog.find((value) => value._id === row.costumeId);
                  const remaining = rowAvailability(row, index);
                  const quantity = Number(row.quantity);
                  const lineTotal = lineEstimate(row);
                  return (
                    <fieldset
                      key={index}
                      className={
                        customer
                          ? 'customer-rental-form__row'
                          : 'grid gap-3 rounded-xl bg-muted/30 p-4 sm:grid-cols-2'
                      }
                    >
                      <legend className="sr-only">Món thuê {index + 1}</legend>
                      <div
                        className={
                          customer ? 'customer-order-field customer-rental-form__item' : 'space-y-1'
                        }
                      >
                        <label
                          className={customer ? 'customer-rental-form__field-label' : undefined}
                          htmlFor={`rental-item-${index}`}
                        >
                          Mẫu thuê {index + 1}
                        </label>
                        <OrderSelect
                          id={`rental-item-${index}`}
                          required
                          className="min-h-11 w-full rounded-md border bg-background px-3"
                          value={row.costumeId}
                          onChange={(event) =>
                            rowPatch(index, { costumeId: event.target.value, size: '' })
                          }
                        >
                          <option value="">Chọn mẫu thuê</option>
                          {row.costumeId && !item && (
                            <option value={row.costumeId}>Mẫu không còn trống trong kỳ thuê</option>
                          )}
                          {catalog.map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.name}
                            </option>
                          ))}
                        </OrderSelect>
                        {row.size && (
                          <p>
                            Cỡ {row.size} · còn tối đa {remaining} món cho dòng này.
                          </p>
                        )}
                        {row.costumeId && (!item || (row.size && quantity > remaining)) && (
                          <p
                            role="alert"
                            className={customer ? 'customer-error' : 'text-destructive'}
                          >
                            Lựa chọn này không đủ hàng trong kỳ thuê mới. Hãy chọn lại.
                          </p>
                        )}
                      </div>
                      <div
                        className={
                          customer ? 'customer-order-field customer-rental-form__size' : 'space-y-1'
                        }
                      >
                        <label
                          className={customer ? 'customer-rental-form__field-label' : undefined}
                          htmlFor={`rental-size-${index}`}
                        >
                          Kích cỡ {index + 1}
                        </label>
                        <OrderSelect
                          id={`rental-size-${index}`}
                          required
                          disabled={!item}
                          className="min-h-11 w-full rounded-md border bg-background px-3"
                          value={row.size}
                          onChange={(event) => rowPatch(index, { size: event.target.value })}
                        >
                          <option value="">Chọn kích cỡ</option>
                          {row.size && !item?.sizes.includes(row.size) && (
                            <option value={row.size}>{row.size} — Không còn trống</option>
                          )}
                          {item?.sizes.map((size) => (
                            <option key={size} value={size}>
                              {customer
                                ? size
                                : `${size} · còn ${item.availableBySize?.[size] ?? 0}`}
                            </option>
                          ))}
                        </OrderSelect>
                      </div>
                      <div className={customer ? 'customer-rental-form__quantity' : 'space-y-1'}>
                        <label
                          className={customer ? 'customer-rental-form__field-label' : undefined}
                          htmlFor={`rental-quantity-${index}`}
                        >
                          Số lượng {index + 1}
                        </label>
                        <div>
                          <Button
                            type="button"
                            variant="ghost"
                            aria-label={`Giảm số lượng ${index + 1}`}
                            disabled={!row.size || !Number.isSafeInteger(quantity) || quantity <= 1}
                            onClick={() => rowPatch(index, { quantity: String(quantity - 1) })}
                          >
                            <Minus aria-hidden="true" size={18} />
                          </Button>
                          <Input
                            id={`rental-quantity-${index}`}
                            required
                            min={1}
                            max={Math.max(1, remaining)}
                            disabled={!row.size}
                            step={1}
                            type="number"
                            value={row.quantity}
                            onChange={(event) => rowPatch(index, { quantity: event.target.value })}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            aria-label={`Tăng số lượng ${index + 1}`}
                            disabled={
                              !row.size ||
                              !Number.isSafeInteger(quantity) ||
                              quantity < 1 ||
                              quantity >= remaining
                            }
                            onClick={() => rowPatch(index, { quantity: String(quantity + 1) })}
                          >
                            <Plus aria-hidden="true" size={18} />
                          </Button>
                        </div>
                      </div>
                      <div
                        className={
                          customer
                            ? 'customer-rental-form__rate'
                            : 'self-center text-sm text-muted-foreground'
                        }
                      >
                        <span
                          className={customer ? 'customer-rental-form__field-label' : 'sr-only'}
                        >
                          Giá thuê/ngày
                        </span>
                        <p>
                          {item ? (
                            typeof item.rentalDailyPrice === 'number' &&
                            item.rentalDailyPrice > 0 ? (
                              customer ? (
                                <CustomerPrice amount={item.rentalDailyPrice} />
                              ) : (
                                `${rentalMoney(item.rentalDailyPrice)}/món/ngày`
                              )
                            ) : (
                              'Chờ studio báo giá theo ngày'
                            )
                          ) : (
                            'Chọn mẫu trước'
                          )}
                        </p>
                      </div>
                      <div className={customer ? 'customer-rental-form__line-total' : undefined}>
                        <span
                          className={customer ? 'customer-rental-form__field-label' : 'sr-only'}
                        >
                          Tiền thuê
                        </span>
                        <p>
                          {lineTotal === null ? (
                            item ? (
                              'Chờ báo giá'
                            ) : (
                              '—'
                            )
                          ) : customer ? (
                            <CustomerPrice amount={lineTotal} />
                          ) : (
                            rentalMoney(lineTotal)
                          )}
                        </p>
                      </div>
                      {(customer || draft.lines.length > 1) && (
                        <Button
                          type="button"
                          variant="ghost"
                          className={customer ? 'customer-rental-form__remove' : undefined}
                          aria-label={`Bỏ món ${index + 1}`}
                          disabled={draft.lines.length === 1}
                          onClick={() =>
                            patch({
                              lines: draft.lines.filter((_, position) => position !== index),
                            })
                          }
                        >
                          <Trash2 aria-hidden="true" size={20} />
                          {!customer && `Bỏ món ${index + 1}`}
                        </Button>
                      )}
                    </fieldset>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  className={customer ? 'customer-rental-form__add' : undefined}
                  disabled={draft.lines.length >= 30}
                  onClick={addRentalItem}
                >
                  <CirclePlus aria-hidden="true" size={20} /> Thêm món thuê
                </Button>
              </section>
              <section
                className={
                  customer
                    ? 'customer-rental-form__contact'
                    : 'grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2'
                }
              >
                <h2
                  className={
                    customer
                      ? 'customer-section-title customer-rental-form__section-title'
                      : 'text-lg font-semibold sm:col-span-2'
                  }
                >
                  Thông tin liên hệ
                </h2>
                <label className={customer ? 'customer-order-field' : undefined}>
                  Người liên hệ
                  <Input
                    required
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Nhập họ và tên"
                    value={draft.contactName}
                    onChange={(event) => patch({ contactName: event.target.value })}
                  />
                </label>
                <label className={customer ? 'customer-order-field' : undefined}>
                  Số điện thoại
                  <Input
                    required
                    type="tel"
                    maxLength={20}
                    autoComplete="tel"
                    placeholder="Nhập số điện thoại"
                    value={draft.phone}
                    onChange={(event) => patch({ phone: event.target.value })}
                  />
                </label>
                <label
                  className={
                    customer ? 'customer-order-field customer-rental-form__notes' : 'sm:col-span-2'
                  }
                >
                  Ghi chú (không bắt buộc)
                  <Textarea
                    aria-label="Ghi chú thuê"
                    rows={3}
                    placeholder="Lời nhắn cho studio"
                    maxLength={2000}
                    value={draft.note}
                    onChange={(event) => patch({ note: event.target.value })}
                  />
                </label>
              </section>
              {!customer && (
                <div className="space-y-4">
                  {estimateContent}
                  <div className={customer ? 'customer-rental-form__footer-meta' : undefined}>
                    <p>
                      {draft.lines.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)} món ·{' '}
                      {days} ngày
                    </p>
                    <p>Chưa gồm cọc và phát sinh. Studio sẽ gửi báo giá để bạn xác nhận.</p>
                  </div>
                  <div className={customer ? 'customer-rental-form__footer-action' : undefined}>
                    <Button type="submit" disabled={!!selectionError}>
                      Xem lại yêu cầu thuê
                    </Button>
                    <p>Gửi yêu cầu chưa giữ hàng.</p>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
        {customer && (
          <aside className="customer-rental-form__summary" aria-labelledby="rental-summary-title">
            <h2 id="rental-summary-title">Tóm tắt kỳ thuê</h2>
            <div className="customer-rental-form__summary-period">
              <CalendarDays size={22} aria-hidden="true" />
              <div>
                {!periodError ? (
                  <>
                    <p>
                      <time dateTime={draft.receiveDate}>
                        {draft.receiveDate.split('-').reverse().join('/')}
                      </time>
                      <ArrowRight size={18} aria-hidden="true" />
                      <time dateTime={draft.returnDate}>
                        {draft.returnDate.split('-').reverse().join('/')}
                      </time>
                    </p>
                    <p>{days} ngày thuê · Tính cả ngày nhận và ngày trả.</p>
                  </>
                ) : (
                  <p>Chọn ngày nhận và trả để xem tạm tính.</p>
                )}
              </div>
            </div>
            <section
              className="customer-rental-form__summary-items"
              aria-labelledby="rental-summary-items-title"
            >
              <h3 id="rental-summary-items-title">
                Danh sách món thuê (
                {
                  new Set(draft.lines.filter((row) => row.costumeId).map((row) => row.costumeId))
                    .size
                }{' '}
                mẫu)
              </h3>
              {!draft.lines.some((row) => row.costumeId) ? (
                <p className="customer-rental-form__summary-empty">Chưa chọn món thuê.</p>
              ) : (
                <ul>
                  {draft.lines
                    .filter((row) => row.costumeId)
                    .map((row, index) => {
                      const item = catalog.find((item) => item._id === row.costumeId);
                      const total = catalogReady ? lineEstimate(row) : null;
                      return (
                        <li key={index}>
                          <div>
                            <h4>{item?.name || 'Mẫu đã chọn'}</h4>
                            <p>
                              Size {row.size || 'chưa chọn'} · {row.quantity || '—'} món
                            </p>
                          </div>
                          <p className="customer-rental-form__summary-line-total">
                            {total === null ? 'Chờ báo giá' : <CustomerPrice amount={total} />}
                          </p>
                          {item?.rentalDailyPrice != null && item.rentalDailyPrice > 0 && days && (
                            <p className="customer-rental-form__summary-formula">
                              {item.rentalDailyPrice.toLocaleString('vi-VN')} ₫/ngày ×{' '}
                              {row.quantity || '—'} món × {days} ngày
                            </p>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>
            <div className="customer-rental-form__summary-total">
              <p>
                <span>Tổng cộng</span>
                <span>
                  {draft.lines.reduce(
                    (sum, row) =>
                      sum +
                      (row.costumeId &&
                      Number.isSafeInteger(Number(row.quantity)) &&
                      Number(row.quantity) > 0
                        ? Number(row.quantity)
                        : 0),
                    0,
                  )}{' '}
                  món{days ? ` · ${days} ngày` : ''}
                </span>
              </p>
              {estimateContent}
            </div>
            {!draft.preview && (
              <Button form={formId} type="submit" disabled={!!selectionError}>
                Xem lại yêu cầu thuê <ArrowRight size={18} aria-hidden="true" />
              </Button>
            )}
            <p>Chưa gồm cọc và phát sinh. Studio sẽ gửi báo giá để bạn xác nhận.</p>
            <p>Gửi yêu cầu chưa giữ hàng.</p>
          </aside>
        )}
      </div>
    </ContentTag>
  );
}
