import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import {
  AlertTriangle,
  Calendar,
  ClipboardCheck,
  Copy,
  FileUp,
  GraduationCap,
  Ruler,
  School,
  Weight,
} from 'lucide-react';
import { customerService } from '../services/customerService';
import { studentService } from '../services/studentService';
import { scheduleService } from '../services/scheduleService';
import { useAppSelector } from '../store';
import type { Customer, ScheduleResponse, Student, StudentResponse } from '../types';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableSkeleton,
  Textarea,
  Combobox,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';

type StudentForm = Omit<Student, '_id' | 'createdAt' | 'customer'>;

const GENDER_LABEL: Record<string, string> = { male: 'Nam', female: 'Nữ' };
const GENDER_FROM_LABEL: Record<string, string> = {
  nam: 'male',
  nữ: 'female',
  male: 'male',
  female: 'female',
};

const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');

interface ImportRow {
  name: string;
  gender: 'male' | 'female';
  height?: number;
  weight?: number;
  notes?: string;
  error?: string;
  warning?: string;
}

const CustomerSizePage = () => {
  const { selectedSeasonId } = useAppSelector((s) => s.seasons);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [schedules, setSchedules] = useState<ScheduleResponse | null>();
  const [totalMale, setTotalMale] = useState(0);
  const [totalFemale, setTotalFemale] = useState(0);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publicAccessToken, setPublicAccessToken] = useState('');
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentResponse | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showDupOnly, setShowDupOnly] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<StudentForm>();

  const formGender = watch('gender');
  const scheduleCostumes = useMemo(() => schedules?.costumes ?? [], [schedules]);
  const visibleCostumes = useMemo(
    () => scheduleCostumes.filter((c) => c.gender === formGender || c.gender === 'unisex'),
    [scheduleCostumes, formGender],
  );

  const prevGenderRef = useRef<string | null>(null);
  useEffect(() => {
    if (!modalOpen) {
      prevGenderRef.current = null;
      return;
    }
    if (prevGenderRef.current === null) {
      prevGenderRef.current = formGender;
      return;
    }
    if (prevGenderRef.current !== formGender) {
      prevGenderRef.current = formGender;
      setValue(
        'costumes',
        scheduleCostumes
          .filter((c) => c.gender === formGender || c.gender === 'unisex')
          .map((c) => c._id),
      );
    }
  }, [formGender, modalOpen, scheduleCostumes, setValue]);

  useEffect(() => {
    const params: Record<string, string | number> = { limit: 200 };
    if (selectedSeasonId) params.season = selectedSeasonId;
    customerService.getAll(params).then((r) => setCustomers(r.data));
    setSelectedCustomer(null);
  }, [selectedSeasonId]);

  useEffect(() => {
    setShowDupOnly(false);
    if (!selectedCustomer) {
      setStudents([]);
      setTotalMale(0);
      setTotalFemale(0);
      return;
    }
    customerService
      .getPublicLink(selectedCustomer._id)
      .then((result) => setPublicAccessToken(result.token));
    setLoadingStudents(true);
    studentService
      .getAll({ customer: selectedCustomer._id })
      .then((r) => {
        setStudents(r.data);
        setTotalMale(r.totalMale ?? 0);
        setTotalFemale(r.totalFemale ?? 0);
      })
      .finally(() => setLoadingStudents(false));
    scheduleService
      .getByCustomer(selectedCustomer._id)
      .then((r) => setSchedules(r))
      .catch(() => setSchedules(null));
  }, [selectedCustomer]);

  const noSchedule = selectedCustomer ? !schedules : false;
  const disabledAll = !selectedCustomer || noSchedule;

  const duplicateNorms = useMemo(() => {
    const count = new Map<string, number>();
    students.forEach((s) => {
      const norm = normalizeName(s.name);
      count.set(norm, (count.get(norm) ?? 0) + 1);
    });
    return new Set([...count.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [students]);

  useEffect(() => {
    if (showDupOnly && duplicateNorms.size === 0) setShowDupOnly(false);
  }, [duplicateNorms, showDupOnly]);

  const publicUrl =
    selectedCustomer && publicAccessToken
      ? `${window.location.origin}/form/${selectedCustomer._id}?access=${publicAccessToken}`
      : '';

  const handleCopy = () => {
    if (!selectedCustomer) return;
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyInfo = async () => {
    if (!selectedCustomer) return;
    const schedule = await scheduleService.getByCustomer(selectedCustomer._id);

    if (!schedule) {
      toast.error('Vui lòng tạo lịch chụp cho lớp này trước khi lấy thông tin gửi đồ.');
      return;
    }
    if (totalMale + totalFemale < selectedCustomer.total) {
      toast.warn(
        'Sĩ số nam/nữ hiện tại nhỏ hơn sĩ số đã đăng ký. Vui lòng cập nhật đầy đủ thông tin học sinh trước khi lấy thông tin gửi đồ.',
      );
    }

    let costumeLines = '';
    if (schedule?.costumes && schedule.costumes.length > 0) {
      const counts = new Map<string, number>();
      students.forEach((s) => {
        s.costumes?.forEach((c) => {
          counts.set(c._id, (counts.get(c._id) ?? 0) + 1);
        });
      });
      costumeLines = schedule.costumes
        .map((c) => `- ${counts.get(c._id) ?? 0} bộ ${c.name}`)
        .join('\n');
    }

    const info = `
Ngày chụp: ${schedule ? dayjs(schedule.shootDate).format('DD/MM/YYYY') : 'N/A'}
Lớp: ${selectedCustomer?.className}
Trường: ${selectedCustomer?.school ?? 'N/A'}
Sĩ số nam: ${totalMale}
Sĩ số nữ: ${totalFemale}
Người nhận đồ: ${selectedCustomer?.contactName}
SĐT: ${selectedCustomer?.contactPhone || '-'}
Địa chỉ: ${selectedCustomer?.contactAddress || '-'}

Thông tin số lượng đồ
${costumeLines || `- ${totalMale} bộ nam\n- ${totalFemale} bộ nữ`}
- ${totalMale + totalFemale} giấy màu
- ${totalMale + totalFemale} chong chóng
`;
    navigator.clipboard.writeText(info).then(() => {
      setCopiedInfo(true);
      setTimeout(() => setCopiedInfo(false), 2000);
    });
  };

  const handleExportExcel = async () => {
    if (!selectedCustomer || students.length === 0) return;

    const className = `${selectedCustomer.className}${selectedCustomer.school ? ' - ' + selectedCustomer.school : ''}`;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Học sinh');
    ws.columns = [
      { width: 6 },
      { width: 26 },
      { width: 12 },
      { width: 16 },
      { width: 15 },
      { width: 32 },
      { width: 32 },
    ];

    ws.addRow([`Lớp: ${className}`]);
    ws.getRow(1).font = { bold: true, size: 13 };

    ws.addRow([
      `Sĩ số: ${students.length} học sinh đã điền / ${selectedCustomer.total} học sinh đăng ký`,
    ]);
    ws.getRow(2).font = { italic: true, size: 11 };

    ws.addRow([]);

    const headerRow = ws.addRow([
      'STT',
      'Họ tên',
      'Giới tính',
      'Chiều cao (cm)',
      'Cân nặng (kg)',
      'Trang phục',
      'Ghi chú',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const border: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    students.forEach((s, i) => {
      const row = ws.addRow([
        i + 1,
        s.name,
        GENDER_LABEL[s.gender],
        s.height ?? '',
        s.weight ?? '',
        s.costumes?.map((c) => c.name).join(', ') ?? '',
        s.notes ?? '',
      ]);
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.border = border;
        if (colNum === 1 || colNum === 3 || colNum === 4 || colNum === 5)
          cell.alignment = { horizontal: 'center' };
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bảng Size - ${className}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openCreate = () => {
    setEditing(null);
    reset({
      name: '',
      gender: 'male',
      height: undefined,
      weight: undefined,
      notes: '',
      costumes: scheduleCostumes
        .filter((c) => c.gender === 'male' || c.gender === 'unisex')
        .map((c) => c._id),
    });
    setModalOpen(true);
  };

  const openEdit = (s: StudentResponse) => {
    setEditing(s);
    reset({
      name: s.name,
      gender: s.gender,
      height: s.height,
      weight: s.weight,
      notes: s.notes,
      costumes: s.costumes?.map((c) => c._id) ?? [],
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: StudentForm) => {
    try {
      if (editing) {
        const updated = await studentService.update(editing._id, data);
        setStudents((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
        if (editing.gender !== updated.gender) {
          if (editing.gender === 'male') setTotalMale((v) => Math.max(0, v - 1));
          else if (editing.gender === 'female') setTotalFemale((v) => Math.max(0, v - 1));
          if (updated.gender === 'male') setTotalMale((v) => v + 1);
          else if (updated.gender === 'female') setTotalFemale((v) => v + 1);
        }
        toast.success('Cập nhật học sinh thành công!');
      } else {
        const created = await studentService.create({ ...data, customer: selectedCustomer!._id });
        setStudents((prev) => [...prev, created]);
        if (created.gender === 'male') setTotalMale((v) => v + 1);
        else if (created.gender === 'female') setTotalFemale((v) => v + 1);
        toast.success('Thêm học sinh thành công!');
      }
      setModalOpen(false);
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];
      if (!ws) {
        toast.error('Không đọc được file Excel.');
        return;
      }

      let headerRowNum = -1;
      ws.eachRow((row, rowNum) => {
        if (headerRowNum !== -1) return;
        const c1 = String(row.getCell(1).value ?? '')
          .trim()
          .toLowerCase();
        const c2 = String(row.getCell(2).value ?? '')
          .trim()
          .toLowerCase();
        if (c1 === 'stt' || c2 === 'họ tên' || c2 === 'ho ten') {
          headerRowNum = rowNum;
        }
      });

      const rows: ImportRow[] = [];
      ws.eachRow((row, rowNum) => {
        if (rowNum <= headerRowNum) return;

        const name = String(row.getCell(2).value ?? '').trim();
        if (!name) return;

        const genderRaw = String(row.getCell(3).value ?? '')
          .trim()
          .toLowerCase();
        const gender = (GENDER_FROM_LABEL[genderRaw] ?? 'male') as 'male' | 'female';

        const rawHeight = row.getCell(4).value;
        const rawWeight = row.getCell(5).value;
        const height = rawHeight !== null && rawHeight !== '' ? Number(rawHeight) : undefined;
        const weight = rawWeight !== null && rawWeight !== '' ? Number(rawWeight) : undefined;
        const notes = row.getCell(6).value ? String(row.getCell(6).value).trim() : undefined;

        const parsedHeight =
          height !== undefined && !isNaN(height) && height > 0 ? height : undefined;
        const parsedWeight =
          weight !== undefined && !isNaN(weight) && weight > 0 ? weight : undefined;

        const missing = [!parsedHeight && 'chiều cao', !parsedWeight && 'cân nặng']
          .filter(Boolean)
          .join(', ');

        rows.push({
          name,
          gender,
          height: parsedHeight,
          weight: parsedWeight,
          notes,
          error: missing ? `Thiếu ${missing}` : undefined,
        });
      });

      if (rows.length === 0) {
        toast.error('Không tìm thấy dữ liệu học sinh trong file.');
        return;
      }

      const existingByNorm = new Map(students.map((s) => [normalizeName(s.name), s.name]));
      const seenInFile = new Map<string, number>();
      rows.forEach((r, i) => {
        const norm = normalizeName(r.name);
        if (existingByNorm.has(norm)) {
          const existingName = existingByNorm.get(norm)!;
          r.warning = `Trùng với "${existingName}" đã có trong lớp`;
        } else if (seenInFile.has(norm)) {
          const firstIdx = seenInFile.get(norm)!;
          r.warning = `Có thể trùng với dòng ${firstIdx + 1}`;
          if (!rows[firstIdx].warning) {
            rows[firstIdx].warning = `Có thể trùng với dòng ${i + 1}`;
          }
        } else {
          seenInFile.set(norm, i);
        }
      });

      setImportRows(rows);
      setImportModalOpen(true);
    } catch {
      toast.error('Đọc file thất bại, vui lòng kiểm tra định dạng.');
    }
  };

  const handleConfirmImport = async () => {
    const valid = importRows.filter((r) => !r.error && r.name);
    if (valid.length === 0) return;
    setImporting(true);
    setImportProgress(0);
    let success = 0;
    for (let i = 0; i < valid.length; i++) {
      try {
        const created = await studentService.create({
          ...valid[i],
          customer: selectedCustomer!._id,
        });
        setStudents((prev) => [...prev, created]);
        if (created.gender === 'male') setTotalMale((v) => v + 1);
        else if (created.gender === 'female') setTotalFemale((v) => v + 1);
        success++;
      } catch {
        // continue on individual failure
      }
      setImportProgress(Math.round(((i + 1) / valid.length) * 100));
    }
    setImporting(false);
    setImportModalOpen(false);
    setImportRows([]);
    toast.success(`Đã import ${success}/${valid.length} học sinh.`);
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await studentService.remove(confirmId);
      const removed = students.find((s) => s._id === confirmId);
      setStudents((prev) => prev.filter((s) => s._id !== confirmId));
      if (removed?.gender === 'male') setTotalMale((v) => Math.max(0, v - 1));
      else if (removed?.gender === 'female') setTotalFemale((v) => Math.max(0, v - 1));
      toast.success('Đã xoá học sinh.');
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  return (
    <div>
      <PageHeader
        kicker="Customers"
        title="Thông tin học sinh"
        description="Quản lý số đo và thông tin trang phục của từng học sinh."
      />

      {/* Class selector */}
      <div className="rounded-xl border bg-card p-4 mb-4 flex flex-wrap items-center gap-3">
        <Label className="shrink-0">Chọn lớp:</Label>
        <div className="flex-1 min-w-[200px]">
          <Combobox
            options={customers.map((c) => ({
              value: c._id,
              label: `${c.className}${c.school ? ` — ${c.school}` : ''}`,
            }))}
            value={selectedCustomer?._id ?? ''}
            onChange={(v) => setSelectedCustomer(customers.find((c) => c._id === v) ?? null)}
            placeholder="-- Chọn lớp --"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          disabled={disabledAll}
          title={publicUrl}
        >
          {copied ? (
            <ClipboardCheck className="text-emerald-500" />
          ) : (
            <Copy className="text-primary" />
          )}
          {copied ? 'Đã copy link nhập liệu!' : 'Copy link nhập liệu'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopyInfo}
          disabled={disabledAll || students.length === 0}
        >
          {copiedInfo ? (
            <ClipboardCheck className="text-emerald-500" />
          ) : (
            <Copy className="text-primary" />
          )}
          {copiedInfo ? 'Đã copy thông tin gửi đồ!' : 'Copy thông tin gửi đồ'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportExcel}
          disabled={disabledAll || students.length === 0}
        >
          <Calendar className="text-green-500" />
          Xuất Excel
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => importFileRef.current?.click()}
          disabled={disabledAll}
        >
          <FileUp className="text-indigo-500" />
          Nhập từ Excel
        </Button>
        <input
          ref={importFileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImportFileChange}
        />
      </div>

      {/* Empty state */}
      {!selectedCustomer && (
        <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground">
          <div className="mb-3 flex justify-center">
            <School className="h-10 w-10 text-sky-500" />
          </div>
          <p className="text-base font-medium">Xin mời chọn lớp để xem danh sách học sinh</p>
          <p className="text-sm mt-1">Sau đó bạn có thể copy link để học sinh tự nhập thông tin</p>
        </div>
      )}

      {/* No-schedule warning */}
      {selectedCustomer && noSchedule && (
        <div className="rounded-xl p-4 mb-4 border border-yellow-400/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 text-sm inline-flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Lớp này chưa có lịch chụp. Vui lòng tạo lịch chụp trước khi thêm/nhập học sinh hoặc copy
            thông tin.
          </span>
        </div>
      )}

      {/* Student list */}
      {selectedCustomer && (
        <>
          <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="text-emerald-500 font-semibold">
                Tổng cộng có {selectedCustomer?.total} học sinh đăng ký
              </div>
              <div>
                <span className="text-foreground font-medium">{students.length}</span> học sinh đã
                điền thông tin{' '}
                <span>
                  (<span className="text-blue-500 font-medium">Nam: {totalMale}</span>
                  {' / '}
                  <span className="text-pink-500 font-medium">Nữ: {totalFemale}</span>)
                </span>
              </div>
              {duplicateNorms.size > 0 && (
                <div className="text-yellow-600 dark:text-yellow-400 font-medium inline-flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {[...duplicateNorms].reduce(
                    (acc, norm) =>
                      acc + students.filter((s) => normalizeName(s.name) === norm).length,
                    0,
                  )}{' '}
                  trùng tên
                </div>
              )}
            </div>
            <div className="flex sm:flex-row flex-col-reverse items-center gap-2">
              {duplicateNorms.size > 0 && (
                <Button
                  variant={showDupOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowDupOnly((v) => !v)}
                  className={cn(
                    showDupOnly &&
                      'bg-yellow-500/15 border-yellow-400/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/20',
                  )}
                >
                  <AlertTriangle />
                  {showDupOnly ? 'Hiện tất cả' : 'Chỉ hiện trùng'}
                </Button>
              )}
              <Button variant="gradient" onClick={openCreate} disabled={noSchedule}>
                Thêm học sinh
              </Button>
            </div>
          </div>

          {loadingStudents ? (
            <TableSkeleton cols={7} rows={4} />
          ) : (
            (() => {
              const displayedStudents = showDupOnly
                ? students.filter((s) => duplicateNorms.has(normalizeName(s.name)))
                : students;
              const studentColumns: Column<StudentResponse>[] = [
                {
                  key: 'index',
                  header: '#',
                  render: (_s, i) => i + 1,
                },
                {
                  key: 'name',
                  header: 'Họ tên',
                  className: 'font-medium',
                  render: (s) => {
                    const isDup = duplicateNorms.has(normalizeName(s.name));
                    return (
                      <>
                        {s.name}
                        {isDup && (
                          <span className="ml-1.5 text-yellow-600 text-xs inline-flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>trùng tên</span>
                          </span>
                        )}
                      </>
                    );
                  },
                },
                {
                  key: 'gender',
                  header: 'Giới tính',
                  render: (s) => GENDER_LABEL[s.gender],
                },
                {
                  key: 'height',
                  header: 'Chiều cao (cm)',
                  align: 'right',
                  render: (s) => s.height ?? '—',
                },
                {
                  key: 'weight',
                  header: 'Cân nặng (kg)',
                  align: 'right',
                  render: (s) => s.weight ?? '—',
                },
                {
                  key: 'costumes',
                  header: 'Trang phục',
                  render: (s) =>
                    s.costumes?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {s.costumes.map((c) => (
                          <Badge key={c._id} variant="outline" className="font-normal">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    ),
                },
                {
                  key: 'notes',
                  header: 'Ghi chú',
                  className: 'text-xs',
                  render: (s) => s.notes,
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (s) => (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-destructive"
                      onClick={() => setConfirmId(s._id)}
                    >
                      Xoá
                    </Button>
                  ),
                },
              ];
              return (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <DataTable<StudentResponse>
                      data={displayedStudents}
                      keyExtractor={(s) => s._id}
                      columns={studentColumns}
                      onRowClick={(r) => openEdit(r)}
                      rowClassName={(s) =>
                        duplicateNorms.has(normalizeName(s.name))
                          ? 'bg-yellow-500/10 shadow-[inset_2px_0_0_rgba(245,158,11,0.95)]'
                          : ''
                      }
                      emptyTitle={
                        showDupOnly ? 'Không còn học sinh trùng tên' : 'Chưa có học sinh nào'
                      }
                      emptyDescription={
                        showDupOnly ? 'Bỏ lọc để xem toàn bộ danh sách.' : undefined
                      }
                      emptyIcon={<GraduationCap className="h-10 w-10 text-primary" />}
                    />
                    {showDupOnly && displayedStudents.length === 0 && (
                      <div className="text-center mt-2">
                        <Button variant="link" size="sm" onClick={() => setShowDupOnly(false)}>
                          Hiện tất cả
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {displayedStudents.map((s, i) => {
                      const isDup = duplicateNorms.has(normalizeName(s.name));
                      const isMale = s.gender === 'male';
                      return (
                        <div
                          key={s._id}
                          onClick={() => openEdit(s)}
                          className={cn(
                            'rounded-xl border bg-card p-4 cursor-pointer',
                            isDup && 'border-yellow-400/50 bg-yellow-500/10',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">{i + 1}.</span>
                                <span className="font-semibold truncate">{s.name}</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'border-transparent',
                                    isMale
                                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                      : 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
                                  )}
                                >
                                  {GENDER_LABEL[s.gender]}
                                </Badge>
                                {isDup && (
                                  <span className="text-yellow-600 dark:text-yellow-400 text-xs inline-flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    <span>trùng tên</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {(s.height || s.weight) && (
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              {s.height && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Ruler className="h-4 w-4 text-sky-500" />
                                  <span>{s.height} cm</span>
                                </span>
                              )}
                              {s.weight && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Weight className="h-4 w-4 text-amber-500" />
                                  <span>{s.weight} kg</span>
                                </span>
                              )}
                            </div>
                          )}
                          {s.costumes?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {s.costumes.map((c) => (
                                <Badge key={c._id} variant="outline" className="font-normal">
                                  {c.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {s.notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">{s.notes}</p>
                          )}
                          <div
                            className="flex justify-end gap-3 mt-3 pt-3 border-t"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => openEdit(s)}
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs text-destructive"
                              onClick={() => setConfirmId(s._id)}
                            >
                              Xoá
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {displayedStudents.length === 0 && (
                      <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
                        {showDupOnly ? (
                          <span>
                            Không còn học sinh trùng tên —{' '}
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0"
                              onClick={() => setShowDupOnly(false)}
                            >
                              Hiện tất cả
                            </Button>
                          </span>
                        ) : (
                          'Không có học sinh nào'
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()
          )}
        </>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá học sinh này?"
        onConfirm={doDelete}
      />

      {/* Import preview modal */}
      <Modal
        open={importModalOpen}
        onOpenChange={(o) => {
          if (importing) return;
          if (!o) {
            setImportRows([]);
          }
          setImportModalOpen(o);
        }}
        title={`Xem trước dữ liệu import — ${importRows.filter((r) => !r.error).length} học sinh`}
        size="lg"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Hệ thống đọc được{' '}
            <span className="font-semibold text-foreground">{importRows.length}</span> dòng.
            {importRows.some((r) => r.error) && (
              <span className="text-destructive ml-1">
                {importRows.filter((r) => r.error).length} dòng lỗi sẽ bị bỏ qua.
              </span>
            )}
            {importRows.some((r) => r.warning) && (
              <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                {importRows.filter((r) => r.warning).length} dòng có thể bị trùng tên.
              </span>
            )}
          </p>
          <div className="max-h-72 overflow-y-auto border rounded-lg">
            <DataTable<ImportRow>
              variant="plain"
              textSize="xs"
              dense
              stickyHeader
              data={importRows}
              keyExtractor={(_r, i) => String(i)}
              rowClassName={(r) =>
                r.error
                  ? 'bg-destructive/10 text-destructive'
                  : r.warning
                    ? 'bg-yellow-500/10'
                    : 'hover:bg-muted/40'
              }
              columns={[
                {
                  key: 'index',
                  header: '#',
                  className: 'text-muted-foreground',
                  render: (_r, i) => i + 1,
                },
                {
                  key: 'name',
                  header: 'Họ tên',
                  className: 'font-medium',
                  render: (r) => r.name || <span className="italic">trống</span>,
                },
                {
                  key: 'gender',
                  header: 'Giới tính',
                  render: (r) => GENDER_LABEL[r.gender] ?? r.gender,
                },
                {
                  key: 'height',
                  header: 'Cao (cm)',
                  align: 'right',
                  render: (r) => r.height ?? '—',
                },
                {
                  key: 'weight',
                  header: 'Nặng (kg)',
                  align: 'right',
                  render: (r) => r.weight ?? '—',
                },
                {
                  key: 'notes',
                  header: 'Ghi chú',
                  className: 'text-muted-foreground',
                  render: (r) => (
                    <>
                      {r.notes ?? ''}
                      {r.error && <span className="text-destructive ml-1">({r.error})</span>}
                      {r.warning && (
                        <span className="text-yellow-600 dark:text-yellow-400 ml-1 inline-flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>{r.warning}</span>
                        </span>
                      )}
                    </>
                  ),
                },
              ]}
            />
          </div>
          {importing && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Đang import…</span>
                <span>{importProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setImportModalOpen(false);
                setImportRows([]);
              }}
              disabled={importing}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              variant="gradient"
              onClick={handleConfirmImport}
              disabled={importing || importRows.filter((r) => !r.error).length === 0}
            >
              {importing
                ? 'Đang import…'
                : `Import ${importRows.filter((r) => !r.error).length} học sinh`}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa học sinh' : 'Thêm học sinh'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Họ tên" required htmlFor="stuName" className="sm:col-span-2">
              <Input id="stuName" {...register('name', { required: true })} />
            </FormField>
            <FormField label="Giới tính" required>
              <Controller
                name="gender"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value ?? 'male'} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Nam</SelectItem>
                      <SelectItem value="female">Nữ</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="Chiều cao (cm)"
              required
              htmlFor="height"
              error={errors.height?.message}
            >
              <Input
                id="height"
                type="number"
                step="0.1"
                {...register('height', {
                  required: 'Vui lòng nhập chiều cao',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Chiều cao không hợp lệ' },
                })}
              />
            </FormField>
            <FormField
              label="Cân nặng (kg)"
              required
              htmlFor="weight"
              error={errors.weight?.message}
            >
              <Input
                id="weight"
                type="number"
                step="0.1"
                {...register('weight', {
                  required: 'Vui lòng nhập cân nặng',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Cân nặng không hợp lệ' },
                })}
              />
            </FormField>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Trang phục</Label>
              {visibleCostumes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {scheduleCostumes.length === 0
                    ? 'Lịch chụp này chưa cấu hình trang phục.'
                    : 'Không có trang phục phù hợp với giới tính đã chọn.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {visibleCostumes.map((c) => (
                    <label
                      key={c._id}
                      className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm cursor-pointer hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        value={c._id}
                        {...register('costumes')}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <FormField label="Ghi chú" htmlFor="notes" className="sm:col-span-2">
              <Textarea id="notes" rows={2} {...register('notes')} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerSizePage;
