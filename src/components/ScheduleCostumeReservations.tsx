import { useId } from 'react';
import { Button, Input } from '@/components/ui';
import type { CostumeResponse } from '../types';

export interface ReservationDraft {
  costume: string;
  size: string;
  quantity: string;
  receiveDate: string;
  returnDate: string;
}

export default function ScheduleCostumeReservations({
  costumes,
  rows,
  shootDate,
  onChange,
}: {
  costumes: CostumeResponse[];
  rows: ReservationDraft[];
  shootDate: string;
  onChange: (rows: ReservationDraft[]) => void;
}) {
  const prefix = useId();
  const update = (index: number, patch: Partial<ReservationDraft>) =>
    onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  return (
    <section className="space-y-3 rounded-xl border p-4" aria-labelledby={`${prefix}-heading`}>
      <h3 id={`${prefix}-heading`} className="font-semibold">
        Đối soát trang phục theo kích cỡ
      </h3>
      <p className="text-sm text-muted-foreground">
        Khai báo số lượng thực tế cho từng mẫu và kích cỡ. Ngày nhận và trả đều chiếm hàng; không bỏ
        trống mẫu đã chọn.
      </p>
      {rows.map((row, index) => {
        const costume = costumes.find((item) => item._id === row.costume);
        const sizes = [
          ...new Set(
            (costume?.inventory ?? [])
              .filter((item) => item.condition === 'good' && item.quantity > 0)
              .map((item) => item.size),
          ),
        ];
        return (
          <fieldset key={index} className="grid gap-3 rounded-lg bg-muted/30 p-3 sm:grid-cols-2">
            <legend className="sr-only">Phân bổ trang phục {index + 1}</legend>
            {row.costume && !sizes.length && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Mẫu này chưa có tồn kho tình trạng tốt. Cập nhật kích cỡ và số lượng trong quản lý
                trang phục trước khi đối soát lịch.
              </p>
            )}
            <div className="space-y-1 text-sm">
              <label htmlFor={`${prefix}-${index}-costume`}>Mẫu trang phục</label>
              <select
                id={`${prefix}-${index}-costume`}
                className="min-h-11 w-full rounded-md border bg-background px-3"
                value={row.costume}
                onChange={(event) => update(index, { costume: event.target.value, size: '' })}
              >
                <option value="">Chọn mẫu</option>
                {costumes.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor={`${prefix}-${index}-size`}>Kích cỡ</label>
              <select
                id={`${prefix}-${index}-size`}
                className="min-h-11 w-full rounded-md border bg-background px-3"
                value={row.size}
                onChange={(event) => update(index, { size: event.target.value })}
              >
                <option value="">Chọn kích cỡ</option>
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <label className="space-y-1 text-sm">
              <span>Số lượng thực tế</span>
              <Input
                type="number"
                min={1}
                max={10000}
                step={1}
                value={row.quantity}
                onChange={(event) => update(index, { quantity: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Ngày nhận</span>
              <Input
                type="date"
                value={row.receiveDate}
                onChange={(event) => update(index, { receiveDate: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Ngày trả</span>
              <Input
                type="date"
                value={row.returnDate}
                onChange={(event) => update(index, { returnDate: event.target.value })}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(rows.filter((_, position) => position !== index))}
            >
              Bỏ dòng {index + 1}
            </Button>
          </fieldset>
        );
      })}
      <Button
        type="button"
        variant="outline"
        disabled={!costumes.length || rows.length >= 100}
        onClick={() =>
          onChange([
            ...rows,
            {
              costume: costumes.length === 1 ? costumes[0]._id : '',
              size: '',
              quantity: '',
              receiveDate: shootDate,
              returnDate: shootDate,
            },
          ])
        }
      >
        Thêm kích cỡ cần giữ
      </Button>
    </section>
  );
}
