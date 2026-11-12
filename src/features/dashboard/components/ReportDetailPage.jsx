import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { useParams } from "react-router";
import { db, auth } from "../../../firebaseConfig";
import ReportDetails from "./ReportDetails";
import { STATUS, statusKey, refNo, formatDate } from "./reportHelpers";

import toast from "react-hot-toast";

export default function ReportDetailPage() {
  const { id } = useParams(); // the :id from the URL
  const [report, setReport] = useState(null);
  // const [history, setHistory] = useState([]);
  const [historyState, setHistoryState] = useState({ id: null, events: [] });
  const [loading, setLoading] = useState(true);
  const [adminID, setAdminID] = useState(0);
  const [adminName, setAdminName] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSettingInProgress, setIsSettingInProgress] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isRequestingInfo, setIsRequestingInfo] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [conversations, setConversations] = useState([]);

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_UPLOAD_PRESET = import.meta.env
    .VITE_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "reports", id), (snap) => {
      setReport(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, "reports", id, "messages"),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => console.log(error),
    );

    return unsubscribe;
  }, [id]);

  // useEffect(() => {
  //   setHistory([]); // clear the previous report's events while the new ones load

  //   const historyQuery = query(
  //     collection(db, "reports", id, "history"),
  //     orderBy("createdAt", "asc")
  //   );

  //   const unsubscribe = onSnapshot(
  //     historyQuery,
  //     (snap) => {
  //       setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  //     },
  //     (error) => console.log("history listener failed:", error)
  //   );

  //   return unsubscribe;
  // }, [id]);

  useEffect(() => {
    const historyQuery = query(
      collection(db, "reports", id, "history"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      historyQuery,
      (snap) => {
        setHistoryState({
          id, // which report these events belong to
          events: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        });
      },
      (error) => console.log("history listener failed:", error),
    );

    return unsubscribe;
  }, [id]);

  const history = historyState.id === id ? historyState.events : [];

  const uploadImage = async (file) => {
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: data },
      );

      const result = await response.json();
      if (!result.secure_url) {
        throw new Error(result.error?.message || "No URL returned");
      }
      return result.secure_url;
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      throw new Error("UPLOAD_FAILED", { cause: error });
    }
  };

  // UTROHON PANI
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          toast.error("No admin found.");
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
          toast.error("No admin info found.");
          return;
        }

        setAdminID(user.uid);
        setAdminName(userSnapshot.data().fullName);
      } catch (error) {
        console.error(error);
        toast.error("Something went wrong.");
      }
    };

    fetchAdmin();
  }, [adminID]);

  const handleClaim = async () => {
    if (isClaiming) {
      return;
    }

    if (!adminID || !adminName) {
      toast.error("Your profile is not loaded yet.");
      return;
    }

    try {
      setIsClaiming(true);

      await runTransaction(db, async (transaction) => {
        // references: pointers only, nothing is read or written yet
        const reportRef = doc(db, "reports", id);
        const historyRef = doc(collection(db, "reports", id, "history"));

        // READ: fetch the report's current state from the server
        const snap = await transaction.get(reportRef);

        // DECIDE: stop here if the claim isn't allowed
        if (!snap.exists()) {
          throw new Error("REPORT_NOT_FOUND");
        }

        const current = snap.data();

        if (current.assignedTo) {
          throw new Error("ALREADY_CLAIMED");
        }

        if (current.status !== "pending") {
          throw new Error("NOT_CLAIMABLE");
        }

        transaction.update(reportRef, {
          status: "under_review",
          assignedTo: adminID,
          assignedToName: adminName,
        });

        transaction.set(historyRef, {
          action: "claimed",
          fromStatus: current.status,
          toStatus: "under_review",
          actorID: adminID,
          actorName: adminName,
          actorRole: "admin",
          note: "Report claimed",
          createdAt: serverTimestamp(),
        });
      });

      toast.success("Report assigned to you");
    } catch (error) {
      if (error.message === "REPORT_NOT_FOUND") {
        toast.error("Report not found.");
      } else if (error.message === "ALREADY_CLAIMED") {
        toast.error("Report is already claimed.");
      } else if (error.message === "NOT_CLAIMABLE") {
        toast.error("Report is not claimable.");
      } else {
        toast.error("Something went wrong.");
      }
      console.log(error);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleVerify = async () => {
    if (isVerifying) {
      return;
    }

    if (!adminID || !adminName) {
      toast.error("Your profile is not loaded yet.");
      return;
    }

    try {
      setIsVerifying(true);

      await runTransaction(db, async (transaction) => {
        const reportRef = doc(db, "reports", id);
        const historyRef = doc(collection(db, "reports", id, "history"));

        const snap = await transaction.get(reportRef);

        if (!snap.exists()) throw new Error("REPORT_NOT_FOUND");

        const current = snap.data();

        if (current.assignedTo !== adminID)
          throw new Error("NOT_ASSIGNED_TO_YOU");

        if (current.status === "need_info" && current.awaitingReply)
          throw new Error("NEEDING_INFO");

        if (current.status !== "under_review" && current.status !== "need_info")
          throw new Error("NOT_VERIFIABLE");

        transaction.update(reportRef, {
          status: "verified",
          awaitingReply: false,
        });

        transaction.set(historyRef, {
          action: "verified",
          fromStatus: current.status,
          toStatus: "verified",
          actorID: adminID,
          actorName: adminName,
          actorRole: "admin",
          note: "Report verified",
          createdAt: serverTimestamp(),
        });
      });

      toast.success("Report verified");
    } catch (error) {
      if (error.message === "REPORT_NOT_FOUND") {
        toast.error("Report not found.");
      } else if (error.message === "NOT_ASSIGNED_TO_YOU") {
        toast.error("Report is not assigned to you.");
      } else if (error.message === "NOT_VERIFIABLE") {
        toast.error("Not verifiable");
      } else if (error.message === "NEEDING_INFO") {
        toast.error("Can't verify, still needing info");
      } else {
        toast.error("Something went wrong.");
      }

      console.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleInProgress = async () => {
    if (isSettingInProgress) {
      return;
    }

    if (!adminID || !adminName) {
      toast.error("Your profile is not loaded yet.");
      return;
    }

    try {
      setIsSettingInProgress(true);

      await runTransaction(db, async (transaction) => {
        const reportRef = doc(db, "reports", id);
        const historyRef = doc(collection(db, "reports", id, "history"));

        const snap = await transaction.get(reportRef);

        if (!snap.exists()) throw new Error("REPORT_NOT_FOUND");

        const current = snap.data();

        if (current.assignedTo !== adminID)
          throw new Error("NOT_ASSIGNED_TO_YOU");
        if (current.status !== "verified") throw new Error("NOT_STARTABLE");

        transaction.update(reportRef, {
          status: "in_progress",
        });

        transaction.set(historyRef, {
          action: "in_progress",
          fromStatus: current.status,
          toStatus: "in_progress",
          actorID: adminID,
          actorName: adminName,
          actorRole: "admin",
          note: "Work started",
          createdAt: serverTimestamp(),
        });
      });

      toast.success("Report in progress");
    } catch (error) {
      if (error.message === "REPORT_NOT_FOUND") {
        toast.error("Report not found.");
      } else if (error.message === "NOT_ASSIGNED_TO_YOU") {
        toast.error("Report is not assigned to you.");
      } else if (error.message === "NOT_STARTABLE") {
        toast.error("Only a verified report can be set to in progress.");
      } else {
        toast.error("Something went wrong.");
      }

      console.error(error);
    } finally {
      setIsSettingInProgress(false);
    }
  };

  const handleResolve = async ({ adminNote, photoFile }) => {
    if (isResolving) {
      return;
    }

    if (!adminID || !adminName) {
      toast.error("Your profile is not loaded yet.");
      return;
    }

    try {
      setIsResolving(true);

      const resolvePhotoUrl = photoFile ? await uploadImage(photoFile) : null;

      await runTransaction(db, async (transaction) => {
        const reportRef = doc(db, "reports", id);
        const historyRef = doc(collection(db, "reports", id, "history"));

        const snap = await transaction.get(reportRef);

        if (!snap.exists()) throw new Error("REPORT_NOT_FOUND");

        const current = snap.data();

        if (current.assignedTo !== adminID)
          throw new Error("NOT_ASSIGNED_TO_YOU");
        if (current.status !== "in_progress") throw new Error("NOT_RESOLVABLE");

        transaction.update(reportRef, {
          status: "resolved",
          resolutionNote: adminNote,
          resolutionPhotoUrl: resolvePhotoUrl,
        });

        transaction.set(historyRef, {
          action: "resolved",
          fromStatus: current.status,
          toStatus: "resolved",
          actorID: adminID,
          actorName: adminName,
          actorRole: "admin",
          note: "Report Resolved",
          adminNote,
          resolvePhotoUrl,
          createdAt: serverTimestamp(),
        });
      });

      toast.success("Report resolved.");
    } catch (error) {
      if (error.message === "REPORT_NOT_FOUND") {
        toast.error("Report not found.");
      } else if (error.message === "NOT_ASSIGNED_TO_YOU") {
        toast.error("Report is not assigned to you.");
      } else if (error.message === "UPLOAD_FAILED") {
        toast.error(
          "Photo upload failed. Check your connection and try again.",
        );
      } else if (error.message === "NOT_RESOLVABLE") {
        toast.error("Only in progress report can be set to resolved.");
      } else {
        toast.error("Something went wrong.");
      }

      console.error(error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleRequestInfo = async ({ question }) => {
    if (isRequestingInfo) {
      return;
    }

    if (!adminID || !adminName) {
      toast.error("Your profile is not loaded yet.");
      return;
    }

    try {
      setIsRequestingInfo(true);

      await runTransaction(db, async (transaction) => {
        const reportRef = doc(db, "reports", id);
        const historyRef = doc(collection(db, "reports", id, "history"));
        const messageRef = doc(collection(db, "reports", id, "messages"));

        const snap = await transaction.get(reportRef);

        if (!snap.exists()) {
          throw new Error("REPORT_NOT_FOUND");
        }

        const current = snap.data();

        if (current.assignedTo !== adminID)
          throw new Error("NOT_ASSIGNED_TO_YOU");

        if (current.status !== "under_review" && current.status !== "need_info")
          throw new Error("NOT_INFO_REQUESTABLE");

        if (current.status === "need_info" && current.awaitingReply !== false)
          throw new Error("WAITING_FOR_REPLY");

        transaction.update(reportRef, {
          status: "need_info",
          awaitingReply: true,
        });

        transaction.set(messageRef, {
          senderID: adminID,
          senderRole: "admin",
          message: question,
          createdAt: serverTimestamp(),
        });

        transaction.set(historyRef, {
          action: "request_info",
          fromStatus: current.status,
          toStatus: "need_info",
          actorID: adminID,
          actorName: adminName,
          actorRole: "admin",
          note: "Report need more info",
          createdAt: serverTimestamp(),
        });
      });

      toast.success("Requested more info");

      return true;
    } catch (error) {
      if (error.message === "REPORT_NOT_FOUND") {
        toast.error("Report not found.");
      } else if (error.message === "NOT_ASSIGNED_TO_YOU") {
        toast.error("Report is not assigned to you.");
      } else if (error.message === "NOT_INFO_REQUESTABLE") {
        toast.error(
          "Info can only be requested while a report is under review.",
        );
      } else if (error.message === "WAITING_FOR_REPLY") {
        toast.error("Still waiting for the reporter to reply.");
      } else {
        toast.error("Something went wrong.");
      }

      console.error(error);

      return false;
    } finally {
      setIsRequestingInfo(false);
    }
  };

  const handleReject = async ({ reason, note }) => {
    if (isRejecting) {
      return;
    }

    if (!adminID || !adminName) {
      toast.error("Your profile is not loaded yet.");
      return;
    }

    try {
      setIsRejecting(true);

      await runTransaction(db, async (transaction) => {
        const reportRef = doc(db, "reports", id);
        const historyRef = doc(collection(db, "reports", id, "history"));

        const snap = await transaction.get(reportRef);

        if (!snap.exists()) {
          throw new Error("REPORT_NOT_FOUND");
        }

        const current = snap.data();

        if (current.assignedTo !== adminID)
          throw new Error("NOT_ASSIGNED_TO_YOU");

        if (current.status !== "under_review" && current.status !== "need_info")
          throw new Error("NOT_REJECTABLE");

        if (current.status === "need_info" && current.awaitingReply !== false)
          throw new Error("NEEDING_INFO");

        transaction.update(reportRef, {
          status: "rejected",
          rejectionReason: reason,
          rejectionNote: note,
        });

        transaction.set(historyRef, {
          action: "rejected",
          fromStatus: current.status,
          toStatus: "rejected",
          actorID: adminID,
          actorName: adminName,
          actorRole: "admin",
          note: "Report rejected",
          createdAt: serverTimestamp(),
        });
      });

      toast.success("Report rejected.");

      return true;
    } catch (error) {
      if (error.message === "REPORT_NOT_FOUND") {
        toast.error("Report not found.");
      } else if (error.message === "NOT_ASSIGNED_TO_YOU") {
        toast.error("Report is not assigned to you.");
      } else if (error.message === "NOT_REJECTABLE") {
        toast.error(
          "Report can only be rejected while a report is under review.",
        );
      } else if (error.message === "NEEDING_INFO") {
        toast.error("Can't reject while waiting for the reporter to reply");
      } else {
        toast.error("Something went wrong.");
      }

      console.error(error);

      return false;
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDuplicate = async () => {};

  if (loading) return <p>Loading…</p>;
  if (!report) return <p>Report not found.</p>;

  const canDecide = Boolean(adminID) && adminID === report.assignedTo;

  const key = statusKey(report);

  // translate the Firestore document into the shape ReportDetail expects
  const detail = {
    id: refNo(report),
    status: key,
    statusLabel: STATUS[key]?.label ?? key,
    assignedTo: report.assignedToName || "Unassigned",
    photoUrl: report.photoUrl,
    category: report.category,
    description: report.description,
    landmarkNote: report.landmarkNote,
    submittedAt: formatDate(report.createdAt),
    area: `Brgy. ${report.brgy}, ${report.municipality}`,
    reporter: {
      name: report.fullName,
      contact: report.contactNumber,
    },
    nearby: [],
    history: history.map((e) => {
      const eventKey = statusKey({ status: e.toStatus });
      return {
        at: e.createdAt ? formatDate(e.createdAt) : "",
        status: eventKey,
        statusLabel: STATUS[eventKey]?.label ?? eventKey,
        by: e.actorName,
        note: e.note,
      };
    }),
    resolutionNote: report.resolutionNote,
    awaitingReply: report.awaitingReply,
    rejectionReason: report.rejectionReason,
    rejectionNote: report.rejectionNote,
  };

  return (
    <ReportDetails
      onClaim={handleClaim}
      isClaiming={isClaiming}
      onVerify={handleVerify}
      isVerifying={isVerifying}
      onSetInProgress={handleInProgress}
      isSettingInProgress={isSettingInProgress}
      onResolve={handleResolve}
      isResolving={isResolving}
      onRequestInfo={handleRequestInfo}
      isRequestingInfo={isRequestingInfo}
      onReject={handleReject}
      isRejecting={isRejecting}
      decisionsDisabled={!canDecide}
      report={detail}
      conversations={conversations}
      adminName={adminName}
    />
  );
}
