export const metadata = {
  title: "Public Track Record - Every Signal, Wins & Losses",
  description:
    "Sanddock's complete, timestamped signal ledger. Every win, loss, and open trade logged publicly. No cherry-picked screenshots, no deleted signals - just verifiable data.",
  alternates: {
    canonical: "/track-record",
  },
  openGraph: {
    title: "Sanddock Public Track Record",
    description:
      "Every signal logged publicly - wins and losses. Auditable, timestamped, and updated in real time.",
    url: "/track-record",
  },
};

export default function TrackRecordLayout({ children }) {
  return children;
}
