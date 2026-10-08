import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui';
import { clientPortalEnabled, clientRentalEnabled } from '../config/features';
import { rentalLabels, rentalError } from '../services/rentalService';
import {
  reportService,
  lifecycleLabels,
  currentReportRange,
  serviceLabels,
  reportMoney,
  reportDate,
  type FinanceReport,
  type InventoryReport,
  type ReportResponse,
  type ReportView,
  type ReportService,
  type FinancialRow,
} from '../services/reportService';

const inputStyle = 'min-w-0 w-full rounded-lg border bg-background px-3 py-2 text-sm';
const thStyle = 'px-3 py-3 text-left font-medium text-muted-foreground';
const tdStyle = 'border-t px-3 py-3 align-top';
const services: ReportService[] = ['photography', 'rental', 'unclassified'];
const views: Record<ReportView, string> = {
  cash: 'Giao dịch trong kỳ',
  agreed: 'Nghiệm thu / đối soát trong kỳ',
  due: 'Hồ sơ còn thu hiện tại',
  refund: 'Hồ sơ cần hoàn hiện tại',
};
function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
function ReportTable({
  caption,
  headings,
  children,
}: {
  caption: string;
  headings: string[];
  children: ReactNode;
}) {
  return (
    <div
      className="min-w-0 overflow-x-auto rounded-xl border bg-card"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headings.map((h) => (
              <th scope="col" key={h} className={thStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Reference({ row }: { row: FinancialRow }) {
  const id = row.referenceId;
  const enabled =
    row.service === 'photography'
      ? clientPortalEnabled
      : row.service === 'rental' && clientRentalEnabled;
  if (!id || row.service === 'unclassified')
    return <span className="text-muted-foreground">Giao dịch #{row._id.slice(-6)}</span>;
  const code = `${row.service === 'photography' ? 'Chụp' : 'Thuê'} #${id.slice(-6)}`;
  return enabled ? (
    <Link
      className="font-medium text-primary underline underline-offset-4"
      to={`${row.service === 'photography' ? '/workflow-bookings' : '/rental-orders'}/${id}`}
    >
      {code}
    </Link>
  ) : (
    <span>{code}</span>
  );
}
export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const defaults = currentReportRange();
  const [range, setRange] = useState({
    from: params.get('from') ?? defaults.from,
    to: params.get('to') ?? defaults.to,
  });
  const [draft, setDraft] = useState(range);
  const [tab, setTab] = useState<'finance' | 'inventory'>('finance');
  const [view, setView] = useState<ReportView>('cash');
  const [service, setService] = useState<ReportService>('all');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [finance, setFinance] = useState<ReportResponse<FinanceReport> | null>(null);
  const [inventory, setInventory] = useState<ReportResponse<InventoryReport> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        if (tab === 'finance') {
          const result = await reportService.finance(
            { ...range, view, service, page },
            controller.signal,
          );
          if (controller.signal.aborted) return;
          const last = Math.max(1, Math.ceil(result.pagination.total / 20));
          if (page > last) setPage(last);
          else setFinance(result);
        } else {
          const result = await reportService.inventory({ ...range, q, page }, controller.signal);
          if (controller.signal.aborted) return;
          const last = Math.max(1, Math.ceil(result.pagination.total / 20));
          if (page > last) setPage(last);
          else setInventory(result);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(rentalError(e));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [range, tab, view, service, q, page, retry]);
  const cash = finance?.data.cash ?? [],
    snapshot = finance?.data.snapshot ?? [],
    accepted = finance?.data.accepted ?? [];
  const sum = (field: 'due' | 'refundDue' | 'depositHeld' | 'unsettledSurplus') =>
    snapshot.reduce((n, row) => n + row[field], 0);
  const current = tab === 'finance' ? finance : inventory;
  const total = current?.pagination.total ?? 0;
  return (
    <div className="min-w-0 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Báo cáo dịch vụ và kho</h1>
        <p className="mt-2 text-muted-foreground">
          Đối chiếu dòng tiền, giá trị dịch vụ và phân bổ trang phục/phụ kiện.
        </p>
      </header>
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setRange(draft);
          setPage(1);
          setParams(draft, { replace: true });
        }}
      >
        <div className="flex-1 basis-40">
          <label className="mb-2 block text-sm font-medium" htmlFor="report-from">
            Từ ngày
          </label>
          <input
            id="report-from"
            className={inputStyle}
            type="date"
            required
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </div>
        <div className="flex-1 basis-40">
          <label className="mb-2 block text-sm font-medium" htmlFor="report-to">
            Đến ngày
          </label>
          <input
            id="report-to"
            className={inputStyle}
            type="date"
            required
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </div>
        <Button type="submit">Xem báo cáo</Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => setRetry((v) => v + 1)}
        >
          Làm mới
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Ngày Việt Nam, gồm cả ngày đầu và cuối; tối đa 366 ngày. Bộ lọc không thay đổi công nợ
          hiện tại.
        </p>
      </form>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Loại báo cáo">
        {(['finance', 'inventory'] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'default' : 'outline'}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
          >
            {t === 'finance' ? 'Dịch vụ và dòng tiền' : 'Phân bổ kho'}
          </Button>
        ))}
      </div>
      {loading ? (
        <p role="status">Đang tải báo cáo…</p>
      ) : error ? (
        <div role="alert" className="rounded-xl border p-4">
          <p className="mb-3 text-destructive">{error}</p>
          <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
            Thử tải lại
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Kỳ {reportDate(range.from + 'T00:00:00+07:00')} –{' '}
            {reportDate(range.to + 'T00:00:00+07:00')}. Dữ liệu đọc lúc{' '}
            {current &&
              new Date(current.data.generatedAt).toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
              })}
            .
          </p>
          {tab === 'finance' && finance && (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Thu–chi và giá trị đã chốt trong kỳ</h2>
                <p className="text-sm text-muted-foreground">
                  Thu–chi theo ngày giao dịch. Giá trị dịch vụ theo ngày khách nghiệm thu ảnh / đồng
                  ý đối soát thuê; phí hủy theo ngày đồng ý hủy. Số liệu dựa trên trạng thái hiện
                  tại, không phải sổ doanh thu kế toán theo kỳ.
                </p>
                <ReportTable
                  caption="So sánh dịch vụ trong kỳ"
                  headings={[
                    'Dịch vụ',
                    'Tiền thu',
                    'Tiền chi / hoàn',
                    'Chênh lệch',
                    'Giá trị nghiệm thu / đối soát',
                    'Phí hủy đã chốt',
                  ]}
                >
                  {services.map((s) => {
                    const c = cash.find((r) => r._id === s),
                      a = accepted.find((r) => r._id === s);
                    return (
                      <tr key={s}>
                        <th scope="row" className={tdStyle}>
                          {serviceLabels[s]}
                        </th>
                        <td className={tdStyle}>{reportMoney(c?.income)}</td>
                        <td className={tdStyle}>{reportMoney(c?.expense)}</td>
                        <td className={tdStyle}>
                          {reportMoney((c?.income ?? 0) - (c?.expense ?? 0))}
                        </td>
                        <td className={tdStyle}>
                          {s === 'unclassified' ? 'Chưa có liên kết' : reportMoney(a?.serviceValue)}
                        </td>
                        <td className={tdStyle}>
                          {s === 'unclassified' ? '—' : reportMoney(a?.cancellationValue)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <th scope="row" className={tdStyle}>
                      Tổng
                    </th>
                    <td className={tdStyle}>
                      {reportMoney(cash.reduce((n, r) => n + r.income, 0))}
                    </td>
                    <td className={tdStyle}>
                      {reportMoney(cash.reduce((n, r) => n + r.expense, 0))}
                    </td>
                    <td className={tdStyle}>
                      {reportMoney(cash.reduce((n, r) => n + r.income - r.expense, 0))}
                    </td>
                    <td className={tdStyle}>
                      {reportMoney(accepted.reduce((n, r) => n + r.serviceValue, 0))}
                    </td>
                    <td className={tdStyle}>
                      {reportMoney(accepted.reduce((n, r) => n + r.cancellationValue, 0))}
                    </td>
                  </tr>
                </ReportTable>
                <p className="text-sm text-muted-foreground">
                  Tiền thu thuê bao gồm cọc bảo đảm. Cọc không được cộng vào giá trị dịch vụ. Giao
                  dịch cũ chưa liên kết được giữ riêng để đối chiếu; chênh lệch thu–chi không phải
                  lợi nhuận.
                </p>
              </section>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Công nợ hiện tại · tất cả thời gian</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label="Còn thu"
                    value={reportMoney(sum('due'))}
                    hint="Thuê trước nhận trả bao gồm cọc chưa thu."
                  />
                  <Metric
                    label="Cần hoàn"
                    value={reportMoney(sum('refundDue'))}
                    hint="Chỉ sau đồng ý giảm giá, hủy hoặc đối soát."
                  />
                  <Metric
                    label="Cọc thuê đang bảo đảm"
                    value={reportMoney(sum('depositHeld'))}
                    hint="Trước nhận trả/hủy, giới hạn theo cọc đã chốt."
                  />
                  <Metric
                    label="Tiền dư chờ đối soát thuê"
                    value={reportMoney(sum('unsettledSurplus'))}
                    hint="Đã nhận trả nhưng khách chưa đồng ý đối soát."
                  />
                </div>
                <ReportTable
                  caption="Giá trị hợp đồng và công nợ hiện tại"
                  headings={[
                    'Dịch vụ',
                    'Hồ sơ đã đồng ý',
                    'Giá trị chốt hiện tại',
                    'Còn thu',
                    'Cần hoàn',
                  ]}
                >
                  {(['photography', 'rental'] as const).map((s) => {
                    const r = snapshot.find((v) => v._id === s);
                    return (
                      <tr key={s}>
                        <th scope="row" className={tdStyle}>
                          {serviceLabels[s]}
                        </th>
                        <td className={tdStyle}>{r?.count ?? 0}</td>
                        <td className={tdStyle}>{reportMoney(r?.agreedValue)}</td>
                        <td className={tdStyle}>{reportMoney(r?.due)}</td>
                        <td className={tdStyle}>{reportMoney(r?.refundDue)}</td>
                      </tr>
                    );
                  })}
                </ReportTable>
                <p className="text-sm text-muted-foreground">
                  Chỉ gồm hồ sơ có báo giá đã đồng ý; giá trị chốt hiện tại gồm phí thuê/phụ phí đã
                  đồng ý hoặc phí hủy. Đề xuất chưa đồng ý không làm tăng giá trị.
                </p>
              </section>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Đối chiếu hồ sơ</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="report-view" className="mb-2 block text-sm font-medium">
                      Nội dung đối chiếu
                    </label>
                    <select
                      id="report-view"
                      className={inputStyle}
                      value={view}
                      onChange={(e) => {
                        setView(e.target.value as ReportView);
                        setPage(1);
                      }}
                    >
                      {Object.entries(views).map(([key, label]) => (
                        <option value={key} key={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="report-service" className="mb-2 block text-sm font-medium">
                      Dịch vụ đối chiếu
                    </label>
                    <select
                      id="report-service"
                      className={inputStyle}
                      value={service}
                      onChange={(e) => {
                        setService(e.target.value as ReportService);
                        setPage(1);
                      }}
                    >
                      {(['all', ...services] as ReportService[]).map((s) => (
                        <option value={s} key={s}>
                          {serviceLabels[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {finance.data.rows.length ? (
                  <ReportTable
                    caption={views[view]}
                    headings={
                      view === 'cash'
                        ? ['Ngày', 'Dịch vụ', 'Hồ sơ', 'Loại', 'Số tiền']
                        : [
                            'Hồ sơ',
                            'Trạng thái',
                            'Giá trị chốt',
                            'Thu ròng',
                            view === 'agreed'
                              ? 'Ngày đồng ý'
                              : view === 'due'
                                ? 'Còn thu'
                                : 'Cần hoàn',
                          ]
                    }
                  >
                    {finance.data.rows.map((r) => (
                      <tr key={r._id}>
                        {view === 'cash' ? (
                          <>
                            <td className={tdStyle}>{reportDate(r.date!)}</td>
                            <td className={tdStyle}>{serviceLabels[r.service]}</td>
                            <td className={tdStyle}>
                              <Reference row={r} />
                            </td>
                            <td className={tdStyle}>
                              {r.type === 'income' ? 'Thu' : 'Chi / hoàn'}
                            </td>
                            <td className={tdStyle}>{reportMoney(r.amount)}</td>
                          </>
                        ) : (
                          <>
                            <td className={tdStyle}>
                              <Reference row={r} />
                            </td>
                            <td className={tdStyle}>
                              {r.service === 'rental'
                                ? rentalLabels[r.status!]
                                : (lifecycleLabels[r.status! as keyof typeof lifecycleLabels] ??
                                  r.status)}
                            </td>
                            <td className={tdStyle}>
                              {reportMoney(r.fee)}
                              {r.valueKind === 'cancellation' && (
                                <span className="block text-xs text-muted-foreground">Phí hủy</span>
                              )}
                            </td>
                            <td className={tdStyle}>{reportMoney(r.netReceived)}</td>
                            <td className={tdStyle}>
                              {view === 'agreed'
                                ? reportDate(r.valueAt!)
                                : reportMoney(view === 'due' ? r.due : r.refundDue)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </ReportTable>
                ) : (
                  <p className="rounded-xl border p-5 text-muted-foreground">
                    Không có dữ liệu phù hợp với bộ lọc đối chiếu.
                  </p>
                )}
              </section>
            </>
          )}
          {tab === 'inventory' && inventory && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Phân bổ theo mẫu và kích cỡ</h2>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setQ(search.trim());
                  setPage(1);
                }}
              >
                <div className="min-w-0 flex-1">
                  <label className="mb-2 block text-sm font-medium" htmlFor="report-costume">
                    Tìm tên mẫu
                  </label>
                  <input
                    id="report-costume"
                    className={inputStyle}
                    maxLength={100}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline">
                  Tìm mẫu
                </Button>
              </form>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="Tồn tốt hiện tại"
                  value={inventory.data.summary.good.toLocaleString('vi-VN')}
                />
                <Metric
                  label="Phân bổ chụp · món × ngày"
                  value={inventory.data.summary.photographyDays.toLocaleString('vi-VN')}
                />
                <Metric
                  label="Phân bổ thuê · món × ngày"
                  value={inventory.data.summary.rentalDays.toLocaleString('vi-VN')}
                />
                <Metric
                  label="Mẫu–size có ngày vượt tồn"
                  value={String(inventory.data.summary.conflictRows)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Đây là mức phân bổ so với tồn tốt hiện tại, không phải tỷ lệ mặc đồ thực tế hoặc tồn
                lịch sử. Gồm ngày nhận và trả. Thuê đã trả tính từ ngày giao đến ngày nhận trả thực
                tế; đơn chưa trả dùng kỳ chốt, quá hạn tiếp tục giữ hàng.
              </p>
              {(inventory.data.summary.unknownSchedules > 0 ||
                inventory.data.summary.overdueOrders > 0 ||
                inventory.data.summary.invalidIntervals > 0 ||
                inventory.data.summary.missingCostumes > 0) && (
                <div
                  role="status"
                  className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm space-y-1"
                >
                  {inventory.data.summary.unknownSchedules > 0 && (
                    <p>
                      {inventory.data.summary.unknownSchedules} lượt mẫu trong lịch cũ thiếu size/số
                      lượng: chưa xác định tỷ lệ đầy đủ.
                    </p>
                  )}
                  {inventory.data.summary.overdueOrders > 0 && (
                    <p>{inventory.data.summary.overdueOrders} đơn quá hạn chưa trả đang giữ kho.</p>
                  )}
                  {inventory.data.summary.invalidIntervals > 0 && (
                    <p>
                      {inventory.data.summary.invalidIntervals} phân bổ có ngày/số lượng thiếu hoặc
                      sai, chưa tính.
                    </p>
                  )}
                  {inventory.data.summary.missingCostumes > 0 && (
                    <p>
                      {inventory.data.summary.missingCostumes} mẫu tham chiếu không còn trong kho.
                    </p>
                  )}
                </div>
              )}
              {inventory.data.rows.length ? (
                <ReportTable
                  caption="Phân bổ trang phục theo mẫu và size"
                  headings={[
                    'Mẫu / size',
                    'Tồn tốt',
                    'Chụp · món × ngày',
                    'Thuê · món × ngày',
                    'Tỷ lệ phân bổ',
                    'Đỉnh giữ / ngày vượt tồn',
                  ]}
                >
                  {inventory.data.rows.map((r) => (
                    <tr key={`${r.costumeId}:${r.size}`}>
                      <th scope="row" className={tdStyle}>
                        {r.name}
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                          Cỡ {r.size}
                          {r.unknownSchedules > 0
                            ? ` · ${r.unknownSchedules} lịch thiếu phân bổ`
                            : ''}
                          {r.invalidIntervals > 0
                            ? ` · ${r.invalidIntervals} phân bổ sai dữ liệu`
                            : ''}
                        </span>
                      </th>
                      <td className={tdStyle}>{r.good}</td>
                      <td className={tdStyle}>{r.photographyDays}</td>
                      <td className={tdStyle}>{r.rentalDays}</td>
                      <td className={tdStyle}>
                        {r.utilization === null
                          ? 'Chưa xác định'
                          : `${r.utilization.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`}
                      </td>
                      <td className={tdStyle}>
                        <span className={r.overCapacityDays ? 'font-medium text-destructive' : ''}>
                          {r.unknownSchedules || r.invalidIntervals ? 'Ít nhất ' : ''}
                          {r.peak} món / {r.overCapacityDays} ngày
                        </span>
                      </td>
                    </tr>
                  ))}
                </ReportTable>
              ) : (
                <p className="rounded-xl border p-5 text-muted-foreground">Không có mẫu phù hợp.</p>
              )}
            </section>
          )}
          {total > 20 && (
            <nav className="flex flex-wrap items-center gap-3" aria-label="Phân trang báo cáo">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Trang trước
              </Button>
              <span className="text-sm">
                Trang {page}/{Math.ceil(total / 20)} · {total} dòng
              </span>
              <Button
                variant="outline"
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
