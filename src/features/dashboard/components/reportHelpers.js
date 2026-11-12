// label + color class for each status pill
export const STATUS = {
  submitted: { label: "Submitted", tone: "gray" },
  under_review: { label: "Under Review", tone: "blue" },
  need_info: { label: "Needs Info", tone: "amber" },
  verified: { label: "Verified", tone: "green" },
  in_progress: { label: "In Progress", tone: "teal" },
  resolved: { label: "Resolved", tone: "green" },
  duplicate: { label: "Duplicate", tone: "purple" },
  rejected: { label: "Rejected", tone: "red" },
};

export const DATE_RANGES = [
  { value: "any", label: "Any date" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

// your mobile app currently saves "pending", so treat it as "submitted"
export const statusKey = (r) => (r.status === "pending" ? "submitted" : r.status);

export const refNo = (r) =>
  r.refNo ||
  `ENV-${r.createdAt?.toDate().getFullYear() ?? "----"}-${r.id.slice(0, 4).toUpperCase()}`;

export const formatDate = (ts) =>
  ts
    ? ts.toDate().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";