import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import { AlertCircle, CalendarCheck, CheckCircle2, Gift, Mars, School, Venus } from 'lucide-react';
import { studentService } from '../services/studentService';
import { scheduleService } from '../services/scheduleService';
import type { PublicScheduleResponse } from '../types';
import { Spinner } from '@/components/ui';
import { CustomerButton } from '@/components/customer/CustomerButton';
import { CustomerChoice } from '@/components/customer/CustomerChoice';
import {
  CustomerFormField,
  CustomerInput,
  CustomerTextarea,
} from '@/components/customer/CustomerFields';
import { CustomerSurface } from '@/components/customer/CustomerSurface';
import '../styles/customer-forms.css';

interface FormValues {
  name: string;
  gender: 'male' | 'female';
  height: number | '';
  weight: number | '';
  notes: string;
  costumes: string[];
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const StudentFormPage = () => {
  const { customer } = useParams<{ customer: string }>();
  const [searchParams] = useSearchParams();
  const access = searchParams.get('access') ?? '';
  const [schedule, setSchedule] = useState<PublicScheduleResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<Status>('idle');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<FormValues>({
    defaultValues: { name: '', gender: 'male', height: '', weight: '', notes: '', costumes: [] },
  });

  const gender = watch('gender');
  const visibleCostumes = (schedule?.costumes ?? []).filter(
    (c) => c.gender === gender || c.gender === 'unisex',
  );

  useEffect(() => {
    setValue(
      'costumes',
      visibleCostumes.map((c) => c._id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, gender]);

  useEffect(() => {
    if (!customer || !access) {
      setLoadError(true);
      return;
    }
    scheduleService
      .getPublicByCustomer(customer, access)
      .then((s) => {
        if (!s) {
          setLoadError(true);
          return;
        }
        setSchedule(s);
      })
      .catch(() => setLoadError(true));
  }, [customer, access]);

  const onSubmit = async (data: FormValues) => {
    setSubmitStatus('loading');
    try {
      await studentService.createPublic({
        customer,
        access,
        name: data.name,
        gender: data.gender,
        height: data.height !== '' ? Number(data.height) : undefined,
        weight: data.weight !== '' ? Number(data.weight) : undefined,
        notes: data.notes || undefined,
        costumes: data.costumes,
      });
      setSubmitStatus('success');
      reset();
    } catch {
      setSubmitStatus('error');
    }
  };

  if (loadError) {
    return (
      <div className="customer-standalone-form">
        <CustomerSurface className="customer-form-state customer-form-error" role="alert">
          <AlertCircle className="customer-form-state__icon" aria-hidden="true" />
          <h1 className="customer-page-title">Không tìm thấy lớp học</h1>
          <p className="customer-form-copy">Link có thể không còn hợp lệ</p>
        </CustomerSurface>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="customer-standalone-form">
        <div className="customer-form-loading" role="status" aria-label="Đang tải thông tin lớp">
          <Spinner />
        </div>
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div className="customer-standalone-form">
        <CustomerSurface className="customer-form-state" role="status">
          <CheckCircle2 className="customer-form-state__icon" aria-hidden="true" />
          <h1 className="customer-page-title">Đã ghi nhận!</h1>
          <p className="customer-form-copy">Thông tin của bạn đã được lưu thành công.</p>
          <CustomerButton fullWidth onClick={() => setSubmitStatus('idle')}>
            Nhập thêm học sinh khác
          </CustomerButton>
        </CustomerSurface>
      </div>
    );
  }

  return (
    <div className="customer-standalone-form">
      <CustomerSurface className="customer-form-stack">
        <header className="customer-form-header">
          <p className="customer-form-kicker">Nhập thông tin học sinh</p>
          <h1 className="customer-page-title">{schedule.customer.className}</h1>
          {schedule.customer.school && (
            <p className="customer-form-meta">
              <School aria-hidden="true" />
              <span>{schedule.customer.school}</span>
            </p>
          )}
          <div className="customer-form-header">
            <p className="customer-form-meta">
              <CalendarCheck aria-hidden="true" />
              <span>Ngày chụp: {dayjs(schedule.shootDate).format('DD/MM/YYYY')}</span>
            </p>
            {schedule.package && (
              <p className="customer-form-meta">
                <Gift aria-hidden="true" />
                <span>Gói chụp: {schedule.package.name}</span>
              </p>
            )}
          </div>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="customer-form-stack customer-form-divider"
        >
          <CustomerFormField label="Họ và tên" required htmlFor="name" error={errors.name?.message}>
            <CustomerInput
              id="name"
              placeholder="Nguyễn Văn A"
              {...register('name', { required: 'Vui lòng nhập họ tên' })}
            />
          </CustomerFormField>

          <fieldset className="customer-form-fieldset">
            <legend className="customer-field__label">
              Giới tính{' '}
              <span className="customer-field__required" aria-hidden="true">
                *
              </span>
            </legend>
            <div className="customer-choice-options">
              {(['male', 'female'] as const).map((g) => (
                <CustomerChoice key={g}>
                  <input type="radio" value={g} {...register('gender', { required: true })} />
                  <span className="customer-form-meta">
                    {g === 'male' ? (
                      <>
                        <Mars aria-hidden="true" />
                        <span>Nam</span>
                      </>
                    ) : (
                      <>
                        <Venus aria-hidden="true" />
                        <span>Nữ</span>
                      </>
                    )}
                  </span>
                </CustomerChoice>
              ))}
            </div>
          </fieldset>

          <div className="customer-form-grid">
            <CustomerFormField
              label="Chiều cao (cm)"
              required
              htmlFor="height"
              error={errors.height?.message}
            >
              <CustomerInput
                id="height"
                type="number"
                step="0.1"
                min="50"
                max="250"
                placeholder="165"
                {...register('height', {
                  required: 'Vui lòng nhập chiều cao',
                  validate: (v) => (v !== '' && Number(v) > 0) || 'Chiều cao không hợp lệ',
                })}
              />
            </CustomerFormField>
            <CustomerFormField
              label="Cân nặng (kg)"
              required
              htmlFor="weight"
              error={errors.weight?.message}
            >
              <CustomerInput
                id="weight"
                type="number"
                step="0.1"
                min="10"
                max="200"
                placeholder="55"
                {...register('weight', {
                  required: 'Vui lòng nhập cân nặng',
                  validate: (v) => (v !== '' && Number(v) > 0) || 'Cân nặng không hợp lệ',
                })}
              />
            </CustomerFormField>
          </div>

          <fieldset className="customer-form-fieldset">
            <legend className="customer-field__label">Trang phục</legend>
            <div className="customer-choice-options">
              {visibleCostumes.map((c) => (
                <CustomerChoice key={c._id}>
                  <input type="checkbox" value={c._id} {...register('costumes')} />
                  <span>{c.name}</span>
                </CustomerChoice>
              ))}
            </div>
            <p className="customer-caption">
              Đây là trang phục trong gói chụp của lớp, nếu không dùng có thể bỏ chọn.
            </p>
          </fieldset>

          <CustomerFormField label="Ghi chú" htmlFor="notes">
            <CustomerTextarea id="notes" rows={2} placeholder="Tuỳ chọn…" {...register('notes')} />
          </CustomerFormField>

          {submitStatus === 'error' && (
            <p className="customer-form-error" role="alert">
              Có lỗi xảy ra, vui lòng thử lại.
            </p>
          )}

          <CustomerButton type="submit" disabled={isSubmitting} fullWidth>
            {isSubmitting ? 'Đang gửi…' : 'Gửi thông tin'}
          </CustomerButton>
        </form>
      </CustomerSurface>
    </div>
  );
};

export default StudentFormPage;
