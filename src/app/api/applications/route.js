import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('user_id');

    if (!userId && !email) {
      return Response.json({ error: 'Either user_id or email parameter is required' }, { status: 400 });
    }

    // Try user_id first
    if (userId) {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Supabase fetch error:', error);
        return Response.json({ error: 'Failed to fetch application' }, { status: 500 });
      }

      if (data && data.length > 0) {
        return Response.json(data, { status: 200 });
      }
    }

    // Fallback to email if user_id didn't find anything
    if (email) {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Supabase fetch error:', error);
        return Response.json({ error: 'Failed to fetch application' }, { status: 500 });
      }

      return Response.json(data || [], { status: 200 });
    }

    return Response.json([], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['name', 'email', 'country', 'experience', 'capital', 'plan', 'riskManagement'];
    for (const field of required) {
      if (!body[field]) {
        return Response.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Check if email already applied
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('email', body.email)
      .limit(1);

    if (existing && existing.length > 0) {
      return Response.json({ error: 'This email has already submitted an application.' }, { status: 400 });
    }

    // Insert application
    const { data, error } = await supabase
      .from('applications')
      .insert({
        name: body.name,
        email: body.email,
        user_id: body.user_id || null,
        telegram: body.telegram || null,
        country: body.country,
        experience: body.experience,
        capital: body.capital,
        exchanges: body.exchanges || null,
        current_services: body.currentServices || null,
        current_services_experience: body.currentServicesExperience || null,
        plan: body.plan,
        goal: body.goal,
        how_found_us: body.howYouFoundUs || null,
        risk_management: body.riskManagement,
        status: 'pending', // pending | accepted | waitlisted | rejected
        created_at: new Date().toISOString(),
      })
      .select('id');

    if (error) {
      console.error('Supabase insert error:', error);
      return Response.json({ error: 'Failed to submit application' }, { status: 500 });
    }

    return Response.json({ success: true, applicationId: data[0].id }, { status: 201 });
  } catch (error) {
    console.error('Application error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
