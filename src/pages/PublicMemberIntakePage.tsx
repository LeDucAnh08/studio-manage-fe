import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CustomerButton } from '@/components/customer/CustomerButton';
import {
  CustomerFormField,
  CustomerInput,
  CustomerSelect,
} from '@/components/customer/CustomerFields';
import { CustomerSurface } from '@/components/customer/CustomerSurface';
import '../styles/customer-forms.css';
import {
  bookingWorkflowService,
  createWorkflowRequestId,
  type PublicMemberIntakeDto,
  type PublicMemberSubmission,
} from '../services/bookingWorkflowService';

type MemberForm = {
  name: string;
  gender: 'male' | 'female' | 'other' | '';
  height: string;
  weight: string;
  contact: string;
  costumeSizes: Record<string, string>;
};

type IntakeDraftState = { requestId: string; fingerprint: string };

const emptyForm = (): MemberForm => ({
  name: '',
  gender: '',
  height: '',
  weight: '',
  contact: '',
  costumeSizes: {},
});

const errorText = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
  'Không thể tải hoặc gửi thông tin. Vui lòng kiểm tra kết nối rồi thử lại.';

const sessionKey = (token: string) => 'yume.member-intake.' + hashText(token);

function hashText(value: string) {
  let hash = 14695981039346656037n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return hash.toString(16);
}

function readIntakeState(key: string): IntakeDraftState {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const value = JSON.parse(raw) as Partial<IntakeDraftState>;
      if (typeof value.requestId === 'string' && typeof value.fingerprint === 'string') {
        return { requestId: value.requestId, fingerprint: value.fingerprint };
      }
    }
  } catch {
    // Start with a fresh idempotency key when session storage is unavailable.
  }
  return { requestId: createWorkflowRequestId(), fingerprint: '' };
}

export default function PublicMemberIntakePage() {
  const { token = '' } = useParams();
  const storageKey = useMemo(() => sessionKey(token), [token]);
  const [intake, setIntake] = useState<PublicMemberIntakeDto | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestState, setRequestState] = useState(() => readIntakeState(storageKey));

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    bookingWorkflowService
      .getPublicMemberIntake(token)
      .then(setIntake)
      .catch((loadError: unknown) => setLoadError(errorText(loadError)))
      .finally(() => setLoading(false));
  }, [token]);

  const update = (patch: Partial<MemberForm>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Nhập họ tên thành viên.';
    if (
      form.height &&
      (!Number.isFinite(Number(form.height)) ||
        Number(form.height) < 80 ||
        Number(form.height) > 230)
    ) {
      errors.height = 'Chiều cao cần từ 80 đến 230 cm.';
    }
    if (
      form.weight &&
      (!Number.isFinite(Number(form.weight)) ||
        Number(form.weight) < 25 ||
        Number(form.weight) > 250)
    ) {
      errors.weight = 'Cân nặng cần từ 25 đến 250 kg.';
    }
    intake?.allowedCostumes.forEach((costume) => {
      if (costume.sizes.length && !form.costumeSizes[costume.costumeId]) {
        errors['costume-' + costume.costumeId] =
          'Chọn size hoặc báo với lớp rằng bạn chưa lấy trang phục này.';
      }
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }
    if (!intake) return;

    const submission: Omit<PublicMemberSubmission, 'requestId'> = {
      name: form.name.trim(),
      ...(form.gender ? { gender: form.gender } : {}),
      ...(form.height ? { height: Number(form.height) } : {}),
      ...(form.weight ? { weight: Number(form.weight) } : {}),
      ...(form.contact.trim() ? { contact: form.contact.trim() } : {}),
      costumeSizes: intake.allowedCostumes
        .filter((costume) => !!form.costumeSizes[costume.costumeId])
        .map((costume) => ({
          costumeId: costume.costumeId,
          size: form.costumeSizes[costume.costumeId],
        })),
    };
    const fingerprint = hashText(JSON.stringify(submission));
    const requestId =
      requestState.fingerprint === fingerprint ? requestState.requestId : createWorkflowRequestId();
    const nextRequestState = { requestId, fingerprint };
    setRequestState(nextRequestState);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(nextRequestState));
    } catch {
      // The form remains usable if storage is unavailable.
    }

    setSubmitting(true);
    setError('');
    try {
      await bookingWorkflowService.submitPublicMember(token, { ...submission, requestId });
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Ignore storage failures after a successful append.
      }
      setSubmitted(true);
    } catch (submitError) {
      setError(errorText(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const addAnother = () => {
    setSubmitted(false);
    setForm(emptyForm());
    const nextRequestState = { requestId: createWorkflowRequestId(), fingerprint: '' };
    setRequestState(nextRequestState);
  };

  if (loading) {
    return (
      <main className="customer-member-form customer-form-copy" role="status">
        Đang mở biểu mẫu…
      </main>
    );
  }
  if (loadError || !intake) {
    return (
      <main className="customer-member-form">
        <CustomerSurface className="customer-form-stack" role="alert">
          <h1 className="customer-page-title">Không mở được biểu mẫu</h1>
          <p className="customer-form-copy">
            {loadError || 'Đường dẫn nhập thông tin không còn hiệu lực.'}
          </p>
          <p className="customer-form-copy">
            Hãy nhờ người đại diện lớp xin lại đường dẫn từ Yume Studio.
          </p>
        </CustomerSurface>
      </main>
    );
  }

  return (
    <main className="customer-member-form customer-form-stack">
      <header className="customer-form-header">
        <p className="customer-form-kicker">Yume Studio · Thông tin thành viên</p>
        <h1 className="customer-page-title">{intake.bookingTitle}</h1>
        <p className="customer-copy">{intake.packageName}</p>
        <p className="customer-form-copy">
          Mỗi thành viên chỉ khai báo thông tin của mình. Danh sách và thông tin của các bạn khác
          không hiển thị trên biểu mẫu này.
        </p>
      </header>

      {submitted ? (
        <CustomerSurface className="customer-form-stack" role="status">
          <h2 className="customer-section-title">Đã gửi thông tin</h2>
          <p className="customer-form-copy">
            Yume đã nhận thông tin của bạn cho lớp {intake.bookingTitle}. Bạn có thể tiếp tục khai
            báo cho thành viên khác.
          </p>
          <CustomerButton onClick={addAnother}>Khai báo thành viên khác</CustomerButton>
        </CustomerSurface>
      ) : (
        <CustomerSurface className="customer-form-stack" padding="compact">
          <div className="customer-form-header">
            <h2 className="customer-section-title">Thông tin của bạn</h2>
            <p className="customer-form-copy">
              Thông tin sẽ được gửi riêng cho đại diện lớp và Yume để chuẩn bị trang phục.
            </p>
          </div>
          <div className="customer-form-grid">
            <CustomerFormField
              label="Họ tên"
              htmlFor="member-name"
              required
              error={fieldErrors.name}
              className="customer-form-grid__full"
            >
              <CustomerInput
                id="member-name"
                autoComplete="name"
                maxLength={100}
                value={form.name}
                aria-invalid={!!fieldErrors.name}
                onChange={(event) => update({ name: event.target.value })}
              />
            </CustomerFormField>
            <CustomerFormField label="Giới tính (tuỳ chọn)" htmlFor="member-gender">
              <CustomerSelect
                id="member-gender"
                value={form.gender}
                onChange={(event) => update({ gender: event.target.value as MemberForm['gender'] })}
              >
                <option value="">Không muốn cung cấp</option>
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
                <option value="other">Khác</option>
              </CustomerSelect>
            </CustomerFormField>
            <CustomerFormField label="Số liên hệ (tuỳ chọn)" htmlFor="member-contact">
              <CustomerInput
                id="member-contact"
                type="tel"
                autoComplete="tel"
                maxLength={25}
                value={form.contact}
                onChange={(event) => update({ contact: event.target.value })}
              />
            </CustomerFormField>
            <CustomerFormField
              label="Chiều cao (cm, tuỳ chọn)"
              htmlFor="member-height"
              error={fieldErrors.height}
            >
              <CustomerInput
                id="member-height"
                type="number"
                inputMode="decimal"
                min={80}
                max={230}
                value={form.height}
                aria-invalid={!!fieldErrors.height}
                onChange={(event) => update({ height: event.target.value })}
              />
            </CustomerFormField>
            <CustomerFormField
              label="Cân nặng (kg, tuỳ chọn)"
              htmlFor="member-weight"
              error={fieldErrors.weight}
            >
              <CustomerInput
                id="member-weight"
                type="number"
                inputMode="decimal"
                min={25}
                max={250}
                value={form.weight}
                aria-invalid={!!fieldErrors.weight}
                onChange={(event) => update({ weight: event.target.value })}
              />
            </CustomerFormField>
          </div>

          {intake.allowedCostumes.length > 0 && (
            <section className="customer-form-stack customer-form-divider">
              <div className="customer-form-header">
                <h3 className="customer-form-title">Size trang phục được chuẩn bị</h3>
                <p className="customer-form-copy">
                  Chọn size theo từng loại trang phục để lớp chốt đủ danh sách trước ngày chụp.
                </p>
              </div>
              {intake.allowedCostumes.map((costume) => (
                <CustomerFormField
                  key={costume.costumeId}
                  label={costume.name}
                  htmlFor={'costume-' + costume.costumeId}
                  error={fieldErrors['costume-' + costume.costumeId]}
                >
                  <CustomerSelect
                    id={'costume-' + costume.costumeId}
                    value={form.costumeSizes[costume.costumeId] || ''}
                    aria-invalid={!!fieldErrors['costume-' + costume.costumeId]}
                    onChange={(event) =>
                      update({
                        costumeSizes: {
                          ...form.costumeSizes,
                          [costume.costumeId]: event.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Chọn size</option>
                    {costume.sizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </CustomerSelect>
                </CustomerFormField>
              ))}
            </section>
          )}

          {error && (
            <p role="alert" className="customer-form-error">
              {error}
            </p>
          )}
          <CustomerButton type="button" fullWidth disabled={submitting} onClick={submit}>
            {submitting ? 'Đang gửi…' : 'Gửi thông tin của tôi'}
          </CustomerButton>
          <p className="customer-caption">
            Đã khai báo trước đó? Gửi lại cùng thông tin để xác nhận lần trước, hoặc nhờ đại diện
            lớp điều chỉnh hồ sơ.
          </p>
        </CustomerSurface>
      )}
    </main>
  );
}
