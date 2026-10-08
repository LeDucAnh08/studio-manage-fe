import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAppearanceContext } from '@/components/customer/CustomerAppearance';
import PublicMemberIntakePage from './PublicMemberIntakePage';
import StudentFormPage from './StudentFormPage';
import FeedbackFormPage from './FeedbackFormPage';
import ProfilePage from './ProfilePage';

const mocks = vi.hoisted(() => ({
  intake: vi.fn(),
  submitMember: vi.fn(),
  requestId: vi.fn(),
  schedule: vi.fn(),
  submitStudent: vi.fn(),
  feedbackGet: vi.fn(),
  feedbackPost: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  telegramStatus: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  auth: {
    user: { username: 'customer.test', name: 'Khách thử', roles: [6] },
    updateUser: vi.fn(),
  },
}));

vi.mock('../services/bookingWorkflowService', () => ({
  bookingWorkflowService: {
    getPublicMemberIntake: mocks.intake,
    submitPublicMember: mocks.submitMember,
  },
  createWorkflowRequestId: mocks.requestId,
}));
vi.mock('../services/scheduleService', () => ({
  scheduleService: { getPublicByCustomer: mocks.schedule },
}));
vi.mock('../services/studentService', () => ({
  studentService: { createPublic: mocks.submitStudent },
}));
vi.mock('../services/authService', () => ({
  authService: { updateProfile: mocks.updateProfile, changePassword: mocks.changePassword },
}));
vi.mock('../services/telegramService', () => ({
  telegramService: { getStatus: mocks.telegramStatus },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('react-toastify', () => ({ toast: mocks.toast }));
vi.mock('axios', () => ({
  default: { create: () => ({ get: mocks.feedbackGet, post: mocks.feedbackPost }) },
}));

function renderPage(page: ReactNode, path: string, route: string, customer = true) {
  return render(
    <CustomerAppearanceContext.Provider value={customer}>
      <div className={customer ? 'customer-ui customer-tokens' : undefined}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={page} />
          </Routes>
        </MemoryRouter>
      </div>
    </CustomerAppearanceContext.Provider>,
  );
}

describe('Customer form presentation keeps submission contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.auth.user = { username: 'customer.test', name: 'Khách thử', roles: [6] };
    let requestSequence = 0;
    mocks.requestId.mockImplementation(() => 'request-' + ++requestSequence);
    mocks.intake.mockResolvedValue({
      bookingTitle: 'Lớp 12A',
      packageName: 'Gói kỷ yếu',
      allowedCostumes: [{ costumeId: 'costume-1', name: 'Áo dài', sizes: ['S', 'M'] }],
    });
    mocks.submitMember.mockResolvedValue(undefined);
    mocks.schedule.mockResolvedValue({
      customer: { className: 'Lớp 12A', school: 'Trường thử' },
      shootDate: '2026-10-10T08:00:00.000Z',
      package: { name: 'Gói kỷ yếu' },
      costumes: [
        { _id: 'costume-male', name: 'Áo nam', gender: 'male' },
        { _id: 'costume-female', name: 'Áo nữ', gender: 'female' },
        { _id: 'costume-unisex', name: 'Áo chung', gender: 'unisex' },
      ],
    });
    mocks.submitStudent.mockResolvedValue(undefined);
    mocks.feedbackGet.mockResolvedValue({
      data: { data: { _id: 'class-1', className: 'Lớp 12A' } },
    });
    mocks.feedbackPost.mockResolvedValue(undefined);
    mocks.updateProfile.mockResolvedValue({ name: 'Tên mới' });
    mocks.changePassword.mockResolvedValue(undefined);
    mocks.telegramStatus.mockResolvedValue({ linked: false, telegramUsername: null });
  });

  it('keeps intake validation, retry request ID and add-another reset', async () => {
    mocks.submitMember.mockRejectedValueOnce(new Error('Connection failed'));
    renderPage(<PublicMemberIntakePage />, '/member-intake/private-token', '/member-intake/:token');
    await screen.findByRole('heading', { name: 'Lớp 12A' });
    expect(mocks.intake).toHaveBeenCalledWith('private-token');
    const name = screen.getByLabelText(/^Họ tên/);
    fireEvent.change(name, { target: { value: ' Lan ' } });
    fireEvent.change(screen.getByLabelText(/Chiều cao/), { target: { value: '64' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi thông tin của tôi' }));
    expect(await screen.findByText('Chiều cao cần từ 80 đến 230 cm.')).toBeInTheDocument();
    expect(mocks.submitMember).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Chiều cao/), { target: { value: '165' } });
    fireEvent.change(screen.getByLabelText(/Cân nặng/), { target: { value: '55' } });
    fireEvent.change(screen.getByLabelText('Áo dài'), { target: { value: 'M' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi thông tin của tôi' }));
    await screen.findByText(
      'Không thể tải hoặc gửi thông tin. Vui lòng kiểm tra kết nối rồi thử lại.',
    );
    const firstSubmission = mocks.submitMember.mock.calls[0];
    expect(firstSubmission).toEqual([
      'private-token',
      {
        name: 'Lan',
        height: 165,
        weight: 55,
        costumeSizes: [{ costumeId: 'costume-1', size: 'M' }],
        requestId: 'request-2',
      },
    ]);
    expect(sessionStorage.length).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi thông tin của tôi' }));
    await screen.findByRole('heading', { name: 'Đã gửi thông tin' });
    expect(mocks.submitMember.mock.calls[1]).toEqual(firstSubmission);
    expect(sessionStorage.length).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Khai báo thành viên khác' }));
    expect(screen.getByLabelText(/^Họ tên/)).toHaveValue('');
    expect(screen.getByLabelText('Áo dài')).toHaveValue('');
  });

  it('keeps student gender/costume selections and the public payload', async () => {
    renderPage(<StudentFormPage />, '/form/class-1?access=access-1', '/form/:customer');
    await screen.findByRole('heading', { name: 'Lớp 12A' });
    expect(mocks.schedule).toHaveBeenCalledWith('class-1', 'access-1');
    expect(screen.getByRole('checkbox', { name: 'Áo nam' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Nữ' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Áo nữ' })).toBeChecked());
    expect(screen.queryByRole('checkbox', { name: 'Áo nam' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Áo chung' }));
    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'Lan' } });
    fireEvent.change(screen.getByLabelText(/Chiều cao/), { target: { value: '165' } });
    fireEvent.change(screen.getByLabelText(/Cân nặng/), { target: { value: '55' } });
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Ghi chú thử' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi thông tin' }));
    await screen.findByRole('heading', { name: 'Đã ghi nhận!' });
    expect(mocks.submitStudent).toHaveBeenCalledWith({
      customer: 'class-1',
      access: 'access-1',
      name: 'Lan',
      gender: 'female',
      height: 165,
      weight: 55,
      notes: 'Ghi chú thử',
      costumes: ['costume-female'],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Nhập thêm học sinh khác' }));
    expect(screen.getByLabelText(/Họ và tên/)).toHaveValue('');
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Nam' })).toBeChecked());
  });

  it('submits feedback once through the form and disables pending duplicate clicks', async () => {
    let resolvePost: (() => void) | undefined;
    mocks.feedbackPost.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePost = resolve;
        }),
    );
    renderPage(<FeedbackFormPage />, '/feedback/class-1?access=access-1', '/feedback/:customer');
    await screen.findByRole('heading', { name: 'Lớp 12A' });
    const submit = screen.getByRole('button', { name: 'Gửi phản hồi' });
    expect(submit).toBeDisabled();
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Đánh giá ekip chụp ảnh' })).getByRole(
        'radio',
        { name: '4 sao' },
      ),
    );
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Đánh giá album ảnh' })).getByRole('radio', {
        name: '5 sao',
      }),
    );
    fireEvent.change(screen.getByLabelText(/Nhận xét về ekip/), {
      target: { value: ' Ekip tốt ' },
    });
    fireEvent.change(screen.getByLabelText(/Nhận xét về album/), {
      target: { value: ' Album đẹp ' },
    });
    await waitFor(() => expect(submit).toBeEnabled());
    expect(submit).toHaveAttribute('form', 'customer-feedback-form');
    fireEvent.click(submit);
    const pending = await screen.findByRole('button', { name: 'Đang gửi…' });
    expect(pending).toBeDisabled();
    fireEvent.click(pending);
    expect(mocks.feedbackPost).toHaveBeenCalledTimes(1);
    expect(mocks.feedbackPost).toHaveBeenCalledWith('/public/feedback', {
      customer: 'class-1',
      access: 'access-1',
      phone: undefined,
      crewFeedback: { rating: 4, description: 'Ekip tốt' },
      albumFeedback: { rating: 5, description: 'Album đẹp' },
      content: undefined,
      suggestion: undefined,
    });
    await act(async () => resolvePost?.());
    await screen.findByRole('heading', { name: 'Cảm ơn bạn rất nhiều!' });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi khác' }));
    expect(screen.getByRole('button', { name: 'Gửi phản hồi' })).toBeDisabled();
    expect(screen.getByLabelText(/Nhận xét về ekip/)).toHaveValue('');
  });

  it('keeps customer profile update and password validation with hidden staff Telegram', async () => {
    renderPage(<ProfilePage />, '/account/profile', '/account/profile');
    expect(screen.queryByText('Liên kết Telegram')).not.toBeInTheDocument();
    expect(mocks.telegramStatus).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Tên đăng nhập')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Họ tên hiển thị'), { target: { value: 'Tên mới' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledWith({ name: 'Tên mới' }));
    expect(mocks.auth.updateUser).toHaveBeenCalledWith({ name: 'Tên mới' });
    fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại'), {
      target: { value: 'old-password' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'new-password' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), {
      target: { value: 'different-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    await screen.findByText('Mật khẩu không khớp');
    expect(mocks.changePassword).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Xác nhận mật khẩu mới')).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), {
      target: { value: 'new-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    await waitFor(() =>
      expect(mocks.changePassword).toHaveBeenCalledWith('old-password', 'new-password'),
    );
    expect(mocks.toast.success).toHaveBeenCalledWith('Đổi mật khẩu thành công');
  });

  it('keeps staff Telegram visibility based on role rather than appearance', async () => {
    mocks.auth.user.roles = [0];
    const staff = renderPage(<ProfilePage />, '/profile', '/profile', false);
    await screen.findByRole('button', { name: 'Liên kết Telegram' });
    expect(mocks.telegramStatus).toHaveBeenCalledTimes(1);
    staff.unmount();
    renderPage(<ProfilePage />, '/account/profile', '/account/profile', true);
    await screen.findByRole('button', { name: 'Liên kết Telegram' });
    expect(mocks.telegramStatus).toHaveBeenCalledTimes(2);
  });
});
