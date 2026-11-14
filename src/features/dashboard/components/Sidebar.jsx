import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";

import { signOut } from "firebase/auth";
import { db, auth } from "../../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import "./Sidebar.css";

const Icon = ({ children }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="sidebar__icon"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const NAV_SECTIONS = [
  {
    label: "Monitor",
    items: [
      {
        to: "/dashboard",
        label: "Reports",
        end: true,
        icon: (
          <>
            <path d="M16 13v2.2l1.6 1" />
            <path d="M3 12h3.458" />
            <path d="M3 19h3.832" />
            <path d="M3 5h18" />
            <circle cx="16" cy="15" r="6" />
          </>
        ),
      },
      {
        to: "/dashboard/analytics",
        label: "Analytics",
        icon: (
          <>
            <path d="M3 3v16a2 2 0 0 0 2 2h16" />
            <path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7" />
          </>
        ),
      },
      {
        to: "/dashboard/reports-map",
        label: "Mapview",
        icon: (
          <>
            <path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 01-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0112 0" />
            <path d="M4.474 15h-.197a1 1 0 00-.969.753l-1.097 4.35a1.5 1.5 0 001.444 1.898L20.344 22a1.5 1.5 0 001.446-1.897l-1.098-4.35a1 1 0 00-.969-.753h-.197" />
            <circle cx="12" cy="8" r="2" />
          </>
        ),
      },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        // TODO: confirm this route once the Admins page exists.
        to: "/dashboard/admins",
        label: "Admins",
        icon: (
          <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </>
        ),
      },
    ],
  },
];

const linkClass = ({ isActive }) =>
  isActive ? "sidebar__link is-active" : "sidebar__link";

const getInitials = (adminName) => {
  console.log(adminName);
  if (!adminName) return;
  adminName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}   

/* ---------- Component ---------- */

const Sidebar = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState({});

  useEffect(() => {
    const getAdmin = async () => {
      try {
        const admin = auth.currentUser;

        if (!admin) {
          throw new Error("ADMIN_NOT_FOUND");
        }

        const adminID = admin.uid;
        const adminEmail = admin.email;

        const userRef = doc(db, "users", adminID);
        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
          throw new Error("PROFILE_NOT_FOUND");
        }

        const adminProfile = userSnapshot.data();

        console.log(adminProfile.fullName);

        setAdmin({ name: adminProfile.fullName, email: adminEmail });
      } catch (error) {
        if (error.message === "ADMIN_NOT_FOUND") {
          toast.error("Your profile is not loaded yet.");
        } else if (error.message === "PROFILE_NOT_FOUND") {
          toast.error("Your profile not found.");
        } else {
          toast.error("Something went wrong.");
        }

        console.error(error);
      }
    };

    getAdmin();
  }, []);

  const handleLogout = async () => {
    try {
      const choice = confirm("Are you sure you want to log out?");

      if (!choice) return;

      await signOut(auth);

      toast.success("Logged out successfully!");

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);

      toast.error("Failed to log out. Please try again.");
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
        </span>
        <div>
          <h1 className="sidebar__brand-name">EcoReport</h1>
          <p className="sidebar__brand-sub">Admin</p>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <h2 className="sidebar__section-label">{section.label}</h2>
            <ul className="sidebar__list">
              {section.items.map(({ to, label, end, icon }) => (
                <li key={to}>
                  <NavLink to={to} end={end} className={linkClass}>
                    <Icon>{icon}</Icon>
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button type="button" onClick={handleLogout} className="sidebar__link">
          <Icon>
            <path d="M10 21H2" />
            <path d="M10 3H7a2 2 0 00-2 2v16" />
            <path d="M14 12h.01" />
            <path d="M19 21V5a2 2 0 00-1.675-1.974l-6.163-1.013A1 1 0 0010 3v18a1 1 0 001.124.992z" />
            <path d="M22 21h-3" />
          </Icon>
          Logout
        </button>

        {/* TODO: confirm the account/profile route */}
        <NavLink
          to="/dashboard/account"
          className={(state) => `${linkClass(state)} sidebar__profile`}
          aria-label={`Account profile: ${admin.name}`}
        >
          <span className="sidebar__avatar" aria-hidden="true">
            {Object.keys(admin).length === 0 ? "..." : getInitials(admin.name)}
          </span>
          <span className="sidebar__profile-text">
            <span className="sidebar__profile-name">{admin.name}</span>
            <span className="sidebar__profile-email">
              {admin.email}
            </span>
          </span>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
