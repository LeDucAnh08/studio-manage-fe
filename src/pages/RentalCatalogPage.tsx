import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ChevronDown, RotateCw, SlidersHorizontal } from 'lucide-react';
import { CustomerButton } from '@/components/customer/CustomerButton';
import {
  CustomerFormField,
  CustomerInput,
  CustomerSelect,
} from '@/components/customer/CustomerFields';
import { CustomerSurface } from '@/components/customer/CustomerSurface';
import { CustomerStatusBadge } from '@/components/customer/CustomerStatusBadge';
import { CustomerContainer } from '@/components/customer/CustomerContainer';
import { CustomerCatalogCard } from '@/components/customer/CustomerCatalogCard';
import { costumeService } from '../services/costumeService';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import type { RentalCatalogFilters, RentalCatalogItem } from '../types';
import { rentalDayCount, validateRentalPeriod, vietnamToday } from '../utils/rentalPeriod';
import { clientRentalEnabled } from '../config/features';

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
const ITEM_KINDS = [
  { value: 'clothing', label: 'Trang phục', other: 'Trang phục khác' },
  { value: 'accessory', label: 'Phụ kiện', other: 'Phụ kiện khác' },
] as const;
const categoryName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ');
const categoryKey = (value: string) => categoryName(value).toLocaleLowerCase('vi');

export default function RentalCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const receiveDate = searchParams.get('receiveDate') || '';
  const returnDate = searchParams.get('returnDate') || '';
  const periodError = validateRentalPeriod(receiveDate, returnDate);
  const periodValid = !periodError;
  const days = rentalDayCount(receiveDate, returnDate);
  const [catalog, setCatalog] = useState({
    key: '',
    items: [] as RentalCatalogItem[],
    error: '',
  });
  const requestId = useRef(0);
  const itemKind = ITEM_KINDS.some((kind) => kind.value === searchParams.get('kind'))
    ? searchParams.get('kind')!
    : '';
  const selectedCategory = categoryKey(searchParams.get('category') || '');
  const [size, setSize] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<RentalCatalogFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 744px)').matches,
  );
  const appliedFilterCount = Object.keys(appliedFilters).length;
  const requestFilters = { ...appliedFilters, receiveDate, returnDate };
  const requestKey = JSON.stringify(requestFilters);
  const loading = periodValid && catalog.key !== requestKey;
  const items = periodValid && catalog.key === requestKey ? catalog.items : [];
  const error = catalog.key === requestKey ? catalog.error : '';
  const groups = ITEM_KINDS.map((kind) => {
    const grouped = new Map<string, { key: string; name: string; items: RentalCatalogItem[] }>();
    const kindItems = items.filter((item) => item.itemKind === kind.value);
    for (const item of kindItems) {
      const name = categoryName(item.category || '') || kind.other;
      const key = categoryKey(name);
      const group = grouped.get(key);
      if (group) group.items.push(item);
      else grouped.set(key, { key, name, items: [item] });
    }
    return {
      ...kind,
      count: kindItems.length,
      categories: [...grouped.values()].sort((a, b) =>
        a.key === categoryKey(kind.other)
          ? 1
          : b.key === categoryKey(kind.other)
            ? -1
            : a.name.localeCompare(b.name, 'vi'),
      ),
    };
  });
  const visibleGroups = groups
    .filter((kind) => !itemKind || kind.value === itemKind)
    .map((kind) => ({
      ...kind,
      categories: kind.categories.filter(
        (category) => !selectedCategory || category.key === selectedCategory,
      ),
    }))
    .filter((kind) => kind.categories.length > 0);
  const visibleCount = visibleGroups.reduce(
    (sum, kind) =>
      sum + kind.categories.reduce((count, category) => count + category.items.length, 0),
    0,
  );

  const chooseGroup = (kind = '', category = '') => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (kind) next.set('kind', kind);
      else next.delete('kind');
      if (category) next.set('category', category);
      else next.delete('category');
      return next;
    });
  };

  const loadCatalog = useCallback(
    async (filters: RentalCatalogFilters, key: string) => {
      const currentRequest = ++requestId.current;
      setCatalog({ key: '', items: [], error: '' });
      try {
        const nextItems = await costumeService.getPublicCatalog(filters);
        if (currentRequest === requestId.current) setCatalog({ key, items: nextItems, error: '' });
      } catch (requestError) {
        const message = isAxiosError<{ message?: string }>(requestError)
          ? requestError.response?.data?.message
          : undefined;
        if (currentRequest === requestId.current)
          setCatalog({
            key,
            items: [],
            error: message || 'Không tải được danh mục. Vui lòng thử lại sau.',
          });
      }
    },
    [setCatalog],
  );

  useEffect(() => {
    if (periodValid) void loadCatalog({ ...appliedFilters, receiveDate, returnDate }, requestKey);
    return () => {
      requestId.current += 1;
    };
  }, [appliedFilters, receiveDate, returnDate, periodValid, requestKey, loadCatalog]);

  const changeDate = (name: 'receiveDate' | 'returnDate', value: string) => {
    requestId.current += 1;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(name, value);
      else next.delete(name);
      return next;
    });
  };

  const currentFilters = (): RentalCatalogFilters => {
    const filters: RentalCatalogFilters = {};
    if (size) filters.size = size;
    if (minPrice.trim()) filters.minPrice = Number(minPrice);
    if (maxPrice.trim()) filters.maxPrice = Number(maxPrice);
    return filters;
  };

  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    const filters = currentFilters();
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    chooseGroup();
    setSize('');
    setMinPrice('');
    setMaxPrice('');
    setAppliedFilters({});
  };

  return (
    <PublicSiteLayout source="costumes">
      <CustomerContainer as="section" width="listing" className="customer-catalog">
        <CustomerSurface className="customer-catalog__intro">
          <CustomerStatusBadge>Dịch vụ cho thuê</CustomerStatusBadge>
          <h1>Trang phục & phụ kiện</h1>
          <p className="customer-copy">
            Thuê trang phục và phụ kiện theo ngày, không cần đặt lịch chụp.
          </p>
        </CustomerSurface>
        <CustomerSurface className="customer-catalog__period">
          <h2 className="customer-section-title">Bạn muốn thuê khi nào?</h2>
          <p className="customer-copy">Chọn ngày nhận và trả để xem mặt hàng còn trống.</p>
          <div className="customer-catalog__period-fields">
            <CustomerFormField label="Ngày nhận" htmlFor="catalog-receive-date" required>
              <CustomerInput
                id="catalog-receive-date"
                type="date"
                min={vietnamToday()}
                required
                value={receiveDate}
                onChange={(event) => changeDate('receiveDate', event.target.value)}
              />
            </CustomerFormField>
            <CustomerFormField label="Ngày trả" htmlFor="catalog-return-date" required>
              <CustomerInput
                id="catalog-return-date"
                type="date"
                min={receiveDate || vietnamToday()}
                required
                value={returnDate}
                onChange={(event) => changeDate('returnDate', event.target.value)}
              />
            </CustomerFormField>
          </div>
          <p
            className={
              periodError && receiveDate && returnDate ? 'customer-error' : 'customer-caption'
            }
            role="status"
            aria-live="polite"
          >
            {periodError || `${days} ngày thuê, tính cả ngày nhận và ngày trả.`}
          </p>
          {clientRentalEnabled && periodValid && !loading && !error && items.length > 0 && (
            <CustomerButton asChild>
              <Link to={`/rental/start?${new URLSearchParams({ receiveDate, returnDate })}`}>
                Tạo yêu cầu thuê riêng
              </Link>
            </CustomerButton>
          )}
        </CustomerSurface>
        {periodValid && !loading && !error && items.length > 0 && (
          <CustomerSurface className="customer-catalog__browse">
            <h2 className="customer-section-title">Chọn nhóm hàng</h2>
            <div role="group" aria-label="Nhóm hàng" className="customer-catalog__kind-options">
              <CustomerButton
                type="button"
                variant="pill"
                className="customer-catalog__choice"
                aria-pressed={!itemKind}
                onClick={() => chooseGroup()}
              >
                Tất cả <span>{items.length} mẫu</span>
              </CustomerButton>
              {groups.map((kind) => (
                <CustomerButton
                  key={kind.value}
                  type="button"
                  variant="pill"
                  className="customer-catalog__choice"
                  aria-pressed={itemKind === kind.value}
                  onClick={() => chooseGroup(kind.value)}
                >
                  {kind.label} <span>{kind.count} mẫu</span>
                </CustomerButton>
              ))}
            </div>
            <div className="customer-catalog__category-options">
              <CustomerButton
                type="button"
                variant="text"
                aria-pressed={!selectedCategory}
                onClick={() => chooseGroup(itemKind)}
              >
                Tất cả danh mục
              </CustomerButton>
              {groups
                .filter((kind) => (!itemKind || itemKind === kind.value) && kind.count > 0)
                .map((kind) => (
                  <div key={kind.value} className="customer-catalog__category-row">
                    <p className="customer-caption">{kind.label}</p>
                    <div
                      role="group"
                      aria-label={`Danh mục ${kind.label.toLocaleLowerCase('vi')}`}
                      className="customer-catalog__category-chips"
                    >
                      {kind.categories.map((category) => (
                        <CustomerButton
                          key={category.key}
                          type="button"
                          variant="pill"
                          className="customer-catalog__choice"
                          aria-pressed={
                            itemKind === kind.value && selectedCategory === category.key
                          }
                          onClick={() => chooseGroup(kind.value, category.key)}
                        >
                          {category.name} <span>{category.items.length} mẫu</span>
                        </CustomerButton>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </CustomerSurface>
        )}
        <details
          open={filtersOpen}
          onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
          className="customer-catalog__filters"
        >
          <summary>
            <span>
              <SlidersHorizontal aria-hidden="true" />
              <span>Tìm theo nhu cầu</span>
              <CustomerStatusBadge>
                {appliedFilterCount ? `${appliedFilterCount} đang dùng` : 'Tuỳ chọn'}
              </CustomerStatusBadge>
            </span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <form onSubmit={submitFilters} className="customer-catalog__filter-form">
            <CustomerFormField label="Kích cỡ" htmlFor="catalog-size">
              <CustomerSelect
                id="catalog-size"
                value={size}
                onChange={(event) => setSize(event.target.value)}
              >
                <option value="">Tất cả</option>
                {SIZES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </CustomerSelect>
            </CustomerFormField>
            <CustomerFormField label="Giá/ngày từ (đ)" htmlFor="catalog-min-price">
              <CustomerInput
                id="catalog-min-price"
                type="number"
                min="0"
                step="1"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
              />
            </CustomerFormField>
            <CustomerFormField label="Giá/ngày đến (đ)" htmlFor="catalog-max-price">
              <CustomerInput
                id="catalog-max-price"
                type="number"
                min="0"
                step="1"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />
            </CustomerFormField>
            <div className="customer-catalog__actions">
              <CustomerButton type="submit" disabled={loading || !periodValid}>
                Tìm sản phẩm
              </CustomerButton>
              <CustomerButton type="button" variant="secondary" onClick={clearFilters}>
                Xoá lọc
              </CustomerButton>
            </div>
          </form>
        </details>
        <p className="customer-caption customer-catalog__note">
          Hàng được giữ sau khi bạn xác nhận thuê và studio ghi nhận đủ tiền cọc.
        </p>
        <div className="customer-catalog__results">
          {!periodValid ? (
            <CustomerSurface className="customer-catalog__empty">
              <h2 className="customer-section-title">Chọn thời gian thuê để bắt đầu</h2>
              <p className="customer-copy">
                Danh mục sẽ hiển thị các mẫu và kích cỡ còn trống trong khoảng ngày bạn chọn.
              </p>
            </CustomerSurface>
          ) : error ? (
            <CustomerSurface role="alert" className="customer-catalog__error">
              <h2 className="customer-section-title customer-error">Không thể tải danh mục</h2>
              <p className="customer-copy">{error}</p>
              <div className="customer-catalog__actions">
                <CustomerButton
                  type="button"
                  variant="secondary"
                  onClick={() => void loadCatalog(requestFilters, requestKey)}
                >
                  <RotateCw aria-hidden="true" /> Thử lại
                </CustomerButton>
                {appliedFilterCount > 0 && (
                  <CustomerButton type="button" variant="text" onClick={clearFilters}>
                    Xoá lọc
                  </CustomerButton>
                )}
              </div>
            </CustomerSurface>
          ) : loading ? (
            <div role="status" aria-live="polite" aria-label="Đang tải danh mục">
              <div className="customer-catalog__grid">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="customer-catalog-card" aria-hidden="true">
                    <div className="customer-catalog-card__illustration" />
                    <div className="customer-catalog-card__meta">
                      <div className="customer-catalog__skeleton-line customer-catalog__skeleton-line--short" />
                      <div className="customer-catalog__skeleton-line" />
                      <div className="customer-catalog__skeleton-body" />
                      <div className="customer-catalog__skeleton-line" />
                      <div className="customer-catalog__skeleton-body" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : visibleCount === 0 ? (
            <CustomerSurface className="customer-catalog__empty">
              <h2 className="customer-section-title">
                {items.length > 0
                  ? 'Danh mục đã chọn chưa có mặt hàng phù hợp'
                  : appliedFilterCount
                    ? 'Chưa tìm thấy mặt hàng phù hợp'
                    : 'Chưa có mặt hàng còn trống trong thời gian này'}
              </h2>
              <p className="customer-copy">
                {items.length > 0
                  ? 'Hãy chọn nhóm khác hoặc xem tất cả danh mục trong khoảng thuê này.'
                  : appliedFilterCount
                    ? 'Hãy xoá bớt điều kiện lọc hoặc liên hệ studio để được tư vấn lựa chọn khác.'
                    : 'Hãy chọn khoảng ngày khác hoặc liên hệ studio để được tư vấn.'}
              </p>
              {items.length > 0 ? (
                <CustomerButton type="button" variant="secondary" onClick={() => chooseGroup()}>
                  Xem tất cả danh mục
                </CustomerButton>
              ) : appliedFilterCount > 0 ? (
                <CustomerButton type="button" variant="secondary" onClick={clearFilters}>
                  Xoá bộ lọc
                </CustomerButton>
              ) : null}
            </CustomerSurface>
          ) : (
            <>
              <p className="customer-catalog__count" role="status" aria-live="polite">
                {visibleCount} mặt hàng còn trống trong khoảng thuê đã chọn
              </p>
              <div className="customer-catalog__groups">
                {visibleGroups.map((kind) => (
                  <section
                    key={kind.value}
                    aria-labelledby={`catalog-${kind.value}-title`}
                    className="customer-catalog__kind-section"
                  >
                    <header className="customer-catalog__kind-heading">
                      <h2 id={`catalog-${kind.value}-title`} className="customer-section-title">
                        {kind.label}
                      </h2>
                    </header>
                    {kind.categories.map((category, index) => (
                      <section
                        key={category.key}
                        aria-labelledby={`catalog-${kind.value}-${index}-title`}
                        className="customer-catalog__category-section"
                      >
                        <header className="customer-catalog__category-heading">
                          <h3 id={`catalog-${kind.value}-${index}-title`}>{category.name}</h3>
                          <CustomerStatusBadge>{category.items.length} mẫu</CustomerStatusBadge>
                        </header>
                        <div className="customer-catalog__grid">
                          {category.items.map((item) => (
                            <CustomerCatalogCard
                              key={item._id}
                              item={item}
                              receiveDate={receiveDate}
                              returnDate={returnDate}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </CustomerContainer>
    </PublicSiteLayout>
  );
}
