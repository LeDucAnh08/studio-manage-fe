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
import type { CostumeType, RentalCatalogFilters, RentalCatalogItem } from '../types';
import { rentalDayCount, validateRentalPeriod, vietnamToday } from '../utils/rentalPeriod';

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
  const [categories, setCategories] = useState<CostumeType[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [itemKind, setItemKind] = useState('');
  const [categoryId, setCategoryId] = useState('');
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

  const loadCategories = useCallback(async () => {
    setCategoryError('');
    try {
      setCategories(await costumeService.getPublicCatalogCategories());
    } catch {
      setCategoryError(
        'Không tải được danh mục loại hàng. Bạn vẫn có thể lọc theo loại, kích cỡ hoặc giá.',
      );
    }
  }, [setCategories, setCategoryError]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

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
  };

  const clearFilters = () => {
    setItemKind('');
    setCategoryId('');
    setSize('');
    setMinPrice('');
    setMaxPrice('');
    setAppliedFilters({});
  };

  return (
    <PublicSiteLayout source="costumes">
      <CustomerContainer as="section" width="listing" className="customer-catalog">
        <nav aria-label="Đường dẫn trang" className="customer-catalog__breadcrumbs">
          <ol>
            <li>
              <Link to="/portfolio#top" className="customer-link">
                Trang chủ
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Trang phục & phụ kiện</li>
          </ol>
        </nav>
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
        </CustomerSurface>
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
            <CustomerFormField label="Loại mặt hàng" htmlFor="catalog-kind">
              <CustomerSelect
                id="catalog-kind"
                value={itemKind}
                onChange={(event) => setItemKind(event.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="clothing">Trang phục</option>
                <option value="accessory">Phụ kiện</option>
              </CustomerSelect>
            </CustomerFormField>
            {categoryError && (
              <div role="alert" className="customer-error customer-catalog__filter-error">
                <p>{categoryError}</p>
                <CustomerButton type="button" variant="text" onClick={() => void loadCategories()}>
                  Thử tải danh mục lại
                </CustomerButton>
              </div>
            )}
            <CustomerFormField label="Danh mục" htmlFor="catalog-category">
              <CustomerSelect
                id="catalog-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </CustomerSelect>
            </CustomerFormField>
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
          ) : items.length === 0 ? (
            <CustomerSurface className="customer-catalog__empty">
              <h2 className="customer-section-title">
                {appliedFilterCount
                  ? 'Chưa tìm thấy mặt hàng phù hợp'
                  : 'Chưa có mặt hàng còn trống trong thời gian này'}
              </h2>
              <p className="customer-copy">
                {appliedFilterCount
                  ? 'Hãy xoá bớt điều kiện lọc hoặc liên hệ studio để được tư vấn lựa chọn khác.'
                  : 'Hãy chọn khoảng ngày khác hoặc liên hệ studio để được tư vấn.'}
              </p>
              {appliedFilterCount > 0 ? (
                <CustomerButton type="button" variant="secondary" onClick={clearFilters}>
                  Xoá bộ lọc
                </CustomerButton>
              ) : (
                <CustomerButton asChild variant="secondary">
                  <Link to="/consultation">Nhận tư vấn</Link>
                </CustomerButton>
              )}
            </CustomerSurface>
          ) : (
            <>
              <p className="customer-catalog__count" role="status" aria-live="polite">
                {items.length} mặt hàng còn trống trong khoảng thuê đã chọn
              </p>
              <div className="customer-catalog__grid">
                {items.map((item) => (
                  <CustomerCatalogCard
                    key={item._id}
                    item={item}
                    receiveDate={receiveDate}
                    returnDate={returnDate}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </CustomerContainer>
    </PublicSiteLayout>
  );
}
