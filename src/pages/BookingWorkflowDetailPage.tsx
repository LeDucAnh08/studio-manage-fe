import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  OrderButton as Button,
  OrderInput as Input,
  OrderTextarea as Textarea,
  OrderSelect,
} from '../components/customer/CustomerOrderControls';
import { useCustomerAppearance } from '../components/customer/CustomerAppearance';
import { CustomerPrice } from '../components/customer/CustomerPrice';
import { CustomerPriceBreakdown } from '../components/customer/CustomerPriceBreakdown';
import { CustomerBookingIntake } from '../components/customer/CustomerBookingIntake';
import { BookingCostumeDetails } from '../components/customer/BookingCostumeDetails';
import '../styles/customer-orders.css';
import { useAuth } from '../context/AuthContext';
import { bookingService, type Booking } from '../services/bookingService';
import {
  bookingWorkflowService,
  bookingWorkflowLabels as lifecycleLabels,
  type BookingWorkflowAction,
  type BookingWorkflowDto,
  type EditableWorkflowMember,
  type PaymentInstructions,
  type WorkflowMember,
  createWorkflowRequestId,
} from '../services/bookingWorkflowService';
import { userService } from '../services/userService';
import type { User } from '../types';
import { BookingPhotographer } from '../components/BookingPhotographer';
import { PhotographerAvailabilityPicker } from '../components/PhotographerAvailabilityPicker';
import {
  photographerWindow,
  availabilityKey,
  type AvailabilityResult,
} from '../services/photographerService';

type Workflow = BookingWorkflowDto['workflow'];
type QuoteLineInput = { label: string; quantity: string; unitPrice: string };
type AllocationInput = {
  costumeId: string;
  size: string;
  quantity: string;
  receiveDate: string;
  returnDate: string;
};
type MemberInput = {
  _id?: string;
  name: string;
  gender: string;
  height: string;
  weight: string;
  contact: string;
  costumeSizes: Array<{ costumeId: string; size: string }>;
};

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const progressLabels: Record<string, string> = {
  not_started: 'Chưa bắt đầu',
  shooting: 'Đang chụp',
  editing: 'Đang hậu kỳ',
  delivered: 'Đã bàn giao',
};
const changeStatusLabels: Record<string, string> = {
  requested: 'Khách đang chờ phản hồi',
  proposed: 'Chờ khách xác nhận đề xuất',
  accepted: 'Đã đồng ý',
  applied: 'Đã áp dụng',
  declined: 'Đã đóng yêu cầu',
};
const methodLabels: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  other: 'Khác',
};
const money = (value: number) =>
  `${(Number.isFinite(value) ? value : 0).toLocaleString('vi-VN')} đ`;
const amountForDisplay = (value: number) => (Number.isFinite(value) ? value : 0);
const errorText = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
  'Không thể cập nhật hồ sơ. Hãy tải lại rồi thử lại.';
const emptyPayments = {
  requiredDeposit: 0,
  totalReceived: 0,
  totalRefunded: 0,
  netReceived: 0,
  totalDue: 0,
  refundDue: 0,
  entries: [] as NonNullable<Workflow['payments']>['entries'],
};
const formatParts = (value: string | Date, options: Intl.DateTimeFormatOptions) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return {};
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: VN_TIME_ZONE, ...options })
      .formatToParts(date)
      .filter((item) => item.type !== 'literal')
      .map((item) => [item.type, item.value]),
  ) as Record<string, string>;
};
const vnDateInput = (value: string | Date) => {
  const parts = formatParts(value, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return parts.year ? `${parts.year}-${parts.month}-${parts.day}` : '';
};
const vnTimeInput = (value: string) => {
  const parts = formatParts(value, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return parts.hour ? `${parts.hour}:${parts.minute}` : '';
};
const dateAtVietnamMidnight = (value: string) => new Date(`${value}T00:00:00+07:00`).toISOString();
const validFutureSchedule = (date: string, start: string, end: string, location: string) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) ||
    !location.trim()
  )
    return false;
  const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
  const endMinutes = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
  return endMinutes > startMinutes && new Date(`${date}T${start}:00+07:00`).getTime() > Date.now();
};
const formatDateTime = (value?: string | Date) => {
  if (!value) return 'Chưa cập nhật';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: VN_TIME_ZONE,
      })
    : 'Chưa cập nhật';
};
const formatDateOnly = (value?: string | Date) => {
  if (!value) return 'Chưa chốt';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('vi-VN', { dateStyle: 'medium', timeZone: VN_TIME_ZONE })
    : 'Chưa chốt';
};
const formatIntakeDateTime = (value?: string | Date) => {
  if (!value) return 'Chưa cập nhật';
  const parts = formatParts(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return parts.year
    ? `${parts.day}/${parts.month}/${parts.year} · ${parts.hour}:${parts.minute}`
    : 'Chưa cập nhật';
};
const defaultMemberInput = (member?: WorkflowMember): MemberInput => ({
  ...(member?._id ? { _id: member._id } : {}),
  name: member?.name ?? '',
  gender: member?.gender ?? '',
  height: member?.height == null ? '' : String(member.height),
  weight: member?.weight == null ? '' : String(member.weight),
  contact: member?.contact ?? '',
  costumeSizes: member?.costumeSizes.map((size) => ({ ...size })) ?? [],
});
const defaultAllocationRows = (members: WorkflowMember[], shootDate: string): AllocationInput[] => {
  const counts = new Map<string, { costumeId: string; size: string; quantity: number }>();
  for (const member of members) {
    for (const size of member.costumeSizes ?? []) {
      const key = `${size.costumeId}:${size.size}`;
      const row = counts.get(key) ?? { costumeId: size.costumeId, size: size.size, quantity: 0 };
      row.quantity += 1;
      counts.set(key, row);
    }
  }
  return [...counts.values()].map((row) => ({
    costumeId: row.costumeId,
    size: row.size,
    quantity: String(row.quantity),
    receiveDate: shootDate,
    returnDate: shootDate,
  }));
};
const splitLines = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const customer = useCustomerAppearance();
  const generatedId = useId();
  const child = isValidElement<{ id?: string }>(children) ? children : null;
  const controlId = child?.props.id || generatedId;
  return (
    <div
      className={
        customer
          ? `customer-order-field ${className}`
          : `block space-y-1.5 text-sm font-medium ${className}`
      }
    >
      <label htmlFor={controlId}>{label}</label>
      {child ? cloneElement(child, { id: controlId }) : children}
    </div>
  );
}

function PaymentInstructionsPanel({ instructions }: { instructions: PaymentInstructions }) {
  const customer = useCustomerAppearance();
  return (
    <div
      className={
        customer ? 'customer-order-inset' : 'mt-4 rounded-xl border bg-muted/30 p-4 text-sm'
      }
    >
      <h3 className={customer ? 'customer-order-title' : 'font-semibold'}>
        Hướng dẫn chuyển khoản
      </h3>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Ngân hàng</dt>
          <dd>{instructions.bankName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Chủ tài khoản</dt>
          <dd>{instructions.accountName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Số tài khoản</dt>
          <dd className="font-semibold">{instructions.accountNumber}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Nội dung chuyển khoản</dt>
          <dd className="break-words">{instructions.transferTemplate}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function BookingWorkflowDetailPage() {
  const location = useLocation();
  const customer = useCustomerAppearance();
  const { id = '' } = useParams();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes(0) || roles.includes(1);
  const isClient = roles.includes(6);
  const isAccountant = !isAdmin && roles.includes(5);
  const isPhotographer = !isAdmin && !isClient && roles.includes(3);
  const canSeeFinancials = isAdmin || isClient || isAccountant;
  const [record, setRecord] = useState<BookingWorkflowDto | null>(null);
  const [legacyBooking, setLegacyBooking] = useState<Booking | null>(null);
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [photographerError, setPhotographerError] = useState('');
  const [allocationAvailability, setAllocationAvailability] = useState<AvailabilityResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [quoteLines, setQuoteLines] = useState<QuoteLineInput[]>([]);
  const [depositRequired, setDepositRequired] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [quoteStartTime, setQuoteStartTime] = useState('');
  const [quoteEndTime, setQuoteEndTime] = useState('');
  const [quoteLocation, setQuoteLocation] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('14');
  const [editingTerms, setEditingTerms] = useState('');
  const [quoteTerms, setQuoteTerms] = useState('');
  const [paymentKind, setPaymentKind] = useState<'deposit' | 'balance' | 'refund'>('deposit');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [progressUrl, setProgressUrl] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [memberDraft, setMemberDraft] = useState<MemberInput[]>([]);
  const [memberError, setMemberError] = useState('');
  const [memberUrl, setMemberUrl] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [allocationRows, setAllocationRows] = useState<AllocationInput[]>([]);
  const [selectedPhotographerIds, setSelectedPhotographerIds] = useState<string[]>([]);
  const [changeKind, setChangeKind] = useState<'change' | 'cancel'>('change');
  const [changeNote, setChangeNote] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedStartTime, setRequestedStartTime] = useState('');
  const [requestedEndTime, setRequestedEndTime] = useState('');
  const [requestedLocation, setRequestedLocation] = useState('');
  const [proposalDate, setProposalDate] = useState('');
  const [proposalStartTime, setProposalStartTime] = useState('');
  const [proposalEndTime, setProposalEndTime] = useState('');
  const [proposalLocation, setProposalLocation] = useState('');
  const [proposedPayable, setProposedPayable] = useState('0');
  const [proposalTerms, setProposalTerms] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const mutationKeys = useRef(new Map<string, string>());

  const load = useCallback(async () => {
    if (!id) {
      setError('Không tìm thấy mã hồ sơ.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const detail = await bookingWorkflowService.get(id);
      setRecord(detail);
      if (isAdmin || isClient) {
        const legacy = await bookingService.get(id).catch(() => null);
        setLegacyBooking(legacy);
      } else {
        setLegacyBooking(null);
      }
    } catch (loadError) {
      setError(errorText(loadError));
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin, isClient]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    userService
      .getPhotographers()
      .then((items) => {
        if (active) setPhotographers(items);
      })
      .catch(() => {
        if (active)
          setPhotographerError('Không tải được danh sách thợ chụp. Hãy thử tải lại hồ sơ.');
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const booking = record?.booking;
  const workflow = record?.workflow;
  const payments = workflow?.payments ?? null;
  const totalQuote = workflow?.quote?.total ?? 0;
  const activeChange =
    !!workflow?.changeRequest && ['requested', 'proposed'].includes(workflow.changeRequest.status);
  const estimatedQuoteTotal = quoteLines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const price = Number(line.unitPrice);
    return sum + (Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : 0);
  }, 0);
  const title =
    booking?.className?.trim() ||
    booking?.contactName?.trim() ||
    booking?.packageName ||
    'Hồ sơ dịch vụ';
  const ordersReturnTo = location.state?.ordersReturnTo;
  const staffReturnTo = location.state?.bookingOrdersReturnTo;
  const backPath = isClient
    ? typeof ordersReturnTo === 'string' &&
      (ordersReturnTo === '/account/orders' || ordersReturnTo.startsWith('/account/orders?'))
      ? ordersReturnTo
      : '/account/orders?tab=bookings'
    : typeof staffReturnTo === 'string' &&
        (staffReturnTo === '/workflow-bookings' || staffReturnTo.startsWith('/workflow-bookings?'))
      ? staffReturnTo
      : '/workflow-bookings';
  const effectivePayment = {
    ...emptyPayments,
    ...(payments ?? {}),
    refundDue: payments?.refundDue ?? 0,
  };
  const canEditMembers = !!(
    (isAdmin || isClient) &&
    workflow?.quote?.acceptedAt &&
    !workflow.resources?.scheduleId &&
    workflow.memberEntry?.opened !== true &&
    ['awaiting_deposit', 'ready_to_confirm'].includes(workflow.lifecycle)
  );
  const isPaymentEntryAvailable = isAdmin || isAccountant;
  const availablePaymentKinds: Array<'deposit' | 'balance' | 'refund'> = [];
  if (isPaymentEntryAvailable && workflow?.quote?.acceptedAt) {
    if (
      workflow.lifecycle === 'awaiting_deposit' &&
      effectivePayment.netReceived < effectivePayment.requiredDeposit
    )
      availablePaymentKinds.push('deposit');
    if (workflow.resources?.scheduleId && effectivePayment.totalDue > 0)
      availablePaymentKinds.push('balance');
    if (effectivePayment.refundDue > 0) availablePaymentKinds.push('refund');
  }
  const selectedPaymentKind = availablePaymentKinds.includes(paymentKind)
    ? paymentKind
    : (availablePaymentKinds[0] ?? 'deposit');
  const canQuote = !!(
    isAdmin &&
    booking?.status === 'approved' &&
    !workflow?.quote?.acceptedAt &&
    !workflow?.payments?.entries.length
  );
  const acceptedDelivery = !!(
    workflow?.progress?.acceptedAt &&
    workflow.progress.acceptedDeliveryVersion === workflow.progress.deliveryVersion
  );

  useEffect(() => {
    if (!booking || !workflow) return;
    const proposedSchedule = workflow.quote?.proposedSchedule;
    const currentSchedule = workflow.resources?.scheduleDetails;
    const defaultDate = vnDateInput(
      currentSchedule?.shootDate ?? proposedSchedule?.shootDate ?? booking.startAt,
    );
    const defaultStart =
      currentSchedule?.startTime ?? proposedSchedule?.startTime ?? vnTimeInput(booking.startAt);
    const defaultEnd =
      currentSchedule?.endTime ?? proposedSchedule?.endTime ?? vnTimeInput(booking.endAt);
    const defaultLocation =
      currentSchedule?.location ?? proposedSchedule?.location ?? booking.location;
    setQuoteLines(
      workflow.quote?.lines.map((line) => ({
        label: line.label,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
      })) ?? [
        {
          label: `Gói ${booking.packageName}`,
          quantity: String(booking.members),
          unitPrice: String(booking.pricePerMember ?? legacyBooking?.pricePerMember ?? 0),
        },
      ],
    );
    setDepositRequired(workflow.quote ? String(workflow.quote.depositRequired) : '');
    setQuoteDate(defaultDate);
    setQuoteStartTime(defaultStart);
    setQuoteEndTime(defaultEnd);
    setQuoteLocation(defaultLocation);
    setDeliveryDays(String(workflow.quote?.delivery.targetDays ?? 14));
    setEditingTerms(workflow.quote?.editingTerms.join('\n') ?? '');
    setQuoteTerms(workflow.quote?.terms.join('\n') ?? '');
    setMemberDraft(workflow.members.map(defaultMemberInput));
    setLinkOpen(workflow.memberEntry?.opened ?? false);
    setSelectedPhotographerIds(
      workflow.resources?.photographers.length
        ? workflow.resources.photographers
        : workflow.assignedPhotographer
          ? [
              workflow.assignedPhotographer._id,
              ...(workflow.assignedSupportPhotographers ?? []).map((row) => row._id),
            ]
          : [],
    );
    setAllocationRows(
      workflow.resources?.costumes.map((item) => ({
        costumeId: item.costumeId,
        size: item.size,
        quantity: String(item.quantity),
        receiveDate: vnDateInput(item.receiveDate),
        returnDate: vnDateInput(item.returnDate),
      })) ?? defaultAllocationRows(workflow.members, defaultDate),
    );
    setRequestedDate(defaultDate);
    setRequestedStartTime(defaultStart);
    setRequestedEndTime(defaultEnd);
    setRequestedLocation(defaultLocation);
    setProposalDate(defaultDate);
    setProposalStartTime(defaultStart);
    setProposalEndTime(defaultEnd);
    setProposalLocation(defaultLocation);
    setProposedPayable(String(workflow.changeRequest?.finalPayable ?? workflow.quote?.total ?? 0));
    setProposalTerms(workflow.changeRequest?.terms.join('\n') ?? '');
  }, [booking, workflow, legacyBooking]);

  const getMutationKey = (signature: string) => {
    const existing = mutationKeys.current.get(signature);
    if (existing) return existing;
    const created = createWorkflowRequestId();
    mutationKeys.current.set(signature, created);
    return created;
  };

  const runAction = async (action: BookingWorkflowAction, data: Record<string, unknown> = {}) => {
    if (!id || !workflow) return null;
    setBusy(action);
    setError('');
    const signature = `${id}:${action}:${JSON.stringify(data)}`;
    try {
      const updated = await bookingWorkflowService.act(
        id,
        workflow.version,
        action,
        data,
        getMutationKey(signature),
      );
      setRecord(updated);
      mutationKeys.current.delete(signature);
      return updated;
    } catch (actionError) {
      setError(errorText(actionError));
      return null;
    } finally {
      setBusy('');
    }
  };

  const submitReview = async (status: 'approved' | 'rejected') => {
    if (!reviewNote.trim()) return;
    setBusy('review');
    setError('');
    try {
      await bookingService.review(id, status, reviewNote.trim());
      toast.success('Đã gửi phản hồi cho khách.');
      await load();
    } catch (reviewError) {
      setError(errorText(reviewError));
    } finally {
      setBusy('');
    }
  };

  const submitQuote = async () => {
    if (!workflow) return;
    const lines = quoteLines.map((line) => ({
      label: line.label.trim(),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
    }));
    if (
      lines.some(
        (line) =>
          !line.label ||
          !Number.isInteger(line.quantity) ||
          line.quantity < 1 ||
          !Number.isSafeInteger(line.unitPrice) ||
          line.unitPrice < 0,
      )
    ) {
      setError('Kiểm tra tên dịch vụ, số lượng và đơn giá trong từng dòng báo giá.');
      return;
    }
    if (
      !validFutureSchedule(quoteDate, quoteStartTime, quoteEndTime, quoteLocation) ||
      !Number.isInteger(Number(deliveryDays)) ||
      Number(deliveryDays) < 1 ||
      Number(deliveryDays) > 365 ||
      !Number.isSafeInteger(Number(depositRequired)) ||
      Number(depositRequired) < 1 ||
      Number(depositRequired) > estimatedQuoteTotal
    ) {
      setError('Báo giá cần có tiền cọc hợp lệ, ngày, giờ và địa điểm chụp.');
      return;
    }
    await runAction('quote.propose', {
      quote: {
        lines,
        depositRequired: Number(depositRequired),
        proposedSchedule: {
          shootDate: dateAtVietnamMidnight(quoteDate),
          startTime: quoteStartTime,
          endTime: quoteEndTime,
          location: quoteLocation.trim(),
        },
        delivery: { targetDays: Number(deliveryDays) },
        editingTerms: splitLines(editingTerms),
        terms: splitLines(quoteTerms),
      },
    });
  };

  const submitMemberEdits = async () => {
    if (!workflow || !booking) return;
    setMemberError('');
    const valid = memberDraft.every((member) => member.name.trim());
    if (!valid || memberDraft.length > booking.members) {
      setMemberError(
        `Mỗi thành viên cần có họ tên và danh sách không vượt quá ${booking.members} người.`,
      );
      return;
    }
    const members: EditableWorkflowMember[] = memberDraft.map((member) => ({
      ...(member._id ? { _id: member._id } : {}),
      name: member.name.trim(),
      ...(member.gender ? { gender: member.gender } : {}),
      ...(member.height ? { height: Number(member.height) } : {}),
      ...(member.weight ? { weight: Number(member.weight) } : {}),
      ...(member.contact.trim() ? { contact: member.contact.trim() } : {}),
      costumeSizes: member.costumeSizes,
    }));
    setBusy('members');
    const signature = `${id}:members:${JSON.stringify(members)}`;
    try {
      if (
        members.some(
          (member) =>
            (member.height !== undefined &&
              (!Number.isFinite(member.height) || member.height < 1 || member.height > 250)) ||
            (member.weight !== undefined &&
              (!Number.isFinite(member.weight) || member.weight < 1 || member.weight > 500)),
        )
      ) {
        setMemberError('Kiểm tra chiều cao và cân nặng của từng thành viên.');
        return;
      }
      const updated = await bookingWorkflowService.updateMembers(
        id,
        workflow.version,
        members,
        getMutationKey(signature),
      );
      setRecord(updated);
      mutationKeys.current.delete(signature);
      toast.success('Đã lưu danh sách thành viên.');
    } catch (saveError) {
      setMemberError(errorText(saveError));
    } finally {
      setBusy('');
    }
  };

  const openMemberLink = async () => {
    const updated = await runAction('member-link.open');
    const entry = updated?.workflow.memberEntry;
    if (entry?.token) {
      setMemberUrl(`${window.location.origin}/member-intake/${encodeURIComponent(entry.token)}`);
      setLinkOpen(true);
    }
  };

  const closeMemberLink = async () => {
    const updated = await runAction('member-link.close');
    if (updated) {
      setLinkOpen(false);
      setMemberUrl('');
    }
  };

  const recordPayment = async () => {
    if (!Number.isSafeInteger(Number(paymentAmount)) || Number(paymentAmount) < 1) {
      setError('Nhập số tiền nguyên dương bằng đồng Việt Nam.');
      return;
    }
    const updated = await runAction('payment.record', {
      kind: selectedPaymentKind,
      amount: Number(paymentAmount),
      method: paymentMethod,
      ...(paymentReference.trim() ? { reference: paymentReference.trim() } : {}),
    });
    if (updated) {
      setPaymentAmount('');
      setPaymentReference('');
    }
  };

  const submitProgress = async (status: 'shooting' | 'editing' | 'delivered') => {
    if (status === 'delivered' && !progressUrl.trim()) {
      setError('Nhập đường dẫn Drive bàn giao cho khách.');
      return;
    }
    const updated = await runAction('progress.update', {
      status,
      ...(status === 'delivered' ? { deliveryUrl: progressUrl.trim() } : {}),
    });
    if (updated && status === 'delivered') setProgressUrl('');
  };

  const submitAllocation = async () => {
    if (!workflow?.quote) return;
    if (!workflow.assignedPhotographer || !allocationReady) {
      setError('Gắn thợ phụ trách và kiểm tra lịch trống hiện tại trước khi xác nhận.');
      return;
    }
    const costumes = allocationRows
      .filter((row) => row.costumeId && row.size)
      .map((row) => ({
        costumeId: row.costumeId,
        size: row.size,
        quantity: Number(row.quantity),
        receiveDate: row.receiveDate,
        returnDate: row.returnDate,
      }));
    const shootDate = vnDateInput(workflow.quote.proposedSchedule.shootDate);
    if (
      !selectedPhotographerIds.length ||
      allocationRows.some(
        (row) =>
          (row.costumeId || row.size || row.quantity) &&
          (!row.costumeId ||
            !row.size ||
            !Number.isInteger(Number(row.quantity)) ||
            Number(row.quantity) < 1 ||
            !row.receiveDate ||
            !row.returnDate ||
            row.receiveDate > row.returnDate ||
            row.receiveDate > shootDate ||
            row.returnDate < shootDate),
      )
    ) {
      setError('Chọn ít nhất một thợ chụp và hoàn thiện từng dòng phân bổ trang phục.');
      return;
    }
    await runAction('resources.confirm', {
      schedule: {
        ...workflow.quote.proposedSchedule,
        photographerIds: selectedPhotographerIds,
      },
      costumes,
    });
  };

  const submitMemberLinkCopy = async () => {
    if (!memberUrl) return;
    try {
      await navigator.clipboard.writeText(memberUrl);
      toast.success('Đã sao chép đường dẫn nhập thông tin.');
    } catch {
      setError('Không thể sao chép tự động. Hãy chọn và sao chép đường dẫn bên dưới.');
    }
  };

  const submitChangeRequest = async () => {
    if (!changeNote.trim()) {
      setError('Mô tả lý do thay đổi hoặc hủy dịch vụ.');
      return;
    }
    if (
      changeKind === 'change' &&
      !validFutureSchedule(requestedDate, requestedStartTime, requestedEndTime, requestedLocation)
    ) {
      setError('Chọn ngày và khung giờ mới trong tương lai, đồng thời nhập địa điểm.');
      return;
    }
    const proposed =
      changeKind === 'change'
        ? {
            schedule: {
              shootDate: dateAtVietnamMidnight(requestedDate),
              startTime: requestedStartTime,
              endTime: requestedEndTime,
              location: requestedLocation.trim(),
            },
          }
        : {};
    const updated = await runAction('change.request', {
      kind: changeKind,
      note: changeNote.trim(),
      proposed,
    });
    if (updated) setChangeNote('');
  };

  const proposeChange = async () => {
    if (!workflow?.changeRequest) return;
    const request = workflow.changeRequest;
    const payable = Number(proposedPayable);
    if (!Number.isSafeInteger(payable) || payable < 0) {
      setError('Nhập số tiền phải trả sau khi áp dụng đề xuất.');
      return;
    }
    if (
      request.kind === 'change' &&
      !validFutureSchedule(proposalDate, proposalStartTime, proposalEndTime, proposalLocation)
    ) {
      setError('Chọn ngày và khung giờ đề xuất trong tương lai, đồng thời nhập địa điểm.');
      return;
    }
    const proposed =
      request.kind === 'cancel'
        ? { finalPayable: payable }
        : {
            schedule: {
              shootDate: dateAtVietnamMidnight(proposalDate),
              startTime: proposalStartTime,
              endTime: proposalEndTime,
              location: proposalLocation.trim(),
            },
            finalPayable: payable,
          };
    await runAction('change.propose', {
      requestId: request._id,
      proposed,
      finalPayable: payable,
      terms: splitLines(proposalTerms),
    });
  };

  const updateMember = (index: number, patch: Partial<MemberInput>) => {
    setMemberDraft((current) =>
      current.map((member, row) => (row === index ? { ...member, ...patch } : member)),
    );
  };
  const setMemberCostumeSize = (index: number, costumeId: string, size: string) => {
    const member = memberDraft[index];
    if (!member) return;
    const costumeSizes = member.costumeSizes.filter((item) => item.costumeId !== costumeId);
    if (size) costumeSizes.push({ costumeId, size });
    updateMember(index, { costumeSizes });
  };
  const updateAllocation = (index: number, patch: Partial<AllocationInput>) => {
    setAllocationRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              ...patch,
              ...(patch.costumeId && patch.costumeId !== row.costumeId ? { size: '' } : {}),
            }
          : row,
      ),
    );
  };

  const timeline = useMemo(
    () =>
      [
        ...(legacyBooking?.events ?? []).map((event) => ({
          action: 'booking',
          message: event.message,
          at: event.at,
        })),
        ...(workflow?.events ?? []),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [legacyBooking?.events, workflow?.events],
  );

  const DetailContainer = customer ? 'section' : 'main';
  if (loading)
    return (
      <DetailContainer
        className={customer ? 'customer-orders customer-orders--detail' : 'mx-auto max-w-5xl p-6'}
        role="status"
      >
        Đang tải hồ sơ dịch vụ…
      </DetailContainer>
    );
  if (!record || !booking || !workflow)
    return (
      <DetailContainer
        className={
          customer ? 'customer-orders customer-orders--detail' : 'mx-auto max-w-5xl space-y-4 p-6'
        }
      >
        <Link className={customer ? 'customer-link' : 'text-primary'} to={backPath}>
          ← Quay lại danh sách
        </Link>
        <p
          role="alert"
          className={
            customer
              ? 'customer-order-error'
              : 'rounded-xl border border-destructive/30 p-4 text-destructive'
          }
        >
          {error || 'Không tải được hồ sơ dịch vụ.'}
        </p>
        <Button variant="outline" onClick={() => void load()}>
          Thử lại
        </Button>
      </DetailContainer>
    );

  const allocationWindow = workflow.quote
    ? photographerWindow(workflow.quote.proposedSchedule)
    : null;
  const allocationReady =
    !!allocationWindow &&
    allocationAvailability?.key ===
      availabilityKey(
        allocationWindow.startAt,
        allocationWindow.endAt,
        booking._id,
        workflow.version,
      ) &&
    selectedPhotographerIds.every((id) =>
      allocationAvailability.rows.some((row) => row._id === id && row.status === 'available'),
    );
  const quoteAccepted = !!workflow.quote?.acceptedAt;
  const quoteCanBeAccepted =
    isClient && booking.status === 'approved' && !!workflow.quote && !quoteAccepted;
  const canConfirmResources =
    isAdmin &&
    quoteAccepted &&
    !workflow.resources?.scheduleId &&
    effectivePayment.netReceived >= (workflow.quote?.depositRequired ?? Number.POSITIVE_INFINITY) &&
    ['awaiting_deposit', 'ready_to_confirm'].includes(workflow.lifecycle);
  const canUpdateProgress =
    (isAdmin || (isPhotographer && workflow.resources?.photographers.includes(user?._id ?? ''))) &&
    !!workflow.resources?.scheduleId;
  const nextProgress =
    workflow.lifecycle === 'confirmed'
      ? 'shooting'
      : workflow.lifecycle === 'shooting'
        ? 'editing'
        : workflow.lifecycle === 'revision_requested'
          ? 'editing'
          : workflow.lifecycle === 'editing'
            ? 'delivered'
            : null;
  const quoteLinesExist = quoteLines.length > 0;
  const scheduleReleased = workflow.lifecycle === 'cancelled';
  const proposedChangeSchedule = workflow.changeRequest?.proposed?.schedule;

  if (
    customer &&
    isClient &&
    booking.status === 'pending' &&
    workflow.lifecycle === 'intake' &&
    !workflow.quote
  ) {
    const sameDay =
      vnDateInput(booking.startAt) && vnDateInput(booking.startAt) === vnDateInput(booking.endAt);
    const requestedTime = sameDay
      ? `${formatIntakeDateTime(booking.startAt)}–${vnTimeInput(booking.endAt)}`
      : `${formatIntakeDateTime(booking.startAt)} – ${formatIntakeDateTime(booking.endAt)}`;
    return (
      <CustomerBookingIntake
        booking={booking}
        title={title}
        assignedPhotographerName={workflow.assignedPhotographer?.name}
        assignedSupportPhotographerNames={workflow.assignedSupportPhotographers?.map(
          (row) => row.name,
        )}
        sentAt={legacyBooking?.createdAt || workflow.createdAt}
        requestedTime={requestedTime}
        note={booking.note || legacyBooking?.note}
        reviewNote={booking.reviewNote || legacyBooking?.reviewNote}
        timeline={timeline}
        formatDateTime={formatIntakeDateTime}
        backPath={backPath}
        error={error}
        busy={busy !== ''}
        onReload={() => void load()}
      />
    );
  }

  return (
    <DetailContainer
      className={
        customer
          ? 'customer-orders customer-orders--detail'
          : 'mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className={
            customer
              ? 'customer-link'
              : 'inline-flex min-h-10 items-center text-sm font-medium text-primary'
          }
          to={backPath}
        >
          ← Quay lại danh sách
        </Link>
        <Button variant="outline" disabled={busy !== ''} onClick={() => void load()}>
          Tải lại hồ sơ
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className={
            customer
              ? 'customer-order-error'
              : 'rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive'
          }
        >
          {error}
        </p>
      )}

      <header
        className={
          customer ? 'customer-order-surface' : 'space-y-3 rounded-2xl border bg-card p-5 sm:p-7'
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p
              className={
                customer
                  ? 'customer-order-meta'
                  : 'text-xs font-semibold uppercase tracking-[0.14em] text-primary'
              }
            >
              Hồ sơ đặt dịch vụ
            </p>
            <h1 className={customer ? 'customer-page-title mt-1' : 'mt-1 text-2xl font-bold'}>
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {booking.packageName} · {booking.members} thành viên
            </p>
          </div>
          <div className="space-y-1 text-right">
            <span
              className={
                customer
                  ? 'customer-status'
                  : 'inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium'
              }
            >
              {lifecycleLabels[workflow.lifecycle]}
            </span>
            <p className={customer ? 'customer-caption' : 'text-xs text-muted-foreground'}>
              Phiên bản hồ sơ {workflow.version}
            </p>
          </div>
        </div>
        {booking.school && <p className="text-sm text-muted-foreground">{booking.school}</p>}
        <div
          className={
            customer
              ? 'customer-order-summary customer-order-summary--four'
              : 'grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4'
          }
        >
          {(isAdmin || isClient || isPhotographer) && (
            <p>
              <span className="text-muted-foreground">Người liên hệ: </span>
              {booking.contactName || 'Chưa có'}
            </p>
          )}
          {(isAdmin || isClient || isPhotographer) && (
            <p>
              <span className="text-muted-foreground">Điện thoại: </span>
              {booking.phone || 'Chưa có'}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Số lượng lớp: </span>
            {booking.members}
          </p>
          <p>
            <span className="text-muted-foreground">Thời gian lớp đề xuất: </span>
            {formatDateTime(booking.startAt)} – {formatDateTime(booking.endAt)}
          </p>
          <p>
            <span className="text-muted-foreground">Địa điểm mong muốn: </span>
            {booking.location}
          </p>
          <p>
            <span className="text-muted-foreground">Yêu cầu gửi lúc: </span>
            {formatDateTime(legacyBooking?.createdAt || workflow.createdAt)}
          </p>
        </div>
        {booking.status === 'pending' && (
          <p
            className={
              customer ? 'customer-order-notice' : 'rounded-lg bg-amber-500/10 p-3 text-sm'
            }
          >
            Yêu cầu đang chờ studio xem xét. Thời gian đề xuất chưa giữ lịch.
          </p>
        )}
        {booking.status === 'approved' && (
          <p
            className={
              customer ? 'customer-order-notice' : 'rounded-lg bg-emerald-600/10 p-3 text-sm'
            }
          >
            Studio đã duyệt tiếp nhận yêu cầu. Lịch chỉ được giữ sau khi khách đồng ý báo giá, đặt
            cọc và studio xác nhận nguồn lực.
          </p>
        )}
        {booking.status === 'rejected' && (
          <p
            className={
              customer ? 'customer-order-inset' : 'rounded-lg bg-destructive/10 p-3 text-sm'
            }
          >
            Studio đã từ chối yêu cầu này.
          </p>
        )}
        {booking.status === 'cancelled' && (
          <p className={customer ? 'customer-order-notice' : 'rounded-lg bg-muted p-3 text-sm'}>
            {booking.cancellationReason || 'Yêu cầu đã được hủy.'}
            {booking.cancelledAt && <> Hủy lúc {formatDateTime(booking.cancelledAt)}.</>}
          </p>
        )}
      </header>

      <BookingPhotographer
        record={record!}
        admin={isAdmin}
        busy={busy !== ''}
        onAssign={(photographerIds) => runAction('photographer.assign', { photographerIds })}
      />

      {isPhotographer && !workflow.resources?.scheduleId && workflow.proposedSchedule && (
        <section className="space-y-2 rounded-2xl border p-5">
          <h2 className="font-semibold">Lịch dự kiến studio</h2>
          <p>
            {formatDateOnly(workflow.proposedSchedule.shootDate)} ·{' '}
            {workflow.proposedSchedule.startTime}–{workflow.proposedSchedule.endTime}
          </p>
          <p>{workflow.proposedSchedule.location}</p>
          <p className="text-sm text-muted-foreground">
            Lịch dự kiến chưa giữ giờ; admin sẽ kiểm tra lại khi xác nhận.
          </p>
        </section>
      )}

      {(isAdmin || isClient) && (
        <BookingCostumeDetails
          booking={booking}
          admin={isAdmin && !workflow.resources?.scheduleId}
          onReleased={load}
        />
      )}

      {(isAdmin || isClient || isPhotographer) && (booking.note || legacyBooking?.note) && (
        <section className={customer ? 'customer-order-surface' : 'rounded-2xl border p-5'}>
          <h2 className={customer ? 'customer-section-title' : 'font-semibold'}>
            Thông tin khách đã gửi
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{booking.note || legacyBooking?.note}</p>
        </section>
      )}

      {isAdmin && booking.status === 'pending' && (
        <section
          className={customer ? 'customer-order-surface' : 'space-y-3 rounded-2xl border p-5'}
        >
          <div>
            <h2 className={customer ? 'customer-section-title' : 'font-semibold'}>
              Xét duyệt yêu cầu ban đầu
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Duyệt chỉ mở bước báo giá; thao tác này chưa xác nhận lịch và chưa thu tiền.
            </p>
          </div>
          <Field label="Phản hồi cho khách">
            <Textarea
              maxLength={2000}
              rows={3}
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy !== '' || !reviewNote.trim()}
              onClick={() => void submitReview('approved')}
            >
              Duyệt yêu cầu
            </Button>
            <Button
              variant="outline"
              disabled={busy !== '' || !reviewNote.trim()}
              onClick={() => void submitReview('rejected')}
            >
              Từ chối
            </Button>
          </div>
        </section>
      )}

      {legacyBooking?.reviewNote && (
        <section className={customer ? 'customer-order-surface' : 'rounded-2xl border p-5'}>
          <h2 className={customer ? 'customer-section-title' : 'font-semibold'}>
            Phản hồi ban đầu của studio
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{legacyBooking.reviewNote}</p>
        </section>
      )}

      {canQuote && (
        <section
          className={
            customer ? 'customer-order-surface' : 'space-y-5 rounded-2xl border p-5 sm:p-6'
          }
        >
          <div>
            <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
              Lập báo giá và đề xuất lịch
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Khách sẽ cần đồng ý đúng phiên bản này trước khi studio ghi nhận cọc hoặc giữ nguồn
              lực.
            </p>
          </div>
          <div className="space-y-3">
            {quoteLines.map((line, index) => (
              <div
                key={index}
                className={
                  customer
                    ? 'customer-order-summary customer-order-inset'
                    : 'grid gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_7rem_9rem_auto] sm:items-end'
                }
              >
                <Field label={`Dịch vụ ${index + 1}`}>
                  <Input
                    maxLength={160}
                    value={line.label}
                    onChange={(event) =>
                      setQuoteLines((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, label: event.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Số lượng">
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={line.quantity}
                    onChange={(event) =>
                      setQuoteLines((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, quantity: event.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Đơn giá (đ) ">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={line.unitPrice}
                    onChange={(event) =>
                      setQuoteLines((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, unitPrice: event.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  disabled={quoteLines.length <= 1}
                  onClick={() =>
                    setQuoteLines((current) => current.filter((_, rowIndex) => rowIndex !== index))
                  }
                >
                  Bỏ dòng
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setQuoteLines((current) => [
                  ...current,
                  { label: '', quantity: '1', unitPrice: '0' },
                ])
              }
            >
              Thêm dòng dịch vụ
            </Button>
          </div>
          <div
            className={
              customer
                ? 'customer-order-summary customer-order-summary--four customer-order-inset'
                : 'grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4'
            }
          >
            <Field label="Tiền đặt cọc (đ)">
              <Input
                type="number"
                min={1}
                step={1}
                value={depositRequired}
                onChange={(event) => setDepositRequired(event.target.value)}
              />
            </Field>
            <Field label="Ngày chụp">
              <Input
                type="date"
                value={quoteDate}
                onChange={(event) => setQuoteDate(event.target.value)}
              />
            </Field>
            <Field label="Bắt đầu">
              <Input
                type="time"
                value={quoteStartTime}
                onChange={(event) => setQuoteStartTime(event.target.value)}
              />
            </Field>
            <Field label="Kết thúc">
              <Input
                type="time"
                value={quoteEndTime}
                onChange={(event) => setQuoteEndTime(event.target.value)}
              />
            </Field>
            <Field
              label="Địa điểm"
              className={customer ? 'customer-order-span-full' : 'sm:col-span-2'}
            >
              <Input
                maxLength={300}
                value={quoteLocation}
                onChange={(event) => setQuoteLocation(event.target.value)}
              />
            </Field>
            <Field label="Bàn giao sau (ngày)">
              <Input
                type="number"
                min={1}
                max={365}
                value={deliveryDays}
                onChange={(event) => setDeliveryDays(event.target.value)}
              />
            </Field>
            <div
              className={
                customer
                  ? 'customer-order-span-full'
                  : 'flex items-end justify-between sm:col-span-2 lg:col-span-4'
              }
            >
              <span className="text-sm text-muted-foreground">Tổng báo giá</span>
              <strong className="text-xl">
                {customer ? (
                  <CustomerPrice amount={amountForDisplay(estimatedQuoteTotal)} />
                ) : (
                  money(estimatedQuoteTotal)
                )}
              </strong>
            </div>
          </div>
          <div className={customer ? 'customer-order-summary' : 'grid gap-4 md:grid-cols-2'}>
            <Field label="Nội dung hậu kỳ, mỗi dòng một điều khoản">
              <Textarea
                rows={4}
                maxLength={5000}
                value={editingTerms}
                onChange={(event) => setEditingTerms(event.target.value)}
                placeholder="Chọn ảnh, chỉnh màu, số vòng chỉnh sửa…"
              />
            </Field>
            <Field label="Điều khoản dịch vụ, mỗi dòng một điều khoản">
              <Textarea
                rows={4}
                maxLength={5000}
                value={quoteTerms}
                onChange={(event) => setQuoteTerms(event.target.value)}
                placeholder="Phạm vi công việc, thời hạn, lưu ý…"
              />
            </Field>
          </div>
          <Button
            disabled={busy !== '' || !quoteLinesExist || !estimatedQuoteTotal}
            onClick={() => void submitQuote()}
          >
            {workflow.quote ? 'Gửi phiên bản báo giá mới' : 'Gửi báo giá cho khách'}
          </Button>
        </section>
      )}

      {workflow.quote && (
        <section
          className={
            customer ? 'customer-order-surface' : 'space-y-4 rounded-2xl border p-5 sm:p-6'
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
                Báo giá phiên bản {workflow.quote.version}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {workflow.quote.acceptedAt
                  ? `Khách đồng ý ${formatDateTime(workflow.quote.acceptedAt)}`
                  : 'Đang chờ khách xem xét'}
              </p>
            </div>
            <span
              className={customer ? 'customer-status' : 'rounded-full bg-muted px-3 py-1 text-sm'}
            >
              {workflow.quote.acceptedAt ? 'Đã được khách đồng ý' : 'Chưa được đồng ý'}
            </span>
          </div>
          <div
            className={customer ? 'customer-order-table-wrap' : 'overflow-x-auto rounded-xl border'}
          >
            <table
              role={customer ? 'table' : undefined}
              aria-label={customer ? 'Chi tiết báo giá' : undefined}
              className={
                customer ? 'customer-order-table' : 'w-full min-w-[32rem] text-left text-sm'
              }
            >
              <thead
                role={customer ? 'rowgroup' : undefined}
                className={customer ? undefined : 'bg-muted/50'}
              >
                <tr role={customer ? 'row' : undefined}>
                  <th role={customer ? 'columnheader' : undefined} className="p-3">
                    Nội dung
                  </th>
                  <th role={customer ? 'columnheader' : undefined} className="p-3 text-right">
                    Số lượng
                  </th>
                  <th role={customer ? 'columnheader' : undefined} className="p-3 text-right">
                    Đơn giá
                  </th>
                  <th role={customer ? 'columnheader' : undefined} className="p-3 text-right">
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody role={customer ? 'rowgroup' : undefined}>
                {workflow.quote.lines.map((line, index) => (
                  <tr
                    key={`${line.label}-${index}`}
                    role={customer ? 'row' : undefined}
                    className="border-t"
                  >
                    <td
                      role={customer ? 'cell' : undefined}
                      data-label={customer ? 'Nội dung' : undefined}
                      className="p-3"
                    >
                      {line.label}
                    </td>
                    <td
                      role={customer ? 'cell' : undefined}
                      data-label={customer ? 'Số lượng' : undefined}
                      className="p-3 text-right"
                    >
                      {line.quantity}
                    </td>
                    <td
                      role={customer ? 'cell' : undefined}
                      data-label={customer ? 'Đơn giá' : undefined}
                      className="p-3 text-right"
                    >
                      {customer ? (
                        <CustomerPrice amount={amountForDisplay(line.unitPrice)} />
                      ) : (
                        money(line.unitPrice)
                      )}
                    </td>
                    <td
                      role={customer ? 'cell' : undefined}
                      data-label={customer ? 'Thành tiền' : undefined}
                      className="p-3 text-right"
                    >
                      {customer ? (
                        <CustomerPrice amount={amountForDisplay(line.quantity * line.unitPrice)} />
                      ) : (
                        money(line.quantity * line.unitPrice)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot
                role={customer ? 'rowgroup' : undefined}
                className={customer ? undefined : 'border-t bg-muted/20'}
              >
                <tr role={customer ? 'row' : undefined}>
                  <th
                    role={customer ? 'rowheader' : undefined}
                    colSpan={3}
                    className="p-3 text-right"
                  >
                    Tổng cộng
                  </th>
                  <th role={customer ? 'cell' : undefined} className="p-3 text-right">
                    {customer ? (
                      <CustomerPrice amount={amountForDisplay(totalQuote)} emphasis="total" />
                    ) : (
                      money(totalQuote)
                    )}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
          <div
            className={
              customer
                ? 'customer-order-summary customer-order-summary--four'
                : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
            }
          >
            <div className={customer ? 'customer-order-inset' : 'rounded-xl bg-muted/30 p-3'}>
              <p className={customer ? 'customer-caption' : 'text-xs text-muted-foreground'}>
                Tiền cọc cần ghi nhận
              </p>
              <p className="mt-1 font-semibold">
                {customer ? (
                  <CustomerPrice amount={amountForDisplay(workflow.quote.depositRequired)} />
                ) : (
                  money(workflow.quote.depositRequired)
                )}
              </p>
            </div>
            <div className={customer ? 'customer-order-inset' : 'rounded-xl bg-muted/30 p-3'}>
              <p className={customer ? 'customer-caption' : 'text-xs text-muted-foreground'}>
                Ngày chụp
              </p>
              <p className="mt-1 font-semibold">
                {formatDateOnly(workflow.quote.proposedSchedule.shootDate)}
              </p>
            </div>
            <div className={customer ? 'customer-order-inset' : 'rounded-xl bg-muted/30 p-3'}>
              <p className={customer ? 'customer-caption' : 'text-xs text-muted-foreground'}>
                Thời gian
              </p>
              <p className="mt-1 font-semibold">
                {workflow.quote.proposedSchedule.startTime} –{' '}
                {workflow.quote.proposedSchedule.endTime}
              </p>
            </div>
            <div className={customer ? 'customer-order-inset' : 'rounded-xl bg-muted/30 p-3'}>
              <p className={customer ? 'customer-caption' : 'text-xs text-muted-foreground'}>
                Bàn giao dự kiến
              </p>
              <p className="mt-1 font-semibold">
                {workflow.quote.delivery.targetDays} ngày (
                {formatDateOnly(workflow.quote.delivery.targetDate)})
              </p>
            </div>
          </div>
          <p className="text-sm">
            <span className="text-muted-foreground">Địa điểm: </span>
            {workflow.quote.proposedSchedule.location}
          </p>
          {!!workflow.quote.editingTerms.length && (
            <div>
              <h3 className={customer ? 'customer-order-title' : 'text-sm font-semibold'}>
                Nội dung hậu kỳ
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {workflow.quote.editingTerms.map((term, index) => (
                  <li key={index}>{term}</li>
                ))}
              </ul>
            </div>
          )}
          {!!workflow.quote.terms.length && (
            <div>
              <h3 className={customer ? 'customer-order-title' : 'text-sm font-semibold'}>
                Điều khoản
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {workflow.quote.terms.map((term, index) => (
                  <li key={index}>{term}</li>
                ))}
              </ul>
            </div>
          )}
          {quoteCanBeAccepted && (
            <div
              className={
                customer
                  ? 'customer-order-inset'
                  : 'rounded-xl border border-primary/20 bg-primary/5 p-4'
              }
            >
              <p className="text-sm">
                Khi đồng ý, bạn xác nhận báo giá phiên bản {workflow.quote.version}, tiền cọc và
                lịch đề xuất. Studio sẽ chỉ giữ lịch sau khi ghi nhận đủ tiền cọc và xác nhận nhân
                sự, trang phục.
              </p>
              <Button
                className="mt-3"
                disabled={busy !== ''}
                onClick={() => void runAction('quote.accept')}
              >
                Tôi đồng ý báo giá phiên bản {workflow.quote?.version}
              </Button>
            </div>
          )}
          {isClient &&
            workflow.quote.acceptedAt &&
            workflow.lifecycle === 'accepted' &&
            effectivePayment.totalDue > 0 && (
              <p
                className={
                  customer ? 'customer-order-notice' : 'rounded-xl bg-amber-500/10 p-3 text-sm'
                }
              >
                Bạn đã nghiệm thu bản bàn giao. Hồ sơ sẽ hoàn tất sau khi kế toán đối chiếu đủ số
                tiền còn lại (
                {customer ? (
                  <CustomerPrice amount={amountForDisplay(effectivePayment.totalDue)} />
                ) : (
                  money(effectivePayment.totalDue)
                )}
                ).
              </p>
            )}
          {canSeeFinancials && workflow.quote.paymentInstructions && workflow.paymentReady && (
            <PaymentInstructionsPanel instructions={workflow.quote.paymentInstructions} />
          )}
          {canSeeFinancials && !workflow.paymentReady && (
            <p
              className={
                customer ? 'customer-order-notice' : 'rounded-xl bg-amber-500/10 p-3 text-sm'
              }
            >
              Studio chưa cấu hình hướng dẫn chuyển khoản. Hãy liên hệ studio để nhận thông tin
              thanh toán.
            </p>
          )}
          {canSeeFinancials && workflow.quoteHistory.length > 0 && (
            <details className={customer ? 'customer-order-surface' : 'rounded-xl border p-4'}>
              <summary className="cursor-pointer text-sm font-semibold">
                Các phiên bản báo giá trước
              </summary>
              <ul className="mt-3 space-y-2 text-sm">
                {workflow.quoteHistory.map((old) => (
                  <li
                    key={old.version}
                    className="flex flex-wrap justify-between gap-2 border-t pt-2"
                  >
                    <span>
                      Phiên bản {old.version}
                      {old.acceptedAt ? ` · Được đồng ý ${formatDateTime(old.acceptedAt)}` : ''}
                    </span>
                    <span>
                      {customer ? (
                        <CustomerPrice amount={amountForDisplay(old.total)} />
                      ) : (
                        money(old.total)
                      )}{' '}
                      · Cọc{' '}
                      {customer ? (
                        <CustomerPrice amount={amountForDisplay(old.depositRequired)} />
                      ) : (
                        money(old.depositRequired)
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {canSeeFinancials && workflow.quote && (
        <section
          className={
            customer ? 'customer-order-surface' : 'space-y-4 rounded-2xl border p-5 sm:p-6'
          }
        >
          <div>
            <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
              Thanh toán và đối soát
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Các khoản dưới đây do Admin hoặc Kế toán ghi nhận sau khi kiểm tra giao dịch thực tế.
            </p>
          </div>
          {customer ? (
            <CustomerPriceBreakdown
              items={[
                {
                  label: 'Cọc cần có',
                  value: (
                    <CustomerPrice amount={amountForDisplay(effectivePayment.requiredDeposit)} />
                  ),
                },
                {
                  label: 'Đã thu',
                  value: (
                    <CustomerPrice amount={amountForDisplay(effectivePayment.totalReceived)} />
                  ),
                },
                {
                  label: 'Đã hoàn',
                  value: (
                    <CustomerPrice amount={amountForDisplay(effectivePayment.totalRefunded)} />
                  ),
                },
                {
                  label: effectivePayment.refundDue > 0 ? 'Cần hoàn' : 'Còn thu',
                  value: (
                    <CustomerPrice
                      amount={amountForDisplay(
                        effectivePayment.refundDue > 0
                          ? effectivePayment.refundDue
                          : effectivePayment.totalDue,
                      )}
                      emphasis="total"
                    />
                  ),
                },
              ]}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Cọc cần có</p>
                <p className="mt-1 font-semibold">{money(effectivePayment.requiredDeposit)}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Đã thu</p>
                <p className="mt-1 font-semibold">{money(effectivePayment.totalReceived)}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Đã hoàn</p>
                <p className="mt-1 font-semibold">{money(effectivePayment.totalRefunded)}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  {effectivePayment.refundDue > 0 ? 'Cần hoàn' : 'Còn thu'}
                </p>
                <p className="mt-1 font-semibold">
                  {money(
                    effectivePayment.refundDue > 0
                      ? effectivePayment.refundDue
                      : effectivePayment.totalDue,
                  )}
                </p>
              </div>
            </div>
          )}
          {isAccountant && (
            <p className="text-sm text-muted-foreground">
              Kế toán chỉ xem và ghi nhận khoản thu, cọc, thanh toán còn lại hoặc hoàn tiền trong hồ
              sơ này.
            </p>
          )}
          {effectivePayment.entries.length > 0 ? (
            <div
              className={
                customer ? 'customer-order-table-wrap' : 'overflow-x-auto rounded-xl border'
              }
            >
              <table
                role={customer ? 'table' : undefined}
                aria-label={customer ? 'Lịch sử thanh toán' : undefined}
                className={
                  customer ? 'customer-order-table' : 'w-full min-w-[34rem] text-left text-sm'
                }
              >
                <thead
                  role={customer ? 'rowgroup' : undefined}
                  className={customer ? undefined : 'bg-muted/50'}
                >
                  <tr role={customer ? 'row' : undefined}>
                    <th role={customer ? 'columnheader' : undefined} className="p-3">
                      Loại
                    </th>
                    <th role={customer ? 'columnheader' : undefined} className="p-3">
                      Ngày
                    </th>
                    <th role={customer ? 'columnheader' : undefined} className="p-3">
                      Cách thức
                    </th>
                    <th role={customer ? 'columnheader' : undefined} className="p-3">
                      Mã tham chiếu
                    </th>
                    <th role={customer ? 'columnheader' : undefined} className="p-3 text-right">
                      Số tiền
                    </th>
                  </tr>
                </thead>
                <tbody role={customer ? 'rowgroup' : undefined}>
                  {effectivePayment.entries.map((entry) => (
                    <tr key={entry._id} role={customer ? 'row' : undefined} className="border-t">
                      <td
                        role={customer ? 'cell' : undefined}
                        data-label={customer ? 'Loại' : undefined}
                        className="p-3"
                      >
                        {entry.kind === 'deposit'
                          ? 'Đặt cọc'
                          : entry.kind === 'refund'
                            ? 'Hoàn tiền'
                            : 'Thanh toán còn lại'}
                      </td>
                      <td
                        role={customer ? 'cell' : undefined}
                        data-label={customer ? 'Ngày' : undefined}
                        className="p-3"
                      >
                        {formatDateTime(entry.receivedAt)}
                      </td>
                      <td
                        role={customer ? 'cell' : undefined}
                        data-label={customer ? 'Cách thức' : undefined}
                        className="p-3"
                      >
                        {methodLabels[entry.method] ?? entry.method}
                      </td>
                      <td
                        role={customer ? 'cell' : undefined}
                        data-label={customer ? 'Mã tham chiếu' : undefined}
                        className="p-3"
                      >
                        {entry.reference || '—'}
                      </td>
                      <td
                        role={customer ? 'cell' : undefined}
                        data-label={customer ? 'Số tiền' : undefined}
                        className="p-3 text-right"
                      >
                        {customer ? (
                          <CustomerPrice amount={amountForDisplay(entry.amount)} />
                        ) : (
                          money(entry.amount)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p
              className={
                customer
                  ? 'customer-order-inset'
                  : 'rounded-xl border p-4 text-sm text-muted-foreground'
              }
            >
              Chưa có khoản thanh toán nào được ghi nhận.
            </p>
          )}
          {isPaymentEntryAvailable && availablePaymentKinds.length > 0 && (
            <div
              className={
                customer
                  ? 'customer-order-summary customer-order-summary--four customer-order-inset'
                  : 'grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4'
              }
            >
              <Field label="Loại giao dịch">
                <OrderSelect
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                  value={selectedPaymentKind}
                  onChange={(event) => setPaymentKind(event.target.value as typeof paymentKind)}
                >
                  {availablePaymentKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind === 'deposit'
                        ? 'Đặt cọc'
                        : kind === 'balance'
                          ? 'Thanh toán còn lại'
                          : 'Hoàn tiền'}
                    </option>
                  ))}
                </OrderSelect>
              </Field>
              <Field label="Số tiền (đ)">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                />
              </Field>
              <Field label="Phương thức">
                <OrderSelect
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="bank_transfer">Chuyển khoản</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="other">Khác</option>
                </OrderSelect>
              </Field>
              <Field label="Mã giao dịch / ghi chú">
                <Input
                  maxLength={160}
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                />
              </Field>
              <div
                className={customer ? 'customer-order-span-full' : 'sm:col-span-2 lg:col-span-4'}
              >
                <Button
                  disabled={busy !== '' || !paymentAmount}
                  onClick={() => void recordPayment()}
                >
                  Ghi nhận giao dịch
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {(isAdmin || isClient) && quoteAccepted && !workflow.resources?.scheduleId && (
        <section
          className={
            customer ? 'customer-order-surface' : 'space-y-4 rounded-2xl border p-5 sm:p-6'
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
                Thông tin thành viên lớp
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Đã khai báo {workflow.members.length} / {booking.members} thành viên. Danh sách chỉ
                hiển thị trong hồ sơ có quyền.
              </p>
            </div>
            <span
              className={customer ? 'customer-status' : 'rounded-full bg-muted px-3 py-1 text-sm'}
            >
              Chưa giữ lịch
            </span>
          </div>
          {canEditMembers && (
            <div
              className={
                customer
                  ? 'customer-order-inset customer-order-stack'
                  : 'space-y-4 rounded-xl border bg-muted/10 p-4'
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className={customer ? 'customer-order-title' : 'font-semibold'}>
                    Chỉnh sửa danh sách
                  </h3>
                  <p className={customer ? 'customer-caption' : 'text-xs text-muted-foreground'}>
                    Lưu danh sách trước khi studio xác nhận lịch. Hãy đóng đường dẫn công khai trước
                    khi chỉnh sửa.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={memberDraft.length >= booking.members}
                  onClick={() => setMemberDraft((current) => [...current, defaultMemberInput()])}
                >
                  Thêm thành viên
                </Button>
              </div>
              {memberDraft.length === 0 && (
                <p
                  className={
                    customer
                      ? 'customer-order-inset'
                      : 'rounded-lg border p-3 text-sm text-muted-foreground'
                  }
                >
                  Chưa có thành viên. Thêm trực tiếp hoặc mở đường dẫn để từng bạn tự nhập thông
                  tin.
                </p>
              )}
              {memberDraft.map((member, index) => (
                <article
                  key={member._id ?? `new-${index}`}
                  className={
                    customer ? 'customer-order-surface' : 'space-y-3 rounded-xl border bg-card p-4'
                  }
                >
                  <div
                    className={
                      customer
                        ? 'customer-order-actions'
                        : 'flex items-center justify-between gap-2'
                    }
                  >
                    <h4 className={customer ? 'customer-caption' : 'font-medium'}>
                      Thành viên {index + 1}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setMemberDraft((current) => current.filter((_, row) => row !== index))
                      }
                    >
                      Xóa
                    </Button>
                  </div>
                  <div
                    className={
                      customer
                        ? 'customer-order-summary'
                        : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
                    }
                  >
                    <Field label="Họ tên">
                      <Input
                        maxLength={100}
                        value={member.name}
                        onChange={(event) => updateMember(index, { name: event.target.value })}
                      />
                    </Field>
                    <Field label="Giới tính">
                      <OrderSelect
                        className="min-h-11 w-full rounded-lg border bg-background px-3"
                        value={member.gender}
                        onChange={(event) => updateMember(index, { gender: event.target.value })}
                      >
                        <option value="">Chưa khai báo</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </OrderSelect>
                    </Field>
                    <Field label="Số liên hệ">
                      <Input
                        maxLength={80}
                        value={member.contact}
                        onChange={(event) => updateMember(index, { contact: event.target.value })}
                      />
                    </Field>
                    <Field label="Chiều cao (cm)">
                      <Input
                        type="number"
                        min={1}
                        max={250}
                        value={member.height}
                        onChange={(event) => updateMember(index, { height: event.target.value })}
                      />
                    </Field>
                    <Field label="Cân nặng (kg)">
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={member.weight}
                        onChange={(event) => updateMember(index, { weight: event.target.value })}
                      />
                    </Field>
                    {workflow.allowedCostumes.map((costume) => (
                      <Field key={costume.costumeId} label={`Size · ${costume.name}`}>
                        <OrderSelect
                          className="min-h-11 w-full rounded-lg border bg-background px-3"
                          value={
                            member.costumeSizes.find((item) => item.costumeId === costume.costumeId)
                              ?.size ?? ''
                          }
                          onChange={(event) =>
                            setMemberCostumeSize(index, costume.costumeId, event.target.value)
                          }
                        >
                          <option value="">Chưa chọn</option>
                          {costume.sizes.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </OrderSelect>
                      </Field>
                    ))}
                  </div>
                </article>
              ))}
              {memberError && (
                <p
                  role="alert"
                  className={customer ? 'customer-order-error' : 'text-sm text-destructive'}
                >
                  {memberError}
                </p>
              )}
              <Button disabled={busy !== ''} onClick={() => void submitMemberEdits()}>
                Lưu danh sách thành viên
              </Button>
            </div>
          )}
          {(isAdmin || isClient) && (
            <div
              className={
                customer
                  ? 'customer-order-inset customer-order-stack'
                  : 'space-y-3 rounded-xl border p-4'
              }
            >
              <div>
                <h3 className={customer ? 'customer-order-title' : 'font-semibold'}>
                  Đường dẫn nhập thông tin riêng
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mỗi thành viên chỉ thấy biểu mẫu của mình. Đóng hoặc tạo lại đường dẫn khi cần
                  thay đổi quyền truy cập.
                </p>
              </div>
              <p className="text-sm">
                Trạng thái: {workflow.memberEntry?.opened || linkOpen ? 'Đang mở' : 'Đã đóng'}
              </p>
              {memberUrl && (
                <div
                  className={
                    customer ? 'customer-order-actions' : 'flex flex-col gap-2 sm:flex-row'
                  }
                >
                  <Input aria-label="Đường dẫn thành viên" readOnly value={memberUrl} />
                  <Button variant="outline" onClick={() => void submitMemberLinkCopy()}>
                    Sao chép link
                  </Button>
                </div>
              )}
              {!memberUrl && workflow.memberEntry?.opened && (
                <p
                  className={
                    customer ? 'customer-order-notice' : 'rounded-lg bg-amber-500/10 p-3 text-sm'
                  }
                >
                  Link hiện đang mở nhưng mã chia sẻ chỉ hiển thị ngay sau khi tạo. Tạo link mới để
                  sao chép và vô hiệu hóa link cũ.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy !== ''} onClick={() => void openMemberLink()}>
                  {workflow.memberEntry?.opened ? 'Tạo link mới' : 'Mở link nhập thông tin'}
                </Button>
                {(workflow.memberEntry?.opened || linkOpen) && (
                  <Button
                    variant="outline"
                    disabled={busy !== ''}
                    onClick={() => void closeMemberLink()}
                  >
                    Đóng link
                  </Button>
                )}
              </div>
            </div>
          )}
          {workflow.members.length > 0 && (
            <div className={customer ? 'customer-order-summary' : 'grid gap-3 sm:grid-cols-2'}>
              {workflow.members.map((member, index) => (
                <article
                  key={member._id}
                  className={customer ? 'customer-order-surface' : 'rounded-xl border p-4'}
                >
                  <h3 className={customer ? 'customer-order-title' : 'font-semibold'}>
                    {index + 1}. {member.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {member.gender === 'male'
                      ? 'Nam'
                      : member.gender === 'female'
                        ? 'Nữ'
                        : member.gender === 'other'
                          ? 'Khác'
                          : 'Chưa khai báo'}
                    {member.height ? ` · ${member.height} cm` : ''}
                    {member.weight ? ` · ${member.weight} kg` : ''}
                  </p>
                  {member.contact && <p className="mt-1 text-sm">Liên hệ: {member.contact}</p>}
                  {member.costumeSizes.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {member.costumeSizes.map((size) => (
                        <li key={size.costumeId}>
                          {workflow.allowedCostumes.find(
                            (item) => item.costumeId === size.costumeId,
                          )?.name ?? 'Trang phục'}{' '}
                          · cỡ {size.size}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {isAdmin && canConfirmResources && workflow.quote && (
        <section
          className={
            customer ? 'customer-order-surface' : 'space-y-4 rounded-2xl border p-5 sm:p-6'
          }
        >
          <div>
            <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
              Xác nhận lịch và phân bổ nguồn lực
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lịch lấy theo báo giá khách đã đồng ý. Chọn thợ chụp đang hoạt động và khai báo số
              lượng trang phục theo từng size.
            </p>
          </div>
          <div
            className={
              customer
                ? 'customer-order-summary customer-order-inset'
                : 'grid gap-3 rounded-xl bg-muted/30 p-4 text-sm sm:grid-cols-2'
            }
          >
            <p>
              <span className="text-muted-foreground">Ngày chụp: </span>
              {formatDateOnly(workflow.quote.proposedSchedule.shootDate)}
            </p>
            <p>
              <span className="text-muted-foreground">Thời gian: </span>
              {workflow.quote.proposedSchedule.startTime} –{' '}
              {workflow.quote.proposedSchedule.endTime}
            </p>
            <p className={customer ? 'customer-order-span-full' : 'sm:col-span-2'}>
              <span className="text-muted-foreground">Địa điểm: </span>
              {workflow.quote.proposedSchedule.location}
            </p>
            <p>
              <span className="text-muted-foreground">Tiền cọc đã nhận: </span>
              {customer ? (
                <CustomerPrice amount={amountForDisplay(effectivePayment.netReceived)} />
              ) : (
                money(effectivePayment.netReceived)
              )}{' '}
              /{' '}
              {customer ? (
                <CustomerPrice amount={amountForDisplay(workflow.quote.depositRequired)} />
              ) : (
                money(workflow.quote.depositRequired)
              )}
            </p>
            <p>
              <span className="text-muted-foreground">Thành viên đã khai báo: </span>
              {workflow.members.length} / {booking.members}
            </p>
          </div>
          {workflow.members.length !== booking.members && (
            <p
              className={
                customer ? 'customer-order-notice' : 'rounded-lg bg-amber-500/10 p-3 text-sm'
              }
            >
              Cần đủ hồ sơ của {booking.members} thành viên trước khi xác nhận.
            </p>
          )}
          {photographerError && (
            <p
              role="alert"
              className={customer ? 'customer-order-error' : 'text-sm text-destructive'}
            >
              {photographerError}
            </p>
          )}
          {!workflow.assignedPhotographer && (
            <p className="text-sm text-destructive">
              Gắn thợ phụ trách ở đầu hồ sơ trước khi xác nhận lịch.
            </p>
          )}
          <PhotographerAvailabilityPicker
            {...photographerWindow(workflow.quote.proposedSchedule)}
            bookingId={booking._id}
            version={workflow.version}
            selected={selectedPhotographerIds}
            onChange={setSelectedPhotographerIds}
            primaryId={workflow.assignedPhotographer?._id}
            multiple
            onLoaded={setAllocationAvailability}
          />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className={customer ? 'customer-order-title' : 'font-medium'}>
                  Trang phục theo size và số lượng
                </h3>
                <p className={customer ? 'customer-caption' : 'text-xs text-muted-foreground'}>
                  Chọn mẫu thực tế, rồi khai báo size, số lượng và ngày nhận/trả cho lớp.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!workflow.allowedCostumes.length}
                onClick={() =>
                  setAllocationRows((current) => [
                    ...current,
                    {
                      costumeId: '',
                      size: '',
                      quantity: '1',
                      receiveDate: vnDateInput(workflow.quote!.proposedSchedule.shootDate),
                      returnDate: vnDateInput(workflow.quote!.proposedSchedule.shootDate),
                    },
                  ])
                }
              >
                Thêm dòng phân bổ
              </Button>
            </div>
            {allocationRows.map((row, index) => {
              const selected = workflow.allowedCostumes.find(
                (item) => item.costumeId === row.costumeId,
              );
              return (
                <div
                  key={index}
                  className={
                    customer
                      ? 'customer-order-summary customer-order-inset'
                      : 'grid gap-2 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end'
                  }
                >
                  <Field
                    label="Trang phục"
                    className={customer ? 'customer-order-span-full' : 'lg:col-span-2'}
                  >
                    <OrderSelect
                      className="min-h-11 w-full rounded-lg border bg-background px-3"
                      value={row.costumeId}
                      onChange={(event) =>
                        updateAllocation(index, { costumeId: event.target.value })
                      }
                    >
                      <option value="">Chọn sản phẩm kho</option>
                      {workflow.allowedCostumes.map((item) => (
                        <option key={item.costumeId} value={item.costumeId}>
                          {item.name}
                        </option>
                      ))}
                    </OrderSelect>
                  </Field>
                  <Field label="Size">
                    <OrderSelect
                      className="min-h-11 w-full rounded-lg border bg-background px-3"
                      value={row.size}
                      disabled={!selected}
                      onChange={(event) => updateAllocation(index, { size: event.target.value })}
                    >
                      <option value="">Chọn size</option>
                      {selected?.sizes.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </OrderSelect>
                  </Field>
                  <Field label="Số lượng">
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={row.quantity}
                      onChange={(event) =>
                        updateAllocation(index, { quantity: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Ngày nhận">
                    <Input
                      type="date"
                      value={row.receiveDate}
                      onChange={(event) =>
                        updateAllocation(index, { receiveDate: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Ngày trả">
                    <Input
                      type="date"
                      value={row.returnDate}
                      onChange={(event) =>
                        updateAllocation(index, { returnDate: event.target.value })
                      }
                    />
                  </Field>
                  <div
                    className={
                      customer ? 'customer-order-span-full' : 'sm:col-span-2 lg:col-span-6'
                    }
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setAllocationRows((current) =>
                          current.filter((_, rowIndex) => rowIndex !== index),
                        )
                      }
                    >
                      Xóa dòng phân bổ
                    </Button>
                  </div>
                </div>
              );
            })}
            {workflow.allowedCostumes.length === 0 && (
              <p
                className={
                  customer
                    ? 'customer-order-inset'
                    : 'rounded-lg border p-3 text-sm text-muted-foreground'
                }
              >
                Gói chưa khai báo loại trang phục. Nếu lớp cần trang phục, hãy cập nhật gói hoặc tư
                vấn trước khi xác nhận.
              </p>
            )}
          </div>
          <Button
            disabled={
              busy !== '' ||
              workflow.members.length !== booking.members ||
              !workflow.assignedPhotographer ||
              !allocationReady ||
              !selectedPhotographerIds.length ||
              !effectivePayment.netReceived ||
              effectivePayment.netReceived < workflow.quote.depositRequired
            }
            onClick={() => void submitAllocation()}
          >
            Kiểm tra và giữ lịch
          </Button>
        </section>
      )}

      {workflow.resources?.scheduleId && (isAdmin || isClient || isPhotographer) && (
        <section
          className={
            customer ? 'customer-order-surface' : 'space-y-4 rounded-2xl border p-5 sm:p-6'
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
                {scheduleReleased ? 'Lịch đã hủy' : 'Lịch và nguồn lực đã xác nhận'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Mã lịch {workflow.resources.scheduleId}
                {scheduleReleased ? ' · nguồn lực đã được giải phóng' : ''}
              </p>
            </div>
            <span
              className={
                customer
                  ? 'customer-status'
                  : `rounded-full px-3 py-1 text-sm ${scheduleReleased ? 'bg-muted' : 'bg-emerald-600/10'}`
              }
            >
              {scheduleReleased ? 'Đã giải phóng' : 'Đã giữ lịch'}
            </span>
          </div>
          {workflow.resources.scheduleDetails && (
            <div
              className={customer ? 'customer-order-summary' : 'grid gap-2 text-sm sm:grid-cols-2'}
            >
              <p>
                <span className="text-muted-foreground">Ngày: </span>
                {formatDateOnly(workflow.resources.scheduleDetails.shootDate)}
              </p>
              <p>
                <span className="text-muted-foreground">Thời gian: </span>
                {workflow.resources.scheduleDetails.startTime} –{' '}
                {workflow.resources.scheduleDetails.endTime}
              </p>
              <p>
                <span className="text-muted-foreground">Địa điểm: </span>
                {workflow.resources.scheduleDetails.location}
              </p>
            </div>
          )}
          <div>
            <h3 className={customer ? 'customer-order-title' : 'text-sm font-semibold'}>
              Thợ chụp
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {workflow.resources.photographers
                .map(
                  (photographerId) =>
                    photographers.find((item) => item._id === photographerId)?.name ??
                    (photographerId === user?._id
                      ? user.name || user.username
                      : `Nhân sự ${photographerId.slice(-6)}`),
                )
                .join(', ')}
            </p>
          </div>
          {workflow.resources.costumes.length > 0 && (
            <div>
              <h3 className={customer ? 'customer-order-title' : 'text-sm font-semibold'}>
                Trang phục đã giữ
              </h3>
              <ul className="mt-1 space-y-1 text-sm">
                {workflow.resources.costumes.map((item, index) => (
                  <li key={`${item.costumeId}-${item.size}-${index}`}>
                    {workflow.allowedCostumes.find(
                      (costume) => costume.costumeId === item.costumeId,
                    )?.name ?? `Trang phục ${item.costumeId.slice(-6)}`}{' '}
                    · cỡ {item.size} · {item.quantity} bộ · nhận {formatDateOnly(item.receiveDate)}{' '}
                    · trả {formatDateOnly(item.returnDate)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {(isClient || isAdmin || isPhotographer) && workflow.progress && (
        <section
          className={
            customer ? 'customer-order-surface' : 'space-y-4 rounded-2xl border p-5 sm:p-6'
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
                Tiến độ chụp và bàn giao
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {progressLabels[workflow.progress.status] ?? workflow.progress.status}
              </p>
            </div>
            {workflow.progress.deliveryVersion > 0 && (
              <span
                className={customer ? 'customer-status' : 'rounded-full bg-muted px-3 py-1 text-sm'}
              >
                Bản bàn giao {workflow.progress.deliveryVersion}
              </span>
            )}
          </div>
          {workflow.progress.deliveredAt && (
            <p className="text-sm">
              Cập nhật bàn giao lúc {formatDateTime(workflow.progress.deliveredAt)}
            </p>
          )}
          {canUpdateProgress && nextProgress && (
            <div
              className={
                customer
                  ? 'customer-order-inset customer-order-stack'
                  : 'space-y-3 rounded-xl border bg-muted/10 p-4'
              }
            >
              <h3 className={customer ? 'customer-order-title' : 'font-medium'}>
                Cập nhật tiến độ
              </h3>
              {nextProgress === 'delivered' && (
                <Field label="Đường dẫn thư mục Drive">
                  <Input
                    type="url"
                    maxLength={2000}
                    placeholder="https://drive.google.com/…"
                    value={progressUrl}
                    onChange={(event) => setProgressUrl(event.target.value)}
                  />
                </Field>
              )}
              <Button disabled={busy !== ''} onClick={() => void submitProgress(nextProgress)}>
                {nextProgress === 'shooting'
                  ? 'Bắt đầu buổi chụp'
                  : nextProgress === 'editing'
                    ? 'Chuyển sang hậu kỳ'
                    : 'Gửi bản bàn giao mới'}
              </Button>
            </div>
          )}
          {(isClient || isAdmin || isPhotographer) && workflow.progress.deliveryUrl && (
            <div
              className={
                customer
                  ? 'customer-order-inset'
                  : 'rounded-xl border border-primary/20 bg-primary/5 p-4'
              }
            >
              <h3 className={customer ? 'customer-order-title' : 'font-semibold'}>
                Bản bàn giao hiện tại · phiên bản {workflow.progress.deliveryVersion}
              </h3>
              <a
                className={
                  customer
                    ? 'customer-link mt-2 inline-block break-all'
                    : 'mt-2 inline-block break-all text-sm text-primary underline'
                }
                href={workflow.progress.deliveryUrl}
                target="_blank"
                rel="noreferrer"
              >
                Mở thư mục Drive
              </a>
              {workflow.progress.acceptedAt && acceptedDelivery ? (
                <p className="mt-2 text-sm">
                  Đã nghiệm thu phiên bản này lúc {formatDateTime(workflow.progress.acceptedAt)}.
                </p>
              ) : null}
              {isClient && workflow.lifecycle === 'delivered' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busy !== ''}
                    onClick={() => {
                      if (!revisionNote.trim()) {
                        setError('Mô tả nội dung cần chỉnh sửa.');
                        return;
                      }
                      void runAction('revision.request', {
                        note: revisionNote.trim(),
                        deliveryVersion: workflow.progress?.deliveryVersion,
                      }).then((updated) => {
                        if (updated) setRevisionNote('');
                      });
                    }}
                  >
                    Yêu cầu chỉnh sửa
                  </Button>
                  <Button
                    disabled={busy !== ''}
                    onClick={() =>
                      void runAction('delivery.accept', {
                        deliveryVersion: workflow.progress?.deliveryVersion,
                      })
                    }
                  >
                    Nghiệm thu bản này
                  </Button>
                </div>
              )}
              {isClient && workflow.lifecycle === 'delivered' && (
                <Field className="mt-3" label="Nội dung cần chỉnh sửa">
                  <Textarea
                    rows={3}
                    maxLength={2000}
                    value={revisionNote}
                    onChange={(event) => setRevisionNote(event.target.value)}
                  />
                </Field>
              )}
            </div>
          )}
          {isClient && workflow.lifecycle === 'accepted' && effectivePayment.totalDue > 0 && (
            <p
              className={
                customer ? 'customer-order-notice' : 'rounded-lg bg-amber-500/10 p-3 text-sm'
              }
            >
              Đã lưu nghiệm thu. Studio sẽ hoàn tất hồ sơ khi đối chiếu xong khoản còn thu{' '}
              {customer ? (
                <CustomerPrice amount={amountForDisplay(effectivePayment.totalDue)} />
              ) : (
                money(effectivePayment.totalDue)
              )}
              .
            </p>
          )}
          {isClient && workflow.lifecycle === 'completed' && (
            <p
              className={
                customer ? 'customer-order-notice' : 'rounded-lg bg-emerald-600/10 p-3 text-sm'
              }
            >
              Bàn giao đã được nghiệm thu và các khoản tiền đã đối soát. Dịch vụ đã hoàn tất.
            </p>
          )}
          {(isClient || isAdmin) && workflow.deliveryHistory.length > 0 && (
            <details className={customer ? 'customer-order-surface' : 'rounded-xl border p-4'}>
              <summary className="cursor-pointer text-sm font-semibold">
                Lịch sử bàn giao theo phiên bản
              </summary>
              <ul className="mt-3 space-y-2 text-sm">
                {workflow.deliveryHistory.map((entry) => (
                  <li
                    key={entry.version}
                    className="flex flex-wrap justify-between gap-2 border-t pt-2"
                  >
                    <span>
                      Phiên bản {entry.version} · {formatDateTime(entry.deliveredAt)}
                    </span>
                    <a
                      className={customer ? 'customer-link' : 'text-primary underline'}
                      href={entry.deliveryUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở Drive
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {(isClient || isAdmin || isPhotographer) &&
            workflow.progress.revisionRequests.length > 0 && (
              <div>
                <h3 className={customer ? 'customer-order-title' : 'text-sm font-semibold'}>
                  Yêu cầu chỉnh sửa
                </h3>
                <ul className="mt-2 space-y-2">
                  {workflow.progress.revisionRequests.map((revision) => (
                    <li
                      key={revision._id}
                      className={
                        customer ? 'customer-order-inset' : 'rounded-lg bg-muted/30 p-3 text-sm'
                      }
                    >
                      <p>{revision.note}</p>
                      <p
                        className={
                          customer ? 'customer-caption mt-1' : 'mt-1 text-xs text-muted-foreground'
                        }
                      >
                        Gửi {formatDateTime(revision.at)}
                        {revision.deliveryVersion
                          ? ` · Bản bàn giao ${revision.deliveryVersion}`
                          : ''}
                        {revision.resolvedAt
                          ? ` · Đã xử lý ${formatDateTime(revision.resolvedAt)}`
                          : ' · Đang xử lý'}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </section>
      )}

      {(isClient || isAdmin) &&
        workflow.lifecycle !== 'completed' &&
        workflow.lifecycle !== 'cancelled' && (
          <section
            className={
              customer ? 'customer-order-surface' : 'space-y-4 rounded-2xl border p-5 sm:p-6'
            }
          >
            <div>
              <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
                Yêu cầu thay đổi hoặc hủy dịch vụ
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {workflow.resources?.scheduleId
                  ? 'Lịch đã xác nhận tiếp tục được giữ trong khi hai bên xem xét đề xuất.'
                  : 'Studio và khách có thể trao đổi đề xuất trước khi chốt lịch.'}{' '}
                Mọi khoản phí hoặc hoàn tiền cần có khách đồng ý.
              </p>
            </div>
            {workflow.changeRequest && (
              <div
                className={
                  customer
                    ? 'customer-order-inset customer-order-stack'
                    : 'space-y-3 rounded-xl border bg-muted/10 p-4'
                }
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className={customer ? 'customer-order-title' : 'font-semibold'}>
                    {workflow.changeRequest.kind === 'cancel'
                      ? 'Yêu cầu hủy dịch vụ'
                      : 'Yêu cầu thay đổi lịch'}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {changeStatusLabels[workflow.changeRequest.status] ??
                      workflow.changeRequest.status}
                  </span>
                </div>
                {workflow.changeRequest.note && (
                  <p className="whitespace-pre-wrap text-sm">{workflow.changeRequest.note}</p>
                )}
                {workflow.changeRequest.kind === 'change' &&
                  Boolean(workflow.changeRequest.requested?.schedule || proposedChangeSchedule) && (
                    <div
                      className={customer ? 'customer-order-summary' : 'grid gap-3 sm:grid-cols-2'}
                    >
                      <div>
                        <h4
                          className={
                            customer
                              ? 'customer-caption'
                              : 'text-xs font-semibold uppercase text-muted-foreground'
                          }
                        >
                          Khách đề nghị
                        </h4>
                        <ScheduleSummary schedule={workflow.changeRequest.requested?.schedule} />
                      </div>
                      {Boolean(proposedChangeSchedule) && (
                        <div>
                          <h4
                            className={
                              customer
                                ? 'customer-caption'
                                : 'text-xs font-semibold uppercase text-muted-foreground'
                            }
                          >
                            Đề xuất của studio
                          </h4>
                          <ScheduleSummary schedule={proposedChangeSchedule} />
                        </div>
                      )}
                    </div>
                  )}
                {workflow.changeRequest.status === 'proposed' && canSeeFinancials && (
                  <div
                    className={customer ? 'customer-order-inset' : 'rounded-lg bg-card p-3 text-sm'}
                  >
                    <p>
                      {workflow.changeRequest.kind === 'cancel'
                        ? 'Phí hủy theo đề xuất'
                        : 'Tổng giá dịch vụ sau thay đổi'}
                      :{' '}
                      <strong>
                        {customer ? (
                          <CustomerPrice
                            amount={amountForDisplay(workflow.changeRequest.finalPayable ?? 0)}
                          />
                        ) : (
                          money(workflow.changeRequest.finalPayable ?? 0)
                        )}
                      </strong>
                    </p>
                    {workflow.changeRequest.kind === 'cancel' ? (
                      <p className="mt-1">
                        Số tiền dự kiến hoàn:{' '}
                        <strong>
                          {customer ? (
                            <CustomerPrice
                              amount={amountForDisplay(workflow.changeRequest.refundDue ?? 0)}
                            />
                          ) : (
                            money(workflow.changeRequest.refundDue ?? 0)
                          )}
                        </strong>
                      </p>
                    ) : (
                      <>
                        <p className="mt-1">
                          Chênh lệch so với giá hiện tại:{' '}
                          <strong>
                            {workflow.changeRequest.priceDelta < 0
                              ? 'giảm '
                              : workflow.changeRequest.priceDelta > 0
                                ? 'tăng '
                                : ''}
                            {customer ? (
                              <CustomerPrice
                                amount={amountForDisplay(
                                  Math.abs(workflow.changeRequest.priceDelta),
                                )}
                              />
                            ) : (
                              money(Math.abs(workflow.changeRequest.priceDelta))
                            )}
                          </strong>
                        </p>
                        <p className="mt-1">
                          Còn thu sau khi áp dụng:{' '}
                          <strong>
                            {customer ? (
                              <CustomerPrice
                                amount={amountForDisplay(
                                  Math.max(
                                    0,
                                    (workflow.changeRequest.finalPayable ?? 0) -
                                      effectivePayment.netReceived,
                                  ),
                                )}
                              />
                            ) : (
                              money(
                                Math.max(
                                  0,
                                  (workflow.changeRequest.finalPayable ?? 0) -
                                    effectivePayment.netReceived,
                                ),
                              )
                            )}
                          </strong>
                        </p>
                        {workflow.changeRequest.refundDue ? (
                          <p className="mt-1">
                            Dự kiến hoàn:{' '}
                            <strong>
                              {customer ? (
                                <CustomerPrice
                                  amount={amountForDisplay(workflow.changeRequest.refundDue)}
                                />
                              ) : (
                                money(workflow.changeRequest.refundDue)
                              )}
                            </strong>
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
                {workflow.changeRequest.terms.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {workflow.changeRequest.terms.map((term, index) => (
                      <li key={index}>{term}</li>
                    ))}
                  </ul>
                )}
                {isClient && workflow.changeRequest.status === 'proposed' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy !== ''}
                      onClick={() =>
                        void runAction('change.accept', { requestId: workflow.changeRequest?._id })
                      }
                    >
                      Đồng ý đề xuất
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy !== ''}
                      onClick={() =>
                        void runAction('change.decline', { requestId: workflow.changeRequest?._id })
                      }
                    >
                      Từ chối đề xuất
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy !== ''}
                      onClick={() =>
                        void runAction('change.withdraw', {
                          requestId: workflow.changeRequest?._id,
                        })
                      }
                    >
                      Rút yêu cầu
                    </Button>
                  </div>
                )}
                {isClient && workflow.changeRequest.status === 'requested' && (
                  <Button
                    variant="outline"
                    disabled={busy !== ''}
                    onClick={() =>
                      void runAction('change.withdraw', { requestId: workflow.changeRequest?._id })
                    }
                  >
                    Rút yêu cầu
                  </Button>
                )}
                {isAdmin && workflow.changeRequest.status === 'requested' && (
                  <div className="space-y-3 border-t pt-3">
                    <h4 className={customer ? 'customer-caption' : 'font-semibold'}>
                      Phản hồi yêu cầu của khách
                    </h4>
                    {workflow.changeRequest.kind === 'change' ? (
                      <div
                        className={
                          customer
                            ? 'customer-order-summary customer-order-summary--four'
                            : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
                        }
                      >
                        <Field label="Ngày đề xuất">
                          <Input
                            type="date"
                            value={proposalDate}
                            onChange={(event) => setProposalDate(event.target.value)}
                          />
                        </Field>
                        <Field label="Bắt đầu">
                          <Input
                            type="time"
                            value={proposalStartTime}
                            onChange={(event) => setProposalStartTime(event.target.value)}
                          />
                        </Field>
                        <Field label="Kết thúc">
                          <Input
                            type="time"
                            value={proposalEndTime}
                            onChange={(event) => setProposalEndTime(event.target.value)}
                          />
                        </Field>
                        <Field label="Tổng giá sau thay đổi (đ)">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={proposedPayable}
                            onChange={(event) => setProposedPayable(event.target.value)}
                          />
                        </Field>
                        <Field
                          label="Địa điểm mới"
                          className={
                            customer ? 'customer-order-span-full' : 'sm:col-span-2 lg:col-span-4'
                          }
                        >
                          <Input
                            maxLength={300}
                            value={proposalLocation}
                            onChange={(event) => setProposalLocation(event.target.value)}
                          />
                        </Field>
                      </div>
                    ) : (
                      <Field label="Phí hủy sau khi chốt (đ)">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={proposedPayable}
                          onChange={(event) => setProposedPayable(event.target.value)}
                        />
                      </Field>
                    )}
                    <Field label="Điều khoản của đề xuất, mỗi dòng một điều khoản">
                      <Textarea
                        rows={3}
                        maxLength={5000}
                        value={proposalTerms}
                        onChange={(event) => setProposalTerms(event.target.value)}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={busy !== ''} onClick={() => void proposeChange()}>
                        Gửi đề xuất để khách xác nhận
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy !== ''}
                        onClick={() =>
                          void runAction('change.decline', {
                            requestId: workflow.changeRequest?._id,
                          })
                        }
                      >
                        Từ chối yêu cầu
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!activeChange && isClient && quoteAccepted && (
              <div
                className={
                  customer
                    ? 'customer-order-inset customer-order-stack'
                    : 'space-y-3 rounded-xl border p-4'
                }
              >
                <div className={customer ? 'customer-order-summary' : 'grid gap-3 sm:grid-cols-2'}>
                  <Field label="Loại yêu cầu">
                    <OrderSelect
                      className="min-h-11 w-full rounded-lg border bg-background px-3"
                      value={changeKind}
                      onChange={(event) => setChangeKind(event.target.value as typeof changeKind)}
                    >
                      <option value="change">Đổi ngày, giờ hoặc địa điểm</option>
                      <option value="cancel">Hủy dịch vụ</option>
                    </OrderSelect>
                  </Field>
                  <Field label="Lý do">
                    <Input
                      maxLength={300}
                      placeholder="Ví dụ: lịch thi của lớp thay đổi"
                      value={changeNote}
                      onChange={(event) => setChangeNote(event.target.value)}
                    />
                  </Field>
                </div>
                {changeKind === 'change' && (
                  <div
                    className={
                      customer
                        ? 'customer-order-summary customer-order-summary--four'
                        : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
                    }
                  >
                    <Field label="Ngày mong muốn">
                      <Input
                        type="date"
                        value={requestedDate}
                        onChange={(event) => setRequestedDate(event.target.value)}
                      />
                    </Field>
                    <Field label="Bắt đầu">
                      <Input
                        type="time"
                        value={requestedStartTime}
                        onChange={(event) => setRequestedStartTime(event.target.value)}
                      />
                    </Field>
                    <Field label="Kết thúc">
                      <Input
                        type="time"
                        value={requestedEndTime}
                        onChange={(event) => setRequestedEndTime(event.target.value)}
                      />
                    </Field>
                    <Field label="Địa điểm mới">
                      <Input
                        maxLength={300}
                        value={requestedLocation}
                        onChange={(event) => setRequestedLocation(event.target.value)}
                      />
                    </Field>
                  </div>
                )}
                <Button disabled={busy !== ''} onClick={() => void submitChangeRequest()}>
                  Gửi yêu cầu cho studio
                </Button>
              </div>
            )}
          </section>
        )}

      {isClient && workflow.lifecycle === 'completed' && !workflow.feedback && (
        <section
          className={customer ? 'customer-order-surface' : 'space-y-3 rounded-2xl border p-5'}
        >
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Đánh giá dịch vụ
          </h2>
          <div
            className={
              customer ? 'customer-order-summary' : 'grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]'
            }
          >
            <Field label="Mức đánh giá">
              <OrderSelect
                className="min-h-11 w-full rounded-lg border bg-background px-3"
                value={feedbackRating}
                onChange={(event) => setFeedbackRating(Number(event.target.value))}
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} / 5 sao
                  </option>
                ))}
              </OrderSelect>
            </Field>
            <Field label="Nhận xét">
              <Textarea
                rows={3}
                maxLength={2000}
                value={feedbackComment}
                onChange={(event) => setFeedbackComment(event.target.value)}
              />
            </Field>
          </div>
          <Button
            disabled={busy !== ''}
            onClick={() =>
              void runAction('feedback.submit', {
                rating: feedbackRating,
                comment: feedbackComment.trim(),
              })
            }
          >
            Gửi đánh giá
          </Button>
        </section>
      )}
      {workflow.feedback && (isClient || isAdmin) && (
        <section className={customer ? 'customer-order-surface' : 'rounded-2xl border p-5'}>
          <h2 className={customer ? 'customer-section-title' : 'font-semibold'}>Đánh giá đã gửi</h2>
          <p className="mt-1">{workflow.feedback.rating} / 5 sao</p>
          {workflow.feedback.comment && (
            <p className="mt-2 whitespace-pre-wrap text-sm">{workflow.feedback.comment}</p>
          )}
        </section>
      )}

      <section
        className={customer ? 'customer-order-surface' : 'space-y-3 rounded-2xl border p-5 sm:p-6'}
      >
        <div>
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Lịch sử xử lý
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Các cập nhật hiển thị theo thời gian Việt Nam.
          </p>
        </div>
        {timeline.length ? (
          <ol className="space-y-3">
            {timeline.map((event, index) => (
              <li
                key={`${event.action}-${event.at}-${index}`}
                className={
                  customer ? 'customer-order-timeline-item' : 'border-l-2 border-primary/30 pl-4'
                }
              >
                <time className={customer ? 'customer-caption' : 'text-xs text-muted-foreground'}>
                  {formatDateTime(event.at)}
                </time>
                <p className="mt-1 text-sm">{event.message}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p
            className={
              customer
                ? 'customer-order-inset'
                : 'rounded-lg border p-4 text-sm text-muted-foreground'
            }
          >
            Chưa có cập nhật trong quy trình.
          </p>
        )}
      </section>
    </DetailContainer>
  );
}

function ScheduleSummary({ schedule }: { schedule: unknown }) {
  if (!schedule || typeof schedule !== 'object') return null;
  const value = schedule as {
    shootDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
  };
  return (
    <div className="mt-1 space-y-1 text-sm">
      <p>
        {formatDateOnly(value.shootDate)} · {value.startTime} – {value.endTime}
      </p>
      <p>{value.location}</p>
    </div>
  );
}
