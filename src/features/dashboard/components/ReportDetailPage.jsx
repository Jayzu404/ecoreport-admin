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

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "reports", id), (snap) => {
      setReport(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
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

        if (current.status !== 'pending') {
          throw new Error('NOT_CLAIMABLE');
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
      } else if (error.message === 'NOT_CLAIMABLE') {
        toast.error('Report is not claimable.');
      }  else {
        toast.error("Something went wrong.");
      }
      console.log(error);
    }
    finally {
      setIsClaiming(false);
    }
  };

  const handleVerify = async () => {

  }

  const handleReject = async () => {
    
  }

  const handleDuplicate = async () => {

  }

  const handleRequestInfo = async () => {

  }

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
  };

  return <ReportDetails onClaim={handleClaim} isClaiming={isClaiming} decisionsDisabled={!canDecide} report={detail} />;
}
