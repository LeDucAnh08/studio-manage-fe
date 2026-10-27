import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAppearanceContext } from '../components/customer/CustomerAppearance';
import { RENTAL_DRAFT_KEY } from '../services/rentalDraft';
import type { RentalOrder } from '../services/rentalService';
import NewRentalPage from './NewRentalPage';
import RentalDetailPage from './RentalDetailPage';
import CostumesPage from './CostumesPage';

const mocks = vi.hoisted(() => ({
  rentalEnabled: true,
  catalog: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  action: vi.fn(),
  costumes: vi.fn(),
  updateCostume: vi.fn(),
  auth: { user: { _id: 'customer-1', roles: [6] } as { _id: string; roles: number[] } | null },
}));
vi.mock('../config/features', () => ({
  get clientRentalEnabled() {
    return mocks.rentalEnabled;
  },
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
function storePreviewDraft() {
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
  mocks.rentalEnabled = true;
  sessionStorage.clear();
  mocks.auth.user = { _id: 'customer-1', roles: [6] };
  mocks.catalog.mockResolvedValue([item]);
});

describe('date-first daily rental form', () => {
  it.each([true, false])(
    'keeps the form and draft available without sending or login redirects when paused (authenticated=%s)',
    async (authenticated) => {
      mocks.rentalEnabled = false;
      mocks.auth.user = authenticated ? { _id: 'customer-1', roles: [6] } : null;
      renderNew(`${path}&item=${item._id}`);
      await choose();
      expect(screen.getByLabelText('Mẫu thuê 1')).toHaveValue(item._id);
      const period = screen.getByRole('region', { name: 'Kỳ thuê' });
      expect(within(period).getByLabelText('Ngày nhận')).toHaveValue(receive);
      expect(within(period).getByLabelText('Ngày trả')).toHaveValue(returned);
      expect(document.querySelectorAll('input[type="date"]')).toHaveLength(2);
      fireEvent.click(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' }));
      await screen.findByRole('heading', { name: 'Kiểm tra yêu cầu thuê' });
      const send = screen.getByRole('button', {
        name: authenticated ? 'Gửi yêu cầu thuê' : 'Đăng nhập để gửi yêu cầu thuê',
      });
      expect(send).toBeDisabled();
      fireEvent.click(send);
      expect(mocks.create).not.toHaveBeenCalled();
      expect(screen.getByTestId('location')).toHaveTextContent('/rental/start?');
      expect(screen.getByTestId('location')).not.toHaveTextContent('/login');
      expect(JSON.parse(sessionStorage.getItem(RENTAL_DRAFT_KEY)!)).toMatchObject({
        contactName: 'Khách thuê',
        phone: '0901234567',
        receiveDate: receive,
        returnDate: returned,
      });
    },
  );

  it('allows editing rental dates inline and keeps a readable period summary', async () => {
    const first = renderNew();
    expect(screen.getByRole('heading', { name: 'Thông tin thuê trang phục' })).toHaveFocus();
    expect(document.querySelectorAll('input[type="date"]')).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('Chọn đủ ngày nhận và ngày trả');
    expect(screen.getByRole('link', { name: 'Danh mục trang phục' })).toHaveAttribute(
      'href',
      '/costumes',
    );
    expect(screen.queryByLabelText('Mẫu thuê 1')).not.toBeInTheDocument();
    expect(mocks.catalog).not.toHaveBeenCalled();
    first.unmount();
    renderNew(path);
    await screen.findByLabelText('Mẫu thuê 1');
    const period = screen.getByRole('region', { name: 'Kỳ thuê' });
    expect(within(period).getByLabelText('Ngày nhận')).toHaveValue(receive);
    expect(within(period).getByLabelText('Ngày trả')).toHaveValue(returned);
    expect(period).toHaveTextContent('3 ngày thuê');
    expect(document.querySelectorAll('input[type="date"]')).toHaveLength(2);
    const changePeriod = screen.getByRole('link', { name: 'Danh mục trang phục' });
    expect(changePeriod).toHaveAttribute(
      'href',
      `/costumes?receiveDate=${receive}&returnDate=${returned}`,
    );
    expect(mocks.catalog).toHaveBeenCalledWith({ receiveDate: receive, returnDate: returned });
  });

  it.each([
    { query: `receiveDate=${receive}`, receiveDate: receive, returnDate: '', error: 'Chọn đủ' },
    { query: `returnDate=${returned}`, receiveDate: '', returnDate: returned, error: 'Chọn đủ' },
    { query: 'receiveDate=&returnDate=', receiveDate: '', returnDate: '', error: 'Chọn đủ' },
    {
      query: 'receiveDate=2099-02-30&returnDate=2099-03-01',
      receiveDate: '2099-02-30',
      returnDate: '2099-03-01',
      error: 'không hợp lệ',
    },
    {
      query: 'receiveDate=2000-01-01&returnDate=2000-01-02',
      receiveDate: '2000-01-01',
      returnDate: '2000-01-02',
      error: 'hôm nay',
    },
  ])(
    'does not mix a supplied invalid or incomplete period with the saved pair: $query',
    async (entry) => {
      storePreviewDraft();
      renderNew(`/rental/start?${entry.query}`);
      expect(await screen.findByRole('alert')).toHaveTextContent(entry.error);
      expect(document.querySelectorAll('input[type="date"]')).toHaveLength(2);
      expect(screen.queryByLabelText('Mẫu thuê 1')).not.toBeInTheDocument();
      expect(mocks.catalog).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
      expect(JSON.parse(sessionStorage.getItem(RENTAL_DRAFT_KEY)!)).toMatchObject({
        receiveDate: entry.receiveDate,
        returnDate: entry.returnDate,
        preview: false,
      });
      const changePeriod = new URL(
        screen.getByRole('link', { name: 'Danh mục trang phục' }).getAttribute('href')!,
        'http://localhost',
      );
      expect(changePeriod.pathname).toBe('/costumes');
      expect(changePeriod.searchParams.get('receiveDate')).toBe(entry.receiveDate || null);
      expect(changePeriod.searchParams.get('returnDate')).toBe(entry.returnDate || null);
    },
  );

  it('uses daily rate times quantity times inclusive days and preserves dates in preview payload', async () => {
    mocks.create.mockResolvedValue({ _id: 'rental-1' });
    renderNew(path);
    await choose();
    expect(screen.getByText(/Tạm tính:/)).toHaveTextContent('300.000');
    expect(screen.getByText(/Tạm tính:/)).not.toHaveTextContent('9.999.999');
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' }));
    expect(screen.getByRole('heading', { name: 'Kiểm tra yêu cầu thuê' })).toBeInTheDocument();
    expect(document.querySelectorAll('input[type="date"]')).toHaveLength(2);
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

  it('edits the rental period inline, restores the new period and rechecks inventory without reducing quantities', async () => {
    const page = renderNew(path);
    await choose();
    fireEvent.change(screen.getByLabelText('Ngày trả'), { target: { value: '2099-10-13' } });
    await waitFor(() =>
      expect(mocks.catalog).toHaveBeenLastCalledWith({
        receiveDate: receive,
        returnDate: '2099-10-13',
      }),
    );
    await waitFor(() => expect(screen.getByText(/Tạm tính:/)).toHaveTextContent('400.000'));
    expect(screen.getByRole('complementary', { name: 'Tóm tắt kỳ thuê' })).toHaveTextContent(
      '2 món · 4 ngày',
    );
    const url = screen.getByTestId('location').textContent!;
    expect(url).toContain('returnDate=2099-10-13');
    page.unmount();
    renderNew(url);
    await screen.findByLabelText('Mẫu thuê 1');
    expect(screen.getByLabelText('Ngày trả')).toHaveValue('2099-10-13');
    expect(screen.getByLabelText('Số lượng 1')).toHaveValue(2);
    expect(screen.getByLabelText('Người liên hệ')).toHaveValue('Khách thuê');
    mocks.catalog.mockResolvedValue([{ ...item, availableBySize: { M: 1 } }]);
    fireEvent.change(screen.getByLabelText('Ngày trả'), { target: { value: '2099-10-14' } });
    await screen.findByText(/Lựa chọn này không đủ hàng/);
    expect(screen.getByLabelText('Số lượng 1')).toHaveValue(2);
    expect(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' })).toBeDisabled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('keeps item totals, quantity bounds and the submitted request in sync while editing multiple items', async () => {
    const accessory = {
      ...item,
      _id: 'accessory-1',
      name: 'Nón lá Huế quai lụa',
      rentalDailyPrice: 15000,
      sizes: ['FREE'],
      availableBySize: { FREE: 2 },
    };
    mocks.catalog.mockResolvedValue([{ ...item, rentalDailyPrice: 125000 }, accessory]);
    mocks.create.mockResolvedValue({ _id: 'rental-1' });
    renderNew(path);
    await choose();

    const firstQuantity = screen.getByLabelText('Số lượng 1');
    fireEvent.click(screen.getByRole('button', { name: 'Tăng số lượng 1' }));
    expect(firstQuantity).toHaveValue(3);
    expect(screen.getByRole('button', { name: 'Tăng số lượng 1' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Giảm số lượng 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Giảm số lượng 1' }));
    expect(firstQuantity).toHaveValue(1);
    expect(screen.getByRole('button', { name: 'Giảm số lượng 1' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tăng số lượng 1' }));

    fireEvent.click(screen.getByRole('button', { name: 'Thêm món thuê' }));
    fireEvent.change(screen.getByLabelText('Mẫu thuê 2'), {
      target: { value: accessory._id },
    });
    fireEvent.change(screen.getByLabelText('Kích cỡ 2'), { target: { value: 'FREE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tăng số lượng 2' }));
    expect(screen.getByLabelText('Số lượng 2')).toHaveValue(2);
    expect(screen.getByRole('button', { name: 'Tăng số lượng 2' })).toBeDisabled();
    expect(
      within(screen.getByRole('group', { name: 'Món thuê 1' })).getByText(/750\.000/),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Món thuê 2' })).getByText(/90\.000/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tạm tính:/)).toHaveTextContent('840.000');

    fireEvent.click(screen.getByRole('button', { name: 'Thêm món thuê' }));
    expect(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ món 3' }));
    expect(screen.queryByLabelText('Mẫu thuê 3')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mẫu thuê 1')).toHaveValue(item._id);
    expect(screen.getByLabelText('Mẫu thuê 2')).toHaveValue(accessory._id);
    expect(screen.getByText(/Tạm tính:/)).toHaveTextContent('840.000');
    fireEvent.change(screen.getByLabelText('Ghi chú thuê'), {
      target: { value: '  Nhận tại studio  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' }));
    expect(screen.getByRole('heading', { name: 'Kiểm tra yêu cầu thuê' })).toBeInTheDocument();
    expect(screen.getByText(/Tạm tính:/)).toHaveTextContent('840.000');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu thuê' }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        {
          contactName: 'Khách thuê',
          phone: '0901234567',
          note: 'Nhận tại studio',
          receiveDate: receive,
          returnDate: returned,
          lines: [
            { costumeId: item._id, size: 'M', quantity: 2 },
            { costumeId: accessory._id, size: 'FREE', quantity: 2 },
          ],
        },
        'request-1',
      ),
    );
  });

  it('does not substitute the old period price when daily rate is not configured', async () => {
    mocks.catalog.mockResolvedValue([{ ...item, rentalDailyPrice: null }]);
    renderNew(path);
    await choose();
    expect(screen.getByText(/Tạm tính:/)).toHaveTextContent('Studio sẽ báo giá theo ngày');
    expect(screen.queryByText('9.999.999')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' })).toBeEnabled();
  });

  it('preserves chosen rows and disables preview if a new range has insufficient stock', async () => {
    const first = renderNew(path);
    await choose();
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' }));
    expect(screen.getByRole('heading', { name: 'Kiểm tra yêu cầu thuê' })).toBeInTheDocument();
    first.unmount();
    mocks.catalog.mockResolvedValue([{ ...item, availableBySize: { M: 1 } }]);
    renderNew(`/rental/start?receiveDate=${receive}&returnDate=2099-10-13`);
    await screen.findByText(/Lựa chọn này không đủ hàng/);
    expect(mocks.catalog).toHaveBeenLastCalledWith({
      receiveDate: receive,
      returnDate: '2099-10-13',
    });
    expect(
      screen.queryByRole('heading', { name: 'Kiểm tra yêu cầu thuê' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mẫu thuê 1')).toHaveValue(item._id);
    expect(screen.getByLabelText('Kích cỡ 1')).toHaveValue('M');
    expect(screen.getByLabelText('Số lượng 1')).toHaveValue(2);
    expect(screen.getByLabelText('Người liên hệ')).toHaveValue('Khách thuê');
    expect(screen.getByLabelText('Số điện thoại')).toHaveValue('0901234567');
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
    const first = renderNew(path);
    await waitFor(() => expect(mocks.catalog).toHaveBeenCalledTimes(1));
    first.unmount();
    mocks.catalog.mockResolvedValue([{ ...item, name: 'Mẫu kỳ mới' }]);
    renderNew(`/rental/start?receiveDate=${receive}&returnDate=2099-10-13`);
    await screen.findByRole('option', { name: 'Mẫu kỳ mới' });
    await act(async () => resolveOld([item]));
    expect(screen.queryByRole('option', { name: 'Áo dài' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mẫu kỳ mới' })).toBeInTheDocument();
  });

  it('restores the draft across login and rechecks the same date range before showing preview', async () => {
    storePreviewDraft();
    renderNew();
    await screen.findByRole('heading', { name: 'Kiểm tra yêu cầu thuê' });
    expect(mocks.catalog).toHaveBeenCalledWith({ receiveDate: receive, returnDate: returned });
    expect(screen.getByText(/Tạm tính:/)).toHaveTextContent('300.000');
  });

  it('keeps the period chosen outside the form through login rather than restoring the old draft dates', async () => {
    mocks.auth.user = null;
    const first = renderNew(`${path}&item=${item._id}`);
    await choose();
    first.unmount();
    renderNew(`/rental/start?receiveDate=${receive}&returnDate=2099-10-13&item=${item._id}`);
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
    const loginUrl = new URL(screen.getByTestId('location').textContent!, 'http://localhost');
    expect(loginUrl.pathname).toBe('/login');
    const returnTo = new URL(loginUrl.searchParams.get('returnTo')!, 'http://localhost');
    expect(returnTo.pathname).toBe('/rental/start');
    expect(returnTo.searchParams.get('receiveDate')).toBe(receive);
    expect(returnTo.searchParams.get('returnDate')).toBe('2099-10-13');
    expect(returnTo.searchParams.get('item')).toBe(item._id);
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
