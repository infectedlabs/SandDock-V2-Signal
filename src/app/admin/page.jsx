"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import AdminShell, { AdminAccessDenied } from "@/components/admin/AdminShell";

const ADMIN_EMAIL = "ghuruprasaath@gmail.com";

const ADMIN_PAGES = [
  {
    href: "/admin/applications",
    title: "Applications",
    description: "Review pending Pro/Master applications - accept, waitlist, or reject.",
  },
  {
    href: "/admin/users",
    title: "Users & Plans",
    description: "Search any user and manually upgrade or degrade their plan (free/pro/master/grandmaster) after confirming USDT payment.",
  },
  {
    href: "/admin/referrals",
    title: "Referral Payouts",
    description: "See every referral conversion and per-referrer USDT totals owed, for weekly Telegram payouts.",
  },
];

export default function AdminIndexPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (user && !isAdmin) router.push("/");
  }, [user, isAdmin, router]);

  if (!user || !isAdmin) return <AdminAccessDenied />;

  return (
    <AdminShell active="/admin" title="Admin console" description="Everything you need to run Sanddock day to day.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ADMIN_PAGES.map((p) => (
          <a key={p.href} href={p.href} className="card card-interactive p-6 block">
            <h2 className="text-[16px] font-semibold text-ink">{p.title}</h2>
            <p className="mt-2 text-[13.5px] text-ink-2 leading-relaxed">{p.description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-soft">
              Open
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12l-7.5 7.5" />
              </svg>
            </span>
          </a>
        ))}
      </div>
    </AdminShell>
  );
}
