import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { safeBookingReturnTo } from '../utils/returnTo';
import { CustomerButton } from '@/components/customer/CustomerButton';
import { CustomerFormField, CustomerInput } from '@/components/customer/CustomerFields';
import { CustomerAuthLayout } from '@/components/customer/CustomerAuthLayout';

interface FormValues {
  username: string;
  password: string;
}

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
      navigate(
        user.roles.includes(6)
          ? returnTo
            ? returnTo
            : '/account/orders'
          : user.roles.length === 1 && user.roles.includes(5)
            ? '/manage/finance'
            : '/',
      );
    } catch {
      setError('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
  };

  return (
    <CustomerAuthLayout titleId="login-title" title="Đăng nhập">
      <form
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
            {...register('username', { required: 'Nhập tên đăng nhập' })}
          />
        </CustomerFormField>
        <CustomerFormField label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
          <CustomerInput
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            aria-required="true"
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
