import { Outlet } from 'react-router-dom';
import { CustomerAppearanceContext } from './CustomerAppearance';
import { validateCustomerContainer } from '@/utils/customerValidation';

export default function CustomerScope() {
  return (
    <CustomerAppearanceContext.Provider value={true}>
      <div
        className="customer-ui customer-tokens"
        onSubmitCapture={(event) => {
          if (
            event.target instanceof HTMLFormElement &&
            event.target.dataset.validatedBy !== 'react-hook-form' &&
            !validateCustomerContainer(event.target)
          ) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <Outlet />
      </div>
    </CustomerAppearanceContext.Provider>
  );
}
