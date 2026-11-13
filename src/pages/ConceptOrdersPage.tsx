import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { isPersonalPhotographer } from '../utils/staffRole';
import { useAuth } from '../context/AuthContext';
import {
  ConceptOrder,
  conceptError,
  conceptService,
  conceptStatus,
  money,
  vnTime,
} from '../services/conceptService';
import '../styles/concept.css';

function StaffConceptOrdersPage() {
  const { user } = useAuth();
  const client = user?.roles.includes(6);
  const [rows, setRows] = useState<ConceptOrder[]>([]),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    conceptService
      .list(status, page)
      .then((r) => {
        if (active) {
          setRows(r.data);
          setTotal(r.pagination.total);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(conceptError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, page, user?._id]);
  return (
    <div className="concept-workspace">
      <header>
        <h1>{client ? 'Đơn chụp concept của tôi' : 'Đơn concept & hậu kỳ'}</h1>
        <div className="concept-actions">
          <Link to="/concept-booking">Đặt buổi chụp mới</Link>
          {user?.roles.some((r) => [0, 1].includes(r)) && (
            <Link to="/settings/concepts">Quản lý concept và gói</Link>
          )}
        </div>
      </header>
      <label>
        Lọc trạng thái
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          {['awaiting_deposit', 'confirmed', 'shot', 'completed', 'expired', 'cancelled'].map(
            (s) => (
              <option key={s} value={s}>
                {conceptStatus[s]}
              </option>
            ),
          )}
        </select>
      </label>
      {error && (
        <p role="alert" className="concept-error">
          {error}
        </p>
      )}
      {loading && <p role="status">Đang tải đơn…</p>}
      {!loading && !rows.length && <p>Chưa có đơn phù hợp.</p>}
      {rows.map((row) => (
        <article className="concept-order-row" key={row._id}>
          <div>
            <h2>
              {row.snapshot.conceptName} · {row.snapshot.name}
            </h2>
            <p>
              {vnTime(row.startAt)} · {row.contactName}
            </p>
            <p>
              {conceptStatus[row.status]}
              {row.refundDue > 0 ? ` · Cần hoàn ${money(row.refundDue)}` : ''}
            </p>
            <p>{row.events[row.events.length - 1]?.message}</p>
          </div>
          <Link
            className="concept-button"
            to={`${client ? '/account' : ''}/concept-orders/${row._id}`}
          >
            Mở hồ sơ và album
          </Link>
        </article>
      ))}
      <footer className="concept-actions">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Trang trước
        </button>
        <span>
          Trang {page} · {total} đơn
        </span>
        <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>
          Trang sau
        </button>
      </footer>
    </div>
  );
}

export default function ConceptOrdersPage() {
  const { user } = useAuth();
  return isPersonalPhotographer(user) ? (
    <Navigate to="/workflow-bookings?service=concept" replace />
  ) : (
    <StaffConceptOrdersPage />
  );
}
