import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import ReportsMap from "./ReportsMap";

export default function ReportsMapView({ publicOnly = false }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = collection(db, "reports");
    const q = publicOnly
      ? query(base, where("status", "in", ["pendings"]))
      : base;

    // onSnapshot keeps the map updated live when reports change
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReports(list);
      setLoading(false);
    });

    return unsubscribe; // stop listening when the component unmounts
  }, [publicOnly]);

  if (loading) return <p>Loading map...</p>;
  return <ReportsMap reports={reports} />;
}
