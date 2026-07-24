import { createAdminClient } from '@/utils/supabase/admin';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ghuruprasaath@gmail.com';

/**
 * Extracts the bearer token from an incoming request and resolves it to a
 * Supabase auth user. Returns { user: null } if the token is missing/invalid.
 */
export async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { user: null };

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { user: null };
  return { user: data.user };
}

export function isAdminEmail(email) {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Resolves the requesting user from the Authorization header and checks
 * that they are the configured admin. Returns { user, isAdmin }.
 */
export async function requireAdmin(request) {
  const { user } = await getUserFromRequest(request);
  return { user, isAdmin: isAdminEmail(user?.email) };
}
