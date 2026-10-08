import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CustomerButton } from './CustomerButton';
import { CustomerFormField, CustomerInput } from './CustomerFields';

describe('Customer controls', () => {
  it('associates changing errors and existing descriptions without dropping the input ref', () => {
    const ref = createRef<HTMLInputElement>();
    const field = (error?: string) => (
      <>
        <p id="account-guidance">Tên dùng để đăng nhập</p>
        <CustomerFormField
          label="Tên đăng nhập"
          htmlFor="username"
          hint="Dùng 3–40 ký tự"
          error={error}
        >
          <CustomerInput
            id="username"
            ref={ref}
            aria-describedby="account-guidance"
            autoComplete="username"
          />
        </CustomerFormField>
      </>
    );
    const view = render(field());
    const input = screen.getByLabelText('Tên đăng nhập');
    expect(ref.current).toBe(input);
    expect(input).toHaveAccessibleDescription('Tên dùng để đăng nhập Dùng 3–40 ký tự');
    fireEvent.change(input, { target: { value: 'khach.thu' } });
    view.rerender(field('Tên đăng nhập đã được sử dụng'));
    expect(ref.current).toBe(input);
    expect(input).toHaveValue('khach.thu');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      'Tên dùng để đăng nhập Tên đăng nhập đã được sử dụng',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Tên đăng nhập đã được sử dụng');
    view.rerender(field());
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAttribute('autocomplete', 'username');
  });

  it('blocks a disabled link before its own handler and permits navigation when enabled', () => {
    const childClick = vi.fn();
    const childCapture = vi.fn();
    const childKeyCapture = vi.fn();
    function page(disabled: boolean) {
      return (
        <MemoryRouter>
          <Routes>
            <Route
              path="/"
              element={
                <CustomerButton asChild disabled={disabled}>
                  <Link
                    to="/booking/start"
                    onClick={childClick}
                    onClickCapture={childCapture}
                    onKeyDownCapture={childKeyCapture}
                    tabIndex={0}
                    aria-disabled={false}
                  >
                    Đặt dịch vụ
                  </Link>
                </CustomerButton>
              }
            />
            <Route path="/booking/start" element={<h1>Chọn gói</h1>} />
          </Routes>
        </MemoryRouter>
      );
    }
    const view = render(page(true));
    const link = screen.getByRole('link', { name: 'Đặt dịch vụ' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
    fireEvent.click(link);
    fireEvent.keyDown(link, { key: 'Enter' });
    expect(childClick).not.toHaveBeenCalled();
    expect(childCapture).not.toHaveBeenCalled();
    expect(childKeyCapture).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Chọn gói' })).not.toBeInTheDocument();
    view.rerender(page(false));
    fireEvent.click(screen.getByRole('link', { name: 'Đặt dịch vụ' }));
    expect(childClick).toHaveBeenCalledTimes(1);
    expect(childCapture).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Chọn gói' })).toBeInTheDocument();
  });

  it('preserves the native submit and disabled behavior of a button', () => {
    const submit = vi.fn((event) => event.preventDefault());
    const ref = createRef<HTMLButtonElement>();
    const form = (disabled: boolean) => (
      <form onSubmit={submit}>
        <CustomerButton ref={ref} type="submit" disabled={disabled}>
          Gửi yêu cầu
        </CustomerButton>
      </form>
    );
    const view = render(form(true));
    const button = screen.getByRole('button', { name: 'Gửi yêu cầu' });
    expect(ref.current).toBe(button);
    fireEvent.click(button);
    expect(submit).not.toHaveBeenCalled();
    view.rerender(form(false));
    fireEvent.click(button);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
