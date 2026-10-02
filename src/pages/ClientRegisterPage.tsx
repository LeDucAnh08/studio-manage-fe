import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button, FormField, Input } from '@/components/ui';
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
    <main className="min-h-screen bg-muted/30 px-4 py-12 flex items-center justify-center">
      <section className="w-full max-w-md bg-card border rounded-2xl p-7 shadow-sm">
        <Link to="/portfolio" className="text-sm text-primary">
          ← Yume Studio
        </Link>
        <h1 className="text-2xl font-bold mt-6">Tạo tài khoản khách hàng</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Đặt dịch vụ và theo dõi phản hồi từ studio trong tài khoản của bạn.
        </p>
        <form
          className="space-y-4 mt-6"
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
          <FormField label="Họ tên" htmlFor="name" error={errors.name?.message}>
            <Input
              id="name"
              autoComplete="name"
              {...register('name', { required: 'Nhập họ tên', maxLength: 100 })}
            />
          </FormField>
          <FormField label="Tên đăng nhập" htmlFor="username" error={errors.username?.message}>
            <Input
              id="username"
              autoComplete="username"
              {...register('username', {
                required: 'Nhập tên đăng nhập',
                pattern: { value: /^[a-zA-Z0-9._-]{3,40}$/, message: 'Dùng 3–40 chữ, số hoặc ._-' },
              })}
            />
          </FormField>
          <FormField label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
            <Input
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
          </FormField>
          <FormField label="Nhập lại mật khẩu" htmlFor="confirm" error={errors.confirm?.message}>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...register('confirm', {
                validate: (value) => value === watch('password') || 'Mật khẩu không khớp',
              })}
            />
          </FormField>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Đang tạo…' : 'Đăng ký'}
          </Button>
        </form>
        <p className="text-sm mt-5">
          Đã có tài khoản?{' '}
          <Link to="/login" state={returnState} className="text-primary">
            Đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}
