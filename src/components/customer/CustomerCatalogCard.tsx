import { Link } from 'react-router-dom';
import { Shirt, Sparkles } from 'lucide-react';
import type { RentalCatalogItem } from '../../types';
import { clientRentalEnabled } from '../../config/features';
import { rentalDayCount } from '../../utils/rentalPeriod';
import { CustomerButton } from './CustomerButton';
import { CustomerPrice } from './CustomerPrice';
import { CustomerStatusBadge } from './CustomerStatusBadge';
import '../../styles/customer-catalog.css';

const genderLabel = { male: 'Nam', female: 'Nữ', unisex: 'Nam / Nữ' };
const itemKindLabel = { clothing: 'Trang phục', accessory: 'Phụ kiện' };

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
  const sizes = item.sizes.filter(
    (size) => !item.availableBySize || item.availableBySize[size] > 0,
  );
  const rentalParams = new URLSearchParams({ item: item._id, receiveDate, returnDate });
  return (
    <article className="customer-catalog-card">
      <div className="customer-catalog-card__illustration">
        {item.itemKind === 'accessory' ? (
          <Sparkles aria-hidden="true" strokeWidth={1.5} />
        ) : (
          <Shirt aria-hidden="true" strokeWidth={1.5} />
        )}
        <span className="customer-catalog-card__kind">{itemKindLabel[item.itemKind]}</span>
      </div>
      <div className="customer-catalog-card__meta">
        <p className="customer-caption">{item.category || itemKindLabel[item.itemKind]}</p>
        <h4 className="customer-catalog-card__title">{item.name}</h4>
        <CustomerStatusBadge>{genderLabel[item.gender]}</CustomerStatusBadge>
        {item.description && (
          <p className="customer-catalog-card__description">{item.description}</p>
        )}
        <div>
          <p className="customer-catalog-card__sizes-label">Còn trống trong khoảng thuê</p>
          <div className="customer-catalog-card__sizes">
            {sizes.length ? (
              sizes.map((size) => (
                <CustomerStatusBadge key={size}>
                  {size}
                  {item.availableBySize ? ` · còn ${item.availableBySize[size]}` : ''}
                </CustomerStatusBadge>
              ))
            ) : (
              <p>Chưa có kích cỡ sẵn sàng; vui lòng liên hệ studio.</p>
            )}
          </div>
        </div>
        <div className="customer-catalog-card__price">
          <p className="customer-caption">Giá thuê theo ngày</p>
          {hasDailyPrice ? (
            <CustomerPrice amount={dailyPrice} unit="/ ngày" />
          ) : (
            <p>Liên hệ báo giá</p>
          )}
        </div>
        {hasDailyPrice && days && (
          <p className="customer-caption">
            Tạm tính {days} ngày / 1 sản phẩm: <CustomerPrice amount={dailyPrice * days} />
          </p>
        )}
        <CustomerButton asChild fullWidth>
          <Link to={`/rental/start?${rentalParams}`}>
            {clientRentalEnabled ? 'Thuê riêng mẫu này' : 'Liên hệ thuê riêng'}
          </Link>
        </CustomerButton>
      </div>
    </article>
  );
}
