import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAppearanceContext } from '../components/customer/CustomerAppearance';
import { RENTAL_DRAFT_KEY } from '../services/rentalDraft';
import type { RentalOrder } from '../services/rentalService';
import NewRentalPage from './NewRentalPage';
import RentalDetailPage from './RentalDetailPage';
import CostumesPage from './CostumesPage';
import RentalCatalogPage from './RentalCatalogPage';

const mocks = vi.hoisted(() => ({
  catalog: vi.fn(),
  policy: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  action: vi.fn(),
  costumes: vi.fn(),
  updateCostume: vi.fn(),
  auth: { user: { _id: 'customer-1', roles: [6] } as { _id: string; roles: number[] } | null },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../components/Layout/PublicSiteLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
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
  rentalService: { get: mocks.get, create: mocks.create, act: mocks.action, policy: mocks.policy },
}));

const receive = '2099-10-10';
const returned = '2099-10-12';
const item = {
  _id: 'costume-1',
  name: 'Áo dài',
  gender: 'female',
  itemKind: 'clothing',
  rentalPrice: 9999999,
  rentalDailyPrice: 50000,
  rentalSecurityDeposit: 100000,
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
        <Routes>
          <Route path="/rental/start" element={<NewRentalPage />} />
          <Route path="/costumes" element={<RentalCatalogPage />} />
          <Route path="*" element={null} />
        </Routes>
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
  sessionStorage.clear();
  mocks.auth.user = { _id: 'customer-1', roles: [6] };
  mocks.catalog.mockResolvedValue([item]);
  mocks.policy.mockResolvedValue({
    version: 'rental-auto-v1',
    holdMinutes: 15,
    depositPercent: 30,
    maxPending: 2,
    leadHours: 24,
    turnaroundDays: 1,
    openHour: 9,
    closeHour: 17,
    closedWeekdays: [],
    terms: ['Sau khi ghi nhận cọc không được hủy/đổi đơn.'],
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('date-first daily rental form', () => {
  it('uses a 30% advance and permits checkout without the old per-item security deposit', async () => {
    mocks.catalog.mockResolvedValue([{ ...item, rentalSecurityDeposit: null }]);
    renderNew(path);
    await choose();
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' }));
    expect(
      within(screen.getByRole('complementary', { name: 'Tóm tắt kỳ thuê' })).getByText(
        /Cọc trước 30%:/,
      ),
    ).toHaveTextContent('90.000');
    expect(screen.getByText(/Còn thanh toán trước khi nhận đồ:/)).toHaveTextContent('210.000');
    fireEvent.click(await screen.findByRole('checkbox', { name: /Tôi đã đọc/ }));
    expect(screen.getByRole('button', { name: 'Đặt thuê và thanh toán cọc' })).toBeEnabled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('consumes an add-item selection once, including another size of an existing model', async () => {
    storePreviewDraft();
    const page = renderNew(`${path}&item=${item._id}&add=1`);
    await screen.findByLabelText('Mẫu thuê 2');
    expect(screen.getByLabelText('Mẫu thuê 1')).toHaveValue(item._id);
    expect(screen.getByLabelText('Số lượng 1')).toHaveValue(2);
    expect(screen.getByLabelText('Mẫu thuê 2')).toHaveValue(item._id);
    expect(screen.getByLabelText('Kích cỡ 2')).toHaveValue('');
    const restoredUrl = screen.getByTestId('location').textContent!;
    expect(restoredUrl).not.toContain('item=');
    expect(restoredUrl).not.toContain('add=');
    page.unmount();
    renderNew(restoredUrl);
    await screen.findByLabelText('Mẫu thuê 2');
    expect(screen.queryByLabelText('Mẫu thuê 3')).not.toBeInTheDocument();
  });
  it('adds a catalog model to an existing draft once, preserves prior quantities, and does not re-add a removed model after repricing', async () => {
    const second = { ...item, _id: 'costume-2', name: 'Vest xanh' };
    mocks.catalog.mockResolvedValue([item, second]);
    storePreviewDraft();
    const selectedPath = `${path}&item=${second._id}`;
    const page = renderNew(selectedPath);
    await screen.findByLabelText('Mẫu thuê 2');
    expect(
      screen.queryByRole('heading', { name: 'Kiểm tra yêu cầu thuê' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mẫu thuê 1')).toHaveValue(item._id);
    expect(screen.getByLabelText('Số lượng 1')).toHaveValue(2);
    expect(screen.getByLabelText('Người liên hệ')).toHaveValue('Khách thuê');
    expect(screen.getByLabelText('Mẫu thuê 2')).toHaveValue(second._id);
    expect(screen.getByLabelText('Kích cỡ 2')).toHaveValue('');
    expect(screen.getByLabelText('Số lượng 2')).toHaveValue(1);
    page.unmount();
    renderNew(selectedPath);
    await screen.findByLabelText('Mẫu thuê 2');
    expect(screen.queryByLabelText('Mẫu thuê 3')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ món 2' }));
    fireEvent.change(screen.getByLabelText('Ngày trả'), { target: { value: '2099-10-13' } });
    await waitFor(() =>
      expect(mocks.catalog).toHaveBeenLastCalledWith({
        receiveDate: receive,
        returnDate: '2099-10-13',
      }),
    );
    await screen.findByLabelText('Mẫu thuê 1');
    expect(screen.queryByLabelText('Mẫu thuê 2')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Số lượng 1')).toHaveValue(2);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'allows submission by default and preserves guest login drafts (authenticated=%s)',
    async (authenticated) => {
      vi.stubEnv('VITE_CLIENT_RENTAL_ENABLED', 'false');
      mocks.auth.user = authenticated ? { _id: 'customer-1', roles: [6] } : null;
      mocks.create.mockResolvedValue({ _id: 'rental-1' });
      renderNew(path);
      await choose();
      expect(screen.queryByText(/Studio tạm ngưng/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' }));
      await screen.findByRole('heading', { name: 'Kiểm tra yêu cầu thuê' });
      const send = screen.getByRole('button', {
        name: authenticated ? 'Đặt thuê và thanh toán cọc' : 'Đăng nhập để đặt thuê',
      });
      expect(send).toBeDisabled();
      fireEvent.click(await screen.findByRole('checkbox', { name: /Tôi đã đọc/ }));
      expect(send).toBeEnabled();
      fireEvent.click(send);
      if (authenticated) {
        await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
        await waitFor(() =>
          expect(screen.getByTestId('location')).toHaveTextContent(
            '/account/rentals/rental-1?payment=deposit',
          ),
        );
      } else {
        expect(mocks.create).not.toHaveBeenCalled();
        expect(screen.getByTestId('location')).toHaveTextContent('/login?returnTo=');
        expect(JSON.parse(sessionStorage.getItem(RENTAL_DRAFT_KEY)!)).toMatchObject({
          contactName: 'Khách thuê',
          phone: '0901234567',
          receiveDate: receive,
          returnDate: returned,
          lines: [{ costumeId: item._id, size: 'M', quantity: '2' }],
        });
      }
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
    if (!screen.getByRole<HTMLInputElement>('checkbox', { name: /Tôi đã đọc/ }).checked)
      fireEvent.click(await screen.findByRole('checkbox', { name: /Tôi đã đọc/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Đặt thuê và thanh toán cọc' }));
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
    fireEvent.click(await screen.findByRole('link', { name: 'Quay lại yêu cầu thuê' }));
    await screen.findByLabelText('Mẫu thuê 1');
    expect(screen.queryByLabelText('Mẫu thuê 2')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Số lượng 1')).toHaveValue(2);
    expect(screen.getByLabelText('Người liên hệ')).toHaveValue('Khách thuê');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm món thuê' }));
    const selectAccessory = await screen.findByRole('link', { name: `Chọn mẫu ${accessory.name}` });
    expect(screen.getByLabelText(/Ngày nhận/)).toHaveValue(receive);
    expect(screen.getByLabelText(/Ngày trả/)).toHaveValue(returned);
    expect(screen.getByLabelText(/Ngày nhận/)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/Ngày trả/)).toHaveAttribute('readonly');
    fireEvent.click(selectAccessory);
    await screen.findByLabelText('Mẫu thuê 2');
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
    fireEvent.click(await screen.findByRole('link', { name: `Chọn mẫu ${item.name}` }));
    await screen.findByLabelText('Mẫu thuê 3');
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
    if (!screen.getByRole<HTMLInputElement>('checkbox', { name: /Tôi đã đọc/ }).checked)
      fireEvent.click(await screen.findByRole('checkbox', { name: /Tôi đã đọc/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Đặt thuê và thanh toán cọc' }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        {
          termsAccepted: true,
          policyVersion: 'rental-auto-v1',
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
    expect(screen.getByText(/Tạm tính:/)).toHaveTextContent('Mẫu chưa có giá');
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
    fireEvent.click(await screen.findByRole('checkbox', { name: /Tôi đã đọc/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập để đặt thuê' }));
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

describe('automatic paid rental terms', () => {
  it('presents the advance as part of the rental fee and shows the remaining 70%', async () => {
    const record = orderFixture();
    record.autoCheckout = true;
    record.status = 'confirmed';
    Object.assign(record.quote!, {
      depositKind: 'advance',
      depositPercent: 30,
      deposit: 90000,
      acceptedAt: receive,
    });
    record.payment = { netReceived: 90000, payable: 300000, due: 210000, refundDue: 0 };
    renderDetail(record);
    await screen.findByRole('heading', { name: 'Thanh toán tiền thuê' });
    expect(screen.getByText(/Cọc trước 30%:/)).toHaveTextContent('90.000');
    expect(screen.getByText(/Còn thu:/)).toHaveTextContent('210.000');
    expect(screen.getByText(/Cọc trước được trừ vào tiền thuê/)).toBeInTheDocument();
    expect(screen.queryByText(/Cọc bảo đảm được đối soát sau nhận trả/)).not.toBeInTheDocument();
  });

  it('records cash consistently and directs bank collections to receipt reconciliation', async () => {
    mocks.auth.user = { _id: 'finance-1', roles: [5] };
    const record = orderFixture();
    record.autoCheckout = true;
    record.status = 'confirmed';
    record.quote!.acceptedAt = '2026-11-10T00:00:00.000Z';
    record.payment = { netReceived: 100000, payable: 400000, due: 300000, refundDue: 0 };
    record.depositPayment = {
      provider: 'sepay',
      mode: 'sandbox',
      reference: 'RENT0000000000000001',
      bankName: 'QA Bank',
      accountNumber: 'SBSTUDIO001',
      accountName: 'QA Studio',
      amount: 0,
      depositRequired: 100000,
      expiresAt: '2099-10-10T00:00:00Z',
      status: 'paid',
      qrUrl: null,
      downloadUrl: null,
    };
    mocks.action.mockResolvedValue({ ...record, readyForHandover: true });
    renderDetail(record);
    await screen.findByLabelText('Phương thức thuê');
    expect(screen.getByLabelText('Phương thức thuê')).toHaveValue('cash');
    expect(screen.getByRole('link', { name: 'Đối soát SePay' })).toHaveAttribute(
      'href',
      '/manage/payment-receipts',
    );
    fireEvent.change(screen.getByLabelText('Số tiền thuê (đ)'), { target: { value: '300000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận tiền thuê' }));
    await waitFor(() =>
      expect(mocks.action).toHaveBeenCalledWith(
        'rental-1',
        2,
        'payment.record',
        { kind: 'balance', amount: 300000, method: 'cash', reference: '' },
        'request-1',
      ),
    );
  });
  it('shows accepted terms and removes customer cancellation/change actions after any payment', async () => {
    const record = orderFixture();
    record.autoCheckout = true;
    record.changesLocked = true;
    record.status = 'awaiting_deposit';
    record.quote!.acceptedAt = '2026-11-10T00:00:00.000Z';
    renderDetail(record);
    await screen.findByRole('heading', { name: 'Chi tiết giá và điều khoản đã xác nhận' });
    expect(
      screen.getByText(
        'Đã ghi nhận thanh toán: không được hủy, đổi mẫu, size, số lượng, ngày thuê hoặc gia hạn.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rút yêu cầu thuê' })).not.toBeInTheDocument();
    expect(screen.queryByText('Gửi yêu cầu thay đổi')).not.toBeInTheDocument();
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
    const edits = await screen.findAllByRole('button', { name: `Sửa mặt hàng ${item.name}` });
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
