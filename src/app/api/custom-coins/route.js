import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const plan = searchParams.get('plan');

    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    // Only MASTER+ users can have custom coins
    if (!['master', 'grandmaster'].includes(plan)) {
      return NextResponse.json({ custom_coins: [] });
    }

    const { data, error } = await supabaseAdmin
      .from('custom_coins')
      .select('symbol')
      .eq('user_id', userId)
      .order('added_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      custom_coins: data ? data.map(c => c.symbol) : [],
      total: data ? data.length : 0,
      max: 5
    });
  } catch (err) {
    console.error('[/api/custom-coins GET] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user_id, symbol, plan } = await request.json();

    if (!user_id || !symbol) {
      return NextResponse.json(
        { error: 'user_id and symbol required' },
        { status: 400 }
      );
    }

    // Only MASTER+ users can have custom coins
    if (!['master', 'grandmaster'].includes(plan)) {
      return NextResponse.json(
        { error: 'Custom coins only available for MASTER+ plans' },
        { status: 403 }
      );
    }

    // Check current count
    const { data: existing, error: countError } = await supabaseAdmin
      .from('custom_coins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id);

    if (countError) throw countError;
    if (existing && existing.length >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 custom coins allowed' },
        { status: 400 }
      );
    }

    // Validate symbol format (e.g., ETHUSDT, SOLUSDT)
    if (!/^[A-Z0-9]{2,10}USDT$/.test(symbol.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid symbol format. Use format like ETHUSDT' },
        { status: 400 }
      );
    }

    // Add custom coin
    const { data, error } = await supabaseAdmin
      .from('custom_coins')
      .insert({ user_id, symbol: symbol.toUpperCase() })
      .select();

    if (error) {
      if (error.message.includes('duplicate')) {
        return NextResponse.json(
          { error: 'Coin already added' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, coin: data[0] });
  } catch (err) {
    console.error('[/api/custom-coins POST] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const symbol = searchParams.get('symbol');
    const plan = searchParams.get('plan');

    if (!userId || !symbol) {
      return NextResponse.json(
        { error: 'user_id and symbol required' },
        { status: 400 }
      );
    }

    // Only MASTER+ users can have custom coins
    if (!['master', 'grandmaster'].includes(plan)) {
      return NextResponse.json(
        { error: 'Custom coins only available for MASTER+ plans' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('custom_coins')
      .delete()
      .eq('user_id', userId)
      .eq('symbol', symbol.toUpperCase());

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/custom-coins DELETE] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
