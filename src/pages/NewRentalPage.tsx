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
  const [params] = useSearchParams();
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(RENTAL_DRAFT_KEY) || 'null') as Draft | null;
      if (saved && (!saved.ownerId || saved.ownerId === user?._id) && Array.isArray(saved.lines))
        return saved;
    } catch {
      clearRentalDraft();
    }
    return empty(user?._id ?? null);
  });
  const [catalog, setCatalog] = useState<RentalCatalogItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    costumeService
      .getPublicCatalog({})
      .then((items) => {
        if (active) setCatalog(items);
      })
      .catch((e) => {
        if (active) setError(rentalError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
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
    setDraft((current) => ({ ...current, ...value }));
  };
  const rowPatch = (index: number, value: Partial<Draft['lines'][number]>) =>
    patch({
      lines: draft.lines.map((row, position) => (position === index ? { ...row, ...value } : row)),
    });
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
        <Link className={customer ? 'customer-link' : 'text-sm text-primary'} to="/costumes">
          ← Chọn trang phục & phụ kiện
        </Link>
        <h1 className={customer ? 'customer-page-title mt-4' : 'mt-4 text-3xl font-bold'}>
          Yêu cầu thuê
        </h1>
        <p className="mt-2 text-muted-foreground">
          Chọn mẫu, kích cỡ và kỳ thuê. Studio sẽ kiểm tra hàng và gửi báo giá; bước này chưa giữ
          hàng.
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
      {loading ? (
        <p role="status">Đang tải mẫu cho thuê…</p>
      ) : !catalog.length ? (
        <section className={customer ? 'customer-order-surface' : 'rounded-xl border p-5'}>
          <p>Chưa có mẫu cho thuê để chọn.</p>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              setError('');
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
            Ngày nhận: {draft.receiveDate} · Ngày trả: {draft.returnDate}
          </p>
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
            <Button disabled={busy} onClick={() => void submit()}>
              {busy ? 'Đang gửi…' : user ? 'Gửi yêu cầu thuê' : 'Đăng nhập để gửi yêu cầu thuê'}
            </Button>
          </div>
        </section>
      ) : (
        <form
          className={customer ? 'customer-orders' : 'space-y-6'}
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.returnDate < draft.receiveDate) {
              setError('Ngày trả phải từ ngày nhận.');
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
                      {item?.sizes.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </OrderSelect>
                  </div>
                  <label className={customer ? 'customer-order-field' : undefined}>
                    Số lượng {index + 1}
                    <Input
                      required
                      min={1}
                      max={10000}
                      step={1}
                      type="number"
                      value={row.quantity}
                      onChange={(event) => rowPatch(index, { quantity: event.target.value })}
                    />
                  </label>
                  <p className="self-center text-sm text-muted-foreground">
                    Giá tham khảo:{' '}
                    {item ? (
                      customer ? (
                        <CustomerPrice amount={item.rentalPrice} />
                      ) : (
                        rentalMoney(item.rentalPrice)
                      )
                    ) : (
                      'Chọn mẫu trước'
                    )}
                    . Chưa bao gồm cọc/phát sinh.
                  </p>
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
              Kỳ thuê và liên hệ
            </h2>
            <label className={customer ? 'customer-order-field' : undefined}>
              Ngày nhận mong muốn
              <Input
                required
                type="date"
                value={draft.receiveDate}
                onChange={(event) => patch({ receiveDate: event.target.value })}
              />
            </label>
            <label className={customer ? 'customer-order-field' : undefined}>
              Ngày trả mong muốn
              <Input
                required
                type="date"
                min={draft.receiveDate}
                value={draft.returnDate}
                onChange={(event) => patch({ returnDate: event.target.value })}
              />
            </label>
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
          <Button type="submit">Xem lại yêu cầu thuê</Button>
        </form>
      )}
    </main>
  );
}
