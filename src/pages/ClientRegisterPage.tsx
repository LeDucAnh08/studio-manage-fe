import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CustomerButton } from '@/components/customer/CustomerButton';
import { CustomerFormField, CustomerInput } from '@/components/customer/CustomerFields';
import { CustomerAuthLayout } from '@/components/customer/CustomerAuthLayout';
import api from '../services/api';
import { toast } from 'react-toastify';
import { safeBookingReturnTo } from '../utils/returnTo';

export default function ClientRegisterPage() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const requestedReturnTo = (location.state as { from?: unknown } | null)?.from;
  const returnTo =
    safeBookingReturnTo(requestedReturnTo) ||
    safeBookingReturnTo(new URLSearchParams(location.search).get('returnTo'));
  const returnState = returnTo ? { from: returnTo } : undefined;
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; username: string; password: string; confirm: string }>();
  return (
    <CustomerAuthLayout titleId="register-title" title="Tạo tài khoản khách hàng">
      <form
        className="customer-register__form"
        onSubmit={handleSubmit(async ({ name, username, password }) => {
          setError('');
          try {
            await api.post('/auth/register', {
              name,
              username: username.trim().toLowerCase(),
              password,
            });
            toast.success('Tạo tài khoản thành công. Hãy đăng nhập.');
            navigate('/login', { state: returnState, replace: true });
          } catch (e) {
            setError(
              (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'Không thể đăng ký. Vui lòng thử lại.',
            );
          }
        })}
      >
        <CustomerFormField label="Họ tên" htmlFor="name" error={errors.name?.message}>
          <CustomerInput
            id="name"
            autoComplete="name"
            {...register('name', { required: 'Nhập họ tên', maxLength: 100 })}
          />
        </CustomerFormField>
        <CustomerFormField
          label="Tên đăng nhập"
          htmlFor="username"
          error={errors.username?.message}
        >
          <CustomerInput
            id="username"
            autoComplete="username"
            {...register('username', {
              required: 'Nhập tên đăng nhập',
              pattern: { value: /^[a-zA-Z0-9._-]{3,40}$/, message: 'Dùng 3–40 chữ, số hoặc ._-' },
            })}
          />
        </CustomerFormField>
        <CustomerFormField label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
          <CustomerInput
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password', {
              required: 'Nhập mật khẩu',
              minLength: { value: 8, message: 'Ít nhất 8 ký tự' },
              validate: (value) =>
                new TextEncoder().encode(value).length <= 72 || 'Mật khẩu quá dài',
            })}
          />
        </CustomerFormField>
        <CustomerFormField
          label="Nhập lại mật khẩu"
          htmlFor="confirm"
          error={errors.confirm?.message}
        >
          <CustomerInput
            id="confirm"
            type="password"
            autoComplete="new-password"
            {...register('confirm', {
              validate: (value) => value === watch('password') || 'Mật khẩu không khớp',
            })}
          />
        </CustomerFormField>
        {error && (
          <p role="alert" className="customer-error">
            {error}
          </p>
        )}
        <CustomerButton type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Đang tạo…' : 'Đăng ký'}
        </CustomerButton>
      </form>
      <p className="customer-register__login">
        Đã có tài khoản?{' '}
        <Link to="/login" state={returnState} className="customer-link">
          Đăng nhập
        </Link>
      </p>
    </CustomerAuthLayout>
  );
}
