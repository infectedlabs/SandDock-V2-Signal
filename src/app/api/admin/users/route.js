import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdmin } from '@/utils/supabase/authHelpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users?search=email-or-name
 * Auth: Bearer <access_token> of the admin account.
 * Lists/searches users for the upgrade/degrade admin dashboard.
 */
export async function GET(request) {
  const { isAdmin } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().replace(/[,%]/g, '');

    const supabase = createAdminClient();
    let query = supabase
      .from('profiles')
      .select('id, email, name, plan, billing_cycle, plan_started_at, plan_ends_at, referral_code, referred_by, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[Admin Users] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
