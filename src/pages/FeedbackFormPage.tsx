import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Lightbulb,
  MessageCircle,
  Phone,
  School,
} from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import Logo from '../components/atoms/Logo';
import {
  Button,
  Card,
  CardContent,
  Input,
  PageLoader,
  StarRating,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

interface ClassInfo {
  _id: string;
  className: string;
  school?: string;
}

interface FormValues {
  customer: string;
  phone: string;
  crewRating: number;
  crewDescription: string;
  albumRating: number;
  albumDescription: string;
  content: string;
  suggestion: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const FeedbackFormPage = () => {
  const { customer: paramCustomerId } = useParams<{ customer: string }>();
  const [fixedClass, setFixedClass] = useState<ClassInfo | null>(null);
  const [searchParams] = useSearchParams();
  const access = searchParams.get('access') ?? '';
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<Status>('idle');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      customer: paramCustomerId || '',
      phone: '',
      crewRating: 0,
      crewDescription: '',
      albumRating: 0,
      albumDescription: '',
      content: '',
      suggestion: '',
    },
  });

  const crewRating = watch('crewRating');
  const albumRating = watch('albumRating');
  const crewDescription = watch('crewDescription');
  const albumDescription = watch('albumDescription');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (paramCustomerId) {
          const { data } = await api.get<{ data: ClassInfo }>(
            `/public/customers/${paramCustomerId}`,
            { params: { access } },
          );
          if (!cancelled) {
            setFixedClass(data.data);
            setValue('customer', data.data._id);
          }
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [paramCustomerId, setValue, access]);

  const onSubmit = async (data: FormValues) => {
    setSubmitStatus('loading');
    try {
      await api.post('/public/feedback', {
        customer: data.customer || undefined,
        access: data.customer ? access : undefined,
        phone: data.phone || undefined,
        crewFeedback: {
          rating: Number(data.crewRating),
          description: data.crewDescription.trim(),
        },
        albumFeedback: {
          rating: Number(data.albumRating),
          description: data.albumDescription.trim(),
        },
        content: data.content || undefined,
        suggestion: data.suggestion || undefined,
      });
      setSubmitStatus('success');
      reset({
        customer: paramCustomerId || '',
        phone: '',
        crewRating: 0,
        crewDescription: '',
        albumRating: 0,
        albumDescription: '',
        content: '',
        suggestion: '',
      });
    } catch {
      setSubmitStatus('error');
    }
  };

  const canSubmit = useMemo(
    () =>
      crewRating > 0 &&
      albumRating > 0 &&
      crewDescription.trim().length > 0 &&
      albumDescription.trim().length > 0 &&
      !isSubmitting,
    [crewRating, albumRating, crewDescription, albumDescription, isSubmitting],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <PageLoader />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="py-10">
            <div className="mb-4 flex justify-center">
              <AlertCircle className="h-12 w-12 text-amber-500" />
            </div>
            <p className="font-semibold text-lg">Không tìm thấy thông tin</p>
            <p className="mt-1 text-sm text-muted-foreground">Link có thể không còn hợp lệ</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full text-center rounded-3xl">
          <CardContent className="p-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <Logo size={80} />
            </div>
            <h2 className="font-bold mb-2 text-2xl">Cảm ơn bạn rất nhiều!</h2>
            <p className="leading-relaxed mb-8 text-muted-foreground">
              Phản hồi của bạn đã được ghi nhận. Chúng tôi sẽ dùng ý kiến này để phục vụ bạn tốt hơn
              trong tương lai.
            </p>
            <Button
              variant="gradient"
              className="w-full py-3"
              onClick={() => setSubmitStatus('idle')}
            >
              Gửi phản hồi khác
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSteps = 4;
  const completionCount =
    (crewRating > 0 ? 1 : 0) +
    (albumRating > 0 ? 1 : 0) +
    (crewDescription.trim().length > 0 ? 1 : 0) +
    (albumDescription.trim().length > 0 ? 1 : 0);
  const progress = Math.round((completionCount / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b">
        <div className="max-w-xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-cyan-500 flex items-center justify-center shadow-sm">
            <Logo size={36} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight truncate">Yume Studio</p>
            <p className="leading-tight text-xs text-muted-foreground">
              Đánh giá trải nghiệm của bạn
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full overflow-hidden bg-muted">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="tabular-nums text-xs text-muted-foreground">{progress}%</span>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 py-8">
        <div className="mb-8">
          <h1 className="font-bold leading-tight text-2xl sm:text-3xl">
            {fixedClass ? fixedClass.className : 'Gửi phản hồi'}
          </h1>
          {fixedClass?.school ? (
            <p className="mt-1 text-muted-foreground inline-flex items-center gap-1.5">
              <School className="h-4 w-4 text-sky-500" />
              <span>{fixedClass.school}</span>
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">Ý kiến của bạn giúp studio phục vụ tốt hơn</p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fixedClass && <input type="hidden" {...register('customer')} />}

          {/* Crew rating */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/15">
                  <Film className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">
                    Ekip chụp ảnh <span className="text-rose-500">*</span>
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Thái độ, sự chuyên nghiệp và kỹ năng
                  </p>
                </div>
              </div>
              <input type="hidden" {...register('crewRating', { required: true, min: 1 })} />
              <StarRating
                value={crewRating}
                onChange={(v) => setValue('crewRating', v, { shouldValidate: true })}
              />
              <Textarea
                rows={2}
                placeholder="Chia sẻ thêm về ekip…"
                className={cn('mt-4 resize-none', errors.crewDescription && 'border-destructive')}
                {...register('crewDescription', {
                  required: true,
                  validate: (v) => v.trim().length > 0,
                })}
              />
              {errors.crewDescription && (
                <p className="mt-1 text-xs text-destructive">Vui lòng chia sẻ thêm về ekip</p>
              )}
            </CardContent>
          </Card>

          {/* Album rating */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-violet-500/15">
                  <ImageIcon className="h-5 w-5 text-violet-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">
                    Album ảnh <span className="text-rose-500">*</span>
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Chất lượng, bố cục và màu sắc
                  </p>
                </div>
              </div>
              <input type="hidden" {...register('albumRating', { required: true, min: 1 })} />
              <StarRating
                value={albumRating}
                onChange={(v) => setValue('albumRating', v, { shouldValidate: true })}
              />
              <Textarea
                rows={2}
                placeholder="Chia sẻ thêm về album…"
                className={cn('mt-4 resize-none', errors.albumDescription && 'border-destructive')}
                {...register('albumDescription', {
                  required: true,
                  validate: (v) => v.trim().length > 0,
                })}
              />
              {errors.albumDescription && (
                <p className="mt-1 text-xs text-destructive">Vui lòng chia sẻ thêm về album</p>
              )}
            </CardContent>
          </Card>

          {/* General feedback */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-teal-500/15">
                  <MessageCircle className="h-5 w-5 text-teal-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">Cảm nhận chung</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Trải nghiệm tổng thể của bạn
                  </p>
                </div>
              </div>
              <Textarea
                rows={3}
                className="resize-none"
                placeholder="Hãy chia sẻ cảm nhận của bạn…"
                {...register('content')}
              />
            </CardContent>
          </Card>

          {/* Suggestion */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/15">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">Đề xuất cải thiện</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Studio có thể làm gì tốt hơn?
                  </p>
                </div>
              </div>
              <Textarea
                rows={3}
                className="resize-none"
                placeholder="Góp ý để studio phục vụ bạn tốt hơn…"
                {...register('suggestion')}
              />
            </CardContent>
          </Card>

          {/* Phone */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <label className="flex items-center gap-2 font-semibold mb-2">
                <Phone className="h-4 w-4 text-emerald-500" />
                <span>Số điện thoại</span>
                <span className="font-normal text-xs text-muted-foreground">· tuỳ chọn</span>
              </label>
              <Input
                type="tel"
                placeholder="Để chúng tôi có thể liên hệ lại nếu cần"
                {...register('phone')}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Phản hồi hoàn toàn ẩn danh trừ khi bạn để lại SĐT
              </p>
            </CardContent>
          </Card>

          {submitStatus === 'error' && (
            <div className="rounded-2xl p-4 text-sm text-destructive bg-destructive/10 border border-destructive/30 inline-flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              <span>Có lỗi xảy ra, vui lòng thử lại.</span>
            </div>
          )}

          <div className="h-20" />
        </form>
      </div>

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 backdrop-blur z-20 bg-background/80 border-t">
        <div className="max-w-xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {completionCount === totalSteps ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Sẵn sàng gửi</span>
                </span>
              ) : (
                `Hoàn thành ${completionCount}/${totalSteps} mục bắt buộc`
              )}
            </p>
          </div>
          <Button
            type="submit"
            variant="gradient"
            disabled={!canSubmit}
            onClick={handleSubmit(onSubmit)}
            className="px-6 py-3"
          >
            {isSubmitting ? 'Đang gửi…' : 'Gửi phản hồi'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackFormPage;
