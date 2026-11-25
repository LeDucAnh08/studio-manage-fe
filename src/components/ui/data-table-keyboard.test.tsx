import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './data-table';

describe('DataTable keyboard row navigation', () => {
  it('opens a focused row with Enter or Space while leaving nested controls independent', () => {
    const open = vi.fn();
    const edit = vi.fn();
    const item = { id: 'class-1', name: 'Lớp 12A1' };
    render(
      <DataTable
        data={[item]}
        columns={[
          { key: 'name', header: 'Tên lớp', render: (row) => row.name },
          {
            key: 'edit',
            header: 'Thao tác',
            render: () => <button onClick={edit}>Sửa lớp</button>,
          },
        ]}
        keyExtractor={(row) => row.id}
        onRowClick={open}
      />,
    );
    const row = screen.getByRole('row', { name: 'Lớp 12A1 Sửa lớp' });
    expect(row).toHaveAttribute('tabindex', '0');
    for (const key of ['Enter', ' ']) {
      fireEvent.keyDown(row, { key });
      expect(open).toHaveBeenLastCalledWith(item, 0);
    }
    expect(open).toHaveBeenCalledTimes(2);
    const button = screen.getByRole('button', { name: 'Sửa lớp' });
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: ' ' });
    fireEvent.click(button);
    fireEvent.keyDown(row, { key: 'ArrowDown' });
    expect(edit).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledTimes(2);
  });
});
