import { Link } from 'react-router-dom';
import { Shirt, Sparkles } from 'lucide-react';
import type { RentalCatalogItem } from '../../types';
import { clientRentalEnabled } from '../../config/features';
import { CustomerButton } from './CustomerButton';
import { CustomerPrice } from './CustomerPrice';
import { CustomerStatusBadge } from './CustomerStatusBadge';
import '../../styles/customer-catalog.css';

const genderLabel = { male: 'Nam', female: 'Nữ', unisex: 'Nam / Nữ' };
const itemKindLabel = { clothing: 'Trang phục', accessory: 'Phụ kiện' };

export function CustomerCatalogCard({ item }: { item: RentalCatalogItem }) {
  return (
    <article className="customer-catalog-card">
      <div className="customer-catalog-card__illustration">
        {item.itemKind === 'accessory' ? (
          <Sparkles aria-hidden="true" strokeWidth={1.5} />
        ) : (
          <Shirt aria-hidden="true" strokeWidth={1.5} />
        )}
        <span className="customer-catalog-card__kind">{itemKindLabel[item.itemKind]}</span>
        <span className="customer-catalog-card__caption">Minh hoạ nhóm hàng</span>
      </div>
      <div className="customer-catalog-card__meta">
        <p className="customer-caption">{item.category || itemKindLabel[item.itemKind]}</p>
        <h2 className="customer-catalog-card__title">{item.name}</h2>
        <CustomerStatusBadge>{genderLabel[item.gender]}</CustomerStatusBadge>
        {item.description && (
          <p className="customer-catalog-card__description">{item.description}</p>
        )}
        <div>
          <p className="customer-catalog-card__sizes-label">Kích cỡ sẵn sàng</p>
          <div className="customer-catalog-card__sizes">
            {item.sizes.length ? (
              item.sizes.map((size) => <CustomerStatusBadge key={size}>{size}</CustomerStatusBadge>)
            ) : (
              <p>Chưa có kích cỡ sẵn sàng; vui lòng liên hệ studio.</p>
            )}
          </div>
        </div>
        <div className="customer-catalog-card__price">
          <p className="customer-caption">Giá thuê tham khảo</p>
          {item.rentalPrice > 0 ? (
            <CustomerPrice amount={item.rentalPrice} />
          ) : (
            <p>Liên hệ báo giá</p>
          )}
        </div>
        <CustomerButton asChild fullWidth>
          <Link
            to={
              clientRentalEnabled
                ? `/rental/start?item=${encodeURIComponent(item._id)}`
                : `/booking/start?source=costumes&item=${encodeURIComponent(item._id)}&itemName=${encodeURIComponent(item.name)}`
            }
          >
            {clientRentalEnabled ? 'Yêu cầu thuê mẫu này' : 'Thêm vào yêu cầu'}
          </Link>
        </CustomerButton>
      </div>
    </article>
  );
}
