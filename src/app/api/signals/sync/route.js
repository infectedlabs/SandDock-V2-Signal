import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Signal generation (swing detection, closing, new-signal creation) is now
// owned exclusively by the standalone Railway worker in
// telegram-signal-worker/. This endpoint used to run that logic itself on
// every terminal page load, which meant the app and the worker could both
// be writing to the `signals` table at the same time — a second writer
// applying slightly different bookkeeping (e.g. how trailing/still-open
// signals get resolved) is exactly how the BNBUSDT stale-duplicate-open-row
// bug happened. Keeping this endpoint but making it a true no-op means any
// existing caller (or old cached frontend build) that still hits this route
// can't accidentally reintroduce a second writer.
export async function GET() {
  return NextResponse.json({
    status: 'noop',
    message: 'Signal generation is handled by the dedicated Railway worker (telegram-signal-worker/). This endpoint no longer writes to the database.',
  });
}
