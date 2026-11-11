import { ArrowRight } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import { CustomerImage } from '../components/customer/CustomerImage';
import { useConceptCatalog } from '../hooks/useConceptCatalog';
import { money } from '../services/conceptService';
import '../styles/concept-catalog.css';

export default function ConceptCatalogPage() {
  const { catalog, error, reload } = useConceptCatalog();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const conceptId = params.get('concept') || '';
  const activeConcept = catalog?.concepts.some((item) => item._id === conceptId) ? conceptId : '';
  const packages =
    catalog?.packages.filter((item) => !activeConcept || item.concept === activeConcept) || [];
  return (
    <PublicSiteLayout source="concepts">
      <div className="concept-catalog-page">
        <header className="concept-catalog-heading">
          <h1>Chọn gói chụp phù hợp với bạn</h1>
          <p>Khám phá concept và tìm buổi chụp dành riêng cho bạn.</p>
        </header>
        {error && (
          <div className="concept-catalog-notice" role="alert">
            <p>{error}</p>
            <button onClick={reload}>Thử tải lại</button>
          </div>
        )}
        {!catalog && !error && (
          <p role="status" className="concept-catalog-notice">
            Đang tải gói chụp…
          </p>
        )}
        {catalog && (
          <>
            <div className="concept-catalog-tabs" role="group" aria-label="Lọc theo concept">
              {[{ _id: '', name: 'Tất cả' }, ...catalog.concepts].map((item) => (
                <button
                  key={item._id}
                  aria-pressed={activeConcept === item._id}
                  onClick={() => setParams(item._id ? { concept: item._id } : {})}
                >
                  {item.name}
                </button>
              ))}
            </div>
            {!packages.length && (
              <p className="concept-catalog-notice">
                Studio đang chuẩn bị các gói concept. Vui lòng quay lại sau.
              </p>
            )}
            <div className="concept-catalog-grid">
              {packages.map((pkg, index) => {
                const concept = catalog.concepts.find((item) => item._id === pkg.concept);
                const image = pkg.imageUrl || concept?.coverUrl || concept?.gallery?.[0]?.url;
                return (
                  <article className="concept-catalog-card" key={pkg._id}>
                    {image && (
                      <CustomerImage
                        src={image}
                        alt={pkg.name}
                        width={600}
                        height={250}
                        priority={index < 3}
                      />
                    )}
                    <div className="concept-catalog-card__body">
                      <p className="concept-catalog-card__category">{concept?.name}</p>
                      <h2>{pkg.name}</h2>
                      <p className="concept-catalog-card__price">
                        {money(pkg.price)} <span>/ buổi</span>
                      </p>
                      <p className="concept-catalog-card__facts">
                        {pkg.durationMinutes} phút <span aria-hidden="true">·</span>{' '}
                        {pkg.retouchQuota} ảnh chỉnh sửa
                      </p>
                      <Link
                        className="concept-card-link"
                        to={`/concept-booking/packages/${pkg._id}`}
                        state={{ catalogSearch: location.search }}
                        aria-label={`Xem chi tiết ${pkg.name}`}
                      >
                        Xem chi tiết <ArrowRight size={18} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PublicSiteLayout>
  );
}
