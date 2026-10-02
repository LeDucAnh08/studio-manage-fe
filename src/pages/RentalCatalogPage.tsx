import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ChevronDown, RotateCw, Shirt, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Badge, Button, Input } from '@/components/ui';
import { costumeService } from '../services/costumeService';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import type { CostumeType, RentalCatalogFilters, RentalCatalogItem } from '../types';

const SIZES = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'FREE',
  ...Array.from({ length: 10 }, (_, i) => String(i + 36)),
];
const genderLabel = { male: 'Nam', female: 'Nữ', unisex: 'Nam / Nữ' };
const itemKindLabel = { clothing: 'Trang phục', accessory: 'Phụ kiện' };
const formatVnd = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;

export default function RentalCatalogPage() {
  const [items, setItems] = useState<RentalCatalogItem[]>([]);
  const [categories, setCategories] = useState<CostumeType[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [itemKind, setItemKind] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [size, setSize] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<RentalCatalogFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  const appliedFilterCount = Object.keys(appliedFilters).length;

  const loadCatalog = useCallback(async (filters: RentalCatalogFilters) => {
    setLoading(true);
    setError('');
    try {
      setItems(await costumeService.getPublicCatalog(filters));
    } catch (requestError) {
      const message = isAxiosError<{ message?: string }>(requestError)
        ? requestError.response?.data?.message
        : undefined;
      setError(message || 'Không tải được danh mục. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setCategoryError('');
    try {
      setCategories(await costumeService.getPublicCatalogCategories());
    } catch {
      setCategoryError('Không tải được danh mục loại hàng. Bạn vẫn có thể lọc theo loại, kích cỡ hoặc giá.');
    }
  }, []);

  useEffect(() => {
    void loadCatalog({});
    void loadCategories();
  }, [loadCatalog, loadCategories]);

  const currentFilters = (): RentalCatalogFilters => {
    const filters: RentalCatalogFilters = {};
    if (itemKind) filters.itemKind = itemKind as RentalCatalogFilters['itemKind'];
    if (categoryId) filters.categoryId = categoryId;
    if (size) filters.size = size;
    if (minPrice.trim()) filters.minPrice = Number(minPrice);
    if (maxPrice.trim()) filters.maxPrice = Number(maxPrice);
    return filters;
  };

  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    const filters = currentFilters();
    setAppliedFilters(filters);
    void loadCatalog(filters);
  };

  const clearFilters = () => {
    setItemKind('');
    setCategoryId('');
    setSize('');
    setMinPrice('');
    setMaxPrice('');
    setAppliedFilters({});
    void loadCatalog({});
  };

  return (
    <PublicSiteLayout source="costumes">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <nav aria-label="Đường dẫn trang" className="mb-5 text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link to="/portfolio#top" className="min-h-11 inline-flex items-center hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Trang chủ</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-foreground">Trang phục & phụ kiện</li>
          </ol>
        </nav>
        <div className="relative isolate overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-card to-cyan-50 p-6 shadow-sm dark:border-amber-300/10 dark:from-amber-400/10 dark:via-card dark:to-cyan-400/10 sm:p-10">
          <div
            className="pointer-events-none absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-background/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800 dark:border-amber-200/20 dark:text-amber-200">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-amber-500 to-cyan-400" />
                Dịch vụ cho thuê
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Trang phục <span className="text-gradient">& phụ kiện</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Tìm và so sánh theo danh mục, kích cỡ và giá thuê để chọn món phù hợp cho buổi chụp.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                <span className="rounded-full border bg-background/75 px-3 py-1.5">
                  Theo danh mục
                </span>
                <span className="rounded-full border bg-background/75 px-3 py-1.5">
                  Theo kích cỡ
                </span>
                <span className="rounded-full border bg-background/75 px-3 py-1.5">
                  Theo giá thuê
                </span>
              </div>
            </div>
            <div
              className="relative hidden h-48 items-center justify-center md:flex"
              aria-hidden="true"
            >
              <div className="absolute h-40 w-40 rounded-full border border-amber-300/40 bg-gradient-to-br from-amber-200/60 to-cyan-200/50 dark:from-amber-400/15 dark:to-cyan-400/15" />
              <div className="absolute right-4 top-2 rounded-2xl border bg-card/90 p-4 shadow-lg shadow-amber-900/5">
                <Shirt className="h-12 w-12 text-amber-600 dark:text-amber-300" strokeWidth={1.5} />
              </div>
              <div className="absolute bottom-2 left-2 rounded-2xl border bg-card/90 p-4 shadow-lg shadow-cyan-900/5">
                <Sparkles
                  className="h-10 w-10 text-cyan-600 dark:text-cyan-300"
                  strokeWidth={1.5}
                />
              </div>
              <span className="absolute bottom-0 right-0 rounded-full border bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Trang phục · Phụ kiện
              </span>
            </div>
          </div>
        </div>

        <details
          open={filtersOpen}
          onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
          className="group mt-6 rounded-2xl border bg-card shadow-sm"
        >
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 outline-none transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="font-semibold">Tìm theo nhu cầu</span>
              <Badge variant="outline" className="shrink-0">
                {appliedFilterCount ? `${appliedFilterCount} đang dùng` : 'Tuỳ chọn'}
              </Badge>
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <form
            onSubmit={submitFilters}
            className="grid gap-4 border-t p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Loại mặt hàng</span>
              <select
                value={itemKind}
                onChange={(event) => setItemKind(event.target.value)}
                className="h-11 w-full appearance-none rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">Tất cả</option>
                <option value="clothing">Trang phục</option>
                <option value="accessory">Phụ kiện</option>
              </select>
            </label>
            {categoryError && (
              <div role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-3">
                <p>{categoryError}</p>
                <Button type="button" variant="ghost" className="mt-1 min-h-11 px-2" onClick={() => void loadCategories()}>
                  Thử tải danh mục lại
                </Button>
              </div>
            )}
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Danh mục</span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-11 w-full appearance-none rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Kích cỡ</span>
              <select
                value={size}
                onChange={(event) => setSize(event.target.value)}
                className="h-11 w-full appearance-none rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">Tất cả</option>
                {SIZES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Giá thuê từ (đ)</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                className="h-11"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Giá thuê đến (đ)</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                className="h-11"
              />
            </label>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
              <Button
                type="submit"
                variant="gradient"
                className="min-h-11 flex-1"
                disabled={loading}
              >
                Tìm sản phẩm
              </Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={clearFilters}>
                Xoá lọc
              </Button>
            </div>
          </form>
        </details>

        <p className="mt-4 text-xs text-muted-foreground">
          Danh mục để tham khảo; kích cỡ chưa được giữ cho ngày thuê. Studio sẽ xác nhận tình trạng
          sản phẩm trước khi chốt.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-8 flex flex-col gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="font-semibold text-destructive">Không thể tải danh mục</h2>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => void loadCatalog(appliedFilters)}
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" /> Thử lại
              </Button>
              {appliedFilterCount > 0 && (
                <Button type="button" variant="ghost" className="min-h-11" onClick={clearFilters}>
                  Xoá lọc
                </Button>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="mt-8" role="status" aria-live="polite" aria-label="Đang tải danh mục">
            <div className="mb-3 h-4 w-28 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="min-h-64 animate-pulse rounded-2xl border bg-card p-5 motion-reduce:animate-none"
                  aria-hidden="true"
                >
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="mt-3 h-6 w-2/3 rounded bg-muted" />
                  <div className="mt-8 h-3 w-1/3 rounded bg-muted" />
                  <div className="mt-3 flex gap-2">
                    <div className="h-7 w-10 rounded bg-muted" />
                    <div className="h-7 w-10 rounded bg-muted" />
                    <div className="h-7 w-10 rounded bg-muted" />
                  </div>
                  <div className="mt-8 h-5 w-28 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-12">
            <div
              className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-xl dark:bg-amber-400/10"
              aria-hidden="true"
            >
              👗
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              {appliedFilterCount
                ? 'Chưa tìm thấy mặt hàng phù hợp'
                : 'Danh mục đang được cập nhật'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {appliedFilterCount
                ? 'Hãy xoá bớt điều kiện lọc hoặc liên hệ studio để được tư vấn lựa chọn khác.'
                : 'Bạn có thể liên hệ studio để hỏi về trang phục và phụ kiện đang có.'}
            </p>
            {appliedFilterCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="mt-5 min-h-11"
                onClick={clearFilters}
              >
                Xoá bộ lọc
              </Button>
            ) : (
              <Link
                to="/consultation"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-amber-500 px-5 font-semibold text-amber-800 outline-none transition hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:text-amber-200 dark:hover:bg-amber-400/10"
              >
                Nhận tư vấn
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-8">
            <p className="mb-3 text-sm text-muted-foreground" role="status" aria-live="polite">
              {items.length} mặt hàng trong danh mục
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <article
                  key={item._id}
                  className="group flex min-h-72 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <div className="relative flex h-36 items-center justify-center overflow-hidden border-b bg-gradient-to-br from-amber-100 via-orange-50 to-cyan-100 dark:from-amber-400/10 dark:via-muted dark:to-cyan-400/10">
                    <div
                      className="absolute -right-8 -top-12 h-32 w-32 rounded-full border border-white/60 bg-white/20"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute -bottom-12 -left-6 h-28 w-28 rounded-full border border-white/60 bg-cyan-300/20"
                      aria-hidden="true"
                    />
                    <div className="relative grid h-20 w-20 place-items-center rounded-3xl border border-white/80 bg-background/80 shadow-lg shadow-amber-900/5 transition-transform group-hover:scale-105 motion-reduce:transform-none">
                      {item.itemKind === 'accessory' ? (
                        <Sparkles
                          className="h-10 w-10 text-cyan-600 dark:text-cyan-300"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <Shirt
                          className="h-10 w-10 text-amber-600 dark:text-amber-300"
                          strokeWidth={1.5}
                        />
                      )}
                    </div>
                    <span className="absolute bottom-3 left-3 rounded-full border border-white/70 bg-background/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Minh hoạ nhóm hàng
                    </span>
                    <span className="absolute right-3 top-3 rounded-full border border-white/70 bg-background/75 px-2.5 py-1 text-[10px] font-semibold text-foreground">
                      {itemKindLabel[item.itemKind]}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          {item.category || itemKindLabel[item.itemKind]}
                        </p>
                        <h2 className="mt-1 break-words text-lg font-semibold leading-snug">
                          {item.name}
                        </h2>
                      </div>
                      <span className="rounded-full border px-2.5 py-1 text-xs">
                        {genderLabel[item.gender]}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted-foreground">Kích cỡ sẵn sàng</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.sizes.length ? (
                          item.sizes.map((option) => (
                            <span
                              key={option}
                              className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-400/10 dark:text-amber-200"
                            >
                              {option}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Chưa có kích cỡ sẵn sàng; vui lòng liên hệ studio.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-2 border-t pt-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        Giá thuê tham khảo
                      </p>
                      <p className="mt-0.5 text-xl font-bold text-primary">
                        {item.rentalPrice > 0 ? formatVnd(item.rentalPrice) : 'Liên hệ báo giá'}
                      </p>
                    </div>
                    <Link
                      to={`/booking/start?source=costumes&item=${encodeURIComponent(item._id)}&itemName=${encodeURIComponent(item.name)}`}
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-white dark:text-slate-900 motion-reduce:transition-none"
                    >
                      Thêm vào yêu cầu
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </PublicSiteLayout>
  );
}
