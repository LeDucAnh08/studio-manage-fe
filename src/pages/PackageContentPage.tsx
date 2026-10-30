import { useEffect, useId, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { Button, FormField, Input, PageHeader, Textarea } from '@/components/ui';
import { packageService, packageImageUrl } from '../services/packageService';
import type { Package, PackageDetails } from '../types';

// Register before BrowserRouter: its popstate listener can unmount the editor
// before a listener registered by the editor's effect gets called.
let pendingPopGuard: ((event: PopStateEvent) => void) | undefined;
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => pendingPopGuard?.(event), true);
}

const emptyDetails = (): PackageDetails => ({
  audience: '',
  benefits: [],
  exclusions: [],
  itinerary: [],
  process: [],
  extraCosts: [],
  preparationNotes: '',
  depositPolicy: '',
  cancellationPolicy: '',
  priceNotes: '',
  gallery: [],
});

interface EditorImage {
  id?: string;
  file?: File;
  preview: string;
  alt: string;
  caption: string;
}

function moveItem<T>(items: T[], index: number, direction: number): T[] {
  const copy = [...items];
  [copy[index], copy[index + direction]] = [copy[index + direction], copy[index]];
  return copy;
}

function ContentRows<T extends Record<string, string>>({
  title,
  rows,
  fields,
  emptyRow,
  onChange,
}: {
  title: string;
  rows: T[];
  fields: Array<{
    key: keyof T & string;
    label: string;
    required?: boolean;
    multiline?: boolean;
    max?: number;
  }>;
  emptyRow: T;
  onChange: (rows: T[]) => void;
}) {
  const groupId = useId();
  return (
    <fieldset className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
      <legend className="px-2 font-semibold">{title}</legend>
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Chưa có nội dung. Mục này sẽ được ẩn trên trang khách hàng.
        </p>
      )}
      {rows.map((row, index) => (
        <div key={index} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Mục {index + 1}</span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Đưa mục ${index + 1} lên trong ${title}`}
                disabled={index === 0}
                onClick={() => onChange(moveItem(rows, index, -1))}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Đưa mục ${index + 1} xuống trong ${title}`}
                disabled={index === rows.length - 1}
                onClick={() => onChange(moveItem(rows, index, 1))}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Xóa mục ${index + 1} trong ${title}`}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
          {fields.map((field) => {
            const Field = field.multiline ? Textarea : Input;
            const id = `${groupId}-${index}-${field.key}`;
            return (
              <FormField
                key={field.key}
                label={`${field.label} ${index + 1}`}
                htmlFor={id}
                required={field.required}
              >
                <Field
                  id={id}
                  value={row[field.key]}
                  required={field.required}
                  maxLength={field.max ?? (field.multiline ? 2000 : 200)}
                  onChange={(event) =>
                    onChange(
                      rows.map((item, i) =>
                        i === index ? { ...item, [field.key]: event.target.value } : item,
                      ),
                    )
                  }
                />
              </FormField>
            );
          })}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={rows.length >= 30}
        onClick={() => onChange([...rows, { ...emptyRow }])}
      >
        <Plus /> Thêm mục vào {title.toLocaleLowerCase('vi-VN')}
      </Button>
    </fieldset>
  );
}

export default function PackageContentPage() {
  const { id = '' } = useParams();
  const [pkg, setPackage] = useState<Package | null>(null);
  const [details, setDetails] = useState<PackageDetails>(emptyDetails);
  const [images, setImages] = useState<EditorImage[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attempt, setAttempt] = useState(0);
  const previews = useRef(new Set<string>());
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    packageService
      .getOne(id)
      .then((item) => {
        if (cancelled) return;
        setPackage(item);
        setDetails({ ...emptyDetails(), ...item.details });
        setImages(
          (item.details?.gallery || []).map((image) => ({
            ...image,
            preview: packageImageUrl(image.id),
          })),
        );
        setDirty(false);
      })
      .catch(() => {
        if (!cancelled)
          setError('Không tải được nội dung gói. Gói có thể đã bị xóa hoặc kết nối bị gián đoạn.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  useEffect(() => {
    const urls = previews.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const currentIndex: unknown = window.history.state?.idx;
    let restoring = false;
    const pop = (event: PopStateEvent) => {
      if (restoring) {
        restoring = false;
        return;
      }
      const nextIndex: unknown = event.state?.idx;
      if (
        typeof currentIndex !== 'number' ||
        typeof nextIndex !== 'number' ||
        currentIndex === nextIndex
      )
        return;
      if (!window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?')) {
        event.stopImmediatePropagation();
        restoring = true;
        window.history.go(currentIndex - nextIndex);
      }
    };
    const leave = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href]');
      if (
        !link ||
        link.getAttribute('target') === '_blank' ||
        link.getAttribute('href')?.startsWith('#')
      )
        return;
      if (!window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    pendingPopGuard = pop;
    document.addEventListener('click', leave, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      if (pendingPopGuard === pop) pendingPopGuard = undefined;
      document.removeEventListener('click', leave, true);
    };
  }, [dirty]);

  const change = <K extends keyof PackageDetails>(key: K, value: PackageDetails[K]) => {
    setDetails((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setSuccess('');
  };
  const changeImages = (next: EditorImage[]) => {
    setImages(next);
    setDirty(true);
    setSuccess('');
  };
  const addImages = (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (images.length + selected.length > 10) {
      setError('Mỗi gói có tối đa 10 ảnh.');
      return;
    }
    if (
      selected.some(
        (file) =>
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError('Chọn ảnh JPEG, PNG hoặc WebP, tối đa 5 MB/ảnh.');
      return;
    }
    setError('');
    changeImages([
      ...images,
      ...selected.map((file) => {
        const preview = URL.createObjectURL(file);
        previews.current.add(preview);
        return { file, preview, alt: file.name.replace(/\.[^.]+$/, ''), caption: '' };
      }),
    ]);
  };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pkg || saving) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const body = new FormData();
    let uploadIndex = 0;
    const gallery = images.map((image) => {
      const reference = image.file ? { uploadIndex: uploadIndex++ } : { id: image.id };
      if (image.file) body.append('images', image.file);
      return { ...reference, alt: image.alt, caption: image.caption };
    });
    body.append(
      'content',
      JSON.stringify({
        version: pkg.detailsVersion || 0,
        details: {
          ...details,
          gallery,
          benefits: details.benefits.map((line) => line.trim()).filter(Boolean),
          exclusions: details.exclusions.map((line) => line.trim()).filter(Boolean),
        },
      }),
    );
    try {
      const saved = await packageService.saveContent(id, body);
      setPackage(saved);
      setDetails({ ...emptyDetails(), ...saved.details });
      setImages(
        (saved.details?.gallery || []).map((image) => ({
          ...image,
          preview: packageImageUrl(image.id),
        })),
      );
      previews.current.forEach((url) => URL.revokeObjectURL(url));
      previews.current.clear();
      setDirty(false);
      setSuccess('Đã lưu. Nội dung mới đã hiển thị trên trang khách hàng.');
    } catch (failure) {
      setError(
        (failure as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Không lưu được nội dung. Các thay đổi của bạn vẫn được giữ, hãy thử lại.',
      );
    } finally {
      setSaving(false);
    }
  };
  const reload = () => {
    if (!dirty || window.confirm('Tải lại sẽ bỏ các thay đổi chưa lưu. Bạn muốn tiếp tục?'))
      setAttempt((value) => value + 1);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        as="h1"
        title={pkg ? `Nội dung chi tiết · ${pkg.name}` : 'Nội dung chi tiết gói'}
        description="Nội dung sẽ hiển thị công khai sau khi lưu thành công."
        action={
          <Button asChild variant="outline">
            <Link to="/settings/packages">Về danh sách gói</Link>
          </Button>
        }
      />
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3"
        >
          <p>{error}</p>
          <Button type="button" variant="outline" onClick={reload} disabled={saving}>
            Tải lại nội dung
          </Button>
        </div>
      )}
      {success && (
        <p role="status" className="rounded-lg border bg-card p-4">
          {success}
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải nội dung gói…</p>
      ) : (
        pkg && (
          <>
            <div className="rounded-xl border bg-card p-4 flex flex-wrap justify-between gap-3 items-center">
              <p className="text-sm">
                Giá gốc: <strong>{pkg.pricePerMember.toLocaleString('vi-VN')} đ/người</strong> · Giá
                và thông tin gói được sửa tại danh sách gói.
              </p>
              <Button asChild variant="link">
                <Link to={`/pricing/${pkg._id}`} target="_blank" rel="noreferrer">
                  Xem trang khách hàng ↗
                </Link>
              </Button>
            </div>
            <form onSubmit={save} aria-busy={saving} className="space-y-6">
              <fieldset disabled={saving} className="space-y-6 min-w-0">
                <section className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
                  <h2 className="font-semibold">Giới thiệu và quyền lợi</h2>
                  <FormField label="Đối tượng phù hợp" htmlFor="package-audience">
                    <Textarea
                      id="package-audience"
                      rows={3}
                      maxLength={4000}
                      value={details.audience}
                      onChange={(event) => change('audience', event.target.value)}
                    />
                  </FormField>
                  <FormField
                    label="Quyền lợi bổ sung (mỗi dòng một quyền lợi)"
                    htmlFor="package-benefits"
                  >
                    <Textarea
                      id="package-benefits"
                      rows={5}
                      value={details.benefits.join('\n')}
                      onChange={(event) => change('benefits', event.target.value.split('\n'))}
                    />
                  </FormField>
                  <p className="text-xs text-muted-foreground">
                    Thời lượng, ekip, trang phục, hậu kỳ và bàn giao đã lấy từ thông tin gói, không
                    cần nhập lại.
                  </p>
                </section>
                <section
                  className="rounded-xl border bg-card p-4 sm:p-6 space-y-4"
                  aria-labelledby="package-images-title"
                >
                  <h2 id="package-images-title" className="font-semibold">
                    Ảnh demo
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Tối đa 10 ảnh, 5 MB/ảnh. Ảnh đầu tiên là ảnh bìa. Ảnh chỉ được công khai sau khi
                    lưu.
                  </p>
                  <label
                    htmlFor="package-images"
                    className="text-sm font-medium inline-flex items-center gap-2"
                  >
                    <ImagePlus size={18} /> Chọn ảnh từ máy
                  </label>
                  <input
                    ref={fileInput}
                    id="package-images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="block max-w-full text-sm"
                    onChange={(event) => {
                      addImages(event.target.files);
                      event.target.value = '';
                    }}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {images.map((image, index) => (
                      <div key={image.preview} className="border rounded-lg p-3 space-y-3 min-w-0">
                        <img
                          src={image.preview}
                          alt={image.alt || `Ảnh ${index + 1}`}
                          className="w-full aspect-video object-cover rounded-md bg-muted"
                        />
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <span className="text-sm font-medium">
                            {index === 0 ? 'Ảnh bìa' : `Ảnh ${index + 1}`}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Đưa ảnh ${index + 1} lên`}
                              disabled={index === 0}
                              onClick={() => changeImages(moveItem(images, index, -1))}
                            >
                              <ArrowUp />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Đưa ảnh ${index + 1} xuống`}
                              disabled={index === images.length - 1}
                              onClick={() => changeImages(moveItem(images, index, 1))}
                            >
                              <ArrowDown />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Xóa ảnh ${index + 1}`}
                              onClick={() => {
                                if (image.file) {
                                  URL.revokeObjectURL(image.preview);
                                  previews.current.delete(image.preview);
                                }
                                changeImages(images.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>
                        <FormField
                          label={`Mô tả ảnh ${index + 1}`}
                          htmlFor={`image-alt-${index}`}
                          required
                        >
                          <Input
                            id={`image-alt-${index}`}
                            required
                            maxLength={300}
                            value={image.alt}
                            onChange={(event) =>
                              changeImages(
                                images.map((item, i) =>
                                  i === index ? { ...item, alt: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </FormField>
                        <FormField
                          label={`Chú thích ảnh ${index + 1}`}
                          htmlFor={`image-caption-${index}`}
                        >
                          <Input
                            id={`image-caption-${index}`}
                            maxLength={500}
                            value={image.caption}
                            onChange={(event) =>
                              changeImages(
                                images.map((item, i) =>
                                  i === index ? { ...item, caption: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </FormField>
                      </div>
                    ))}
                  </div>
                </section>
                <ContentRows
                  title="Lịch trình buổi chụp mẫu"
                  rows={details.itinerary}
                  emptyRow={{ time: '', title: '', description: '' }}
                  fields={[
                    { key: 'time', label: 'Mốc thời gian', required: true, max: 80 },
                    { key: 'title', label: 'Hoạt động', required: true },
                    { key: 'description', label: 'Mô tả lịch trình', multiline: true },
                  ]}
                  onChange={(rows) => change('itinerary', rows)}
                />
                <ContentRows
                  title="Quy trình dịch vụ"
                  rows={details.process}
                  emptyRow={{ title: '', description: '' }}
                  fields={[
                    { key: 'title', label: 'Tên bước', required: true },
                    { key: 'description', label: 'Mô tả bước', multiline: true },
                  ]}
                  onChange={(rows) => change('process', rows)}
                />
                <section className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
                  <h2 className="font-semibold">Chi phí</h2>
                  <FormField label="Ghi chú báo giá" htmlFor="package-price-notes">
                    <Textarea
                      id="package-price-notes"
                      maxLength={4000}
                      value={details.priceNotes}
                      onChange={(event) => change('priceNotes', event.target.value)}
                    />
                  </FormField>
                  <FormField
                    label="Khoản chưa bao gồm (mỗi dòng một khoản)"
                    htmlFor="package-exclusions"
                  >
                    <Textarea
                      id="package-exclusions"
                      rows={4}
                      value={details.exclusions.join('\n')}
                      onChange={(event) => change('exclusions', event.target.value.split('\n'))}
                    />
                  </FormField>
                </section>
                <ContentRows
                  title="Chi phí phát sinh"
                  rows={details.extraCosts}
                  emptyRow={{ name: '', priceLabel: '', condition: '' }}
                  fields={[
                    { key: 'name', label: 'Tên chi phí', required: true },
                    { key: 'priceLabel', label: 'Mức phí', required: true },
                    { key: 'condition', label: 'Điều kiện áp dụng', multiline: true },
                  ]}
                  onChange={(rows) => change('extraCosts', rows)}
                />
                <section className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
                  <h2 className="font-semibold">Điều kiện và lưu ý</h2>
                  {(
                    [
                      { key: 'preparationNotes', label: 'Lưu ý chuẩn bị' },
                      { key: 'depositPolicy', label: 'Chính sách đặt cọc' },
                      { key: 'cancellationPolicy', label: 'Chính sách đổi/hủy lịch' },
                    ] as const
                  ).map((field) => (
                    <FormField key={field.key} label={field.label} htmlFor={`package-${field.key}`}>
                      <Textarea
                        id={`package-${field.key}`}
                        rows={4}
                        maxLength={4000}
                        value={details[field.key]}
                        onChange={(event) => change(field.key, event.target.value)}
                      />
                    </FormField>
                  ))}
                </section>
              </fieldset>
              <div className="sticky bottom-0 z-10 border rounded-lg bg-card p-4 flex flex-wrap gap-3 items-center justify-between shadow-lg">
                <span className="text-sm text-muted-foreground">
                  {dirty ? 'Có thay đổi chưa lưu' : 'Nội dung đã đồng bộ'}
                </span>
                <Button type="submit" disabled={saving || !dirty}>
                  {saving ? 'Đang lưu…' : 'Lưu nội dung'}
                </Button>
              </div>
            </form>
          </>
        )
      )}
    </div>
  );
}
