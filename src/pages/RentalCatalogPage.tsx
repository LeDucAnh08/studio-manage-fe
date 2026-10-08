import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
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
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 744px)').matches,
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
      setCategoryError(
        'Không tải được danh mục loại hàng. Bạn vẫn có thể lọc theo loại, kích cỡ hoặc giá.',
      );
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
            Tìm và so sánh theo danh mục, kích cỡ và giá thuê để chọn món phù hợp cho buổi chụp.
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
            <CustomerFormField label="Giá thuê từ (đ)" htmlFor="catalog-min-price">
              <CustomerInput
                id="catalog-min-price"
                type="number"
                min="0"
                step="1"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
              />
            </CustomerFormField>
            <CustomerFormField label="Giá thuê đến (đ)" htmlFor="catalog-max-price">
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
              <CustomerButton type="submit" disabled={loading}>
                Tìm sản phẩm
              </CustomerButton>
              <CustomerButton type="button" variant="secondary" onClick={clearFilters}>
                Xoá lọc
              </CustomerButton>
            </div>
          </form>
        </details>
        <p className="customer-caption customer-catalog__note">
          Danh mục để tham khảo; kích cỡ chưa được giữ cho ngày thuê. Studio sẽ xác nhận tình trạng
          sản phẩm trước khi chốt.
        </p>
        <div className="customer-catalog__results">
          {error ? (
            <CustomerSurface role="alert" className="customer-catalog__error">
              <h2 className="customer-section-title customer-error">Không thể tải danh mục</h2>
              <p className="customer-copy">{error}</p>
              <div className="customer-catalog__actions">
                <CustomerButton
                  type="button"
                  variant="secondary"
                  onClick={() => void loadCatalog(appliedFilters)}
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
                  : 'Danh mục đang được cập nhật'}
              </h2>
              <p className="customer-copy">
                {appliedFilterCount
                  ? 'Hãy xoá bớt điều kiện lọc hoặc liên hệ studio để được tư vấn lựa chọn khác.'
                  : 'Bạn có thể liên hệ studio để hỏi về trang phục và phụ kiện đang có.'}
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
                {items.length} mặt hàng trong danh mục
              </p>
              <div className="customer-catalog__grid">
                {items.map((item) => (
                  <CustomerCatalogCard key={item._id} item={item} />
                ))}
              </div>
            </>
          )}
        </div>
      </CustomerContainer>
    </PublicSiteLayout>
  );
}
