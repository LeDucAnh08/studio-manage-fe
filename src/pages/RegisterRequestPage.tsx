import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button, FormField, Input, Textarea } from '@/components/ui';
import type { UserRole } from '../types';
import { accountRequestService } from '../services/accountRequestService';

interface FormValues {
  name: string;
  username: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  requestedRole: UserRole;
  note?: string;
}

const roles: { value: UserRole; label: string }[] = [
  { value: 2, label: 'Sale' },
  { value: 3, label: 'Thợ chụp ảnh' },
  { value: 4, label: 'Cộng tác viên Sale' },
  { value: 5, label: 'Kế toán' },
];

const errorText = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
  'Không thể gửi yêu cầu. Vui lòng thử lại.';

const RegisterRequestPage = () => {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { requestedRole: 2 } });
  const password = watch('password');

  const onSubmit = async (data: FormValues) => {
    setError('');
    try {
      await accountRequestService.submit({
        ...data,
        name: data.name.trim(),
        username: data.username.trim().toLowerCase(),
        phone: data.phone?.trim() || undefined,
        note: data.note?.trim() || undefined,
      });
      setSuccess(true);
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <section className="max-w-md rounded-2xl border bg-card p-8 text-center shadow">
          <h1 className="text-xl font-bold">Đã gửi yêu cầu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Quản trị viên sẽ xét duyệt và cấp quyền truy cập cho bạn.
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow">
        <h1 className="text-2xl font-bold">Yêu cầu cấp tài khoản</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tài khoản chỉ được sử dụng sau khi quản trị viên duyệt.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <FormField label="Họ và tên" required error={errors.name?.message}>
            <Input
              autoComplete="name"
              maxLength={100}
              {...register('name', {
                required: 'Vui lòng nhập họ tên',
                validate: (value) => !!value.trim() || 'Vui lòng nhập họ tên',
              })}
            />
          </FormField>
          <FormField label="Tên đăng nhập" required error={errors.username?.message}>
            <Input
              autoComplete="username"
              maxLength={40}
              {...register('username', {
                required: 'Vui lòng nhập tên đăng nhập',
                pattern: {
                  value: /^[a-zA-Z0-9._-]{3,40}$/,
                  message: 'Dùng 3–40 chữ, số hoặc ._-',
                },
              })}
            />
          </FormField>
          <FormField label="Số điện thoại" error={errors.phone?.message}>
            <Input
              type="tel"
              maxLength={25}
              {...register('phone', {
                validate: (value) =>
                  !value || /^[+\d() .-]{8,25}$/.test(value.trim()) || 'Số điện thoại không hợp lệ',
              })}
            />
          </FormField>
          <FormField label="Vai trò mong muốn" required>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              {...register('requestedRole', { valueAsNumber: true })}
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Mật khẩu" required error={errors.password?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              {...register('password', {
                required: 'Vui lòng nhập mật khẩu',
                minLength: { value: 8, message: 'Mật khẩu cần ít nhất 8 ký tự' },
                validate: (value) =>
                  new TextEncoder().encode(value).length <= 72 || 'Mật khẩu quá dài',
              })}
            />
          </FormField>
          <FormField label="Xác nhận mật khẩu" required error={errors.confirmPassword?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword', {
                required: 'Vui lòng xác nhận mật khẩu',
                validate: (value) => value === password || 'Mật khẩu xác nhận không khớp',
              })}
            />
          </FormField>
          <FormField label="Ghi chú" error={errors.note?.message}>
            <Textarea
              rows={3}
              maxLength={1000}
              {...register('note', {
                maxLength: { value: 1000, message: 'Ghi chú tối đa 1000 ký tự' },
              })}
            />
          </FormField>
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">
            Đã có tài khoản? Đăng nhập
          </Link>
        </div>
      </section>
    </main>
  );
};

export default RegisterRequestPage;
