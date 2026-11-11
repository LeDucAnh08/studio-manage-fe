import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCustomerAppearance } from '@/components/customer/CustomerAppearance';
import {
  OrderButton as Button,
  OrderSelect,
  OrderTextarea,
} from '@/components/customer/CustomerOrderControls';
import { DeliveryPhotoGallery } from '@/components/customer/DeliveryPhotoGallery';
import { DeliveryPhotoUpload } from '@/components/customer/DeliveryPhotoUpload';
import BookingAlbumPage from './BookingAlbumPage';
import type { BookingAlbum } from '@/services/bookingAlbumService';
import {
  bookingWorkflowService,
  createWorkflowRequestId,
  type BookingWorkflowAction,
  type BookingWorkflowDto,
} from '@/services/bookingWorkflowService';
import '../styles/booking-delivery.css';

const errorText = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status === 409
    ? 'Hồ sơ hoặc bản bàn giao đã thay đổi. Tải lại và xem bản mới nhất trước khi gửi.'
    : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Chưa thể tải hoặc gửi phản hồi. Vui lòng thử lại.';
const date = (value?: string) =>
  value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
const safeUrl = (value?: string) => {
  try {
    const url = new URL(value || '');
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
};

export default function BookingDeliveryPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const requestedVersion = Number(new URLSearchParams(location.search).get('version')) || 0;
  const requestedTab = new URLSearchParams(location.search).get('tab');
  const { user } = useAuth();
  const identity = `${id}:${user?._id || ''}`;
  const activeIdentity = useRef(identity);
  useLayoutEffect(() => {
    activeIdentity.current = identity;
  }, [identity]);
  const customer = useCustomerAppearance();
  const [record, setRecord] = useState<BookingWorkflowDto | null>(null);
  const [recordIdentity, setRecordIdentity] = useState('');
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(0),
    [busy, setBusy] = useState(false);
  const [photoSection, setPhotoSection] = useState<'selection' | 'delivery'>('delivery');
  const [hasDrive, setHasDrive] = useState<boolean | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [deliveryPhotoIds, setDeliveryPhotoIds] = useState<string[]>([]);
  const [draft, setDraft] = useState({ note: '', version: 0 });
  const [rating, setRating] = useState(5),
    [comment, setComment] = useState('');
  const keys = useRef(new Map<string, string>()),
    inFlight = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    let active = true;
    alive.current = true;
    inFlight.current = false;
    setBusy(false);
    setLoading(true);
    setError('');
    void bookingWorkflowService
      .get(id)
      .then((value) => {
        if (active) {
          setRecord(value);
          setRecordIdentity(identity);
          setSelectedVersion(requestedVersion);
          setPhotoSection(
            requestedTab === 'selection'
              ? 'selection'
              : requestedTab === 'delivery' || value.workflow.progress?.deliveryVersion
                ? 'delivery'
                : 'selection',
          );
          setHasDrive(null);
        }
      })
      .catch((error) => {
        if (active) setError(errorText(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      alive.current = false;
    };
  }, [id, requestedVersion, requestedTab, identity]);
  const current = record?.booking._id === id && recordIdentity === identity ? record : null;
  const progress = current?.workflow.progress;
  const latest = progress?.deliveryVersion || 0;
  const version =
    selectedVersion === latest ||
    current?.workflow.deliveryHistory.some((entry) => entry.version === selectedVersion)
      ? selectedVersion
      : latest;
  const selected =
    version === latest
      ? progress
      : current?.workflow.deliveryHistory.find((entry) => entry.version === version);
  const back = customer ? `/account/bookings/${id}` : `/workflow-bookings/${id}`;
  const canRespond =
    customer &&
    user?.roles.includes(6) &&
    current?.booking.status === 'approved' &&
    current.workflow.lifecycle === 'delivered' &&
    version === latest;
  const staleDraft = !!draft.note && draft.version !== latest;
  const action = async (type: BookingWorkflowAction, data: Record<string, unknown>) => {
    if (!current || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const signature = `${id}:${current.workflow.version}:${type}:${JSON.stringify(data)}`;
    if (!keys.current.has(signature)) keys.current.set(signature, createWorkflowRequestId());
    try {
      const next = await bookingWorkflowService.act(
        id,
        current.workflow.version,
        type,
        data,
        keys.current.get(signature),
      );
      if (!alive.current || activeIdentity.current !== identity) return;
      setRecord(next);
      keys.current.delete(signature);
      if (type === 'revision.request') {
        setDraft({ note: '', version: latest });
        setNotice('Đã gửi phản hồi cho studio. Ekip sẽ kiểm tra và cập nhật bản chỉnh sửa.');
      } else if (type === 'delivery.accept') setNotice('Đã xác nhận ảnh đạt yêu cầu. Cảm ơn bạn!');
      else if (type === 'progress.update') {
        setSelectedVersion(0);
        setNotice('Đã gửi bản bàn giao mới.');
      } else {
        setComment('');
        setNotice('Đã gửi đánh giá cho studio.');
      }
    } catch (error) {
      if (alive.current && activeIdentity.current === identity) setError(errorText(error));
    } finally {
      if (alive.current && activeIdentity.current === identity) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
  const albumChanged = (next: BookingAlbum | null) => {
    if (!alive.current || activeIdentity.current !== identity) return;
    setHasDrive(!!next);
    if (!next) return;
    if (next.latestDeliveryVersion !== latest) {
      setSelectedVersion(0);
      if (next.latestDeliveryVersion) setPhotoSection('delivery');
    }
    void bookingWorkflowService
      .get(id)
      .then((value) => {
        if (alive.current && activeIdentity.current === identity) setRecord(value);
      })
      .catch((e) => {
        if (alive.current && activeIdentity.current === identity) setError(errorText(e));
      });
  };
  return (
    <div className="delivery-page">
      <div className="delivery-page__toolbar">
        <Link className={customer ? 'customer-back-link' : 'app-back-link text-primary'} to={back}>
          <ArrowLeft size={16} aria-hidden="true" /> Quay lại hồ sơ đơn
        </Link>
      </div>
      {loading ? (
        <p role="status">Đang tải ảnh bàn giao…</p>
      ) : !current ? (
        <p role="alert">{error || 'Không tìm thấy bản bàn giao.'}</p>
      ) : (
        <>
          <header className="delivery-page__heading">
            <div>
              <h1 className={customer ? 'customer-page-title' : 'text-2xl font-bold'}>
                Album bàn giao
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {current.booking.className || current.booking.packageName}
                {selected?.photos?.length ? ` · ${selected.photos.length} ảnh` : ''}
                {selected?.deliveredAt &&
                  ` · Bàn giao ${new Date(selected.deliveredAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`}
              </p>
            </div>
            {!!latest && photoSection === 'delivery' && (
              <label className="delivery-page__version">
                <span className="sr-only">Phiên bản ảnh</span>
                <OrderSelect
                  value={version}
                  disabled={busy}
                  onChange={(event) => setSelectedVersion(Number(event.target.value))}
                >
                  {Array.from(
                    new Set([
                      latest,
                      ...current.workflow.deliveryHistory.map((entry) => entry.version),
                    ]),
                  )
                    .sort((a, b) => b - a)
                    .map((item) => (
                      <option key={item} value={item}>
                        Bản bàn giao {item}
                        {item !== latest ? ' — bản cũ' : ''}
                      </option>
                    ))}
                </OrderSelect>
              </label>
            )}
          </header>
          <div className="delivery-page__tabs" role="tablist" aria-label="Các phần album">
            <button
              id="delivery-selection-tab"
              type="button"
              role="tab"
              aria-selected={photoSection === 'selection'}
              aria-controls="delivery-content"
              onClick={() => setPhotoSection('selection')}
            >
              Ảnh chọn
            </button>
            <button
              id="delivery-edited-tab"
              type="button"
              role="tab"
              aria-selected={photoSection === 'delivery'}
              aria-controls="delivery-content"
              onClick={() => setPhotoSection('delivery')}
            >
              Ảnh đã chỉnh
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm">
              {notice}
            </p>
          )}
          <div
            id="delivery-content"
            role="tabpanel"
            aria-labelledby={
              photoSection === 'selection' ? 'delivery-selection-tab' : 'delivery-edited-tab'
            }
            className="delivery-page__layout"
          >
            <section className="delivery-page__album" aria-label="Album ảnh bàn giao">
              <BookingAlbumPage
                key={identity}
                embedded
                staff={!customer}
                account={customer}
                section={photoSection}
                deliveryVersion={version}
                canCommentDelivery={current.workflow.lifecycle === 'delivered'}
                workflowVersion={current.workflow.version}
                lifecycle={current.workflow.lifecycle}
                onAlbumChange={albumChanged}
              />
              {!customer && current.workflow.lifecycle === 'revision_requested' && (
                <Button
                  disabled={busy}
                  onClick={() => void action('progress.update', { status: 'editing' })}
                >
                  Chuyển sang hậu kỳ
                </Button>
              )}
              {photoSection === 'delivery' &&
                !customer &&
                current.workflow.lifecycle === 'editing' && (
                  <details className="delivery-page__panel delivery-page__upload">
                    <summary>Tải ảnh trực tiếp lên hệ thống</summary>
                    <DeliveryPhotoUpload
                      bookingId={id}
                      previous={progress?.photos || []}
                      onChange={setDeliveryPhotoIds}
                      onBusy={setUploadingPhotos}
                    />
                    <Button
                      disabled={busy || uploadingPhotos || !deliveryPhotoIds.length}
                      onClick={() =>
                        void action('progress.update', { status: 'delivered', deliveryPhotoIds })
                      }
                    >
                      Gửi ảnh tải lên
                    </Button>
                  </details>
                )}
              {photoSection === 'delivery' &&
                (!latest || !selected ? (
                  <div className="delivery-page__panel">
                    Studio chưa bàn giao ảnh. Vui lòng quay lại sau.
                  </div>
                ) : !selected.photos?.some((photo) => photo.source === 'drive') ||
                  hasDrive === false ? (
                  <>
                    {selected.photos?.length ? (
                      <DeliveryPhotoGallery
                        key={`${id}:${version}`}
                        bookingId={id}
                        photos={selected.photos}
                      />
                    ) : safeUrl(selected.deliveryUrl) ? (
                      <div className="space-y-3">
                        <p>Bản bàn giao này được studio lưu bằng liên kết Drive trước đây.</p>
                        <Button asChild variant="outline">
                          <a
                            href={safeUrl(selected.deliveryUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Mở album bàn giao cũ
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <p>Chưa thể mở ảnh của bản bàn giao này. Hãy liên hệ studio.</p>
                    )}
                  </>
                ) : hasDrive === null ? (
                  <p role="status">Đang mở ảnh Drive…</p>
                ) : null)}
            </section>
            {photoSection === 'delivery' && !!latest && selected && (
              <aside
                className="delivery-page__feedback space-y-4"
                aria-labelledby="delivery-feedback-title"
              >
                <h2 id="delivery-feedback-title">Phản hồi về bộ ảnh</h2>
                {version !== latest ? (
                  <p className="text-sm">
                    Bạn đang xem bản cũ. Chọn bản mới nhất để gửi phản hồi hoặc xác nhận ảnh đạt yêu
                    cầu.
                  </p>
                ) : canRespond ? (
                  <>
                    <form
                      className="delivery-page__feedback-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!draft.note.trim() || staleDraft) return;
                        void action('revision.request', {
                          note: draft.note.trim(),
                          deliveryVersion: latest,
                        });
                      }}
                    >
                      <p className="text-sm text-muted-foreground">
                        Chia sẻ cảm nhận và những điều bạn muốn studio điều chỉnh cho bộ ảnh sau hậu
                        kỳ.
                      </p>
                      <label htmlFor="delivery-feedback" className="text-sm font-medium">
                        Nội dung phản hồi
                      </label>
                      <OrderTextarea
                        id="delivery-feedback"
                        rows={6}
                        maxLength={2000}
                        required
                        value={draft.note}
                        disabled={busy}
                        onChange={(event) =>
                          setDraft({ note: event.target.value, version: latest })
                        }
                      />
                      {staleDraft && (
                        <p role="alert" className="text-sm text-destructive">
                          Bản ảnh đã thay đổi. Kiểm tra ảnh mới và cập nhật nội dung phản hồi trước
                          khi gửi.
                        </p>
                      )}
                      <Button
                        type="submit"
                        className="delivery-page__submit"
                        disabled={busy || !draft.note.trim() || staleDraft}
                      >
                        <Send size={18} aria-hidden="true" /> Gửi phản hồi
                      </Button>
                      <p className="delivery-page__feedback-hint">
                        Studio sẽ kiểm tra phản hồi và gửi lại bản ảnh đã chỉnh sửa.
                      </p>
                    </form>
                    <div className="delivery-page__accept">
                      <h3>Bạn đã hài lòng với bộ ảnh?</h3>
                      <p>
                        Chỉ xác nhận khi bạn đã xem và hài lòng với toàn bộ ảnh trong bản bàn giao
                        này.
                      </p>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void action('delivery.accept', { deliveryVersion: latest })}
                      >
                        <CheckCircle2 size={21} aria-hidden="true" /> Xác nhận ảnh đã đạt yêu cầu
                      </Button>
                    </div>
                  </>
                ) : customer ? (
                  <p className="text-sm">
                    {current.workflow.lifecycle === 'revision_requested' ||
                    current.workflow.lifecycle === 'editing'
                      ? 'Studio đang xử lý phản hồi và chỉnh sửa ảnh. Bạn vẫn có thể xem bản đã gửi.'
                      : progress?.acceptedDeliveryVersion === latest
                        ? 'Bạn đã xác nhận ảnh trong bản bàn giao này đạt yêu cầu.'
                        : 'Hiện chưa thể gửi phản hồi cho bản bàn giao này.'}
                  </p>
                ) : (
                  <p className="text-sm">
                    Ekip xem album và phản hồi của khách tại đây. Cập nhật bản bàn giao mới ngay
                    trong tab Ảnh đã chỉnh.
                  </p>
                )}
                {progress?.revisionRequests.length ? (
                  <section className="border-t pt-4 space-y-3">
                    <h3 className="font-semibold">Phản hồi đã gửi</h3>
                    <ul className="space-y-3">
                      {progress.revisionRequests
                        .filter(
                          (entry) => !entry.deliveryVersion || entry.deliveryVersion === version,
                        )
                        .map((entry) => (
                          <li key={entry._id} className="text-sm">
                            <p className="whitespace-pre-wrap">{entry.note}</p>
                            <p className="mt-1 text-muted-foreground">
                              Bản {entry.deliveryVersion || version} · {date(entry.at)} ·{' '}
                              {entry.resolvedAt ? 'Đã xử lý' : 'Đang chờ studio'}
                            </p>
                          </li>
                        ))}
                    </ul>
                  </section>
                ) : null}
                {customer &&
                  version === latest &&
                  current.workflow.lifecycle === 'completed' &&
                  !current.workflow.feedback && (
                    <form
                      className="border-t pt-4 space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void action('feedback.submit', { rating, comment: comment.trim() });
                      }}
                    >
                      <h3 className="font-semibold">Đánh giá dịch vụ</h3>
                      <label htmlFor="delivery-rating">Số sao</label>
                      <OrderSelect
                        id="delivery-rating"
                        value={rating}
                        disabled={busy}
                        onChange={(event) => setRating(Number(event.target.value))}
                      >
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={value} value={value}>
                            {value} sao
                          </option>
                        ))}
                      </OrderSelect>
                      <label htmlFor="delivery-comment">Nhận xét</label>
                      <OrderTextarea
                        id="delivery-comment"
                        rows={4}
                        maxLength={2000}
                        value={comment}
                        disabled={busy}
                        onChange={(event) => setComment(event.target.value)}
                      />
                      <Button type="submit" disabled={busy}>
                        Gửi đánh giá
                      </Button>
                    </form>
                  )}
                {current.workflow.feedback && (
                  <section className="border-t pt-4">
                    <h3 className="font-semibold">Đánh giá đã gửi</h3>
                    <p className="text-sm">{current.workflow.feedback.rating} / 5 sao</p>
                    <p className="mt-2 text-sm whitespace-pre-wrap">
                      {current.workflow.feedback.comment}
                    </p>
                  </section>
                )}
              </aside>
            )}
          </div>
        </>
      )}
    </div>
  );
}
