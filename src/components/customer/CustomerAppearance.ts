import { createContext, useContext } from 'react';

export const CustomerAppearanceContext = createContext(false);

export const useCustomerAppearance = () => useContext(CustomerAppearanceContext);
