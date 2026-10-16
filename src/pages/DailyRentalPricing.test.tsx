import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAppearanceContext } from '../components/customer/CustomerAppearance';
import { RENTAL_DRAFT_KEY } from '../services/rentalDraft';
import type { RentalOrder } from '../services/rentalService';
import NewRentalPage from './NewRentalPage';
import RentalDetailPage from './RentalDetailPage';
import CostumesPage from './CostumesPage';

const mocks = vi.hoisted(() => ({
  catalog: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  action: vi.fn(),
  costumes: vi.fn(),
  updateCostume: vi.fn(),
  auth: { user: { _id: 'customer-1', roles: [6] } as { _id: string; roles: number[] } | null },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../services/costumeService', () => ({
  costumeService: {
    getPublicCatalog: mocks.catalog,
    getAll: mocks.costumes,
    update: mocks.updateCostume,
  },
}));
vi.mock('../services/costumeTypeService', () => ({
  costumeTypeService: { getAll: async () => [] },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../services/bookingWorkflowService', () => ({
  createWorkflowRequestId: () => 'request-1',
}));
vi.mock('../services/rentalService', async () => ({
  ...(await vi.importActual('../services/rentalService')),
  rentalService: { get: mocks.get, create: mocks.create, act: mocks.action },
}));

const receive = '2099-10-10';
const returned = '2099-10-12';
const item = {
  _id: 'costume-1',
  name: 'Áo dài',
  rentalPrice: 9999999,
  rentalDailyPrice: 50000,
  sizes: ['M'],
  availableBySize: { M: 3 },
};
const path = `/rental/start?receiveDate=${receive}&returnDate=${returned}`;

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderNew(url = '/rental/start') {
  return render(
    <CustomerAppearanceContext.Provider value={true}>
      <MemoryRouter initialEntries={[url]}>
        <NewRentalPage />
        <Location />
      </MemoryRouter>
    </CustomerAppearanceContext.Provider>,
  );
}
async function choose(quantity = '2') {
  await screen.findByRole('option', { name: 'Áo dài' });
  fireEvent.change(screen.getByLabelText('Mẫu thuê 1'), { target: { value: item._id } });
  fireEvent.change(screen.getByLabelText('Kích cỡ 1'), { target: { value: 'M' } });
  fireEvent.change(screen.getByLabelText('Số lượng 1'), { target: { value: quantity } });
  fireEvent.change(screen.getByLabelText('Người liên hệ'), { target: { value: 'Khách thuê' } });
  fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0901234567' } });
}
function orderFixture(): RentalOrder {
  return {
    _id: 'rental-1',
    version: 2,
    status: 'quoting',
    pricingMode: 'daily',
    contactName: 'Khách thuê',
    note: '',
    requestedReceiveDate: receive,
    requestedReturnDate: returned,
    requestedLines: [
      { costumeId: item._id, name: item.name, size: 'M', quantity: 2, unitPrice: 50000 },
    ],
    quote: {
      version: 1,
      pricingMode: 'daily',
      rentalDays: 3,
      receiveDate: receive,
      returnDate: returned,
      lines: [{ costumeId: item._id, name: item.name, size: 'M', quantity: 2, unitPrice: 50000 }],
      fee: 300000,
      deposit: 500000,
      terms: ['Cọc riêng'],
    },
    quoteHistory: [],
    readyForHandover: false,
    returns: [],
    change: null,
    events: [],
    createdAt: receive,
    updatedAt: receive,
  };
}
function renderDetail(order: RentalOrder) {
  mocks.get.mockResolvedValue(order);
  return render(
    <MemoryRouter initialEntries={['/rentals/rental-1']}>
      <Routes>
        <Route path="/rentals/:id" element={<RentalDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.auth.user = { _id: 'customer-1', roles: [6] };
  mocks.catalog.mockResolvedValue([item]);
});

describe('date-first daily rental form', () => {
  it('does not load or show products until both dates are valid', async () => {
    renderNew();
    expect(screen.getByLabelText('Ngày nhận mong muốn')).toHaveValue('');
    expect(screen.queryByLabelText('Mẫu thuê 1')).not.toBeInTheDocument();
    expect(mocks.catalog).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Ngày nhận mong muốn'), { target: { value: receive } });
    expect(mocks.catalog).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Ngày trả mong muốn'), { target: { value: returned } });
    await screen.findByLabelText('Mẫu thuê 1');
    expect(mocks.catalog).toHaveBeenCalledWith({ receiveDate: receive, returnDate: returned });
  });

  it('uses daily rate times quantity times inclusive days and preserves dates in preview payload', async () => {
    mocks.create.mockResolvedValue({ _id: 'rental-1' });
    renderNew(path);
    await choose();
    expect(screen.getByText(/Tiền thuê dự kiến:/)).toHaveTextContent('300.000');
    expect(screen.getByText(/Tiền thuê dự kiến:/)).not.toHaveTextContent('9.999.999');
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' }));
    expect(screen.getByRole('heading', { name: 'Kiểm tra yêu cầu thuê' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu thuê' }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          receiveDate: receive,
          returnDate: returned,
          lines: [{ costumeId: item._id, size: 'M', quantity: 2 }],
        }),
        'request-1',
      ),
    );
  });

  it('does not substitute the old period price when daily rate is not configured', async () => {
    mocks.catalog.mockResolvedValue([{ ...item, rentalDailyPrice: null }]);
    renderNew(path);
    await choose();
    expect(screen.getByText(/Tiền thuê dự kiến:/)).toHaveTextContent('Studio sẽ báo giá theo ngày');
    expect(screen.queryByText('9.999.999')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' })).toBeEnabled();
  });

  it('preserves chosen rows and disables preview if a new range has insufficient stock', async () => {
    renderNew(path);
    await choose();
    mocks.catalog.mockResolvedValue([{ ...item, availableBySize: { M: 1 } }]);
    fireEvent.change(screen.getByLabelText('Ngày trả mong muốn'), {
      target: { value: '2099-10-13' },
    });
    await screen.findByText(/Lựa chọn này không đủ hàng/);
    expect(screen.getByLabelText('Số lượng 1')).toHaveValue(2);
    expect(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' })).toBeDisabled();
    expect(screen.getByLabelText('Số lượng 1')).toHaveAttribute('max', '1');
  });

  it('ignores a late response for the previous date range', async () => {
    let resolveOld!: (items: (typeof item)[]) => void;
    mocks.catalog.mockImplementationOnce(
      () =>
        new Promise<(typeof item)[]>((resolve) => {
          resolveOld = resolve;
        }),
    );
    renderNew(path);
    await waitFor(() => expect(mocks.catalog).toHaveBeenCalledTimes(1));
    mocks.catalog.mockResolvedValue([{ ...item, name: 'Mẫu kỳ mới' }]);
    fireEvent.change(screen.getByLabelText('Ngày trả mong muốn'), {
      target: { value: '2099-10-13' },
    });
    await screen.findByRole('option', { name: 'Mẫu kỳ mới' });
    await act(async () => resolveOld([item]));
    expect(screen.queryByRole('option', { name: 'Áo dài' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mẫu kỳ mới' })).toBeInTheDocument();
  });

  it('restores the draft across login and rechecks the same date range before showing preview', async () => {
    sessionStorage.setItem(
      RENTAL_DRAFT_KEY,
      JSON.stringify({
        ownerId: null,
        contactName: 'Khách thuê',
        phone: '0901234567',
        note: '',
        receiveDate: receive,
        returnDate: returned,
        lines: [{ costumeId: item._id, size: 'M', quantity: '2' }],
        preview: true,
      }),
    );
    renderNew();
    await screen.findByRole('heading', { name: 'Kiểm tra yêu cầu thuê' });
    expect(mocks.catalog).toHaveBeenCalledWith({ receiveDate: receive, returnDate: returned });
    expect(screen.getByText(/Tiền thuê dự kiến:/)).toHaveTextContent('300.000');
  });

  it('keeps edited dates in the URL and login return path rather than restoring the original range', async () => {
    mocks.auth.user = null;
    renderNew(path);
    await choose();
    fireEvent.change(screen.getByLabelText('Ngày trả mong muốn'), {
      target: { value: '2099-10-13' },
    });
    await waitFor(() =>
      expect(mocks.catalog).toHaveBeenLastCalledWith({
        receiveDate: receive,
        returnDate: '2099-10-13',
      }),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('returnDate=2099-10-13');
    await screen.findByRole('button', { name: 'Xem lại yêu cầu thuê' });
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập để gửi yêu cầu thuê' }));
    expect(decodeURIComponent(screen.getByTestId('location').textContent!)).toContain(
      '/login?returnTo=/rental/start?receiveDate=2099-10-10&returnDate=2099-10-13',
    );
    expect(JSON.parse(sessionStorage.getItem(RENTAL_DRAFT_KEY)!)).toMatchObject({
      receiveDate: receive,
      returnDate: '2099-10-13',
      preview: true,
    });
  });
});

describe('daily and legacy rental detail', () => {
  it('shows daily formula without classifying multiple days as extension charges', async () => {
    renderDetail(orderFixture());
    await screen.findByText('Báo giá thuê phiên bản 1');
    expect(screen.getByText(/Đơn giá\/ngày:/)).toHaveTextContent('50.000 đ × 2 món × 3 ngày');
    expect(screen.queryByText(/Phí gia hạn đã đồng ý:/)).not.toBeInTheDocument();
  });

  it('keeps old orders and historical quotes on period pricing', async () => {
    const order = orderFixture();
    delete order.pricingMode;
    delete order.quote!.pricingMode;
    order.quote!.fee = 100000;
    renderDetail(order);
    await screen.findByText(/Đơn giá kỳ thuê ban đầu:/);
    expect(screen.queryByText(/Đơn giá\/ngày:/)).not.toBeInTheDocument();
  });

  it('leaves an unknown daily quote rate blank instead of zero for staff', async () => {
    mocks.auth.user = { _id: 'sale-1', roles: [2] };
    const order = orderFixture();
    order.quote = null;
    delete order.requestedLines[0].unitPrice;
    renderDetail(order);
    const rate = await screen.findByLabelText('Đơn giá/ngày 1 (đ)');
    expect(rate).toHaveValue(null);
    expect(rate).toHaveAttribute('min', '1');
    fireEvent.change(rate, { target: { value: '50000' } });
    expect(screen.getByText(/Tổng phí thuê:/)).toHaveTextContent('300.000 đ · 3 ngày');
  });

  it('keeps daily extension fee readonly and lets the server calculate its value', async () => {
    mocks.auth.user = { _id: 'admin-1', roles: [0] };
    const order = orderFixture();
    order.status = 'confirmed';
    order.quote!.acceptedAt = receive;
    order.change = {
      _id: 'change-1',
      kind: 'extend',
      status: 'requested',
      returnDate: '2099-10-13',
      note: 'Gia hạn',
      terms: [],
    };
    mocks.action.mockResolvedValue(order);
    renderDetail(order);
    await screen.findByText(/Phí thuê cuối theo ngày:/);
    expect(screen.queryByLabelText('Phí thuê cuối sau thay đổi (đ)')).not.toBeInTheDocument();
    expect(screen.getByText(/Phí thuê cuối theo ngày:/)).toHaveTextContent('400.000 đ');
    fireEvent.change(screen.getByLabelText('Điều khoản thay đổi đơn thuê'), {
      target: { value: 'Giữ đơn giá/ngày' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đề xuất thay đổi đơn thuê' }));
    await waitFor(() =>
      expect(mocks.action).toHaveBeenCalledWith(
        'rental-1',
        2,
        'change.propose',
        { terms: ['Giữ đơn giá/ngày'] },
        'request-1',
      ),
    );
  });
});

describe('separate daily rate in staff inventory', () => {
  beforeEach(() =>
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    ),
  );
  afterEach(() => vi.unstubAllGlobals());

  async function editCostume() {
    mocks.costumes.mockResolvedValue([
      { ...item, gender: 'unisex', itemKind: 'clothing', isRentalItem: true, inventory: [] },
    ]);
    mocks.updateCostume.mockResolvedValue({});
    render(<CostumesPage />);
    const edits = await screen.findAllByRole('button', { name: 'Sửa' });
    fireEvent.click(edits[0]);
    expect(screen.getByLabelText('Giá thuê kỳ cũ (đồng)')).toHaveValue(item.rentalPrice);
  }

  it('saves a separate daily price while preserving the old period price', async () => {
    await editCostume();
    fireEvent.change(screen.getByLabelText('Giá thuê/ngày (đồng)'), { target: { value: '75000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(mocks.updateCostume).toHaveBeenCalledWith(
        item._id,
        expect.objectContaining({ rentalPrice: item.rentalPrice, rentalDailyPrice: 75000 }),
      ),
    );
  });

  it('clears the daily rate to null rather than zero or the legacy price', async () => {
    await editCostume();
    fireEvent.change(screen.getByLabelText('Giá thuê/ngày (đồng)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(mocks.updateCostume).toHaveBeenCalledWith(
        item._id,
        expect.objectContaining({ rentalPrice: item.rentalPrice, rentalDailyPrice: null }),
      ),
    );
  });
});
