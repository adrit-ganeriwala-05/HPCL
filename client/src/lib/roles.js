// Mirrors server/internal/models/user.go's Role consts.
export const ROLE_CLIENT = 'client';
export const ROLE_EMPLOYEE = 'employee';
export const ROLE_ADMIN = 'admin';

// Admin has every permission implicitly (server enforces this too — these
// flags are only meaningful on employee accounts). Use this everywhere the
// UI needs to know "can this user do X", instead of reading the raw flag.
export function hasPermission(user, flag) {
  if (!user) return false;
  if (user.role === ROLE_ADMIN) return true;
  return user.role === ROLE_EMPLOYEE && !!user[flag];
}
