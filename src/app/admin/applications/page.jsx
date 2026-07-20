"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function AdminApplicationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedApp, setSelectedApp] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Check admin access - only ghuruprasaath@gmail.com
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
    setUpdatingId(appId);
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
      setUpdatingId(null);
    }
  };

  const filteredApps = applications.filter(a => a.status === filterStatus);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl font-bold">Access Denied</p>
          <p className="text-black">Only ghuruprasaath@gmail.com has access to this page.</p>
          <a href="/" className="inline-block px-6 py-2 bg-black text-white font-bold text-sm uppercase rounded-lg hover:bg-brand-orange transition-all">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-[#0a0e27]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
          <h1 className="text-sm font-bold uppercase tracking-wider">Applications Admin</h1>
          <a href="/terminal" className="text-[11px] hover:text-brand-orange transition-colors">
            Back to Terminal →
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── FILTER TABS ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 mb-8 border-b border-zinc-800 pb-4">
          {["pending", "accepted", "waitlisted", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${
                filterStatus === status
                  ? "bg-brand-orange text-white"
                  : "bg-zinc-900 text-white hover:text-white"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({applications.filter(a => a.status === status).length})
            </button>
          ))}
        </div>

        {/* ── APPLICATIONS TABLE ───────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-white">Loading...</div>
          ) : filteredApps.length === 0 ? (
            <div className="p-8 text-center text-white">No {filterStatus} applications.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800 border-b border-zinc-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Experience</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Capital</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Applied</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="border-b border-zinc-700 hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-3 text-sm text-white">{app.name}</td>
                      <td className="px-6 py-3 text-sm text-white">{app.email}</td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`text-xs font-bold uppercase ${
                          app.plan === 'pro' ? 'text-brand-orange' : 'text-purple-400'
                        }`}>
                          {app.plan}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-white text-xs">{app.experience}</td>
                      <td className="px-6 py-3 text-sm text-white text-xs">{app.capital}</td>
                      <td className="px-6 py-3 text-sm text-white text-xs">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="text-brand-orange hover:text-brand-orange/80 text-xs font-bold uppercase transition-colors"
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
      </div>

      {/* ── DETAIL MODAL ────────────────────────────────────────────────────── */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-800 border-b border-zinc-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold uppercase tracking-wide">{selectedApp.name}</h2>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-white hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Info */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-orange mb-3">Personal Info</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-white">Name:</span> <span className="text-white">{selectedApp.name}</span></p>
                  <p><span className="text-white">Email:</span> <span className="text-white">{selectedApp.email}</span></p>
                  {selectedApp.telegram && <p><span className="text-white">Telegram:</span> <span className="text-white">{selectedApp.telegram}</span></p>}
                  <p><span className="text-white">Country:</span> <span className="text-white">{selectedApp.country}</span></p>
                </div>
              </section>

              {/* Trading Info */}
              <section className="pt-4 border-t border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-orange mb-3">Trading Profile</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-white">Experience:</span> <span className="text-white">{selectedApp.experience}</span></p>
                  <p><span className="text-white">Capital:</span> <span className="text-white">{selectedApp.capital}</span></p>
                  {selectedApp.exchanges && <p><span className="text-white">Exchanges:</span> <span className="text-white">{selectedApp.exchanges}</span></p>}
                  {selectedApp.current_services && <p><span className="text-white">Current Services:</span> <span className="text-white">{selectedApp.current_services}</span></p>}
                </div>
              </section>

              {/* Application Details */}
              <section className="pt-4 border-t border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-orange mb-3">Application</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-white uppercase tracking-wider mb-1">Goal</p>
                    <p className="text-sm text-white">{selectedApp.goal}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white uppercase tracking-wider mb-1">Risk Management (THE KEY QUESTION)</p>
                    <p className="text-sm text-white">{selectedApp.risk_management}</p>
                  </div>
                </div>
              </section>

              {/* Existing Notes */}
              {selectedApp.reviewer_notes && (
                <section className="pt-4 border-t border-zinc-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-orange mb-3">Reviewer Notes</h3>
                  <p className="text-sm text-zinc-300">{selectedApp.reviewer_notes}</p>
                </section>
              )}

              {/* Action Buttons */}
              {selectedApp.status === "pending" && (
                <section className="pt-4 border-t border-zinc-800 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateApplicationStatus(selectedApp.id, "accepted", "Approved - good risk management")}
                      disabled={updatingId === selectedApp.id}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold uppercase rounded-lg transition-all"
                    >
                      {updatingId === selectedApp.id ? "Accepting..." : "Accept"}
                    </button>
                    <button
                      onClick={() => updateApplicationStatus(selectedApp.id, "waitlisted", "Waitlisted - check back later")}
                      disabled={updatingId === selectedApp.id}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white text-sm font-bold uppercase rounded-lg transition-all"
                    >
                      {updatingId === selectedApp.id ? "Waitlisting..." : "Waitlist"}
                    </button>
                    <button
                      onClick={() => updateApplicationStatus(selectedApp.id, "rejected", "Rejected - does not meet risk management standards")}
                      disabled={updatingId === selectedApp.id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold uppercase rounded-lg transition-all col-span-2"
                    >
                      {updatingId === selectedApp.id ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
