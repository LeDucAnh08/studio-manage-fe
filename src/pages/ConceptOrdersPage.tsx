import { Navigate, useLocation } from 'react-router-dom';

export default function ConceptOrdersPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('service', 'concept');
  return <Navigate to={`/workflow-bookings?${params}`} replace />;
}
