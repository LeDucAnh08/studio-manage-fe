import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  OrderButton as Button,
  OrderInput as Input,
  OrderTextarea as Textarea,
  OrderSelect,
} from '../components/customer/CustomerOrderControls';
import { useCustomerAppearance } from '../components/customer/CustomerAppearance';
import { CustomerPrice } from '../components/customer/CustomerPrice';
import '../styles/customer-orders.css';
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
  const customer = useCustomerAppearance();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(RENTAL_DRAFT_KEY) || 'null') as Draft | null;
      if (saved && (!saved.ownerId || saved.ownerId === user?._id) && Array.isArray(saved.lines))
        return {
          ...saved,
          receiveDate: params.get('receiveDate') ?? saved.receiveDate,
          returnDate: params.get('returnDate') ?? saved.returnDate,
          preview:
            (params.has('receiveDate') && params.get('receiveDate') !== saved.receiveDate) ||
            (params.has('returnDate') && params.get('returnDate') !== saved.returnDate)
              ? false
              : saved.preview,
        };
    } catch {
      clearRentalDraft();
    }
    return {
      ...empty(user?._id ?? null),
      receiveDate: params.get('receiveDate') ?? '',
      returnDate: params.get('returnDate') ?? '',
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
    if (item && catalog.some((row) => row._id === item))
      setDraft((current) =>
        current.lines.length === 1 && !current.lines[0].costumeId
          ? { ...current, lines: [{ ...current.lines[0], costumeId: item }] }
          : current,
      );
  }, [catalog, params]);
  const patch = (value: Partial<Draft>) => {
    setError('');
    if (value.receiveDate !== undefined || value.returnDate !== undefined) {
      const next = new URLSearchParams(params);
      for (const key of ['receiveDate', 'returnDate'] as const) {
        const date = value[key] ?? draft[key];
        if (date) next.set(key, date);
        else next.delete(key);
      }
      setParams(next, { replace: true });
    }
    setDraft((current) => ({
      ...current,
      ...value,
      ...(value.receiveDate !== undefined || value.returnDate !== undefined
        ? { preview: false }
        : {}),
    }));
  };
  const rowPatch = (index: number, value: Partial<Draft['lines'][number]>) =>
    patch({
      lines: draft.lines.map((row, position) => (position === index ? { ...row, ...value } : row)),
    });
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
    catalogReady &&
    days &&
    draft.lines.every((row) => {
      const rate = catalog.find((item) => item._id === row.costumeId)?.rentalDailyPrice;
      return typeof rate === 'number' && rate > 0 && Number(row.quantity) > 0;
    })
      ? draft.lines.reduce(
          (sum, row) =>
            sum +
            (catalog.find((item) => item._id === row.costumeId)?.rentalDailyPrice ?? 0) *
              Number(row.quantity) *
              days,
          0,
        )
      : null;
  const estimateContent = (
    <p>
      Tiền thuê dự kiến:{' '}
      {estimate === null ? (
        'Studio sẽ báo giá theo ngày cho các mẫu chưa có giá.'
      ) : customer ? (
        <CustomerPrice amount={estimate} emphasis="total" />
      ) : (
        rentalMoney(estimate)
      )}
      {estimate !== null && (
        <span className="block text-sm text-muted-foreground">
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
      navigate(
        `/login?returnTo=${encodeURIComponent('/rental/start' + (params.toString() ? '?' + params.toString() : ''))}`,
      );
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
    <main
      className={
        customer
          ? 'customer-orders customer-orders--rental-form'
          : 'mx-auto max-w-3xl space-y-6 px-4 py-8'
      }
    >
      <header>
        <Link
          className={customer ? 'customer-link' : 'text-sm text-primary'}
          to={
            draft.receiveDate && draft.returnDate
              ? `/costumes?${new URLSearchParams({ receiveDate: draft.receiveDate, returnDate: draft.returnDate })}`
              : '/costumes'
          }
        >
          ← Chọn trang phục & phụ kiện
        </Link>
        <h1 className={customer ? 'customer-page-title mt-4' : 'mt-4 text-3xl font-bold'}>
          Yêu cầu thuê
        </h1>
        <p className="mt-2 text-muted-foreground">
          Chọn ngày nhận và trả để xem trang phục, phụ kiện còn trống. Bạn có thể thuê riêng, không
          cần đặt lịch chụp. Gửi yêu cầu chưa giữ hàng.
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
      <section
        className={
          customer
            ? 'customer-order-surface customer-order-field__group'
            : 'grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2'
        }
      >
        <h2
          className={
            customer
              ? 'customer-section-title customer-order-span-full'
              : 'text-lg font-semibold sm:col-span-2'
          }
        >
          Chọn kỳ thuê
        </h2>
        <label className={customer ? 'customer-order-field' : undefined}>
          Ngày nhận mong muốn
          <Input
            required
            type="date"
            min={vietnamToday()}
            disabled={busy}
            value={draft.receiveDate}
            onChange={(event) => patch({ receiveDate: event.target.value })}
          />
        </label>
        <label className={customer ? 'customer-order-field' : undefined}>
          Ngày trả mong muốn
          <Input
            required
            type="date"
            min={draft.receiveDate || vietnamToday()}
            disabled={busy}
            value={draft.returnDate}
            onChange={(event) => patch({ returnDate: event.target.value })}
          />
        </label>
        <p
          className={
            customer
              ? 'customer-order-span-full text-sm text-muted-foreground'
              : 'text-sm text-muted-foreground sm:col-span-2'
          }
        >
          {periodError || `${days} ngày thuê; tính cả ngày nhận và ngày trả.`}
        </p>
      </section>
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
                {catalog.find((item) => item._id === row.costumeId)?.name ?? 'Mẫu chưa xác định'} ·
                cỡ {row.size} · {row.quantity} món
              </li>
            ))}
          </ul>
          <p>
            Ngày nhận: {draft.receiveDate} · Ngày trả: {draft.returnDate} · {days} ngày
          </p>
          {estimateContent}
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
          className={customer ? 'customer-orders' : 'space-y-6'}
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
              customer ? 'customer-order-surface' : 'space-y-4 rounded-2xl border bg-card p-5'
            }
          >
            <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
              Mẫu và kích cỡ
            </h2>
            {draft.lines.map((row, index) => {
              const item = catalog.find((value) => value._id === row.costumeId);
              const remaining = rowAvailability(row, index);
              return (
                <fieldset
                  key={index}
                  className={
                    customer
                      ? 'customer-order-field__group customer-order-inset'
                      : 'grid gap-3 rounded-xl bg-muted/30 p-4 sm:grid-cols-2'
                  }
                >
                  <legend className="sr-only">Món thuê {index + 1}</legend>
                  <div className={customer ? 'customer-order-field' : 'space-y-1'}>
                    <label htmlFor={`rental-item-${index}`}>Mẫu thuê {index + 1}</label>
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
                  </div>
                  <div className={customer ? 'customer-order-field' : 'space-y-1'}>
                    <label htmlFor={`rental-size-${index}`}>Kích cỡ {index + 1}</label>
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
                          {size} · còn {item.availableBySize?.[size] ?? 0}
                        </option>
                      ))}
                    </OrderSelect>
                  </div>
                  <label className={customer ? 'customer-order-field' : undefined}>
                    Số lượng {index + 1}
                    <Input
                      required
                      min={1}
                      max={Math.max(1, remaining)}
                      disabled={!row.size}
                      step={1}
                      type="number"
                      value={row.quantity}
                      onChange={(event) => rowPatch(index, { quantity: event.target.value })}
                    />
                  </label>
                  <div className="self-center text-sm text-muted-foreground">
                    <p>
                      Giá thuê/ngày:{' '}
                      {item ? (
                        typeof item.rentalDailyPrice === 'number' && item.rentalDailyPrice > 0 ? (
                          customer ? (
                            <CustomerPrice amount={item.rentalDailyPrice} unit="/món/ngày" />
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
                    {row.size && <p>Còn tối đa {remaining} món cho dòng này trong kỳ thuê.</p>}
                    {row.costumeId && (!item || (row.size && Number(row.quantity) > remaining)) && (
                      <p role="alert">
                        Lựa chọn này không đủ hàng trong kỳ thuê mới. Hãy chọn lại.
                      </p>
                    )}
                  </div>
                  {draft.lines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        patch({ lines: draft.lines.filter((_, position) => position !== index) })
                      }
                    >
                      Bỏ món {index + 1}
                    </Button>
                  )}
                </fieldset>
              );
            })}
            <Button
              type="button"
              variant="outline"
              disabled={draft.lines.length >= 30}
              onClick={() =>
                patch({ lines: [...draft.lines, { costumeId: '', size: '', quantity: '1' }] })
              }
            >
              Thêm món thuê
            </Button>
          </section>
          <section
            className={
              customer
                ? 'customer-order-surface customer-order-field__group'
                : 'grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2'
            }
          >
            <h2
              className={
                customer
                  ? 'customer-section-title customer-order-span-full'
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
                value={draft.phone}
                onChange={(event) => patch({ phone: event.target.value })}
              />
            </label>
            <label
              className={
                customer ? 'customer-order-field customer-order-span-full' : 'sm:col-span-2'
              }
            >
              Ghi chú thuê
              <Textarea
                rows={3}
                maxLength={2000}
                value={draft.note}
                onChange={(event) => patch({ note: event.target.value })}
              />
            </label>
          </section>
          {estimateContent}
          <Button type="submit" disabled={!!selectionError}>
            Xem lại yêu cầu thuê
          </Button>
        </form>
      )}
    </main>
  );
}
