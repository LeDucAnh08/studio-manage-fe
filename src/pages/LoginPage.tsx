import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Logo from '../components/atoms/Logo';
import { useAuth } from '../context/AuthContext';
import { Button, FormField, Input } from '@/components/ui';
import { safeBookingReturnTo } from '../utils/returnTo';

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
    formState: { isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    setError('');
    try {
      const user = await login(data.username, data.password);
      navigate(
        user.roles.includes(6)
          ? returnTo
            ? returnTo
            : '/account/bookings'
          : user.roles.length === 1 && user.roles.includes(5)
            ? '/manage/finance'
            : '/',
      );
    } catch {
      setError('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-amber-50 via-background to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Ambient glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none bg-amber-400/30 blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none bg-cyan-400/30 blur-3xl" />

      {/* Glass card */}
      <div className="relative w-full max-w-sm mx-4 rounded-2xl p-8 bg-card/80 backdrop-blur-xl border shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 rounded-2xl overflow-hidden shadow-[0_0_24px_rgba(245,158,11,0.45)]">
            <Logo size={56} />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-amber-500 to-cyan-500">
            Yume Studio
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">Đăng nhập để tiếp tục</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Tên đăng nhập" htmlFor="username">
            <Input
              id="username"
              placeholder="Tên đăng nhập của bạn"
              autoComplete="username"
              {...register('username', { required: true })}
            />
          </FormField>
          <FormField label="Mật khẩu" htmlFor="password">
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password', { required: true })}
            />
          </FormField>

          {error && (
            <p className="text-sm rounded-xl px-3 py-2 text-destructive bg-destructive/10 border border-destructive/20">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="gradient"
            disabled={isSubmitting}
            className="w-full mt-2 py-3"
          >
            {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            state={returnTo ? { from: returnTo } : undefined}
            className="font-medium text-primary hover:underline"
          >
            Đăng ký khách hàng
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
