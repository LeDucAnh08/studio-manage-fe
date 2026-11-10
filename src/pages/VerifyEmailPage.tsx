import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { CustomerButton } from '@/components/customer/CustomerButton';
import { emailService, emailError } from '@/services/emailService';

export default function VerifyEmailPage() {
  const location = useLocation(),
    navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [token, setToken] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get('token') || '',
  );
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState('');
  return (
    <section className="customer-order-surface space-y-4">
      <h1 className="customer-page-title">Xác minh email nhận thông báo</h1>
      {done ? (
        <p role="status">
          Email đã được xác minh. Bạn sẽ nhận thông báo khi studio duyệt đơn và yêu cầu thanh toán
          cọc.
        </p>
      ) : (
        <>
          <p>
            Bạn đang đăng nhập bằng tài khoản <strong>{user?.username}</strong>
            {user?.email && (
              <>
                {' '}
                với email <strong>{user.email}</strong>
              </>
            )}
            . Hãy xác nhận bằng đúng tài khoản đã yêu cầu.
          </p>
          {!token && (
            <p role="alert">
              Đường dẫn xác minh không hợp lệ. Mở lại đường dẫn trong email hoặc yêu cầu thư mới ở
              hồ sơ cá nhân.
            </p>
          )}
          {error && (
            <p role="alert" className="customer-error">
              {error}
            </p>
          )}
          <CustomerButton
            disabled={busy || !token}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                updateUser(await emailService.confirm(token));
                setDone(true);
                setToken('');
                navigate('/account/verify-email', { replace: true });
              } catch (error) {
                setError(emailError(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Đang xác minh…' : 'Xác minh email'}
          </CustomerButton>
        </>
      )}
      <div className="flex flex-wrap gap-4">
        <Link className="customer-link" to="/account/profile">
          Hồ sơ cá nhân
        </Link>
        <Link className="customer-link" to="/account/orders?tab=bookings">
          Xem đơn chụp ảnh
        </Link>
      </div>
    </section>
  );
}
