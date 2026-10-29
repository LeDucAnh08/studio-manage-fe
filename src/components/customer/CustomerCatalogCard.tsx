import { Link } from 'react-router-dom';
import { ArrowRight, Shirt, Sparkles } from 'lucide-react';
import type { RentalCatalogItem } from '../../types';
import { clientPortalEnabled } from '../../config/features';
import { rentalDayCount } from '../../utils/rentalPeriod';
import { CustomerButton } from './CustomerButton';
import { CustomerPrice } from './CustomerPrice';
import { CustomerStatusBadge } from './CustomerStatusBadge';
import '../../styles/customer-catalog.css';

const genderLabel = { male: 'Nam', female: 'Nữ', unisex: 'Nam / Nữ' };
const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE'];

export function CustomerCatalogCard({
  item,
  receiveDate,
  returnDate,
}: {
  item: RentalCatalogItem;
  receiveDate: string;
  returnDate: string;
}) {
  const days = rentalDayCount(receiveDate, returnDate);
  const dailyPrice = item.rentalDailyPrice;
  const hasDailyPrice =
    typeof dailyPrice === 'number' && Number.isFinite(dailyPrice) && dailyPrice >= 0;
  const sizes = item.sizes
    .filter((size) => !item.availableBySize || item.availableBySize[size] > 0)
    .sort((a, b) => {
      const left = sizeOrder.indexOf(a);
      const right = sizeOrder.indexOf(b);
      return left >= 0 && right >= 0 ? left - right : a.localeCompare(b, 'vi', { numeric: true });
    });
  const rentalParams = new URLSearchParams({ item: item._id, receiveDate, returnDate });
  return (
    <article
      className={`customer-catalog-card${clientPortalEnabled ? ' customer-catalog-card--selectable' : ''}`}
    >
      <header className="customer-catalog-card__heading">
        <div className="customer-catalog-card__illustration" aria-hidden="true">
          {item.itemKind === 'accessory' ? (
            <Sparkles aria-hidden="true" strokeWidth={1.5} />
          ) : (
            <Shirt aria-hidden="true" strokeWidth={1.5} />
          )}
        </div>
        <div className="customer-catalog-card__identity">
          <CustomerStatusBadge>{genderLabel[item.gender]}</CustomerStatusBadge>
          <h4 className="customer-catalog-card__title">{item.name}</h4>
          {item.description && (
            <p className="customer-catalog-card__description">{item.description}</p>
          )}
        </div>
      </header>
      <div className="customer-catalog-card__availability">
        <p className="customer-catalog-card__sizes-label">Số lượng theo size:</p>
        <div className="customer-catalog-card__sizes">
          {sizes.length ? (
            sizes.map((size) => (
              <CustomerStatusBadge key={size}>
                {size}
                {item.availableBySize ? `: ${item.availableBySize[size]}` : ''}
              </CustomerStatusBadge>
            ))
          ) : (
            <p>Chưa có kích cỡ sẵn sàng; vui lòng liên hệ studio.</p>
          )}
        </div>
      </div>
      <div className="customer-catalog-card__price">
        <span className="sr-only">Giá thuê theo ngày</span>
        {hasDailyPrice ? (
          <CustomerPrice amount={dailyPrice} unit="/ ngày" />
        ) : (
          <p>Liên hệ báo giá</p>
        )}
        {hasDailyPrice && days && (
          <p className="customer-catalog-card__estimate">
            <span className="sr-only">Tạm tính </span>
            {days} ngày: <CustomerPrice amount={dailyPrice * days} />
            <span className="sr-only"> / 1 sản phẩm</span>
          </p>
        )}
      </div>
      {clientPortalEnabled && (
        <CustomerButton asChild fullWidth>
          <Link
            to={`/rental/start?${rentalParams}`}
            className="customer-catalog-card__select"
            aria-label={`Chọn mẫu ${item.name}`}
          >
            Chọn mẫu này <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </CustomerButton>
      )}
    </article>
  );
}
