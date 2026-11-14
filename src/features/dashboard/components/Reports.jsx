import { useEffect, useMemo, useRef, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import "./Reports.css";

import {
  STATUS,
  statusKey,
  refNo,
  formatDate,
  DATE_RANGES,
} from "./reportHelpers";

import { useNavigate } from "react-router";

// ⚠️ Adjust these status keys to match the keys in your STATUS object
const TABS = [
  {
    key: "action",
    label: "Needs action",
    statuses: ["submitted", "needs_info", "under_review"],
  },
  {
    key: "active",
    label: "Verified & active",
    statuses: ["verified", "in_progress"],
  },
  { key: "closed", label: "Closed", statuses: ["resolved", "rejected"] },
  { key: "all", label: "All", statuses: null },
];

// ⚠️ Replace with your real logged-in admin's name
const ME = "Joel Reyes";

const daysSince = (ts) =>
  ts ? Math.floor((Date.now() - ts.toMillis()) / 86400000) : null;

const timeAgo = (ts) => {
  const d = daysSince(ts);
  if (d === null) return "—";
  if (d === 0) return "Today";
  return d === 1 ? "1 day ago" : `${d} days ago`;
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true); // true until the first snapshot arrives
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("action");
  const [category, setCategory] = useState("all");
  const [area, setArea] = useState("all");
  const [range, setRange] = useState("any");
  const [cutoff, setCutoff] = useState(null);

  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // "asc" = oldest first, like the reference queue
    const q = query(collection(db, "reports"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setReports(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError(false);
        setLoading(false);
      },
      // second argument = error callback (permissions, network, missing index)
      () => {
        setError(true);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  // press "/" to focus the search box
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(tag)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const categories = useMemo(
    () => [...new Set(reports.map((r) => r.category).filter(Boolean))],
    [reports],
  );
  const areas = useMemo(
    () => [...new Set(reports.map((r) => r.area).filter(Boolean))],
    [reports],
  );

  // counts for tab badges + header
  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [
          t.key,
          t.statuses
            ? reports.filter((r) => t.statuses.includes(statusKey(r))).length
            : reports.length,
        ]),
      ),
    [reports],
  );
  const newCount = useMemo(
    () => reports.filter((r) => statusKey(r) === "submitted").length,
    [reports],
  );
  const oldestWaiting = useMemo(
    () =>
      reports.find(
        (r) => r.createdAt && TABS[0].statuses.includes(statusKey(r)),
      )?.createdAt,
    [reports],
  );

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    const activeTab = TABS.find((t) => t.key === tab);

    return reports.filter((r) => {
      if (activeTab.statuses && !activeTab.statuses.includes(statusKey(r)))
        return false;
      if (category !== "all" && r.category !== category) return false;
      if (area !== "all" && r.area !== area) return false;
      if (cutoff && (!r.createdAt || r.createdAt.toMillis() < cutoff))
        return false;
      if (text) {
        const haystack =
          `${refNo(r)} ${r.fullName ?? ""} ${r.area ?? ""}`.toLowerCase();
        if (!haystack.includes(text)) return false;
      }
      return true;
    });
  }, [reports, search, tab, category, area, cutoff]);

  const handleRangeChange = (e) => {
    const value = e.target.value;
    setRange(value);
    setCutoff(value === "any" ? null : Date.now() - Number(value) * 86400000);
  };

  const hasFilters =
    search.trim() !== "" ||
    category !== "all" ||
    area !== "all" ||
    range !== "any";

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setArea("all");
    setRange("any");
    setCutoff(null);
  };

  // Which message (if any) replaces the rows. Order matters: most specific cause first.
  let message = null;
  if (error) {
    message = {
      title: "Couldn't load reports",
      text: "Check your connection, then refresh the page.",
    };
  } else if (reports.length === 0) {
    message = {
      title: "No reports yet",
      text: "New reports will show up here as soon as they're submitted.",
    };
  } else if (filtered.length === 0 && hasFilters) {
    message = {
      title: "No reports match your filters",
      text: "Try a different search, or clear the filters.",
      actionLabel: "Clear filters",
      onAction: clearFilters,
    };
  } else if (filtered.length === 0) {
    message = {
      title: "Nothing in this tab",
      text: "Reports with a matching status will appear here.",
    };
  }

  return (
    <div className="reports-page">
      {/* ===== PAGE HEADER ===== */}
      <header className="page-head">
        <div>
          <h1>Report/s</h1>
          <p className="subtitle" aria-live="polite">
            {loading
              ? "Loading reports…"
              : `${newCount} new · ${counts.action} need action`}
          </p>
        </div>

        {oldestWaiting && (
          <div className="oldest-chip">
            <ClockIcon size={18} />
            <span>Oldest waiting:</span>
            <strong>{timeAgo(oldestWaiting)}</strong>
          </div>
        )}
      </header>

      <div className="reports-card">
        {/* ===== TABS ===== */}
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="tab-badge">{loading ? "–" : counts[t.key]}</span>
            </button>
          ))}
        </div>

        {/* ===== TOOLBAR ===== */}
        <div className="toolbar">
          <div className="search">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search ref no., reporter, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>/</kbd>
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="all">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select value={range} onChange={handleRangeChange}>
            {DATE_RANGES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          {!loading && !error && (
            <span className="count">{filtered.length} results</span>
          )}
        </div>

        {/* ===== TABLE ===== */}
        <div className="table-wrap">
          <table aria-busy={loading}>
            <thead>
              <tr>
                <th>Report</th>
                <th>Area</th>
                <th className="sorted">
                  Date
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </th>
                <th>Reporter</th>
                <th>Status</th>
                <th>Assigned</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {/* 1. still fetching */}
              {loading && <SkeletonRows />}

              {/* 2. fetched, and there are rows to show */}
              {!loading &&
                !error &&
                filtered.map((r) => {
                  const key = statusKey(r);
                  const s = STATUS[key] ?? {
                    label: key ?? "Unknown",
                    tone: "gray",
                  };
                  const needsAttention = key === "submitted";
                  const days = daysSince(r.createdAt);

                  return (
                    <tr
                      key={r.id}
                      className={needsAttention ? "row unread" : "row"}
                      onClick={() => navigate(`/dashboard/reports/${r.id}`)}
                    >
                      {/* Report: dot + thumbnail + category + ref no. */}
                      <td className="report-cell">
                        {needsAttention && <span className="unread-dot" />}
                        <div className="report">
                          <img src={r.photoUrl} alt="" />
                          <div>
                            <div className="report-title">{r.category}</div>
                            <div className="ref">{refNo(r)}</div>
                          </div>
                        </div>
                      </td>

                      <td className="area" title={r.municipality}>
                        {r.brgy || "—"}
                      </td>

                      <td>
                        <span
                          className={`date ${days >= 7 ? "warn" : ""}`}
                          title={formatDate(r.createdAt)}
                        >
                          <ClockIcon size={16} />
                          {timeAgo(r.createdAt)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`reporter ${needsAttention ? "strong" : ""}`}
                        >
                          {r.fullName}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`pill ${s.tone} ${needsAttention ? "solid" : ""}`}
                        >
                          <span className="pill-dot" />
                          {s.label}
                        </span>
                      </td>

                      <td>
                        {!r.assignedTo ? (
                          <span className="unclaimed">Unclaimed</span>
                        ) : r.assignedTo === ME ? (
                          <span className="you">
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 12l5 5L20 7" />
                            </svg>
                            You
                          </span>
                        ) : (
                          <span className="assignee">{r.assignedToName}</span>
                        )}
                      </td>

                      <td className="chevron">
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </td>
                    </tr>
                  );
                })}

              {/* 3. fetched, but nothing to show (error / no reports / no match / empty tab) */}
              {!loading && message && <TableMessage {...message} />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* Placeholder rows shaped like real rows, so nothing jumps when data lands */
function SkeletonRows({ count = 6 }) {
  return Array.from({ length: count }, (_, i) => (
    <tr key={i} className="row skeleton-row" aria-hidden="true">
      <td className="report-cell">
        <div className="report">
          <span className="skeleton skeleton-thumb" />
          <div className="skeleton-stack">
            <span className="skeleton" style={{ width: 120 }} />
            <span className="skeleton" style={{ width: 88, height: 10 }} />
          </div>
        </div>
      </td>
      <td>
        <span className="skeleton" style={{ width: 80 }} />
      </td>
      <td>
        <span className="skeleton" style={{ width: 72 }} />
      </td>
      <td>
        <span className="skeleton" style={{ width: 110 }} />
      </td>
      <td>
        <span className="skeleton skeleton-pill" />
      </td>
      <td>
        <span className="skeleton" style={{ width: 72 }} />
      </td>
      <td />
    </tr>
  ));
}

/* One message row for every "nothing to show" case */
function TableMessage({ title, text, actionLabel, onAction }) {
  return (
    <tr>
      <td colSpan={7} className="empty-state">
        <div role="status">
          <p className="empty-title">{title}</p>
          <p className="empty-text">{text}</p>
          {onAction && (
            <button type="button" className="empty-action" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function ClockIcon({ size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}