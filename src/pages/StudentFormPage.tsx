import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import { AlertCircle, CalendarCheck, CheckCircle2, Gift, Mars, School, Venus } from 'lucide-react';
import { studentService } from '../services/studentService';
import { scheduleService } from '../services/scheduleService';
import type { PublicScheduleResponse } from '../types';
import {
  Button,
  Card,
  CardContent,
  FormField,
  Input,
  Label,
  PageLoader,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="py-10">
            <div className="mb-4 flex justify-center">
              <AlertCircle className="h-12 w-12 text-amber-500" />
            </div>
            <p className="font-medium">Không tìm thấy lớp học</p>
            <p className="text-sm mt-1 text-muted-foreground">Link có thể không còn hợp lệ</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <PageLoader />
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="p-8">
            <div className="mb-4 flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Đã ghi nhận!</h2>
            <p className="text-sm mb-6 text-muted-foreground">
              Thông tin của bạn đã được lưu thành công.
            </p>
            <Button variant="gradient" className="w-full" onClick={() => setSubmitStatus('idle')}>
              Nhập thêm học sinh khác
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center py-10 px-4 bg-background">
      <Card className="w-full max-w-md p-0 overflow-hidden">
        <div className="px-6 py-5 border-b">
          <p className="text-xs uppercase tracking-wider mb-1 text-muted-foreground">
            Nhập thông tin học sinh
          </p>
          <h1 className="text-xl font-bold flex items-center gap-2 flex-wrap">
            <span>{schedule.customer.className}</span>
            {schedule.customer.school && (
              <span className="text-sm font-light text-muted-foreground inline-flex items-center gap-1">
                <School className="h-4 w-4 text-sky-500" />
                <span>{schedule.customer.school}</span>
              </span>
            )}
          </h1>

          <div className="flex flex-col">
            <p className="text-sm text-primary mt-1.5 font-medium inline-flex items-center gap-1.5">
              <CalendarCheck className="h-4 w-4" />
              <span>Ngày chụp: {dayjs(schedule.shootDate).format('DD/MM/YYYY')}</span>
            </p>
            {schedule.package && (
              <p className="text-sm text-emerald-600 mt-1.5 font-medium inline-flex items-center gap-1.5">
                <Gift className="h-4 w-4" />
                <span>Gói chụp: {schedule.package.name}</span>
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <FormField label="Họ và tên" required htmlFor="name" error={errors.name?.message}>
            <Input
              id="name"
              placeholder="Nguyễn Văn A"
              {...register('name', { required: 'Vui lòng nhập họ tên' })}
            />
          </FormField>

          <div className="space-y-1.5">
            <Label>
              Giới tính <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-3">
              {(['male', 'female'] as const).map((g) => (
                <label
                  key={g}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2 rounded-md border bg-card px-3 py-2.5 cursor-pointer hover:bg-muted',
                    gender === g && 'border-primary bg-primary/5',
                  )}
                >
                  <input
                    type="radio"
                    value={g}
                    {...register('gender', { required: true })}
                    className="accent-primary"
                  />
                  <span className="text-sm inline-flex items-center gap-1.5">
                    {g === 'male' ? (
                      <>
                        <Mars className="h-4 w-4 text-sky-600" />
                        <span>Nam</span>
                      </>
                    ) : (
                      <>
                        <Venus className="h-4 w-4 text-pink-500" />
                        <span>Nữ</span>
                      </>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Chiều cao (cm)"
              required
              htmlFor="height"
              error={errors.height?.message}
            >
              <Input
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
            </FormField>
            <FormField
              label="Cân nặng (kg)"
              required
              htmlFor="weight"
              error={errors.weight?.message}
            >
              <Input
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
            </FormField>
          </div>

          <div className="space-y-1.5">
            <Label>Trang phục</Label>
            <div className="flex flex-wrap gap-3">
              {visibleCostumes.map((c) => (
                <label
                  key={c._id}
                  className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 cursor-pointer hover:bg-muted text-sm"
                >
                  <input
                    type="checkbox"
                    value={c._id}
                    {...register('costumes')}
                    className="accent-primary h-4 w-4"
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs ml-1 text-muted-foreground">
              Đây là trang phục trong gói chụp của lớp, nếu không dùng có thể bỏ chọn.
            </p>
          </div>

          <FormField label="Ghi chú" htmlFor="notes">
            <Textarea id="notes" rows={2} placeholder="Tuỳ chọn…" {...register('notes')} />
          </FormField>

          {submitStatus === 'error' && (
            <p className="text-destructive text-sm">Có lỗi xảy ra, vui lòng thử lại.</p>
          )}

          <Button type="submit" variant="gradient" disabled={isSubmitting} className="w-full py-3">
            {isSubmitting ? 'Đang gửi…' : 'Gửi thông tin'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default StudentFormPage;
