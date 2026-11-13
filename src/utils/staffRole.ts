import type { UserRole } from '../types';

export const isPersonalPhotographer = (user: { roles: UserRole[] } | null | undefined) =>
  !!user?.roles.includes(3) && !user.roles.some((role) => [0, 1, 2, 4].includes(role));
