import { useEffect, useState } from 'react';
import { Button, DataTable } from '@/components/ui';
import {
  customerService,
  type ClassStudents as ClassStudentsData,
} from '../services/customerService';

const genderLabels: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };

export default function ClassStudents({ customerId }: { customerId: string }) {
  const [data, setData] = useState<ClassStudentsData | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    customerService.getStudents(customerId).then(
      (result) => {
        if (active) setData(result);
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [customerId, reload]);

  return (
    <section className="space-y-3" aria-labelledby="class-students-title">
      <div>
        <h2 id="class-students-title" className="text-xl font-semibold">
          Thông tin học sinh
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.source === 'booking'
            ? 'Thông tin học sinh khách hàng đã điền khi đặt dịch vụ kỉ yếu và cập nhật trong hồ sơ đơn.'
            : 'Danh sách học sinh đã lưu của lớp.'}
          {data && ` Tổng cộng: ${data.students.length} học sinh.`}
        </p>
      </div>
      {error ? (
        <div role="alert" className="rounded-lg border p-4">
          <p>Không tải được thông tin học sinh. Vui lòng thử lại.</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => setReload((value) => value + 1)}
          >
            Thử lại
          </Button>
        </div>
      ) : (
        <DataTable
          aria-label="Thông tin học sinh của lớp"
          data={data?.students ?? []}
          loading={!data}
          keyExtractor={(student) => student._id}
          emptyTitle="Chưa có thông tin học sinh"
          emptyDescription="Thông tin sẽ xuất hiện khi khách hàng bổ sung danh sách học sinh trong hồ sơ kỉ yếu."
          pagination={{ pageSize: 20 }}
          columns={[
            { key: 'index', header: 'STT', render: (_student, index) => index + 1 },
            {
              key: 'name',
              header: 'Họ tên',
              className: 'min-w-[160px] font-medium',
              render: (student) => student.name,
            },
            {
              key: 'contact',
              header: 'Liên hệ',
              className: 'min-w-[140px] whitespace-nowrap',
              render: (student) => student.contact || '—',
            },
            {
              key: 'gender',
              header: 'Giới tính',
              className: 'min-w-[90px]',
              render: (student) => genderLabels[student.gender || ''] || '—',
            },
            {
              key: 'height',
              header: 'Chiều cao (cm)',
              className: 'min-w-[110px]',
              render: (student) => student.height ?? '—',
            },
            {
              key: 'weight',
              header: 'Cân nặng (kg)',
              className: 'min-w-[110px]',
              render: (student) => student.weight ?? '—',
            },
            {
              key: 'shirtSize',
              header: 'Size áo',
              className: 'min-w-[80px]',
              render: (student) => student.shirtSize || '—',
            },
            {
              key: 'pantsSize',
              header: 'Size quần',
              className: 'min-w-[90px]',
              render: (student) => student.pantsSize || '—',
            },
            {
              key: 'notes',
              header: 'Ghi chú',
              className: 'min-w-[180px] whitespace-pre-wrap',
              render: (student) => student.notes || '—',
            },
          ]}
        />
      )}
    </section>
  );
}
