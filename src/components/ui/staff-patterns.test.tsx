import { createRef, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormField } from './form-field';
import { Input } from './input';
import { DatePicker } from './date-picker';
import { DataTable } from './data-table';
import { Modal } from './modal';
import { PageHeader } from './page-header';
import { OrderSelect } from '../customer/CustomerOrderControls';
import { CustomerAppearanceContext } from '../customer/CustomerAppearance';

describe('Staff form and table patterns', () => {
  it('returns focus to the opener of a controlled modal without a Radix Trigger', async () => {
    function Form() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Thêm lớp</button>
          <Modal open={open} onOpenChange={setOpen} title="Thông tin lớp">
            <Input aria-label="Tên lớp" />
          </Modal>
        </>
      );
    }
    render(<Form />);
    const opener = screen.getByRole('button', { name: 'Thêm lớp' });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('textbox', { name: 'Tên lớp' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(opener).toHaveFocus());
  });
  it('connects changing errors and hints without losing existing descriptions, value or ref', () => {
    const ref = createRef<HTMLInputElement>();
    const field = (error?: string) => (
      <>
        <p id="existing-help">Thông tin liên hệ</p>
        <FormField
          label="Số điện thoại"
          htmlFor="phone"
          required
          hint="Nhập số liên hệ"
          error={error}
        >
          <Input id="phone" aria-describedby="existing-help" ref={ref} />
        </FormField>
      </>
    );
    const view = render(field());
    const input = screen.getByRole('textbox', { name: 'Số điện thoại' });
    expect(ref.current).toBe(input);
    expect(input).toHaveAccessibleDescription('Thông tin liên hệ Nhập số liên hệ');
    expect(input).toHaveAttribute('aria-required', 'true');
    fireEvent.change(input, { target: { value: 'abc' } });
    view.rerender(field('Số điện thoại không hợp lệ'));
    expect(input).toHaveAccessibleDescription('Thông tin liên hệ Số điện thoại không hợp lệ');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Số điện thoại không hợp lệ');
    view.rerender(field());
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveValue('abc');
  });

  it.each([false, true])(
    'preserves native select events/ref/disabled in customer mode %s',
    (customer) => {
      const change = vi.fn();
      const ref = createRef<HTMLSelectElement>();
      const view = render(
        <CustomerAppearanceContext.Provider value={customer}>
          <FormField label="Phương thức" htmlFor="method" hint="Chọn cách thu">
            <OrderSelect ref={ref} id="method" defaultValue="cash" onChange={change}>
              <option value="cash">Tiền mặt</option>
              <option value="bank">Chuyển khoản</option>
            </OrderSelect>
          </FormField>
        </CustomerAppearanceContext.Provider>,
      );
      const select = screen.getByRole('combobox', { name: 'Phương thức' });
      expect(ref.current).toBe(select);
      expect(select).toHaveAccessibleDescription('Chọn cách thu');
      expect(select.classList.contains('customer-control')).toBe(customer);
      fireEvent.change(select, { target: { value: 'bank' } });
      expect(change.mock.calls[0][0].target.value).toBe('bank');
      view.rerender(
        <CustomerAppearanceContext.Provider value={customer}>
          <OrderSelect disabled aria-label="Phương thức" value="bank" onChange={change}>
            <option value="bank">Chuyển khoản</option>
          </OrderSelect>
        </CustomerAppearanceContext.Provider>,
      );
      expect(screen.getByRole('combobox')).toBeDisabled();
      expect(screen.getByRole('combobox')).toHaveValue('bank');
    },
  );

  it('clears a date with a sibling button and restores trigger focus without opening the calendar', () => {
    function Dates() {
      const [value, setValue] = useState<string | undefined>('2026-10-10');
      return <DatePicker value={value} onChange={setValue} placeholder="Ngày chụp" />;
    }
    render(<Dates />);
    const trigger = screen.getByRole('button', { name: '10/10/2026' });
    const clear = screen.getByRole('button', { name: 'Xoá ngày: Ngày chụp' });
    expect(clear.closest('button')).toBe(clear);
    expect(trigger.contains(clear)).toBe(false);
    fireEvent.click(clear);
    expect(screen.getByRole('button', { name: 'Ngày chụp' })).toHaveFocus();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xoá ngày: Ngày chụp' })).not.toBeInTheDocument();
  });

  it('keeps server pagination and row actions independent and exposes a keyboard scroll region', () => {
    const page = vi.fn();
    const row = vi.fn();
    const edit = vi.fn();
    render(
      <DataTable
        aria-label="Lớp học"
        data={[{ id: 'one', name: 'Lớp có tên dài' }]}
        keyExtractor={(item) => item.id}
        onRowClick={row}
        pagination={{ serverSide: true, page: 1, pageSize: 10, total: 21, onPageChange: page }}
        columns={[
          { key: 'name', header: 'Tên', render: (item) => item.name },
          {
            key: 'action',
            header: 'Thao tác',
            render: () => <button onClick={edit}>Sửa lớp</button>,
          },
        ]}
      />,
    );
    expect(screen.getByRole('region', { name: 'Lớp học' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('table', { name: 'Lớp học' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sửa lớp' }));
    expect(edit).toHaveBeenCalledOnce();
    expect(row).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Lớp có tên dài'));
    expect(row).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(page).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { name: 'Trang 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' })).toBeInTheDocument();
  });

  it('preserves client pagination, loading and empty states', () => {
    const columns = [{ key: 'name', header: 'Tên', render: (item: { name: string }) => item.name }];
    const data = [{ name: 'Lớp A' }, { name: 'Lớp B' }];
    const view = render(
      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.name}
        pagination={{ pageSize: 1, hidePageSize: true }}
      />,
    );
    expect(screen.queryByText('Lớp B')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getByText('Lớp B')).toBeInTheDocument();
    view.rerender(
      <DataTable data={[]} columns={columns} keyExtractor={(item) => item.name} loading />,
    );
    expect(screen.getByRole('status', { name: 'Đang tải dữ liệu' })).toBeInTheDocument();
    view.rerender(
      <DataTable
        data={[]}
        columns={columns}
        keyExtractor={(item) => item.name}
        emptyTitle="Không tìm thấy lớp"
      />,
    );
    expect(screen.getByText('Không tìm thấy lớp')).toBeInTheDocument();
  });

  it('keeps the default header level and associates the modal description and close action', () => {
    const close = vi.fn();
    const view = render(<PageHeader title="Danh sách" />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    view.rerender(
      <>
        <PageHeader title="Danh sách" as="h1" />
        <Modal
          open
          onOpenChange={close}
          title="Thêm lớp"
          description="Các trường có dấu * là bắt buộc."
        >
          <Input aria-label="Tên lớp" />
        </Modal>
      </>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Thêm lớp' });
    expect(dialog).toHaveAccessibleDescription('Các trường có dấu * là bắt buộc.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    expect(close).toHaveBeenCalledWith(false);
  });
});
