import { useState } from "react";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Copy,
  MapPin,
  Calendar,
  Clock,
  UserPlus,
  User,
  Check,
  CircleHelp,
  CircleX,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Landmark,
  History,
  Wrench,
  CircleCheck,
  ImagePlus,
  Hourglass,
  MessageSquare,
} from "lucide-react";
import "./ReportDetails.css";

import { useNavigate } from "react-router";

/* The pipeline is fixed UI, so it lives here instead of in the data. */
const PIPELINE = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "verified", label: "Verified" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

const REJECT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "unclear", label: "Unclear" },
  { value: "not_environmental", label: "Not environmental" },
  { value: "outside_coverage", label: "Outside coverage area" },
];

const INFO_SUGGESTIONS = [
  "Can you send a closer photo?",
  "Is this still happening?",
  "What is the nearest landmark?",
];

const MIN_NOTE = 10;

/* Statuses that sit beside the pipeline: they light up the "Under Review" slot
   but show their own label and color. */
const OFF_PIPELINE = ["need_info", "info_requested", "rejected", "duplicate"];

/* "need-info", "Need Info", "need_info" -> "need_info" */
const normalize = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const UNCLAIMED = ["", "unassigned", "unclaimed"];

/*
  UI-only component. Everything comes in through props; no fetching,
  no state, no status-transition rules. You wire those up.

  report shape (all strings unless noted):
  {
    id: "ENV-2026-0052",
    status: "submitted",            // submitted | under_review | verified | in_progress | resolved
                                    // | need_info | rejected | duplicate  ("need-info" also works)
    statusLabel: "Submitted",
    assignedTo: null,               // null / "" / "Unassigned" -> "Unclaimed" chip + claim banner
    openLabel: "Open 37 days",      // amber pill next to the meta row
    photoUrl, category, description, landmarkNote,
    submittedAt: "Sep 29, 12:00 PM",
    submittedAgo: "1 mo ago",
    area: "Brgy. Santo Niño",
    reporter: {
      name, reportCount (number, optional),
      phone (or contact), email,    // full values, shown when contactVisible
      phoneMasked, emailMasked,     // masked values (optional), shown otherwise
    },
    nearby: [{ id, category, distance: "38 m", ago: "1 mo ago", thumbUrl, status, statusLabel }],
    history: [{ at, status, statusLabel, by, note }]
  }

  Other props (all optional):
    position           { index: 4, total: 9 }  -> "4 / 9" in the top bar
    contactVisible     boolean -> swaps masked values for full ones
    decisionsDisabled  boolean (default true) -> greys out Verify / Request info / Duplicate / Reject
    showAdminActions   boolean (default false) -> shows Set In Progress / Resolve below the decision row
*/
export default function ReportDetail({
  report,
  map, // any element you want in the map slot (e.g. a react-leaflet <MapContainer>)
  categoryIcon = <Droplet size={22} />,
  position,
  contactVisible = false,
  decisionsDisabled = true,
  onPrev,
  onNext,
  onCopyId,
  onClaim,
  onToggleContact,
  onCopyValue,
  onUseAsOriginal,
  onRequestInfo,
  onReject,
  onMarkDuplicate,
  onVerify,
  onSetInProgress,
  onResolve,
  isClaiming,
  isVerifying,
  isSettingInProgress,
  isResolving,
  isRequestingInfo,
  conversations,
  adminName,
  canVerify,
}) {
  const {
    id,
    status,
    statusLabel,
    assignedTo,
    openLabel,
    photoUrl,
    category,
    description,
    landmarkNote,
    submittedAt,
    submittedAgo,
    area,
    reporter,
    nearby = [],
    history = [],
    resolutionNote,
    awaitingReply,
  } = report;

  const [view, setView] = useState("decision");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [infoQuestion, setInfoQuestion] = useState("");
  const [duplicateOf, setDuplicateOf] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState("");

  const navigate = useNavigate();

  const closePanel = () => {
    setView("decision");
    setRejectReason("");
    setRejectNote("");
    setInfoQuestion("");
    setDuplicateOf("");
    setResolveNote("");
    setProofFile(null);
    setProofPreview("");
  };

  const toDateObj = (ts) => {
    if (!ts) return null;
    if (typeof ts.toDate === "function") return ts.toDate(); // real Timestamp
    if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000); // plain object
    return null;
  };

  const formatTime = (ts) => {
    const date = toDateObj(ts);
    return date
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
  };

  const submitReject = () => {
    if (!rejectReason) return;
    onReject?.({ reason: rejectReason, note: rejectNote.trim() });
  };

  const submitInfo = async () => {
    const question = infoQuestion.trim();
    if (!question) return;

    const success = await onRequestInfo?.({ question });

    if (success) closePanel();
  };

  const submitDuplicate = () => {
    if (!duplicateOf) return;
    onMarkDuplicate?.({ originalId: duplicateOf });
  };

  const submitResolve = () => {
    if (resolveNote.trim().length < MIN_NOTE) return;
    onResolve?.({ adminNote: resolveNote.trim(), photoFile: proofFile });
  };

  const pickProof = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    // e.target.value = ""; // lets the same file be picked again after removing it
  };

  const clearProof = () => {
    setProofFile(null);
    setProofPreview("");
  };

  const statusKey = normalize(status);
  const isVerified = statusKey === "verified";
  const isInProgress = statusKey === "in_progress";
  const isResolved = statusKey === "resolved";
  const isNeedingInfo = statusKey === "need_info";
  const isWaitingForReply =
    statusKey === "need_info" && awaitingReply !== false;
  const resolvedEvent = history.find((h) => normalize(h.status) === "resolved");
  const isOffPipeline = OFF_PIPELINE.includes(statusKey);
  const currentStep = PIPELINE.findIndex(
    (s) => s.key === (isOffPipeline ? "under_review" : statusKey),
  );
  const isUnclaimed = UNCLAIMED.includes(
    String(assignedTo ?? "")
      .trim()
      .toLowerCase(),
  );
  const submittedWhen = submittedAgo ?? submittedAt;

  // when did the report reach this step? (from history, if it's there)
  const stepAt = (key) => {
    const hit = history.find((h) => normalize(h.status) === key);
    if (hit) return hit.at;
    return key === "submitted" ? submittedWhen : "";
  };

  const phone = reporter?.phone ?? reporter?.contact;
  const email = reporter?.email;
  const MASK = "••••••••••";

  return (
    <div className="rd">
      {/* ---------- Top bar ---------- */}
      <div className="rd-topbar">
        <div className="rd-topbar-inner">
          <div className="rd-crumbs">
            <button
              type="button"
              className="rd-back"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft size={18} /> Queue
            </button>
            <ChevronRight size={14} className="rd-crumb-sep" />
            <span className="rd-mono rd-crumb-id">{id}</span>
            <StatusPill status={status} solid>
              {statusLabel}
            </StatusPill>
          </div>

          <div className="rd-pager">
            <span className="rd-keys">
              <kbd>J</kbd>
              <kbd>K</kbd>
              <span>to navigate</span>
            </span>
            {position && (
              <span className="rd-pager-count">
                {position.index} / {position.total}
              </span>
            )}
            <button
              type="button"
              className="rd-icon-btn"
              aria-label="Previous report"
              onClick={onPrev}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="rd-icon-btn"
              aria-label="Next report"
              onClick={onNext}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="rd-page">
        {/* ---------- Title block ---------- */}
        <header className="rd-header">
          <div className="rd-title-row">
            <span className="rd-cat-icon">{categoryIcon}</span>
            <h1 className="rd-title">{category}</h1>
          </div>

          <div className="rd-assignee">
            <span className="rd-assignee-label">Assignee</span>
            <span
              className={`rd-assignee-chip ${isUnclaimed ? "" : "rd-assignee-chip--set"}`}
            >
              {isUnclaimed ? "Unclaimed" : assignedTo}
            </span>
          </div>

          <div className="rd-meta-row">
            <span className="rd-meta-item">
              <span className="rd-mono">{id}</span>
              <button
                type="button"
                className="rd-ghost-icon"
                aria-label="Copy report ID"
                onClick={onCopyId}
              >
                <Copy size={15} />
              </button>
            </span>
            <span className="rd-meta-item">
              <MapPin size={16} /> {area}
            </span>
            <span className="rd-meta-item">
              <Calendar size={16} /> Submitted {submittedWhen}
            </span>
            {openLabel && (
              <span className="rd-open-pill">
                <Clock size={14} /> {openLabel}
              </span>
            )}
          </div>
        </header>

        {/* ---------- Pipeline stepper ---------- */}
        <nav className="rd-card rd-stepper" aria-label="Report progress">
          {PIPELINE.map((step, i) => {
            const isCurrent = i === currentStep;
            const state = isCurrent
              ? "current"
              : i < currentStep
                ? "done"
                : "todo";
            const label = isCurrent && isOffPipeline ? statusLabel : step.label;
            const at = stepAt(isCurrent ? statusKey : step.key);
            return (
              <div key={step.key} className="rd-step-wrap">
                <div
                  className={`rd-step rd-step--${state} ${
                    isCurrent && isOffPipeline ? `rd-step--${statusKey}` : ""
                  }`}
                >
                  <span className="rd-step-dot">
                    {state === "done" ? (
                      <Check size={13} />
                    ) : state === "current" ? (
                      <i />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="rd-step-text">
                    <span className="rd-step-label">{label}</span>
                    <span className="rd-step-at">{at || "—"}</span>
                  </span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <span
                    className={`rd-step-line ${i < currentStep ? "rd-step-line--done" : ""}`}
                  />
                )}
              </div>
            );
          })}
        </nav>

        <div className="rd-grid">
          {/* ---------- Left column ---------- */}
          <div className="rd-col">
            <section className="rd-card rd-report">
              <div className="rd-photo-wrap">
                <img
                  className="rd-photo"
                  src={photoUrl}
                  alt={`${category} report`}
                />
                <span className="rd-photo-badge">Reported photo</span>
              </div>
              <div className="rd-report-body">
                <p className="rd-eyebrow">Reporter's description</p>
                <p className="rd-description">{description}</p>
                <p className="rd-submitted">
                  <Calendar size={16} /> Submitted {submittedAt}
                </p>
              </div>
            </section>

            {conversations.length > 0 && (
              <section
                className="rd-card rd-convo"
                aria-label="Conversation with the reporter"
              >
                <div className="rd-card-head rd-card-head--plain">
                  <h2 className="rd-card-title">
                    <MessageSquare size={19} /> Conversation
                  </h2>
                  <span className="rd-card-aside">
                    {conversations.length}{" "}
                    {conversations.length === 1 ? "message" : "messages"}
                  </span>
                </div>

                <ol className="rd-convo-list">
                  {conversations.map((m) => (
                    <li key={m.id} className={`rd-msg rd-msg--${m.senderRole}`}>
                      <p className="rd-msg-meta">
                        <strong>
                          {m.senderRole === "admin"
                            ? `${adminName}`
                            : "Reporter"}
                        </strong>
                        {formatTime(m.createdAt) &&
                          ` · ${formatTime(m.createdAt)}`}
                      </p>
                      <div className="rd-bubble">
                        {m.message && (
                          <p className="rd-bubble-text">{m.message}</p>
                        )}
                        {m.photoUrl && (
                          <img
                            className="rd-bubble-photo"
                            src={m.photoUrl}
                            alt="Photo sent by the reporter"
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                {isNeedingInfo && (
                  <div
                    className={`rd-convo-foot ${
                      awaitingReply === false
                        ? "rd-convo-foot--replied"
                        : "rd-convo-foot--waiting"
                    }`}
                  >
                    {awaitingReply === false ? (
                      <>
                        <MessageSquare size={16} />
                        The reporter replied. Review their answer, then verify,
                        ask again, or reject.
                      </>
                    ) : (
                      <>
                        <Clock size={16} />
                        Waiting for the reporter to reply.
                      </>
                    )}
                  </div>
                )}
              </section>
            )}

            <section className="rd-card rd-location">
              <div className="rd-card-head">
                <h2 className="rd-card-title">
                  <MapPin size={19} /> Location
                </h2>
                <span className="rd-card-aside">{area}</span>
              </div>

              <div className="rd-map">{map}</div>

              <div className="rd-landmark">
                <Landmark size={18} />
                <div>
                  <p className="rd-landmark-label">
                    Landmark noted by reporter
                  </p>
                  <p className="rd-landmark-value">{landmarkNote}</p>
                </div>
              </div>

              <div className="rd-legend">
                <span>
                  <i className="rd-legend-dot rd-legend-dot--pin" /> Reporter's
                  pin
                </span>
                <span>
                  <i className="rd-legend-dot rd-legend-dot--nearby" /> Nearby
                  reports
                </span>
              </div>

              <div className="rd-nearby">
                <div className="rd-card-head rd-card-head--plain">
                  <h3 className="rd-nearby-title">Nearby reports</h3>
                  <span className="rd-card-aside">
                    {nearby.length} within ~100 m · check for duplicates
                  </span>
                </div>

                {nearby.length === 0 ? (
                  <p className="rd-muted">No other reports within ~100 m.</p>
                ) : (
                  <ul className="rd-nearby-list">
                    {nearby.map((n) => (
                      <li key={n.id} className="rd-nearby-item">
                        <img
                          className="rd-nearby-thumb"
                          src={n.thumbUrl}
                          alt=""
                        />
                        <div className="rd-nearby-info">
                          <p className="rd-nearby-id">
                            <span className="rd-mono">{n.id}</span>
                            <span className="rd-muted">{n.distance}</span>
                          </p>
                          <p className="rd-nearby-sub">
                            {n.category} · {n.ago}
                          </p>
                        </div>
                        <StatusPill status={n.status}>
                          {n.statusLabel}
                        </StatusPill>
                        <button
                          type="button"
                          className="rd-link-btn"
                          onClick={() => onUseAsOriginal?.(n.id)}
                        >
                          Use as original
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="rd-card rd-history">
              <div className="rd-card-head rd-card-head--plain">
                <h2 className="rd-card-title">
                  <History size={19} /> Activity
                </h2>
                <span className="rd-card-aside">
                  {history.length} {history.length === 1 ? "event" : "events"}
                </span>
              </div>

              <ol className="rd-history-list">
                {history.map((h, i) => (
                  <li key={i} className="rd-history-item">
                    <span className="rd-history-dot" />
                    <div className="rd-history-main">
                      <p className="rd-history-line">
                        <StatusPill status={h.status} solid>
                          {h.statusLabel}
                        </StatusPill>
                        <span>
                          by <strong>{h.by}</strong>
                        </span>
                      </p>
                      <p className="rd-history-note">{h.note}</p>
                    </div>
                    <time className="rd-history-time">{h.at}</time>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* ---------- Right column ---------- */}
          <div className="rd-col">
            <section className="rd-card rd-actions-card">
              {isUnclaimed && (
                <div className="rd-claim">
                  <p className="rd-claim-title">
                    <UserPlus size={19} /> Unclaimed
                  </p>
                  <p className="rd-claim-text">
                    No one is handling this report yet. Claim it to review and
                    take action.
                  </p>
                  <button
                    type="button"
                    className="rd-claim-btn"
                    onClick={onClaim}
                    disabled={isClaiming}
                  >
                    <UserPlus size={19} />{" "}
                    {isClaiming ? "Claiming report..." : "Claim Report"}
                  </button>
                  <p className="rd-claim-hint">
                    Assigns to you and moves it to Under Review
                  </p>
                </div>
              )}

              {view === "decision" &&
                !isVerified &&
                !isInProgress &&
                !isResolved && (
                  <div className="rd-decision">
                    <div className="rd-decision-head">
                      <h2 className="rd-decision-title">Next step</h2>
                      <span className="rd-card-aside rd-card-aside--dark">
                        Review decision
                      </span>
                    </div>
                    <p className="rd-decision-sub">
                      Confirms the issue is real and ready for action.
                    </p>

                    {isWaitingForReply && (
                      <div className="rd-waiting-box">
                        <span className="rd-waiting-icon">
                          <Hourglass size={20} />
                        </span>
                        <div>
                          <p className="rd-waiting-title">
                            Waiting for the reporter's reply
                          </p>
                          <p className="rd-waiting-text">
                            Your question was sent.
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="rd-verify"
                      disabled={
                        decisionsDisabled || isVerifying || isWaitingForReply
                      }
                      onClick={onVerify}
                    >
                      <Check size={18} />{" "}
                      {isVerifying ? "Verifying..." : "Verify"}
                    </button>

                    <div className="rd-secondary">
                      <button
                        type="button"
                        className="rd-sec-btn rd-sec-btn--info"
                        disabled={decisionsDisabled || isRequestingInfo}
                        onClick={() => setView("info")}
                      >
                        <CircleHelp size={18} />{" "}
                        {isRequestingInfo
                          ? "Requesting info..."
                          : "Request info"}
                      </button>
                      <button
                        type="button"
                        className="rd-sec-btn rd-sec-btn--dup"
                        disabled={decisionsDisabled}
                        onClick={() => setView("duplicate")}
                      >
                        <Copy size={18} /> Duplicate
                      </button>
                      <button
                        type="button"
                        className="rd-sec-btn rd-sec-btn--reject"
                        disabled={decisionsDisabled}
                        onClick={() => setView("reject")}
                      >
                        <CircleX size={18} /> Reject
                      </button>
                    </div>
                  </div>
                )}

              {view === "decision" && isVerified && (
                <div className="rd-decision">
                  <div className="rd-decision-head">
                    <h2 className="rd-decision-title">Next step</h2>
                    <span className="rd-card-aside rd-card-aside--dark">
                      Field work
                    </span>
                  </div>
                  <p className="rd-decision-sub">
                    Tells the reporter that a team is on it.
                  </p>

                  <button
                    type="button"
                    className="rd-verify"
                    disabled={decisionsDisabled || isSettingInProgress}
                    onClick={onSetInProgress}
                  >
                    <Wrench size={18} />{" "}
                    {isSettingInProgress ? "Starting work..." : "Start work"}
                  </button>
                </div>
              )}

              {view === "decision" && isInProgress && (
                <div className="rd-decision">
                  <div className="rd-decision-head">
                    <h2 className="rd-decision-title">Next step</h2>
                    <span className="rd-card-aside rd-card-aside--dark">
                      Field work
                    </span>
                  </div>
                  <p className="rd-decision-sub">
                    Closes the report with a resolution note for the reporter.
                  </p>

                  <button
                    type="button"
                    className="rd-verify"
                    disabled={decisionsDisabled}
                    onClick={() => setView("resolve")}
                  >
                    <CircleCheck size={18} /> Resolve
                  </button>
                </div>
              )}

              {view === "reject" && (
                <DecisionPanel
                  tone="reject"
                  icon={<CircleX size={20} />}
                  title="Reject"
                  subtitle="Closes the report. The reporter sees the reason."
                  submitLabel="Reject report"
                  submitDisabled={!rejectReason}
                  onSubmit={submitReject}
                  onClose={closePanel}
                >
                  <fieldset className="rd-fieldset">
                    <legend className="rd-field-label">
                      Reason <span className="rd-required">*</span>
                    </legend>
                    <div className="rd-choices rd-choices--grid">
                      {REJECT_REASONS.map((r) => (
                        <label
                          key={r.value}
                          className={`rd-choice ${
                            rejectReason === r.value
                              ? "rd-choice--selected"
                              : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name="reject-reason"
                            value={r.value}
                            checked={rejectReason === r.value}
                            onChange={() => setRejectReason(r.value)}
                          />
                          <span className="rd-choice-radio" />
                          <span>{r.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label
                    className="rd-field-label rd-field-label--spaced"
                    htmlFor="reject-note"
                  >
                    Note to the reporter{" "}
                    <span className="rd-optional">(optional)</span>
                  </label>
                  <textarea
                    id="reject-note"
                    className="rd-textarea"
                    placeholder="Explain what they could do differently"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                  />
                </DecisionPanel>
              )}

              {view === "info" && (
                <DecisionPanel
                  tone="info"
                  icon={<CircleHelp size={20} />}
                  title="Request info"
                  subtitle="Pauses review until the reporter replies."
                  submitLabel={
                    isRequestingInfo ? "Sending..." : "Send question"
                  }
                  submitDisabled={
                    !infoQuestion.trim() ||
                    isRequestingInfo ||
                    isWaitingForReply
                  }
                  onSubmit={submitInfo}
                  onClose={closePanel}
                >
                  <div className="rd-chips">
                    {INFO_SUGGESTIONS.map((text) => (
                      <button
                        key={text}
                        type="button"
                        className="rd-chip"
                        onClick={() => setInfoQuestion(text)}
                      >
                        {text}
                      </button>
                    ))}
                  </div>

                  <label
                    className="rd-field-label rd-field-label--spaced"
                    htmlFor="info-question"
                  >
                    Question for the reporter
                  </label>
                  <textarea
                    id="info-question"
                    className="rd-textarea"
                    placeholder="e.g. Can you send a closer photo of the pipe?"
                    value={infoQuestion}
                    onChange={(e) => setInfoQuestion(e.target.value)}
                    autoFocus
                  />
                </DecisionPanel>
              )}

              {view === "duplicate" && (
                <DecisionPanel
                  tone="duplicate"
                  icon={<Copy size={20} />}
                  title="Duplicate"
                  subtitle="Closes this report and links it to the original."
                  submitLabel="Mark duplicate"
                  submitDisabled={!duplicateOf}
                  onSubmit={submitDuplicate}
                  onClose={closePanel}
                >
                  <fieldset className="rd-fieldset">
                    <legend className="rd-field-label">
                      Original report <span className="rd-required">*</span>
                    </legend>

                    {nearby.length === 0 ? (
                      <p className="rd-empty-note">
                        No other reports within 100 m. A duplicate must share
                        the same location as its original.
                      </p>
                    ) : (
                      <div className="rd-choices rd-choices--list">
                        {nearby.map((n) => (
                          <label
                            key={n.id}
                            className={`rd-choice ${
                              duplicateOf === n.id ? "rd-choice--selected" : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name="duplicate-of"
                              value={n.id}
                              checked={duplicateOf === n.id}
                              onChange={() => setDuplicateOf(n.id)}
                            />
                            <span className="rd-choice-radio" />
                            <span className="rd-choice-text">
                              <span className="rd-mono">{n.id}</span>
                              <span className="rd-muted">
                                {n.category} · {n.distance} · {n.ago}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                </DecisionPanel>
              )}

              {view === "resolve" && isInProgress && (
                <DecisionPanel
                  tone="resolve"
                  icon={<CircleCheck size={20} />}
                  title="Resolve"
                  subtitle="Closes the report with a resolution note for the reporter."
                  submitLabel={isResolving ? "Resolving..." : "Resolve report"}
                  submitDisabled={
                    resolveNote.trim().length < MIN_NOTE || isResolving
                  }
                  onSubmit={submitResolve}
                  onClose={closePanel}
                >
                  <div className="rd-label-row">
                    <label className="rd-field-label" htmlFor="resolve-note">
                      Resolution note{" "}
                      <span className="rd-badge">Shown to reporter</span>
                    </label>
                    <span className="rd-counter">
                      {resolveNote.trim().length}/{MIN_NOTE} min
                    </span>
                  </div>
                  <textarea
                    id="resolve-note"
                    className="rd-textarea"
                    placeholder="What was done to fix this?"
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    autoFocus
                  />

                  <p className="rd-field-label rd-field-label--spaced">
                    Proof photo <span className="rd-optional">(optional)</span>
                  </p>
                  <div className="rd-proof">
                    <label className="rd-upload">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={pickProof}
                      />
                      {proofPreview ? (
                        <img
                          className="rd-upload-preview"
                          src={proofPreview}
                          alt="Proof preview"
                        />
                      ) : (
                        <>
                          <ImagePlus size={22} />
                          <span>Upload photo</span>
                        </>
                      )}
                    </label>
                    {proofPreview && (
                      <button
                        type="button"
                        className="rd-proof-link"
                        onClick={clearProof}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </DecisionPanel>
              )}

              {isResolved && (
                <div className="rd-outcome">
                  <h2 className="rd-decision-title">Outcome</h2>
                  <div className="rd-outcome-box">
                    <div className="rd-outcome-head">
                      <StatusPill status="resolved" solid>
                        Resolved
                      </StatusPill>
                      <span className="rd-outcome-meta">
                        {[resolvedEvent?.at, resolvedEvent?.by]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <p className="rd-outcome-note">{resolutionNote}</p>
                    <p className="rd-outcome-closed">
                      This report is closed. No further actions.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section
              className="rd-card rd-reporter"
              aria-label="Reporter contact, staff only"
            >
              <div className="rd-reporter-head">
                <h2 className="rd-card-title">
                  <User size={19} /> Reporter
                </h2>
                <button
                  type="button"
                  className="rd-show-contact"
                  onClick={onToggleContact}
                >
                  {contactVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  {contactVisible ? "Hide contact" : "Show contact"}
                </button>
              </div>

              <p className="rd-reporter-name">{reporter.name}</p>
              {reporter.reportCount != null && (
                <p className="rd-reporter-count">
                  {reporter.reportCount}{" "}
                  {reporter.reportCount === 1 ? "report" : "reports"} submitted
                </p>
              )}

              <ul className="rd-contact-list">
                <li className="rd-contact-row">
                  <Phone size={18} />
                  <span className="rd-mono">
                    {contactVisible ? phone : (reporter.phoneMasked ?? MASK)}
                  </span>
                  <button
                    type="button"
                    className="rd-ghost-icon"
                    aria-label="Copy phone number"
                    onClick={() => onCopyValue?.(phone)}
                  >
                    <Copy size={18} />
                  </button>
                </li>
                <li className="rd-contact-row">
                  <Mail size={18} />
                  <span className="rd-mono">
                    {contactVisible ? email : (reporter.emailMasked ?? MASK)}
                  </span>
                  <button
                    type="button"
                    className="rd-ghost-icon"
                    aria-label="Copy email"
                    onClick={() => onCopyValue?.(email)}
                  >
                    <Copy size={18} />
                  </button>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, solid = false, children }) {
  const key = normalize(status);
  return (
    <span
      className={`rd-pill rd-pill--${key} ${solid ? "rd-pill--solid" : ""}`}
    >
      {key === "resolved" ? (
        <CircleCheck size={15} />
      ) : (
        <i className="rd-pill-dot" />
      )}
      {children}
    </span>
  );
}

function DecisionPanel({
  tone,
  icon,
  title,
  subtitle,
  submitLabel,
  submitDisabled,
  onSubmit,
  onClose,
  children,
}) {
  return (
    <div
      className={`rd-panel rd-panel--${tone}`}
      onKeyDown={(e) => {
        if (e.ctrlKey && e.key === "Enter" && !submitDisabled) onSubmit();
      }}
    >
      <div className="rd-panel-head">
        <button
          type="button"
          className="rd-panel-back"
          aria-label="Back to review decision"
          onClick={onClose}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="rd-panel-heading">
          <h2 className="rd-panel-title">{title}</h2>
          <p className="rd-panel-sub">{subtitle}</p>
        </div>
        <span className="rd-panel-badge">{icon}</span>
      </div>

      <div className="rd-panel-body">{children}</div>

      <div className="rd-panel-foot">
        <span className="rd-panel-hint rd-mono">Ctrl + Enter</span>
        <div className="rd-panel-actions">
          <button type="button" className="rd-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rd-btn-submit"
            disabled={submitDisabled}
            onClick={onSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
