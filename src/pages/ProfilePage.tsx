import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Send, Link2, Link2Off, KeyRound, User as UserIcon, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { telegramService, type TelegramStatus } from '../services/telegramService';
import { ROLE_LABELS } from '../types';
import { Button, FormField, Input, PageHeader, Spinner } from '@/components/ui';
import { useCustomerAppearance } from '@/components/customer/CustomerAppearance';
import { CustomerButton } from '@/components/customer/CustomerButton';
import { CustomerFormField, CustomerInput } from '@/components/customer/CustomerFields';
import { CustomerStatusBadge } from '@/components/customer/CustomerStatusBadge';
import { CustomerSurface } from '@/components/customer/CustomerSurface';
import '../styles/customer-forms.css';

function ProfileField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  const isCustomer = useCustomerAppearance();
  if (isCustomer) {
    return (
      <CustomerFormField label={label} htmlFor={htmlFor} error={error}>
        {children}
      </CustomerFormField>
    );
  }
  return (
    <FormField label={label} htmlFor={htmlFor}>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </FormField>
  );
}

// ── Profile form ─────────────────────────────────────────────────────────────

interface ProfileFormValues {
  name: string;
}

function ProfileSection() {
  const isCustomer = useCustomerAppearance();
  const ProfileInput = isCustomer ? CustomerInput : Input;
  const ProfileButton = isCustomer ? CustomerButton : Button;
  const { user, updateUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: { name: user?.name ?? '' },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const updated = await authService.updateProfile({ name: data.name });
      updateUser({ name: updated.name });
      toast.success('Cập nhật thông tin thành công');
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={isCustomer ? 'customer-form-stack' : 'space-y-4'}
    >
      <ProfileField label="Tên đăng nhập" htmlFor="username">
        <ProfileInput id="username" value={user?.username ?? ''} disabled />
      </ProfileField>
      <ProfileField label="Họ tên hiển thị" htmlFor="name">
        <ProfileInput id="name" placeholder="Nhập tên hiển thị" {...register('name')} />
      </ProfileField>
      <div>
        <p
          className={isCustomer ? 'customer-field__label' : 'text-sm font-medium mb-1.5'}
          style={isCustomer ? undefined : { color: 'var(--text-secondary)' }}
        >
          Vai trò
        </p>
        <div className={isCustomer ? 'customer-profile-roles' : 'flex flex-wrap gap-2'}>
          {user?.roles?.map((r) =>
            isCustomer ? (
              <CustomerStatusBadge key={r}>{ROLE_LABELS[r]}</CustomerStatusBadge>
            ) : (
              <span
                key={r}
                className="text-xs px-2.5 py-1 rounded-lg font-medium"
                style={{ background: 'var(--user-role-bg)', color: 'var(--user-role-text)' }}
              >
                {ROLE_LABELS[r]}
              </span>
            ),
          )}
        </div>
      </div>
      <ProfileButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Spinner className={isCustomer ? 'h-4 w-4' : 'mr-2 h-4 w-4'} /> : null}
        Lưu thay đổi
      </ProfileButton>
    </form>
  );
}

// ── Change password form ──────────────────────────────────────────────────────

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function PasswordSection() {
  const isCustomer = useCustomerAppearance();
  const ProfileInput = isCustomer ? CustomerInput : Input;
  const ProfileButton = isCustomer ? CustomerButton : Button;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<PasswordFormValues>();

  const newPassword = watch('newPassword');

  const onSubmit = async (data: PasswordFormValues) => {
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      toast.success('Đổi mật khẩu thành công');
      reset();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Có lỗi xảy ra';
      toast.error(msg);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={isCustomer ? 'customer-form-stack' : 'space-y-4'}
    >
      <ProfileField
        label="Mật khẩu hiện tại"
        htmlFor="currentPassword"
        error={errors.currentPassword?.message}
      >
        <ProfileInput
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword', { required: 'Vui lòng nhập mật khẩu hiện tại' })}
        />
      </ProfileField>
      <ProfileField label="Mật khẩu mới" htmlFor="newPassword" error={errors.newPassword?.message}>
        <ProfileInput
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register('newPassword', {
            required: 'Vui lòng nhập mật khẩu mới',
            minLength: { value: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
          })}
        />
      </ProfileField>
      <ProfileField
        label="Xác nhận mật khẩu mới"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
      >
        <ProfileInput
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword', {
            required: 'Vui lòng xác nhận mật khẩu',
            validate: (v) => v === newPassword || 'Mật khẩu không khớp',
          })}
        />
      </ProfileField>
      <ProfileButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Spinner className={isCustomer ? 'h-4 w-4' : 'mr-2 h-4 w-4'} /> : null}
        Đổi mật khẩu
      </ProfileButton>
    </form>
  );
}

// ── Telegram section ──────────────────────────────────────────────────────────

function TelegramSection() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await telegramService.getStatus();
      setStatus(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, []);

  const handleLink = async () => {
    setLinking(true);
    try {
      const res = await telegramService.generateLinkToken();
      // Open Telegram deeplink in new tab
      window.open(res.url, '_blank', 'noopener,noreferrer');
      toast.info(
        'Mở Telegram và bấm "Start" để hoàn tất liên kết. Token có hiệu lực trong 15 phút.',
      );
      // Poll for link completion every 3s for up to 60s
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const updated = await telegramService.getStatus();
          if (updated.linked) {
            setStatus(updated);
            clearInterval(poll);
            toast.success(`Đã liên kết Telegram thành công!`);
          }
        } catch {
          /* ignore */
        }
        if (attempts >= 20) clearInterval(poll);
      }, 3000);
    } catch {
      toast.error('Không thể tạo liên kết, vui lòng thử lại');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await telegramService.unlink();
      setStatus({ linked: false, telegramUsername: null });
      toast.success('Đã huỷ liên kết Telegram');
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setUnlinking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-faint)' }}>
        <Spinner className="h-4 w-4" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
          style={
            status?.linked
              ? {
                  background: 'rgba(34,197,94,0.12)',
                  color: '#16a34a',
                  border: '1px solid rgba(34,197,94,0.25)',
                }
              : {
                  background: 'rgba(148,163,184,0.12)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--card-border)',
                }
          }
        >
          <Send className="w-4 h-4" />
          {status?.linked
            ? status.telegramUsername
              ? `Đã liên kết: @${status.telegramUsername}`
              : 'Đã liên kết Telegram'
            : 'Chưa liên kết'}
        </div>
      </div>

      <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
        {status?.linked
          ? 'Bạn sẽ nhận thông báo Telegram khi có lịch chụp mới hoặc cập nhật trạng thái.'
          : 'Liên kết tài khoản Telegram để nhận thông báo lịch chụp và giao dịch trực tiếp trên điện thoại.'}
      </p>

      {status?.linked ? (
        <Button variant="outline" onClick={handleUnlink} disabled={unlinking}>
          {unlinking ? <Spinner className="mr-2 h-4 w-4" /> : <Link2Off className="mr-2 w-4 h-4" />}
          Huỷ liên kết
        </Button>
      ) : (
        <Button onClick={handleLink} disabled={linking}>
          {linking ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <ExternalLink className="mr-2 w-4 h-4" />
          )}
          Liên kết Telegram
        </Button>
      )}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  const isCustomer = useCustomerAppearance();
  if (isCustomer) {
    return (
      <CustomerSurface className="customer-profile-section">
        <div className="customer-profile-section__header">
          <Icon className="customer-profile-section__icon" />
          <h2 className="customer-section-title">{title}</h2>
        </div>
        {children}
      </CustomerSurface>
    );
  }
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const isCustomer = useCustomerAppearance();
  const { user } = useAuth();

  return (
    <div className={isCustomer ? 'customer-profile customer-form-stack' : 'space-y-6'}>
      {isCustomer ? (
        <header className="customer-form-header">
          <p className="customer-caption">{user?.username}</p>
          <h1 className="customer-page-title">Hồ sơ cá nhân</h1>
        </header>
      ) : (
        <PageHeader title="Hồ sơ cá nhân" kicker={`${user?.username}`} />
      )}
      <div
        className={
          isCustomer ? 'customer-profile-grid' : 'grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl'
        }
      >
        <SectionCard icon={UserIcon} title="Thông tin cá nhân">
          <ProfileSection />
        </SectionCard>

        <SectionCard icon={KeyRound} title="Đổi mật khẩu">
          <PasswordSection />
        </SectionCard>

        {!user?.roles.includes(6) && (
          <SectionCard icon={Link2} title="Liên kết Telegram">
            <TelegramSection />
          </SectionCard>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
