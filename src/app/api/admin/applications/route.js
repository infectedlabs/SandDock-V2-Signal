import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export async function GET(request) {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Error:', error);
      return Response.json({ error: error.message || 'Database query failed' }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('Error fetching applications:', error);
    return Response.json({ error: error.message || 'Failed to fetch applications' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const body = await request.json();
    const { status, reviewerNotes } = body;

    if (!status) {
      return Response.json({ error: 'Missing status' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('applications')
      .update({
        status,
        reviewer_notes: reviewerNotes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*');

    if (error) {
      console.error('Supabase Error:', error);
      return Response.json({ error: error.message || 'Failed to update application' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    const updatedApp = data[0];

    // Send approval email only if status is "accepted"
    if (status === 'accepted' && updatedApp.email && updatedApp.name && updatedApp.plan) {
      try {
        const emailResponse = await fetch(
          new URL('/api/email/send-approval', request.url),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: updatedApp.email,
              name: updatedApp.name,
              plan: updatedApp.plan
            })
          }
        );

        if (!emailResponse.ok) {
          const emailError = await emailResponse.json();
          console.error('Failed to send approval email:', emailError);
          // Don't fail the application update if email fails
          // Just log the error for debugging
        }
      } catch (emailError) {
        console.error('Error calling email endpoint:', emailError);
        // Continue anyway - the application was already updated
      }
    }

    return Response.json(updatedApp);
  } catch (error) {
    console.error('Error updating application:', error);
    return Response.json({ error: error.message || 'Failed to update application' }, { status: 500 });
  }
}
