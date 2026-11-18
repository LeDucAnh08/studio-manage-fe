export const SESSION_ENDED = 'yume:session-ended';

// This only schedules the UI lock. The API still verifies the JWT signature and user.
export function tokenExpiresAt(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function endSession(expectedToken?: string) {
  if (expectedToken && localStorage.getItem('token') !== expectedToken) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event(SESSION_ENDED));
}
