import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { safeBookingReturnTo } from '../utils/returnTo';
import { validateText } from '@/utils/customerValidation';
import { CustomerButton } from '@/components/customer/CustomerButton';
import { CustomerFormField, CustomerInput } from '@/components/customer/CustomerFields';
import { CustomerAuthLayout } from '@/components/customer/CustomerAuthLayout';

interface FormValues {
  username: string;
  password: string;
}

const LoginPasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className="customer-auth__password">
        <CustomerInput
          {...props}
          id={id}
          ref={ref}
          type={visible ? 'text' : 'password'}
          style={{ paddingInlineEnd: 52 }}
        />
        <button
          type="button"
          className="customer-auth__password-toggle"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-controls={id}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
    );
  },
);
LoginPasswordInput.displayName = 'LoginPasswordInput';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedReturnTo = (location.state as { from?: unknown } | null)?.from;
  const returnTo =
    safeBookingReturnTo(requestedReturnTo) ||
    safeBookingReturnTo(new URLSearchParams(location.search).get('returnTo'));
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    setError('');
    try {
      const user = await login(data.username, data.password);
      navigate(user.roles.includes(6) ? (returnTo ? returnTo : '/account/orders') : '/');
    } catch (error) {
      const response = (error as { response?: { status?: number; data?: { message?: string } } })
        .response;
      setError(
        response?.status === 429
          ? response.data?.message || 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.'
          : response?.status && response.status >= 500
            ? 'Hệ thống chưa thể đăng nhập. Vui lòng thử lại sau.'
            : 'Tên đăng nhập hoặc mật khẩu không đúng.',
      );
    }
  };

  return (
    <CustomerAuthLayout titleId="login-title" title="Đăng nhập">
      {returnTo && (
        <p role="status" className="customer-register__intro">
          Vui lòng đăng nhập để tiếp tục.
        </p>
      )}
      <form
        noValidate
        data-validated-by="react-hook-form"
        onSubmit={handleSubmit(onSubmit)}
        className="customer-register__form"
        aria-busy={isSubmitting}
      >
        <CustomerFormField
          label="Tên đăng nhập"
          htmlFor="username"
          error={errors.username?.message}
        >
          <CustomerInput
            id="username"
            placeholder="Tên đăng nhập của bạn"
            autoComplete="username"
            aria-required="true"
            required
            maxLength={40}
            {...register('username', {
              required: 'Nhập tên đăng nhập',
              validate: (value) => validateText(value, 'Tên đăng nhập', 40) || true,
            })}
          />
        </CustomerFormField>
        <CustomerFormField label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
          <LoginPasswordInput
            id="password"
            placeholder="••••••••"
            autoComplete="current-password"
            aria-required="true"
            required
            {...register('password', { required: 'Nhập mật khẩu' })}
          />
        </CustomerFormField>
        {error && (
          <p role="alert" className="customer-error">
            {error}
          </p>
        )}
        <CustomerButton type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </CustomerButton>
      </form>
      <p className="customer-register__login">
        Chưa có tài khoản?{' '}
        <Link
          to="/register"
          state={returnTo ? { from: returnTo } : undefined}
          className="customer-link"
        >
          Đăng ký khách hàng
        </Link>
      </p>
    </CustomerAuthLayout>
  );
};

export default LoginPage;
