import { Outlet } from 'react-router-dom';
import { CustomerAppearanceContext } from './CustomerAppearance';

export default function CustomerScope() {
  return (
    <CustomerAppearanceContext.Provider value={true}>
      <div className="customer-ui customer-tokens">
        <Outlet />
      </div>
    </CustomerAppearanceContext.Provider>
  );
}
