"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { BILLING_CYCLES_BY_PLAN } from "@/lib/plans";
import AdminShell, { AdminAccessDenied } from "@/components/admin/AdminShell";

const ADMIN_EMAIL = "ghuruprasaath@gmail.com";
const PLAN_OPTIONS = ["free", "pro", "master", "grandmaster"];

function planChipClass(plan) {
  if (plan === "grandmaster") return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  if (plan === "master") return "border-accent-2/30 bg-accent-2/10 text-[#c4b5fd]";
  if (plan === "pro") return "border-accent/30 bg-accent/10 text-accent-soft";
  return "border-line bg-white/[0.03] text-ink-3";
}

export default function AdminUsersPage() {
  const { user, session } = useAuth();
  const router = useRouter();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [draftPlan, setDraftPlan] = useState("free");
  const [draftCycle, setDraftCycle] = useState("monthly");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user && !isAdmin) router.push("/");
  }, [user, isAdmin, router]);

  const fetchUsers = async (q = "") => {
    setLoading(true);
    try {
      const token = session?.access_token;
      const res = await fetch(`/api/admin/users${q ? `?search=${encodeURIComponent(q)}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && session) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, session]);

  const startEdit = (u) => {
    setEditingId(u.id);
    setDraftPlan(u.plan);
    setDraftCycle(u.billing_cycle || BILLING_CYCLES_BY_PLAN[u.plan]?.[0] || "monthly");
    setErrorMsg("");
  };

  const submitChange = async (u) => {
    setSaving(true);
    setErrorMsg("");
    try {
      const token = session?.access_token;
      const res = await fetch("/api/admin/upgrade-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: u.id,
          newPlan: draftPlan,
          billingCycle: draftPlan === "free" ? undefined : draftCycle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update plan");
      setEditingId(null);
      await fetchUsers(search);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user || !isAdmin) return <AdminAccessDenied />;

  return (
    <AdminShell
      active="/admin/users"
      title="Users & plans"
      description="Search a user and manually set their plan once you've confirmed their USDT payment."
    >
      <form onSubmit={(e) => { e.preventDefault(); fetchUsers(search); }} className="flex gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="field flex-1"
        />
        <button type="submit" className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-ink bg-white/[0.06] border border-line hover:bg-white/[0.1] transition-colors cursor-pointer">
          Search
        </button>
      </form>

      {errorMsg && (
        <div className="rounded-xl border border-down/30 bg-down/10 px-4 py-3 text-[13px] text-down mb-6">
          {errorMsg}
        </div>
      )}

      <div className="card overflow-hidden !rounded-2xl">
        {loading ? (
          <div className="p-10 text-center text-ink-2 text-sm">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-ink-2 text-sm">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[780px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Email</th>
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Plan</th>
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Billing cycle</th>
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Ends</th>
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Ref. code</th>
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.03] transition-colors align-top">
                    <td className="px-5 py-4 text-ink">
                      {u.email}
                      {u.name && <div className="text-[11px] text-ink-3 mt-0.5">{u.name}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`chip ${planChipClass(u.plan)}`}>{u.plan}</span>
                    </td>
                    <td className="px-5 py-4 text-ink-2 text-xs">{u.billing_cycle || "—"}</td>
                    <td className="px-5 py-4 text-ink-2 text-xs">
                      {u.plan_ends_at ? new Date(u.plan_ends_at).toLocaleDateString() : (u.plan === "grandmaster" ? "Never" : "—")}
                    </td>
                    <td className="px-5 py-4 text-ink-3 text-xs font-mono">{u.referral_code}</td>
                    <td className="px-5 py-4">
                      {editingId === u.id ? (
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <select
                            value={draftPlan}
                            onChange={(e) => {
                              const p = e.target.value;
                              setDraftPlan(p);
                              setDraftCycle(BILLING_CYCLES_BY_PLAN[p]?.[0] || "monthly");
                            }}
                            className="field !py-1.5 !px-2.5 text-xs"
                          >
                            {PLAN_OPTIONS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          {draftPlan !== "free" && (
                            <select
                              value={draftCycle}
                              onChange={(e) => setDraftCycle(e.target.value)}
                              className="field !py-1.5 !px-2.5 text-xs"
                            >
                              {BILLING_CYCLES_BY_PLAN[draftPlan].map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => submitChange(u)}
                              disabled={saving}
                              className="px-3 py-1.5 bg-up/15 hover:bg-up/25 disabled:opacity-50 text-up border border-up/30 text-[11px] font-semibold rounded-lg transition-all cursor-pointer"
                            >
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] text-ink-2 border border-line text-[11px] font-semibold rounded-lg transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(u)}
                          className="text-accent-soft hover:text-ink text-[12px] font-semibold transition-colors cursor-pointer"
                        >
                          Change plan →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
