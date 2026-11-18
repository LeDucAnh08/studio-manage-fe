import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  CustomerFormField,
  CustomerInput,
  CustomerSelect,
  CustomerTextarea,
} from './CustomerFields';
import {
  validateCustomerContainer,
  validateEmail,
  validatePassword,
  validatePhone,
  validateReferences,
} from '@/utils/customerValidation';

function ContactForm({ submit = vi.fn() }: { submit?: () => void }) {
  const [name, setName] = useState('');
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (validateCustomerContainer(event.currentTarget)) submit();
      }}
    >
      <CustomerFormField htmlFor="contact-name" label="Họ tên">
        <CustomerInput
          id="contact-name"
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </CustomerFormField>
      <CustomerFormField htmlFor="contact-phone" label="Số điện thoại">
        <CustomerInput id="contact-phone" required type="tel" />
      </CustomerFormField>
      <CustomerFormField htmlFor="contact-email" label="Email">
        <CustomerInput id="contact-email" type="email" />
      </CustomerFormField>
      <button>Gửi</button>
    </form>
  );
}

describe('customer input validation messages', () => {
  it('defers blur feedback while focusing a submit action, then reports errors on that first submit', () => {
    const submit = vi.fn();
    render(<ContactForm submit={submit} />);
    const email = screen.getByLabelText('Email');
    const send = screen.getByRole('button', { name: 'Gửi' });
    fireEvent.change(email, { target: { value: 'bad@localhost' } });
    fireEvent.blur(email, { relatedTarget: send });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(send);
    expect(screen.getByText('Vui lòng nhập họ tên.')).toBeInTheDocument();
    expect(screen.getByText(/Nhập địa chỉ email hợp lệ/)).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
  it('reports every missing field on submit, focuses the first and permits a corrected submission', () => {
    const submit = vi.fn();
    render(<ContactForm submit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(screen.getByText('Vui lòng nhập họ tên.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập số điện thoại.')).toBeInTheDocument();
    expect(screen.getByLabelText('Họ tên')).toHaveFocus();
    expect(submit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Họ tên'), { target: { value: '  ' } });
    expect(screen.getByLabelText('Họ tên')).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(screen.getByLabelText('Họ tên'), { target: { value: 'Nguyễn An' } });
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0901234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(submit).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows optional email and phone format errors on blur and clears optional values correctly', () => {
    render(<ContactForm />);
    const email = screen.getByLabelText('Email');
    fireEvent.change(email, { target: { value: 'abc@domain' } });
    fireEvent.blur(email);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(/email hợp lệ/);
    fireEvent.change(email, { target: { value: '' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const phone = screen.getByLabelText('Số điện thoại');
    fireEvent.change(phone, { target: { value: 'abc' } });
    fireEvent.blur(phone);
    expect(phone).toHaveAccessibleDescription(/10 chữ số/);
  });

  it('validates numeric ranges, integer steps and required selections with field-specific messages', () => {
    render(
      <form>
        <label>
          Số lượng
          <CustomerInput type="number" required min={1} max={3} step={1} />
        </label>
        <label>
          Size
          <CustomerSelect required defaultValue="">
            <option value="">Chọn size</option>
            <option>M</option>
          </CustomerSelect>
        </label>
      </form>,
    );
    const quantity = screen.getByLabelText('Số lượng');
    fireEvent.change(quantity, { target: { value: '4' } });
    fireEvent.blur(quantity);
    expect(screen.getByRole('alert')).toHaveTextContent('Số lượng không được lớn hơn 3.');
    fireEvent.change(quantity, { target: { value: '1.5' } });
    expect(screen.getByRole('alert')).toHaveTextContent('vui lòng nhập số nguyên');
    fireEvent.change(quantity, { target: { value: '2' } });
    fireEvent.blur(screen.getByLabelText('Size'));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng chọn size.');
  });

  it('rechecks controlled values and cross-field validation without requiring another blur', async () => {
    function Passwords() {
      const [password, setPassword] = useState('abcdefgh');
      return (
        <>
          <label>
            Mật khẩu
            <CustomerInput value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label>
            Nhập lại
            <CustomerInput
              defaultValue="abcdefgh"
              validation={(value) => (value === password ? undefined : 'Mật khẩu không khớp.')}
            />
          </label>
        </>
      );
    }
    render(<Passwords />);
    fireEvent.blur(screen.getByLabelText('Nhập lại'));
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'abcdefgh-new' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Mật khẩu không khớp.');
  });

  it('checks reference links and maximum length in restored values', async () => {
    render(
      <label>
        Link ảnh mẫu
        <CustomerTextarea data-validation="https-lines" defaultValue="javascript:alert(1)" />
      </label>,
    );
    fireEvent.blur(screen.getByLabelText('Link ảnh mẫu'));
    expect(screen.getByRole('alert')).toHaveTextContent('dòng 1 phải là URL HTTPS');
    fireEvent.change(screen.getByLabelText('Link ảnh mẫu'), {
      target: { value: 'https://example.com/ref' },
    });
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('does not duplicate a form-library error, including fields with additional child content', () => {
    render(
      <CustomerFormField label="Email" htmlFor="email" error="Email không hợp lệ.">
        <CustomerInput id="email" type="email" defaultValue="bad" />
        <small>Thông tin riêng</small>
      </CustomerFormField>,
    );
    fireEvent.blur(screen.getByLabelText('Email'));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Email không hợp lệ.');
  });

  it('keeps optional empty values valid and matches server email/password/HTTPS boundaries', () => {
    expect(validatePhone('', false)).toBeUndefined();
    expect(validatePhone('+84 901 234 567')).toBeUndefined();
    expect(validatePhone('0001234567')).toBeTruthy();
    for (const value of ['a..b@x.com', '.a@x.com', 'a@localhost', 'a@x.c', 'a b@x.com'])
      expect(validateEmail(value)).toBeTruthy();
    expect(validateEmail('mail+test@example.com')).toBeUndefined();
    expect(validatePassword('á'.repeat(37))).toMatch(/72 byte/);
    expect(validatePassword('á'.repeat(36))).toBeUndefined();
    expect(validateReferences('https://user:secret@example.com')).toBeTruthy();
    expect(validateReferences(Array(11).fill('https://example.com').join('\n'))).toMatch(/10 link/);
    expect(validateReferences('')).toBeUndefined();
  });
});
