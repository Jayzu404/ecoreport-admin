import { useState, useEffect } from "react";

import { db } from "../../../firebaseConfig";
import { getDocs, collection, query, where, orderBy } from "firebase/firestore";

import "./Admins.css";

const SKELETON_ROWS = 3;

function formatJoined(timestamp) {
  if (!timestamp) return "—";

  const date =
    typeof timestamp.toDate === "function"
      ? timestamp.toDate()
      : new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
}

// Maps Firestore error codes to messages a user can act on
function getErrorMessage(err) {
  switch (err?.code) {
    case "permission-denied":
      return "You don't have permission to view admin accounts.";
    case "unavailable":
      return "Can't reach the server. Check your connection and try again.";
    default:
      return "Something went wrong while loading admin accounts.";
  }
}

function TableHead() {
  return (
    <div className="admin-table__row admin-table__row--head" role="row">
      <div role="columnheader">Name</div>
      <div role="columnheader">Email</div>
      <div role="columnheader">Joined</div>
    </div>
  );
}

export default function AdminAccounts() {
  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0); // bump to retry

  useEffect(() => {
    let isCancelled = false;

    const getAdmins = async () => {
      setIsLoading(true);
      setError("");

      try {
        const usersRef = collection(db, "users");
        const adminsQuery = query(
          usersRef,
          where("role", "==", "admin"),
          orderBy("createdAt", "desc"),
        );

        const snapshot = await getDocs(adminsQuery);
        if (isCancelled) return;

        setAdmins(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        if (isCancelled) return;

        console.error(err);
        setAdmins([]);
        setError(getErrorMessage(err));
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    getAdmins();

    return () => {
      isCancelled = true;
    };
  }, [reloadKey]);

  const hasAdmins = admins.length > 0;

  let subtitle;
  if (isLoading) {
    subtitle = "Loading admin accounts…";
  } else if (error) {
    subtitle = "We couldn't load the list of admins.";
  } else if (!hasAdmins) {
    subtitle = "Admins can review, assign, and resolve reports.";
  } else {
    subtitle = `${admins.length} ${
      admins.length === 1 ? "admin" : "admins"
    } can review, assign, and resolve reports.`;
  }

  return (
    <section className="admin-accounts">
      <header className="admin-accounts__header">
        <h1 className="admin-accounts__title">Admin accounts</h1>
        <p className="admin-accounts__subtitle">{subtitle}</p>
      </header>

      {isLoading ? (
        <div
          className="admin-table"
          role="table"
          aria-label="Admin accounts"
          aria-busy="true"
        >
          <TableHead />
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <div className="admin-table__row" role="row" key={i}>
              <div role="cell">
                <span className="skeleton skeleton--name" />
              </div>
              <div role="cell">
                <span className="skeleton skeleton--email" />
              </div>
              <div role="cell">
                <span className="skeleton skeleton--date" />
              </div>
            </div>
          ))}
          <span className="sr-only" role="status">
            Loading admin accounts
          </span>
        </div>
      ) : error ? (
        <div className="admin-state admin-state--error" role="alert">
          <h2 className="admin-state__title">Couldn't load admin accounts</h2>
          <p className="admin-state__text">{error}</p>
          <button
            type="button"
            className="admin-state__button"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Try again
          </button>
        </div>
      ) : !hasAdmins ? (
        <div className="admin-state">
          <h2 className="admin-state__title">No admin accounts yet</h2>
          <p className="admin-state__text">
            Accounts with the admin role will show up here.
          </p>
        </div>
      ) : (
        <div className="admin-table" role="table" aria-label="Admin accounts">
          <TableHead />

          {admins.map((admin) => {
            // TODO: compare with the signed-in user, e.g. admin.id === currentUser?.uid
            const isYou = false;

            return (
              <div className="admin-table__row" role="row" key={admin.id}>
                <div className="admin-table__name" role="cell">
                  <span className="admin-table__name-text">
                    {admin.fullName || "Unnamed admin"}
                  </span>
                  {isYou && <span className="admin-table__badge">You</span>}
                </div>
                <div className="admin-table__muted" role="cell">
                  {admin.email}
                </div>
                <div className="admin-table__muted" role="cell">
                  {formatJoined(admin.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}