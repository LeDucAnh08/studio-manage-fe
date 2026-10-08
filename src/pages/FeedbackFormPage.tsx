import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Spinner } from '@/components/ui';
import { CustomerButton } from '@/components/customer/CustomerButton';
import { CustomerFeedbackSection } from '@/components/customer/CustomerFeedbackSection';
import {
  CustomerFormField,
  CustomerInput,
  CustomerTextarea,
} from '@/components/customer/CustomerFields';
import { CustomerRatingInput } from '@/components/customer/CustomerRatingInput';
import { CustomerSurface } from '@/components/customer/CustomerSurface';
import '../styles/customer-forms.css';

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
  const submitBarRef = useRef<HTMLDivElement>(null);
  const [submitBarHeight, setSubmitBarHeight] = useState(0);

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

  useEffect(() => {
    const bar = submitBarRef.current;
    if (!bar) return;
    const measure = () => setSubmitBarHeight(bar.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(bar);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [loading, loadError, submitStatus]);

  if (loading) {
    return (
      <div className="customer-standalone-form">
        <div
          className="customer-form-loading"
          role="status"
          aria-label="Đang tải biểu mẫu phản hồi"
        >
          <Spinner />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="customer-standalone-form">
        <CustomerSurface className="customer-form-state customer-form-error" role="alert">
          <AlertCircle className="customer-form-state__icon" aria-hidden="true" />
          <h1 className="customer-page-title">Không tìm thấy thông tin</h1>
          <p className="customer-form-copy">Link có thể không còn hợp lệ</p>
        </CustomerSurface>
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div className="customer-standalone-form">
        <CustomerSurface className="customer-form-state" role="status">
          <div className="customer-feedback-success-logo">
            <Logo size={80} appearance="customer" />
          </div>
          <h1 className="customer-page-title">Cảm ơn bạn rất nhiều!</h1>
          <p className="customer-copy">
            Phản hồi của bạn đã được ghi nhận. Chúng tôi sẽ dùng ý kiến này để phục vụ bạn tốt hơn
            trong tương lai.
          </p>
          <CustomerButton fullWidth onClick={() => setSubmitStatus('idle')}>
            Gửi phản hồi khác
          </CustomerButton>
        </CustomerSurface>
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
    <div className="customer-feedback-page" style={{ paddingBottom: submitBarHeight }}>
      <header className="customer-feedback-header">
        <div className="customer-feedback-header__inner">
          <div className="customer-feedback-logo">
            <Logo size={36} appearance="customer" />
          </div>
          <div className="customer-form-header">
            <p className="customer-form-title">Yume Studio</p>
            <p className="customer-caption">Đánh giá trải nghiệm của bạn</p>
          </div>
          <div className="customer-feedback-progress">
            <div
              className="customer-feedback-progress__track"
              role="progressbar"
              aria-label="Các mục phản hồi đã hoàn thành"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="customer-feedback-progress__fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="customer-caption">{progress}%</span>
          </div>
        </div>
      </header>

      <div className="customer-standalone-form customer-form-stack">
        <div className="customer-form-header">
          <h1 className="customer-page-title">
            {fixedClass ? fixedClass.className : 'Gửi phản hồi'}
          </h1>
          {fixedClass?.school ? (
            <p className="customer-form-meta">
              <School aria-hidden="true" />
              <span>{fixedClass.school}</span>
            </p>
          ) : (
            <p className="customer-copy">Ý kiến của bạn giúp studio phục vụ tốt hơn</p>
          )}
        </div>

        <form
          id="customer-feedback-form"
          onSubmit={handleSubmit(onSubmit)}
          className="customer-form-stack"
        >
          {fixedClass && <input type="hidden" {...register('customer')} />}

          {/* Crew rating */}
          <CustomerFeedbackSection
            icon={Film}
            title="Ekip chụp ảnh"
            description="Thái độ, sự chuyên nghiệp và kỹ năng"
            required
          >
            <input type="hidden" {...register('crewRating', { required: true, min: 1 })} />
            <CustomerRatingInput
              aria-label="Đánh giá ekip chụp ảnh"
              required
              value={crewRating}
              onChange={(v) => setValue('crewRating', v, { shouldValidate: true })}
            />
            <CustomerFormField
              label="Nhận xét về ekip"
              htmlFor="crew-description"
              error={errors.crewDescription ? 'Vui lòng chia sẻ thêm về ekip' : undefined}
              required
            >
              <CustomerTextarea
                id="crew-description"
                rows={2}
                placeholder="Chia sẻ thêm về ekip…"
                {...register('crewDescription', {
                  required: true,
                  validate: (v) => v.trim().length > 0,
                })}
              />
            </CustomerFormField>
          </CustomerFeedbackSection>

          {/* Album rating */}
          <CustomerFeedbackSection
            icon={ImageIcon}
            title="Album ảnh"
            description="Chất lượng, bố cục và màu sắc"
            required
          >
            <input type="hidden" {...register('albumRating', { required: true, min: 1 })} />
            <CustomerRatingInput
              aria-label="Đánh giá album ảnh"
              required
              value={albumRating}
              onChange={(v) => setValue('albumRating', v, { shouldValidate: true })}
            />
            <CustomerFormField
              label="Nhận xét về album"
              htmlFor="album-description"
              error={errors.albumDescription ? 'Vui lòng chia sẻ thêm về album' : undefined}
              required
            >
              <CustomerTextarea
                id="album-description"
                rows={2}
                placeholder="Chia sẻ thêm về album…"
                {...register('albumDescription', {
                  required: true,
                  validate: (v) => v.trim().length > 0,
                })}
              />
            </CustomerFormField>
          </CustomerFeedbackSection>

          {/* General feedback */}
          <CustomerFeedbackSection
            icon={MessageCircle}
            title="Cảm nhận chung"
            description="Trải nghiệm tổng thể của bạn"
          >
            <CustomerFormField label="Cảm nhận của bạn" htmlFor="feedback-content">
              <CustomerTextarea
                id="feedback-content"
                rows={3}
                placeholder="Hãy chia sẻ cảm nhận của bạn…"
                {...register('content')}
              />
            </CustomerFormField>
          </CustomerFeedbackSection>

          {/* Suggestion */}
          <CustomerFeedbackSection
            icon={Lightbulb}
            title="Đề xuất cải thiện"
            description="Studio có thể làm gì tốt hơn?"
          >
            <CustomerFormField label="Đề xuất của bạn" htmlFor="feedback-suggestion">
              <CustomerTextarea
                id="feedback-suggestion"
                rows={3}
                placeholder="Góp ý để studio phục vụ bạn tốt hơn…"
                {...register('suggestion')}
              />
            </CustomerFormField>
          </CustomerFeedbackSection>

          {/* Phone */}
          <CustomerFeedbackSection icon={Phone} title="Số điện thoại" description="Tuỳ chọn">
            <CustomerFormField
              label="Số điện thoại liên hệ"
              htmlFor="feedback-phone"
              hint="Phản hồi hoàn toàn ẩn danh trừ khi bạn để lại SĐT"
            >
              <CustomerInput
                id="feedback-phone"
                type="tel"
                placeholder="Để chúng tôi có thể liên hệ lại nếu cần"
                {...register('phone')}
              />
            </CustomerFormField>
          </CustomerFeedbackSection>

          {submitStatus === 'error' && (
            <div className="customer-form-error customer-form-meta" role="alert">
              <AlertCircle aria-hidden="true" />
              <span>Có lỗi xảy ra, vui lòng thử lại.</span>
            </div>
          )}
        </form>
      </div>

      {/* Sticky submit bar */}
      <div className="customer-feedback-submit" ref={submitBarRef}>
        <div className="customer-feedback-submit__inner">
          <div>
            <p className="customer-form-copy" role="status">
              {completionCount === totalSteps ? (
                <span className="customer-form-meta">
                  <CheckCircle2 aria-hidden="true" />
                  <span>Sẵn sàng gửi</span>
                </span>
              ) : (
                `Hoàn thành ${completionCount}/${totalSteps} mục bắt buộc`
              )}
            </p>
          </div>
          <CustomerButton type="submit" form="customer-feedback-form" disabled={!canSubmit}>
            {isSubmitting ? 'Đang gửi…' : 'Gửi phản hồi'}
          </CustomerButton>
        </div>
      </div>
    </div>
  );
};

export default FeedbackFormPage;
