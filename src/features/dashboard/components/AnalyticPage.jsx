import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebaseConfig"; // adjust to wherever your Firebase config lives
import Analytics from "./Analytics";

export default function AnalyticsPage() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    // onSnapshot listens live: it re-runs whenever a report is added or changed
    const unsubscribe = onSnapshot(collection(db, "reports"), (snapshot) => {
      setReports(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return unsubscribe; // stop listening when the page unmounts
  }, []);

  return <Analytics reports={reports} />;
}
