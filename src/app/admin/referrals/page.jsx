"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import AdminShell, { AdminAccessDenied } from "@/components/admin/AdminShell";

const ADMIN_EMAIL = "ghuruprasaath@gmail.com";

export default function AdminReferralsPage() {
  const { user, session } = useAuth();
  const router = useRouter();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [byReferrer, setByReferrer] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !isAdmin) router.push("/");
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin || !session) return;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/referrals", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load referrals");
        setByReferrer(data.byReferrer || []);
        setConversions(data.conversions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, session]);

  if (!user || !isAdmin) return <AdminAccessDenied />;

  const grandTotal = byReferrer.reduce((s, r) => s + r.totalEarned, 0);

  return (
    <AdminShell
      active="/admin/referrals"
      title="Referral payouts"
      description="Every referral conversion and what each referrer is owed in USDT."
    >
      <div className="card-gradient-border p-px mb-8">
        <div className="relative rounded-[17px] bg-surface-2/80 backdrop-blur-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-16 w-52 h-52 rounded-full bg-accent/18 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              Total commissions ever earned (all referrers)
            </p>
            <p className="text-[32px] font-semibold tracking-tight text-gradient mt-1.5">${grandTotal.toFixed(2)} USDT</p>
          </div>
          <p className="relative text-[12.5px] text-ink-2 max-w-sm sm:text-right leading-relaxed">
            Referrers claim weekly by contacting you on Telegram - send USDT TRC20 directly, no in-app payout tracking.
          </p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3 mb-3">By referrer</h2>
        <div className="card overflow-hidden !rounded-2xl">
          {loading ? (
            <div className="p-10 text-center text-ink-2 text-sm">Loading...</div>
          ) : byReferrer.length === 0 ? (
            <div className="p-10 text-center text-ink-2 text-sm">No referral conversions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Referrer</th>
                    <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Conversions</th>
                    <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Total earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {byReferrer.map((r) => (
                    <tr key={r.referrerId} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-4 text-ink">
                        {r.email}
                        {r.name && <div className="text-[11px] text-ink-3 mt-0.5">{r.name}</div>}
                      </td>
                      <td className="px-5 py-4 text-ink-2">{r.conversionCount}</td>
                      <td className="px-5 py-4 font-semibold text-up">${r.totalEarned.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3 mb-3">All conversions</h2>
        <div className="card overflow-hidden !rounded-2xl">
          {conversions.length === 0 ? (
            <div className="p-10 text-center text-ink-2 text-sm">No referral conversions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Date</th>
                    <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Referrer</th>
                    <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Referred</th>
                    <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Plan</th>
                    <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {conversions.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-4 text-ink-2 text-xs tabular-nums">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-ink text-xs">{c.referrer?.email}</td>
                      <td className="px-5 py-4 text-ink text-xs">{c.referred?.email}</td>
                      <td className="px-5 py-4 text-ink-2 text-xs uppercase font-semibold">{c.plan} · {c.billing_cycle}</td>
                      <td className="px-5 py-4 font-semibold text-up text-xs">${Number(c.commission_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
