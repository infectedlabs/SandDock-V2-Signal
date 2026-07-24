"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import AdminShell, { AdminAccessDenied } from "@/components/admin/AdminShell";

const STATUS_FILTERS = ["pending", "accepted", "waitlisted", "rejected"];

export default function AdminApplicationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedApp, setSelectedApp] = useState(null);
  const [updatingAction, setUpdatingAction] = useState(null); // Format: "appId_status"

  const ADMIN_EMAIL = "ghuruprasaath@gmail.com";
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (user && !isAdmin) {
      router.push("/");
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/admin/applications");
      const data = await res.json();

      if (!res.ok) {
        console.error("API Error:", res.status, data);
        throw new Error(data.error || "Failed to fetch applications");
      }

      setApplications(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching applications:", error);
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (appId, newStatus, notes = "") => {
    setUpdatingAction(`${appId}_${newStatus}`);
    try {
      const res = await fetch(`/api/admin/applications?id=${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reviewerNotes: notes }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("API Error:", res.status, data);
        throw new Error(data.error || "Failed to update");
      }

      await fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error("Error updating application:", error);
      alert(`Failed to update application: ${error.message}`);
    } finally {
      setUpdatingAction(null);
    }
  };

  const filteredApps = applications.filter((a) => a.status === filterStatus);

  if (!user || !isAdmin) return <AdminAccessDenied />;

  return (
    <AdminShell
      active="/admin/applications"
      title="Applications"
      description="Review pending Pro/Master applications and decide who gets access."
    >
      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 text-[12px] font-semibold rounded-full border transition-colors cursor-pointer ${
              filterStatus === status
                ? "bg-accent/15 text-accent-soft border-accent/30"
                : "bg-transparent text-ink-2 border-line hover:text-ink"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)} ({applications.filter((a) => a.status === status).length})
          </button>
        ))}
      </div>

      {/* APPLICATIONS TABLE */}
      <div className="card overflow-hidden !rounded-2xl">
        {loading ? (
          <div className="p-10 text-center text-ink-2 text-sm">Loading...</div>
        ) : filteredApps.length === 0 ? (
          <div className="p-10 text-center text-ink-2 text-sm">No {filterStatus} applications.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Name</th>
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Email</th>
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Plan</th>
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Experience</th>
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Capital</th>
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Applied</th>
                  <th className="text-left px-5 py-3.5 font-semibold uppercase tracking-[0.14em] text-[10px] text-ink-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-4 text-ink">{app.name}</td>
                    <td className="px-5 py-4 text-ink-2">{app.email}</td>
                    <td className="px-5 py-4">
                      <span className={`chip ${app.plan === "pro" ? "chip-accent" : ""}`}>{app.plan}</span>
                    </td>
                    <td className="px-5 py-4 text-ink-2 text-xs">{app.experience}</td>
                    <td className="px-5 py-4 text-ink-2 text-xs">{app.capital}</td>
                    <td className="px-5 py-4 text-ink-2 text-xs tabular-nums">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="text-accent-soft hover:text-ink text-[12px] font-semibold transition-colors cursor-pointer"
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-gradient-border p-px max-w-2xl w-full max-h-[90vh]">
            <div className="relative rounded-[17px] bg-surface-2/95 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-surface-2/95 backdrop-blur-xl border-b border-line px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-[16px] font-semibold text-ink">{selectedApp.name}</h2>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-ink-2 hover:text-ink text-2xl leading-none cursor-pointer bg-transparent border-0"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft mb-3">Personal info</h3>
                  <div className="space-y-1.5 text-[13.5px] text-ink-2">
                    <p><span className="text-ink-3">Name:</span> {selectedApp.name}</p>
                    <p><span className="text-ink-3">Email:</span> {selectedApp.email}</p>
                    {selectedApp.telegram && <p><span className="text-ink-3">Telegram:</span> {selectedApp.telegram}</p>}
                    <p><span className="text-ink-3">Country:</span> {selectedApp.country}</p>
                  </div>
                </section>

                <section className="pt-5 border-t border-line">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft mb-3">Trading profile</h3>
                  <div className="space-y-1.5 text-[13.5px] text-ink-2">
                    <p><span className="text-ink-3">Experience:</span> {selectedApp.experience}</p>
                    <p><span className="text-ink-3">Capital:</span> {selectedApp.capital}</p>
                    {selectedApp.exchanges && <p><span className="text-ink-3">Exchanges:</span> {selectedApp.exchanges}</p>}
                    {selectedApp.current_services && <p><span className="text-ink-3">Current services:</span> {selectedApp.current_services}</p>}
                  </div>
                </section>

                <section className="pt-5 border-t border-line">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft mb-3">Application</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-ink-3 uppercase tracking-[0.14em] mb-1">Goal</p>
                      <p className="text-[13.5px] text-ink-2">{selectedApp.goal}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-3 uppercase tracking-[0.14em] mb-1">Risk management (the key question)</p>
                      <p className="text-[13.5px] text-ink-2">{selectedApp.risk_management}</p>
                    </div>
                  </div>
                </section>

                {selectedApp.reviewer_notes && (
                  <section className="pt-5 border-t border-line">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft mb-3">Reviewer notes</h3>
                    <p className="text-[13.5px] text-ink-2">{selectedApp.reviewer_notes}</p>
                  </section>
                )}

                {selectedApp.status === "pending" && (
                  <section className="pt-5 border-t border-line">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => updateApplicationStatus(selectedApp.id, "accepted", "Approved - good risk management")}
                        disabled={updatingAction === `${selectedApp.id}_accepted`}
                        className="px-4 py-2.5 bg-up/15 hover:bg-up/25 disabled:opacity-50 text-up border border-up/30 text-[12px] font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        {updatingAction === `${selectedApp.id}_accepted` ? "Accepting..." : "Accept"}
                      </button>
                      <button
                        onClick={() => updateApplicationStatus(selectedApp.id, "waitlisted", "Waitlisted - check back later")}
                        disabled={updatingAction === `${selectedApp.id}_waitlisted`}
                        className="px-4 py-2.5 bg-amber-400/15 hover:bg-amber-400/25 disabled:opacity-50 text-amber-300 border border-amber-400/30 text-[12px] font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        {updatingAction === `${selectedApp.id}_waitlisted` ? "Waitlisting..." : "Waitlist"}
                      </button>
                      <button
                        onClick={() => updateApplicationStatus(selectedApp.id, "rejected", "Rejected - does not meet risk management standards")}
                        disabled={updatingAction === `${selectedApp.id}_rejected`}
                        className="col-span-2 px-4 py-2.5 bg-down/15 hover:bg-down/25 disabled:opacity-50 text-down border border-down/30 text-[12px] font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        {updatingAction === `${selectedApp.id}_rejected` ? "Rejecting..." : "Reject"}
                      </button>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
