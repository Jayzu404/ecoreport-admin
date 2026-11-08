import { NavLink } from "react-router-dom";

import { signOut } from "firebase/auth";
import { auth } from "../../../firebaseConfig";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import "./Sidebar.css";

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const choice = confirm('Are you sure you want to log out?');

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
    <aside className="bg-emerald-600 fixed top-0 bottom-0 px-8 pt-5 w-[250px]">
      <h1 className="mb-10 text-white text-lg font-bold">ECOREPORT ADMIN</h1>

      <nav>
        <ul className="flex flex-col gap-8 text-white">
          <li>
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) => {
                return isActive ? "block bg-emerald-500" : "block";
              }}
            >
              <div className="sidebar-group">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-list-clock preview-icon"
                >
                  <path d="M16 13v2.2l1.6 1" />
                  <path d="M3 12h3.458" />
                  <path d="M3 19h3.832" />
                  <path d="M3 5h18" />
                  <circle cx="16" cy="15" r="6" />
                </svg>
                Reports
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dashboard/analytics"
              className={({ isActive }) => {
                return isActive ? "block bg-emerald-500" : "block";
              }}
            >
              <div className="sidebar-group">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-chart-spline preview-icon"
                >
                  <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                  <path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7" />
                </svg>
                Analytics
              </div>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dashboard/reports-map"
              className={({ isActive }) => {
                return isActive ? "block bg-emerald-500" : "block";
              }}
            >
              <div className="sidebar-group">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-map-pinned preview-icon"
                >
                  <path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 01-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0112 0" />
                  <path d="M4.474 15h-.197a1 1 0 00-.969.753l-1.097 4.35a1.5 1.5 0 001.444 1.898L20.344 22a1.5 1.5 0 001.446-1.897l-1.098-4.35a1 1 0 00-.969-.753h-.197" />
                  <circle cx="12" cy="8" r="2" />
                </svg>
                Mapview
              </div>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="mt-80 text-white">
        <button onClick={handleLogout} className="cursor-pointer">
          <div className="sidebar-group">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-door-open preview-icon"
            >
              <path d="M10 21H2" />
              <path d="M10 3H7a2 2 0 00-2 2v16" />
              <path d="M14 12h.01" />
              <path d="M19 21V5a2 2 0 00-1.675-1.974l-6.163-1.013A1 1 0 0010 3v18a1 1 0 001.124.992z" />
              <path d="M22 21h-3" />
            </svg>
            Logout
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
