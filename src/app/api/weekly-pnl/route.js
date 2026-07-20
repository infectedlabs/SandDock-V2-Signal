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
    // Get signals from the past 7 days with completed PnL only
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: signals, error } = await supabaseAdmin
      .from('signals')
      .select('symbol, pnl_pct, is_win')
      .not('pnl_pct', 'is', null)
      .gte('bar_time', sevenDaysAgo.toISOString())
      .order('bar_time', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    if (!signals || signals.length === 0) {
      return NextResponse.json(
        { BTC: 0, ETH: 0, BNB: 0, total: 0 },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // Calculate PnL by coin - sum all PnL values
    const pnlBySymbol = { BTC: 0, ETH: 0, BNB: 0 };
    const countBySymbol = { BTC: 0, ETH: 0, BNB: 0 };

    signals.forEach(signal => {
      const pnl = parseFloat(signal.pnl_pct) || 0;

      if (signal.symbol?.includes('BTC')) {
        pnlBySymbol.BTC += pnl;
        countBySymbol.BTC++;
      } else if (signal.symbol?.includes('ETH')) {
        pnlBySymbol.ETH += pnl;
        countBySymbol.ETH++;
      } else if (signal.symbol?.includes('BNB')) {
        pnlBySymbol.BNB += pnl;
        countBySymbol.BNB++;
      }
    });

    const total = pnlBySymbol.BTC + pnlBySymbol.ETH + pnlBySymbol.BNB;

    return NextResponse.json(
      {
        BTC: pnlBySymbol.BTC,
        ETH: pnlBySymbol.ETH,
        BNB: pnlBySymbol.BNB,
        total: total
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err) {
    console.error('[/api/weekly-pnl] Error:', err.message);
    return NextResponse.json(
      { BTC: 0, ETH: 0, BNB: 0, total: 0 },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
