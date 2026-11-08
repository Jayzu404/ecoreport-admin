import { Popup } from "react-leaflet";
import "./ReportPopup.css";

/* ---------- Status pill: label + color class for each status ---------- */
const STATUS = {
  pending: { label: "Pending", tone: "amber" },
  under_review: { label: "Under review", tone: "amber" },
  needs_info: { label: "Needs info", tone: "amber" },
  verified: { label: "Verified", tone: "green" },
  in_progress: { label: "In progress", tone: "blue" },
  resolved: { label: "Resolved", tone: "green" },
  rejected: { label: "Rejected", tone: "gray" },
  duplicate: { label: "Duplicate", tone: "gray" },
};

/* ---------- "1 mo ago" style time ---------- */
function timeAgo(createdAt) {
  if (!createdAt) return "";
  // Firestore Timestamps have .toDate(); plain dates/strings work with new Date()
  const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} y ago`;
}

/* ---------- Report code like ENV-2026-0045 ---------- */
function reportCode(r) {
  if (r.reportCode) return r.reportCode; // use your own code if you store one
  const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || Date.now());
  return `ENV-${date.getFullYear()}-${String(r.id || "").slice(0, 4).toUpperCase()}`;
}

/* ---------- Small inline icons (no extra library needed) ---------- */
const PinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

/* ------------------------------------------------------------------
   Usage inside your map:
   <Marker position={[r.lat, r.lng]}>
     <ReportPopup report={r} onOpen={() => navigate(`/reports/${r.id}`)} />
   </Marker>
------------------------------------------------------------------- */
export default function ReportPopup({ report: r, onOpen }) {
  const status = STATUS[r.status] || { label: r.status, tone: "gray" };

  return (
    <Popup className="report-popup" minWidth={340} maxWidth={340}>
      <div className="rp">
        <div className="rp__top">
          {r.photoUrl ? (
            <img className="rp__photo" src={r.photoUrl} alt="" />
          ) : (
            <div className="rp__photo rp__photo--empty" />
          )}

          <div className="rp__info">
            <div className="rp__code">{reportCode(r)}</div>
            <div className="rp__title">{r.category}</div>
            <div className="rp__place">
              <PinIcon />
              <span>{r.barangay}</span>
            </div>
          </div>
        </div>

        <div className="rp__meta">
          <span className={`rp__status rp__status--${status.tone}`}>
            <span className="rp__dot" />
            {status.label}
          </span>
          <span className="rp__time">
            <ClockIcon />
            {timeAgo(r.createdAt)}
          </span>
        </div>

        <button type="button" className="rp__open" onClick={onOpen}>
          Open report
          <ChevronIcon />
        </button>
      </div>
    </Popup>
  );
}