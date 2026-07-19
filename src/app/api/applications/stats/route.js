import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export async function GET(request) {
  try {
    // Get all application counts by status
    const { data: allApps, error } = await supabase
      .from('applications')
      .select('status, plan');

    if (error) {
      console.error('Error fetching stats:', error);
      return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Calculate stats
    const stats = {
      total: allApps.length,
      pending: allApps.filter(a => a.status === 'pending').length,
      accepted: allApps.filter(a => a.status === 'accepted').length,
      waitlisted: allApps.filter(a => a.status === 'waitlisted').length,
      rejected: allApps.filter(a => a.status === 'rejected').length,
      proWaitlist: allApps.filter(a => a.plan === 'pro' && a.status === 'waitlisted').length,
      masterWaitlist: allApps.filter(a => a.plan === 'master' && a.status === 'waitlisted').length,
      lastReviewDate: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      lastBatch: {
        accepted: allApps.filter(a => a.status === 'accepted').length,
        waitlisted: allApps.filter(a => a.status === 'waitlisted').length,
      },
    };

    return Response.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
