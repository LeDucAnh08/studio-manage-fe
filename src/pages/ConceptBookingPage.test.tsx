import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import ConceptCatalogPage from './ConceptCatalogPage';
import ConceptPackageDetailPage from './ConceptPackageDetailPage';
import ConceptPhotographerPage from './ConceptPhotographerPage';
import ConceptBookingPage, { CONCEPT_DRAFT_KEY } from './ConceptBookingPage';
import ConceptOrderPage from './ConceptOrderPage';
import { GuestConceptAlbumPage } from './ConceptAlbumPanel';
import { conceptDraftFromOrder, writeConceptDraft } from '../services/conceptDraft';
import {
  conceptService,
  type Catalog,
  type ConceptOrder,
  type ConceptAlbum,
} from '../services/conceptService';

const { auth } = vi.hoisted(() => ({
  auth: {
    user: { _id: 'client-1', emailVerifiedAt: '2026-01-01', roles: [6] } as {
      _id: string;
      emailVerifiedAt?: string;
      roles: number[];
    } | null,
  },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../components/Layout/PublicSiteLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('../services/conceptService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/conceptService')>();
  return {
    ...original,
    conceptService: {
      catalog: vi.fn(),
      photographer: vi.fn(),
      availability: vi.fn(),
      costumes: vi.fn(),
      checkout: vi.fn(),
      order: vi.fn(),
      guestAlbum: vi.fn(),
      image: vi.fn(),
    },
  };
});
const catalog: Catalog = {
  concepts: [
    {
      _id: 'concept-1',
      name: 'Nàng thơ',
      description: 'Mô tả',
      coverUrl: '/images/concepts/portrait-01.webp',
      story: 'Câu chuyện riêng của concept.',
      audience: 'Chân dung cá nhân',
      gallery: [{ url: '/images/concepts/portrait-01.webp', caption: 'Ánh sáng cửa sổ' }],
      active: true,
    },
  ],
  packages: [
    {
      _id: 'pkg-1',
      concept: 'concept-1',
      name: 'Gói riêng',
      introduction: 'Lưu lại nét riêng trong từng khung hình.',
      studioSupport: [
        { title: 'Tự tin tạo dáng', description: 'Ekip hướng dẫn biểu cảm và dáng đứng.' },
      ],
      delivery: {
        timeline: 'Bảy ngày sau khi chốt ảnh.',
        format: 'JPEG qua album riêng.',
        originals: 'Theo thỏa thuận.',
      },
      showcase: {
        title: 'Trước và sau hậu kỳ',
        description: 'Tinh chỉnh ánh sáng và màu sắc.',
        images: [
          { url: '/images/concepts/portrait-01.webp', caption: 'Trước hậu kỳ' },
          { url: '/images/concepts/portrait-02.webp', caption: 'Sau hậu kỳ' },
        ],
      },
      decor: {
        backdrop: 'Phông kem sáng',
        props: 'Ghế gỗ và vải nền',
        layout: 'Góc cửa sổ',
        included: 'Một set decor studio',
      },
      price: 1000000,
      durationMinutes: 60,
      maxPeople: 2,
      retouchQuota: 10,
      extraPhotoPrice: 50000,
      costumeTypes: [],
      costumeCount: 0,
      active: true,
      version: 3,
    },
  ],
  settings: {
    openMinutes: 540,
    closeMinutes: 1140,
    stepMinutes: 30,
    bufferMinutes: 60,
    horizonDays: 90,
    closedWeekdays: [],
    version: 0,
  },
};
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-11T07:00:00Z'));
  sessionStorage.clear();
  vi.clearAllMocks();
  auth.user = { _id: 'client-1', emailVerifiedAt: '2026-01-01', roles: [6] };
  vi.mocked(conceptService.catalog).mockResolvedValue(catalog);
  vi.mocked(conceptService.availability).mockImplementation(async (_id, day) => ({
    day,
    available: true,
    slots: [
      {
        startAt: `${day}T10:00:00.000Z`,
        endAt: `${day}T11:00:00.000Z`,
        photographers: [{ _id: 'photo-1', name: 'Thợ An', portfolio: [] }],
      },
    ],
  }));
  vi.mocked(conceptService.costumes).mockResolvedValue([]);
  vi.mocked(conceptService.photographer).mockResolvedValue({
    _id: 'photo-1',
    name: 'Thợ An',
    bio: 'Giới thiệu riêng của An.',
    tagline: 'Giữ nét riêng.',
    story: 'Câu chuyện của An.',
    philosophy: 'Ưu tiên cảm xúc tự nhiên.',
    concepts: [{ _id: 'concept-1', name: 'Nàng thơ' }],
    portfolio: [],
    approach: [{ title: 'Hướng dẫn nhẹ nhàng', description: 'Theo nhịp của khách.' }],
    audience: [{ title: 'Lần đầu chụp', description: 'Làm quen với ống kính.' }],
  });
});
afterEach(() => vi.restoreAllMocks());
function PaymentDestination() {
  const location = useLocation();
  return <p>{location.search === '?payment=deposit' ? 'Thanh toán cọc mới' : 'Sai màn hình'}</p>;
}
const renderWizard = (url = '/concept-booking', state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[state ? { pathname: url, state } : url]}>
      <Routes>
        <Route path="/concept-booking" element={<ConceptCatalogPage />} />
        <Route path="/concept-booking/packages/:packageId" element={<ConceptPackageDetailPage />} />
        <Route
          path="/concept-booking/packages/:packageId/photographers/:photographerId"
          element={<ConceptPhotographerPage />}
        />
        <Route
          path="/concept-booking/packages/:packageId/book/:screen"
          element={<ConceptBookingPage />}
        />
        <Route path="/account/concept-orders/:id" element={<PaymentDestination />} />
      </Routes>
    </MemoryRouter>,
  );
async function fillWizard() {
  fireEvent.click(await screen.findByRole('link', { name: 'Xem chi tiết Gói riêng' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Chọn gói này' }));
  await waitFor(() =>
    expect(screen.queryByText('Đang kiểm tra lịch trống…')).not.toBeInTheDocument(),
  );
  fireEvent.click(document.querySelector('.concept-month-grid button:not(:disabled)')!);
  fireEvent.click(screen.getByRole('button', { name: /17:00/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  fireEvent.click(await screen.findByRole('link', { name: 'Xem hồ sơ Thợ An' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Chọn Thợ An' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Chọn Thợ An' }));
  await screen.findByRole('heading', { name: 'Thông tin buổi chụp' });
  fireEvent.change(screen.getByLabelText('Họ tên liên hệ'), { target: { value: 'Khách An' } });
  fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0901234567' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  await screen.findByRole('heading', { name: 'Kiểm tra trước khi đặt cọc' });
}
describe('concept booking contract', () => {
  it('restores a concept review, rechecks availability and keeps edits after reload', async () => {
    const withWardrobe = structuredClone(catalog);
    withWardrobe.packages[0].costumeCount = 1;
    vi.mocked(conceptService.catalog).mockResolvedValue(withWardrobe);
    const order = {
      package: 'pkg-1',
      startAt: '2026-11-14T10:00:00.000Z',
      photographer: 'photo-1',
      contactName: 'Khách An',
      phone: '0901234567',
      people: 1,
      brief: 'Ý tưởng từ đơn cũ',
      wardrobeMeasurements: [{ size: 'M', heightCm: 165, weightKg: 50 }],
      references: ['https://example.com/reference'],
    } as unknown as ConceptOrder;
    const conceptDraft = conceptDraftFromOrder(order, 'client-1');
    let page = renderWizard('/concept-booking/packages/pkg-1/book/review', { conceptDraft });
    expect(await screen.findByText('Ý tưởng từ đơn cũ')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Thợ An')).toBeInTheDocument());
    expect(screen.getByText(/Người 1.*Size M.*165 cm.*50 kg/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Tôi đồng ý giá gói/ })).not.toBeChecked();
    expect(conceptService.checkout).not.toHaveBeenCalled();
    const saved = JSON.parse(sessionStorage.getItem(CONCEPT_DRAFT_KEY)!);
    writeConceptDraft({ ...saved, brief: 'Đã sửa ý tưởng', key: 'fresh-retry-key' });
    page.unmount();
    page = renderWizard('/concept-booking/packages/pkg-1/book/review', { conceptDraft });
    expect(await screen.findByText('Đã sửa ý tưởng')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(CONCEPT_DRAFT_KEY)!).key).toBe('fresh-retry-key');
    page.unmount();
    vi.mocked(conceptService.availability).mockResolvedValue({
      day: '2026-11-14',
      available: true,
      slots: [],
    });
    page = renderWizard('/concept-booking/packages/pkg-1/book/review', { conceptDraft });
    expect(
      await screen.findByRole('link', { name: 'Chọn lại thời gian hoặc thợ' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đồng ý giá gói/ }));
    expect(screen.getByRole('button', { name: 'Tiếp theo' })).toBeDisabled();
    expect(conceptService.checkout).not.toHaveBeenCalled();
    page.unmount();
  });
  it.each([
    ['awaiting_deposit', 'pending', '2026-11-12T07:00:00Z', 'Quét mã để thanh toán', true],
    ['confirmed', 'paid', '2026-11-12T07:00:00Z', 'Đã nhận tiền cọc', false],
    ['awaiting_deposit', 'pending', '2026-11-11T06:00:00Z', 'Phiên thanh toán đã hết hạn', false],
  ])(
    'shows the dedicated deposit screen for %s / %s',
    async (status, paymentStatus, expiresAt, heading, showQr) => {
      vi.mocked(conceptService.order).mockResolvedValue({
        _id: 'order-1',
        package: 'pkg-1',
        snapshot: { ...catalog.packages[0], conceptName: 'Nàng thơ', deposit: 300000 },
        status,
        startAt: '2026-11-14T10:00:00Z',
        endAt: '2026-11-14T11:00:00Z',
        originalStartAt: '2026-11-14T10:00:00Z',
        contactName: 'Khách An',
        phone: '0901234567',
        people: 1,
        isOwner: true,
        paymentRequests: [
          {
            id: 'deposit-1',
            kind: 'deposit',
            amount: paymentStatus === 'paid' ? 0 : 300000,
            status: paymentStatus,
            expiresAt,
            qrUrl: '/deposit-qr.png',
            reference: 'TEST-DEPOSIT',
            bankName: 'Ngân hàng mẫu',
            accountNumber: '0000000000',
            accountName: 'Studio mẫu',
          },
        ],
      } as ConceptOrder);
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/account/concept-orders/order-1',
              search: '?payment=deposit',
              state: { conceptDraft: { ownerId: 'client-1', packageId: 'pkg-1' } },
            },
          ]}
        >
          <Routes>
            <Route path="/account/concept-orders/:id" element={<ConceptOrderPage />} />
          </Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          name:
            paymentStatus === 'paid'
              ? 'Đã nhận tiền cọc'
              : showQr
                ? 'Thanh toán tiền cọc'
                : 'Phiên thanh toán đã hết hạn',
        }),
      ).toBeInTheDocument();
      expect(!!screen.queryByRole('img', { name: /QR thanh toán/ })).toBe(showQr);
      expect(screen.getByRole('link', { name: 'Quay lại kiểm tra thông tin' })).toHaveAttribute(
        'href',
        '/concept-booking/packages/pkg-1/book/review',
      );
      expect(screen.queryByRole('button', { name: /Tạo QR/ })).not.toBeInTheDocument();
      expect(conceptService.checkout).not.toHaveBeenCalled();
    },
  );
  it('keeps a one-person package fixed to one participant without a dropdown', async () => {
    const single = structuredClone(catalog);
    single.packages[0].maxPeople = 1;
    single.packages[0].costumeCount = 1;
    vi.mocked(conceptService.catalog).mockResolvedValue(single);
    sessionStorage.setItem(
      CONCEPT_DRAFT_KEY,
      JSON.stringify({
        ownerId: 'client-1',
        packageId: 'pkg-1',
        step: 4,
        startAt: '2026-11-14T10:00:00.000Z',
        photographerId: 'photo-1',
        people: 2,
        costumes: [],
        wardrobeMeasurements: [
          { size: 'M', heightCm: 165, weightKg: 55 },
          { size: 'L', heightCm: 175, weightKg: 70 },
        ],
      }),
    );
    renderWizard('/concept-booking/packages/pkg-1/book/costumes');
    await screen.findByRole('heading', { name: 'Thông tin buổi chụp' });
    await waitFor(() =>
      expect(screen.queryByLabelText('Số người tham gia')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('1 người', { exact: true })).toBeInTheDocument();
    expect(screen.getByLabelText('Size người 1')).toHaveValue('M');
    expect(screen.queryByLabelText('Size người 2')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem(CONCEPT_DRAFT_KEY) || '{}')).toMatchObject({
        people: 1,
        wardrobeMeasurements: [{ size: 'M', heightCm: 165, weightKg: 55 }],
      }),
    );
  });
  it('opens old brief links in the merged form and restores all fields on reload', async () => {
    sessionStorage.setItem(
      CONCEPT_DRAFT_KEY,
      JSON.stringify({
        ownerId: 'client-1',
        packageId: 'pkg-1',
        step: 5,
        startAt: '2026-11-14T10:00:00.000Z',
        photographerId: 'photo-1',
        costumes: [],
        contactName: 'Mai Anh',
        phone: '0912345678',
        people: 2,
        brief: 'Ánh sáng dịu, tông màu ấm.',
        referencesText: 'https://example.com/style.jpg',
      }),
    );
    const first = renderWizard('/concept-booking/packages/pkg-1/book/brief');
    await screen.findByRole('heading', { name: 'Thông tin buổi chụp' });
    expect(screen.getByRole('link', { name: 'Quay lại chọn thợ' })).toHaveAttribute(
      'href',
      '/concept-booking/packages/pkg-1/book/photographer',
    );
    expect(screen.getByText(/Gói sử dụng trang phục cá nhân/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Size người 1')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Số người tham gia')).toHaveValue('2');
    fireEvent.change(screen.getByLabelText('Ý tưởng và yêu cầu'), {
      target: { value: 'Thêm ảnh tự nhiên.' },
    });
    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem(CONCEPT_DRAFT_KEY) || '{}').brief).toBe(
        'Thêm ảnh tự nhiên.',
      ),
    );
    first.unmount();
    renderWizard('/concept-booking/packages/pkg-1/book/costumes');
    expect(await screen.findByLabelText('Họ tên liên hệ')).toHaveValue('Mai Anh');
    expect(screen.getByLabelText('Số điện thoại')).toHaveValue('0912345678');
    expect(screen.getByLabelText('Ý tưởng và yêu cầu')).toHaveValue('Thêm ảnh tự nhiên.');
    expect(screen.getByLabelText(/^Link ảnh mẫu/)).toHaveValue('https://example.com/style.jpg');
    expect(screen.getAllByRole('button', { name: 'Tiếp tục' })).toHaveLength(1);
    expect(conceptService.costumes).not.toHaveBeenCalled();
    expect(conceptService.checkout).not.toHaveBeenCalled();
  });
  it('returns a direct review link with invalid contact details to the merged form', async () => {
    sessionStorage.setItem(
      CONCEPT_DRAFT_KEY,
      JSON.stringify({
        ownerId: 'client-1',
        packageId: 'pkg-1',
        step: 6,
        startAt: '2026-11-14T10:00:00.000Z',
        photographerId: 'photo-1',
        costumes: [],
        contactName: 'Mai Anh',
        phone: '123',
        people: 1,
      }),
    );
    renderWizard('/concept-booking/packages/pkg-1/book/review');
    await screen.findByRole('heading', { name: 'Thông tin buổi chụp' });
    expect(screen.queryByRole('button', { name: 'Tiếp theo' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await screen.findByText('Kiểm tra họ tên, số điện thoại và số người.');
    expect(conceptService.checkout).not.toHaveBeenCalled();
  });
  it('collects size, height and weight per person and submits them without catalog choices', async () => {
    const included = structuredClone(catalog);
    included.packages[0].costumeCount = 2;
    vi.mocked(conceptService.catalog).mockResolvedValue(included);
    sessionStorage.setItem(
      CONCEPT_DRAFT_KEY,
      JSON.stringify({
        ownerId: 'client-1',
        packageId: 'pkg-1',
        step: 4,
        startAt: '2026-11-14T10:00:00.000Z',
        photographerId: 'photo-1',
        costumes: [],
      }),
    );
    renderWizard('/concept-booking/packages/pkg-1/book/costumes');
    await screen.findByRole('heading', { name: 'Thông tin buổi chụp' });
    expect(screen.queryByRole('link', { name: 'Quay lại chi tiết gói' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quay lại chọn thợ' })).toHaveAttribute(
      'href',
      '/concept-booking/packages/pkg-1/book/photographer',
    );
    expect(
      screen.getByRole('link', { name: 'Quay lại chọn thợ' }).querySelector('svg'),
    ).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Quay lại' })).not.toBeInTheDocument();
    expect(conceptService.costumes).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Số người tham gia')).toHaveValue('1');
    fireEvent.change(screen.getByLabelText('Số người tham gia'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await screen.findByText('Điền size, chiều cao và cân nặng cho từng người.');
    for (const [i, size, height, weight] of [
      [1, 'M', '165.5', '55.2'],
      [2, 'L', '175', '70'],
    ] as const) {
      fireEvent.change(screen.getByLabelText(`Size người ${i}`), { target: { value: size } });
      fireEvent.change(screen.getByLabelText(`Chiều cao người ${i}`), {
        target: { value: height },
      });
      fireEvent.change(screen.getByLabelText(`Cân nặng người ${i}`), { target: { value: weight } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await screen.findByText('Kiểm tra họ tên, số điện thoại và số người.');
    fireEvent.change(screen.getByLabelText('Họ tên liên hệ'), { target: { value: 'Khách An' } });
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0901234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await screen.findByRole('heading', { name: 'Kiểm tra trước khi đặt cọc' });
    expect(screen.getByRole('link', { name: 'Quay lại thông tin buổi chụp' })).toHaveAttribute(
      'href',
      '/concept-booking/packages/pkg-1/book/costumes',
    );
    expect(screen.getByText('Người 1 · Size M · 165.5 cm · 55.2 kg')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Quay lại thông tin buổi chụp' }));
    expect(await screen.findByLabelText('Size người 1')).toHaveValue('M');
    expect(screen.getByLabelText('Cân nặng người 2')).toHaveValue(70);
    expect(screen.getByLabelText('Họ tên liên hệ')).toHaveValue('Khách An');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await screen.findByRole('heading', { name: 'Kiểm tra trước khi đặt cọc' });
    vi.mocked(conceptService.checkout).mockResolvedValue({ _id: 'new-order' } as ConceptOrder);
    fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đồng ý/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp theo' }));
    await screen.findByText('Thanh toán cọc mới');
    expect(vi.mocked(conceptService.checkout).mock.calls[0][0]).toMatchObject({
      people: 2,
      costumes: [],
      wardrobeMeasurements: [
        { size: 'M', heightCm: 165.5, weightKg: 55.2 },
        { size: 'L', heightCm: 175, weightKg: 70 },
      ],
    });
  });
  it('sends incomplete restored wardrobe details back to the measurement step', async () => {
    const included = structuredClone(catalog);
    included.packages[0].costumeCount = 1;
    vi.mocked(conceptService.catalog).mockResolvedValue(included);
    sessionStorage.setItem(
      CONCEPT_DRAFT_KEY,
      JSON.stringify({
        ownerId: 'client-1',
        packageId: 'pkg-1',
        step: 6,
        startAt: '2026-11-14T10:00:00.000Z',
        photographerId: 'photo-1',
        costumes: [],
        wardrobeMeasurements: [{ size: 'M', heightCm: 165, weightKg: 0 }],
      }),
    );
    renderWizard('/concept-booking/packages/pkg-1/book/review');
    await screen.findByRole('heading', { name: 'Thông tin buổi chụp' });
    expect(
      screen.queryByRole('heading', { name: 'Kiểm tra trước khi đặt cọc' }),
    ).not.toBeInTheDocument();
    expect(conceptService.checkout).not.toHaveBeenCalled();
  });
  it('opens a personal profile as a separate screen and keeps the draft when returning', async () => {
    sessionStorage.setItem(
      CONCEPT_DRAFT_KEY,
      JSON.stringify({
        ownerId: 'client-1',
        packageId: 'pkg-1',
        step: 3,
        startAt: '2026-11-14T10:00:00.000Z',
        photographerId: '',
        costumes: [],
      }),
    );
    renderWizard('/concept-booking/packages/pkg-1/photographers/photo-1');
    await screen.findByRole('heading', { name: 'Thợ An' });
    expect(screen.getByText('Câu chuyện của An.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Điều tôi chú trọng' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Quay lại danh sách thợ' }));
    await screen.findByRole('heading', { name: 'Chọn thợ chụp' });
    expect(JSON.parse(sessionStorage.getItem(CONCEPT_DRAFT_KEY) || '{}').startAt).toBe(
      '2026-11-14T10:00:00.000Z',
    );
    expect(conceptService.checkout).not.toHaveBeenCalled();
  });
  it('lets guests view a profile without a booking and blocks selecting without a time', async () => {
    auth.user = null;
    renderWizard('/concept-booking/packages/pkg-1/photographers/photo-1');
    await screen.findByRole('heading', { name: 'Thợ An' });
    expect(screen.getByRole('button', { name: 'Chọn Thợ An' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Quay lại chi tiết gói' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Một số bộ ảnh tiêu biểu' }),
    ).not.toBeInTheDocument();
    expect(conceptService.availability).not.toHaveBeenCalled();
  });
  it('rechecks the photographer before selection and preserves the draft if they become busy', async () => {
    sessionStorage.setItem(
      CONCEPT_DRAFT_KEY,
      JSON.stringify({
        ownerId: 'client-1',
        packageId: 'pkg-1',
        step: 3,
        startAt: '2026-11-14T10:00:00.000Z',
        photographerId: '',
        costumes: [],
      }),
    );
    renderWizard('/concept-booking/packages/pkg-1/photographers/photo-1');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chọn Thợ An' })).toBeEnabled());
    vi.mocked(conceptService.availability).mockResolvedValue({
      day: '2026-11-14',
      available: false,
      slots: [],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Chọn Thợ An' }));
    await screen.findByText(
      'Thợ không còn trống ở khung giờ này. Bạn vui lòng chọn lại thời gian hoặc thợ khác.',
    );
    expect(JSON.parse(sessionStorage.getItem(CONCEPT_DRAFT_KEY) || '{}').photographerId).toBe('');
    expect(screen.getByRole('button', { name: 'Chọn Thợ An' })).toBeDisabled();
    expect(conceptService.checkout).not.toHaveBeenCalled();
  });
  it('reports an unavailable public profile without offering a selection', async () => {
    vi.mocked(conceptService.photographer).mockRejectedValue({
      response: { data: { message: 'Hồ sơ thợ chưa được công khai.' } },
    });
    renderWizard('/concept-booking/packages/pkg-1/photographers/photo-1');
    await screen.findByRole('alert');
    expect(screen.getByText('Hồ sơ thợ chưa được công khai.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chọn Thợ An' })).not.toBeInTheDocument();
  });
  it('requires the details screen before selecting a package and does not reserve from the cards', async () => {
    renderWizard();
    const link = await screen.findByRole('link', { name: 'Xem chi tiết Gói riêng' });
    expect(screen.queryByRole('button', { name: 'Chọn gói này' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Các bước đặt chụp' })).not.toBeInTheDocument();
    expect(conceptService.availability).not.toHaveBeenCalled();
    fireEvent.click(link);
    await screen.findByRole('heading', { name: 'Gói riêng' });
    expect(screen.getByText('Câu chuyện riêng của concept.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chi phí và thanh toán' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Decor & bối cảnh' })).toBeInTheDocument();
    expect(screen.getByText('Phông kem sáng')).toBeInTheDocument();
    expect(screen.getByText('Một set decor studio')).toBeInTheDocument();
    expect(screen.getByText('Lưu lại nét riêng trong từng khung hình.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Studio đồng hành cùng bạn' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bộ ảnh bạn nhận được' })).toBeInTheDocument();
    expect(screen.getByText('Bảy ngày sau khi chốt ảnh.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem ảnh giới thiệu 1: Trước hậu kỳ' }));
    const showcaseDialog = await screen.findByRole('dialog', {
      name: 'Bộ ảnh giới thiệu Nàng thơ',
    });
    expect(showcaseDialog).toHaveTextContent('1 / 2');
    fireEvent.keyDown(showcaseDialog, { key: 'ArrowRight' });
    expect(showcaseDialog).toHaveTextContent('Sau hậu kỳ');
    expect(showcaseDialog).toHaveTextContent('2 / 2');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.getByRole('heading', { name: 'Đổi và hủy lịch' })).toBeInTheDocument();
    expect(conceptService.checkout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xem ảnh 1: Ánh sáng cửa sổ' }));
    await screen.findByRole('dialog', { name: 'Ảnh tham khảo Nàng thơ' });
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chọn gói này' }));
    await screen.findByRole('heading', { name: 'Chọn thời gian buổi chụp' });
    expect(JSON.parse(sessionStorage.getItem(CONCEPT_DRAFT_KEY) || '{}').packageId).toBe('pkg-1');
  });

  it('keeps legacy packages readable without empty presentation sections', async () => {
    const legacy = structuredClone(catalog);
    for (const field of ['introduction', 'studioSupport', 'delivery', 'showcase'] as const)
      delete legacy.packages[0][field];
    vi.mocked(conceptService.catalog).mockResolvedValue(legacy);
    renderWizard('/concept-booking/packages/pkg-1');
    await screen.findByRole('heading', { name: 'Gói riêng' });
    expect(screen.getByText('Mô tả')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Studio đồng hành cùng bạn' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Thời gian giao ảnh')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xem ảnh giới thiệu/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bộ ảnh bạn nhận được' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chọn gói này' })).toBeInTheDocument();
  });

  it('opens details by URL and handles packages which are no longer available', async () => {
    renderWizard('/concept-booking/packages/missing');
    await screen.findByRole('heading', { name: 'Gói chụp không còn khả dụng' });
    expect(screen.queryByRole('button', { name: 'Chọn gói này' })).not.toBeInTheDocument();
    expect(conceptService.checkout).not.toHaveBeenCalled();
  });

  it('does not bypass details on a fresh direct date link', async () => {
    renderWizard('/concept-booking/packages/pkg-1/book/date');
    await screen.findByRole('heading', { name: 'Gói riêng' });
    expect(screen.getByRole('button', { name: 'Chọn gói này' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Chọn thời gian buổi chụp' }),
    ).not.toBeInTheDocument();
  });

  it('does not create an order while choosing a package, date, photographer and brief', async () => {
    renderWizard();
    await fillWizard();
    expect(conceptService.checkout).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Tạo QR/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /QR/ })).not.toBeInTheDocument();
    expect(sessionStorage.getItem(CONCEPT_DRAFT_KEY)).toContain('Khách An');
    expect(screen.getByRole('button', { name: 'Tiếp theo' })).toBeDisabled();
  });
  it('preserves the draft but blocks QR creation for an unverified account', async () => {
    auth.user = { _id: 'client-1', roles: [6] };
    renderWizard();
    await fillWizard();
    expect(screen.getByRole('link', { name: 'Cập nhật và xác thực email' })).toHaveAttribute(
      'href',
      '/account/profile',
    );
    expect(screen.queryByRole('button', { name: 'Tiếp theo' })).not.toBeInTheDocument();
    expect(conceptService.checkout).not.toHaveBeenCalled();
  });
  it('submits the agreed package version without trusting client prices and reuses retry identity', async () => {
    vi.mocked(conceptService.checkout)
      .mockRejectedValueOnce({ response: { data: { message: 'Tạm mất kết nối' } } })
      .mockResolvedValueOnce({ _id: 'new-order' } as ConceptOrder);
    renderWizard();
    await fillWizard();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp theo' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp theo' }));
    await screen.findByText('Thanh toán cọc mới');
    const [first, second] = vi.mocked(conceptService.checkout).mock.calls;
    expect(first[1]).toEqual(second[1]);
    expect(first[0]).toMatchObject({
      packageId: 'pkg-1',
      packageVersion: 3,
      accepted: true,
      photographerId: 'photo-1',
    });
    expect(first[0]).not.toHaveProperty('price');
    expect(sessionStorage.getItem(CONCEPT_DRAFT_KEY)).toBeNull();
  });
  it('does not expose a previous account draft after switching accounts', async () => {
    sessionStorage.setItem(
      CONCEPT_DRAFT_KEY,
      JSON.stringify({
        ownerId: 'another-client',
        packageId: 'pkg-1',
        step: 5,
        contactName: 'Private Name',
        costumes: [],
      }),
    );
    renderWizard();
    await screen.findByRole('link', { name: 'Xem chi tiết Gói riêng' });
    expect(screen.queryByDisplayValue('Private Name')).not.toBeInTheDocument();
  });
  it('disables dates for which the server reports no suitable photographers', async () => {
    vi.mocked(conceptService.availability).mockImplementation(async (_id, day) => ({
      day,
      available: false,
      slots: [],
    }));
    renderWizard();
    fireEvent.click(await screen.findByRole('link', { name: 'Xem chi tiết Gói riêng' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Chọn gói này' }));
    await waitFor(() =>
      expect(screen.queryByText('Đang kiểm tra lịch trống…')).not.toBeInTheDocument(),
    );
    const dates = document.querySelectorAll('.concept-month-grid button');
    expect(dates).toHaveLength(30);
    dates.forEach((d) => expect(d).toBeDisabled());
    expect(
      screen.getByText('Ngày này chưa có khung giờ trống. Bạn vui lòng chọn ngày khác.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
  });
  it('respects the booking horizon and clears an old time when selecting another date', async () => {
    vi.mocked(conceptService.catalog).mockResolvedValue({
      ...catalog,
      settings: { ...catalog.settings, horizonDays: 3 },
    });
    renderWizard();
    fireEvent.click(await screen.findByRole('link', { name: 'Xem chi tiết Gói riêng' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Chọn gói này' }));
    await waitFor(() => expect(document.querySelector('[data-date="2026-11-14"]')).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Tháng trước' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tháng sau' })).toBeDisabled();
    expect(document.querySelector('[data-date="2026-11-10"]')).toBeDisabled();
    expect(document.querySelector('[data-date="2026-11-15"]')).toBeDisabled();
    expect(document.querySelector('[data-date="2026-11-11"]')).toHaveAttribute(
      'aria-current',
      'date',
    );
    expect(
      vi
        .mocked(conceptService.availability)
        .mock.calls.map((call) => call[1])
        .sort(),
    ).toEqual(['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14']);
    fireEvent.click(document.querySelector('[data-date="2026-11-14"]')!);
    fireEvent.click(screen.getByRole('button', { name: /17:00/ }));
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeEnabled();
    fireEvent.click(document.querySelector('[data-date="2026-11-12"]')!);
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
    expect(screen.getByText('Chưa chọn khung giờ')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(CONCEPT_DRAFT_KEY) || '{}').startAt).toBe('');
    expect(conceptService.checkout).not.toHaveBeenCalled();
  });
  it('navigates months across the year and stops at the last bookable month', async () => {
    renderWizard();
    fireEvent.click(await screen.findByRole('link', { name: 'Xem chi tiết Gói riêng' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Chọn gói này' }));
    await screen.findByRole('heading', { name: 'Tháng 11, 2026' });
    await waitFor(() => expect(document.querySelector('[data-date="2026-11-14"]')).toBeEnabled());
    const initialCalls = vi
      .mocked(conceptService.availability)
      .mock.calls.filter((call) => call[1].startsWith('2026-11')).length;
    fireEvent.click(screen.getByRole('button', { name: 'Tháng sau' }));
    await waitFor(() => expect(document.querySelector('[data-date="2026-12-01"]')).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Tháng trước' }));
    await waitFor(() => expect(document.querySelector('[data-date="2026-11-14"]')).toBeEnabled());
    expect(
      vi
        .mocked(conceptService.availability)
        .mock.calls.filter((call) => call[1].startsWith('2026-11')),
    ).toHaveLength(initialCalls);
    for (const month of [12, 1, 2]) {
      fireEvent.click(screen.getByRole('button', { name: 'Tháng sau' }));
      await screen.findByRole('heading', { name: `Tháng ${month}, ${month === 12 ? 2026 : 2027}` });
    }
    await waitFor(() => expect(document.querySelector('[data-date="2027-02-09"]')).toBeEnabled());
    expect(document.querySelectorAll('.concept-month-grid button')).toHaveLength(28);
    expect(document.querySelector('[data-date="2027-02-10"]')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tháng sau' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tháng trước' })).toBeEnabled();
  });
  it('retries failed availability without allowing a stale time to continue', async () => {
    vi.mocked(conceptService.availability).mockRejectedValueOnce(new Error('Không tải được lịch.'));
    renderWizard();
    fireEvent.click(await screen.findByRole('link', { name: 'Xem chi tiết Gói riêng' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Chọn gói này' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Thử tải lại lịch' }));
    await waitFor(() => expect(document.querySelector('[data-date="2026-11-14"]')).toBeEnabled());
    expect(screen.queryByRole('button', { name: 'Thử tải lại lịch' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
  });
  it('blocks a restored time which is no longer available', async () => {
    sessionStorage.setItem(
      CONCEPT_DRAFT_KEY,
      JSON.stringify({
        ownerId: 'client-1',
        packageId: 'pkg-1',
        step: 2,
        startAt: '2026-11-14T10:00:00.000Z',
        costumes: [],
      }),
    );
    vi.mocked(conceptService.availability).mockResolvedValue({
      day: '2026-11-14',
      available: false,
      slots: [],
    });
    renderWizard('/concept-booking/packages/pkg-1/book/date');
    await screen.findByText('Khung giờ đã chọn không còn khả dụng');
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
    expect(conceptService.checkout).not.toHaveBeenCalled();
  });
  it('refreshes availability if the selected time passes before continuing', async () => {
    renderWizard();
    fireEvent.click(await screen.findByRole('link', { name: 'Xem chi tiết Gói riêng' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Chọn gói này' }));
    await waitFor(() => expect(document.querySelector('[data-date="2026-11-11"]')).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /17:00/ }));
    vi.mocked(Date.now).mockReturnValue(Date.parse('2026-11-11T11:00:00Z'));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await screen.findByText('Khung giờ đã qua. Vui lòng chọn khung giờ khác.');
    await waitFor(() => expect(document.querySelector('[data-date="2026-11-11"]')).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
    expect(conceptService.checkout).not.toHaveBeenCalled();
  });
});
it('guest album uses an independent read-only client and offers no selection, feedback or download', async () => {
  vi.mocked(conceptService.guestAlbum).mockResolvedValue({
    title: 'Album riêng',
    version: 1,
    status: 'selecting',
    deliveryVersion: 0,
    allowDownload: false,
    photos: [],
    deliveries: [],
  } as unknown as ConceptAlbum);
  window.history.replaceState({}, '', '/concept-albums/public-id#access=share-token');
  render(
    <MemoryRouter initialEntries={['/concept-albums/public-id']}>
      <Routes>
        <Route path="/concept-albums/:publicId" element={<GuestConceptAlbumPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Album riêng' });
  expect(conceptService.guestAlbum).toHaveBeenCalledWith(
    'public-id',
    'share-token',
    expect.any(AbortSignal),
  );
  expect(screen.queryByRole('button', { name: /Chốt|Gửi|Tải/ })).not.toBeInTheDocument();
});
