import { useEffect, useState } from 'react';
import { conceptService, conceptError, type Catalog } from '../services/conceptService';

export function useConceptCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setError('');
    conceptService
      .catalog(abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setCatalog(data);
      })
      .catch((failure) => {
        if (!abort.signal.aborted) setError(conceptError(failure));
      });
    return () => abort.abort();
  }, [revision]);
  return { catalog, error, reload: () => setRevision((value) => value + 1) };
}
