import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import PhotographerPortfolio from '../components/PhotographerPortfolio';
import { conceptError, conceptService, type PublicPhotographer } from '../services/conceptService';

export default function PhotographerPublicPage() {
  const { photographerId = '' } = useParams();
  const [result, setResult] = useState<{ profile?: PublicPhotographer; error?: string }>({});
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setResult({});
    conceptService
      .photographer(photographerId, abort.signal)
      .then((profile) => {
        if (!abort.signal.aborted) setResult({ profile });
      })
      .catch((error) => {
        if (!abort.signal.aborted) setResult({ error: conceptError(error) });
      });
    return () => abort.abort();
  }, [photographerId, revision]);
  return (
    <PublicSiteLayout source="concepts">
      <div className="photographer-page">
        <Link className="app-back-link photographer-back" to="/concepts">
          <ArrowLeft size={18} />
          Quay lại concept
        </Link>
        {result.error ? (
          <div role="alert">
            <h1>Chưa thể mở hồ sơ thợ</h1>
            <p>{result.error}</p>
            <button onClick={() => setRevision((n) => n + 1)}>Thử tải lại</button>
          </div>
        ) : result.profile ? (
          <>
            <PhotographerPortfolio profile={result.profile} />
            <Link className="photographer-public-cta" to="/concepts">
              Khám phá concept và đặt lịch
            </Link>
          </>
        ) : (
          <p role="status">Đang tải hồ sơ thợ…</p>
        )}
      </div>
    </PublicSiteLayout>
  );
}
