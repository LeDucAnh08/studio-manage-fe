import type { ReactNode } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { CustomerButton } from './CustomerButton';
import { CustomerSelect } from './CustomerFields';
import { vietnamDisplayDate } from '../../utils/vietnamCalendarDate';

export function CustomerOrdersWorkspace({
  kind,
  loading,
  error,
  total,
  page,
  view,
  emptyMessage,
  onViewChange,
  onPageChange,
  onReload,
  children,
  preview,
}: {
  kind: string;
  loading: boolean;
  error: string;
  total: number;
  page: number;
  view: string;
  emptyMessage: string;
  onViewChange: (view: string) => void;
  onPageChange: (page: number) => void;
  onReload: () => void;
  children: ReactNode;
  preview: ReactNode;
}) {
  return (
    <div className="customer-orders-workspace__columns">
      <section className="customer-orders-list" aria-labelledby="orders-list-title">
        <div className="customer-orders-list__toolbar">
          <h2 id="orders-list-title">{loading ? `Đơn ${kind}` : `${total} đơn ${kind}`}</h2>
          <div>
            <label className="sr-only" htmlFor="order-view">
              Trạng thái
            </label>
            <CustomerSelect
              id="order-view"
              value={view}
              onChange={(event) => onViewChange(event.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="active">Đang thực hiện</option>
              <option value="completed">Hoàn tất</option>
              <option value="cancelled">Đã hủy</option>
              <option value="rejected">Đã từ chối</option>
            </CustomerSelect>
            <CustomerButton
              variant="text"
              aria-label="Tải lại đơn"
              title="Tải lại đơn"
              disabled={loading}
              onClick={onReload}
            >
              <RefreshCw size={18} aria-hidden="true" />
            </CustomerButton>
          </div>
        </div>
        {loading ? (
          <p role="status" className="customer-orders-workspace__state">
            Đang tải danh sách đơn…
          </p>
        ) : error ? (
          <div role="alert" className="customer-orders-workspace__state">
            <p>{error}</p>
            <CustomerButton variant="secondary" onClick={onReload}>
              Thử lại
            </CustomerButton>
          </div>
        ) : !preview ? (
          <p className="customer-orders-workspace__state">
            {view ? 'Chưa có đơn phù hợp với trạng thái này.' : emptyMessage}
          </p>
        ) : (
          <ul className="customer-orders-list__items" aria-label={`Danh sách đơn ${kind}`}>
            {children}
          </ul>
        )}
        {!loading && !error && (total > 20 || page > 1) && (
          <nav className="customer-orders-list__pagination" aria-label={`Trang đơn ${kind}`}>
            <CustomerButton
              variant="secondary"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              Trước
            </CustomerButton>
            <span>
              Trang {page} / {Math.max(page, Math.ceil(total / 20))}
            </span>
            <CustomerButton
              variant="secondary"
              disabled={page * 20 >= total}
              onClick={() => onPageChange(page + 1)}
            >
              Sau
            </CustomerButton>
          </nav>
        )}
      </section>
      <div
        id="selected-order-panel"
        className="customer-orders-workspace__detail"
        aria-live="polite"
      >
        {!loading && !error && preview ? (
          preview
        ) : (
          <div className="customer-orders-workspace__placeholder">
            {loading
              ? 'Đang chuẩn bị hồ sơ…'
              : error
                ? 'Danh sách đơn chưa tải được.'
                : 'Tiến độ và thông tin đơn sẽ hiển thị tại đây.'}
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomerOrderProgress({
  stages,
  currentStep,
  terminal = false,
}: {
  stages: Array<{ label: string; at?: string | null; done: boolean; description?: string }>;
  currentStep: number;
  terminal?: boolean;
}) {
  return (
    <section className="customer-orders-progress" aria-labelledby="orders-progress-title">
      <h3 id="orders-progress-title">Tiến độ đơn</h3>
      <ol>
        {stages.map((stage, index) =>
          terminal && !stage.done ? null : (
            <li
              key={stage.label}
              className={`${!terminal && index === currentStep ? 'is-current' : ''} ${stage.done ? 'is-complete' : ''}`}
              aria-current={!terminal && index === currentStep ? 'step' : undefined}
            >
              <span className="customer-orders-progress__marker" aria-hidden="true">
                {stage.done && <Check size={16} />}
              </span>
              <div>
                <p className="customer-orders-progress__label">{stage.label}</p>
                {stage.at && <time dateTime={stage.at}>{vietnamDisplayDate(stage.at)}</time>}
                {stage.description &&
                  !terminal &&
                  (index === currentStep || index === stages.length - 1) && (
                    <p>{stage.description}</p>
                  )}
              </div>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}
