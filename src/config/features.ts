export const clientPortalEnabled = import.meta.env.VITE_CLIENT_PORTAL_ENABLED !== 'false';
export const clientRentalEnabled =
  clientPortalEnabled && import.meta.env.VITE_CLIENT_RENTAL_ENABLED === 'true';
