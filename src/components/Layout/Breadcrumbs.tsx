import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getNavigationBreadcrumbs } from '../../config/navigation';

const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const items = getNavigationBreadcrumbs(pathname);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Đường dẫn" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isCurrentPage = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground/60" />
              )}
              {item.to && !isCurrentPage ? (
                <Link to={item.to} className="text-muted-foreground hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isCurrentPage ? 'page' : undefined}
                  className={
                    isCurrentPage ? 'font-medium text-foreground' : 'text-muted-foreground'
                  }
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
