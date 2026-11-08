import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Signup.css"; // shares the same auth styles as Signup

import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

import toast from "react-hot-toast";

// Simple leaf icon used as the ECOREPORT logo mark
const LeafMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="brand-mark">
    <path d="M20 4C10 4 4 9 4 15c0 2 .8 3.6 2 4.7C6.4 14 10 10.5 15 9c-3.6 2.2-6 5.4-7 9.2 1 .5 2 .8 3 .8 6 0 9-5.5 9-15z" />
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLogging || isCoolingDown) {
      return;
    }

    setIsCoolingDown(true);

    setTimeout(() => {
      setIsCoolingDown(false);
    }, 5000);

    if (!email.trim() || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    await login();
  };

  const login = async () => {
    try {
      setIsLogging(true);

      await signInWithEmailAndPassword(auth, email.trim(), password);

      toast.success("Logged in successfully!", {
        duration: 2500,
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Login error code:", error.code);
      console.error("Login error message:", error.message);

      if (error.code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        toast.error("Incorrect email or password.");
      } else if (error.code === "auth/user-disabled") {
        toast.error("This account has been disabled.");
      } else if (error.code === "auth/too-many-requests") {
        toast.error("Too many login attempts. Please try again later.");
      } else if (error.code === "auth/network-request-failed") {
        toast.error("Network error. Check your internet connection.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="signup-page">
      {/* "signup-card--reverse" puts the green panel on the right */}
      <div className="signup-card signup-card--reverse">
        {/* Form panel */}
        <main className="signup-form-wrap">
          <h1>Admin sign in</h1>
          <p className="signup-hint">
            Review, verify and resolve the reports your community sends in.
          </p>

          <form className="signup-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="sr-only">Email</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              <input
                type="email"
                name="email"
                placeholder="Email"
                autoComplete="email"
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                value={email}
                required
              />
            </label>

            <label className="field">
              <span className="sr-only">Password</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <input
                type="password"
                name="password"
                placeholder="Password"
                autoComplete="current-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                value={password}
                required
              />
            </label>

            <button type="button" className="link-btn">
              Forgot your password?
            </button>

            <button
              type="submit"
              className="btn btn-solid"
              disabled={isLogging || isCoolingDown}
            >
              {isLogging
                ? "Logging in..."
                : isCoolingDown
                  ? "Please wait..."
                  : "Login"}
            </button>
          </form>
        </main>

        {/* Green panel: switch-to-signup prompt */}
        <aside className="signup-panel">
          <div className="signup-brand">
            <LeafMark />
            <span>ECOREPORT</span>
          </div>

          <div className="signup-panel-body">
            <h2>Welcome back!</h2>
            <p>
              New to the team? Create an admin account to start managing
              reports.
            </p>
            <Link to="/signup" className="btn btn-outline">
              Create account
            </Link>
          </div>

          <svg
            className="signup-hills"
            viewBox="0 0 400 160"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 90 C80 40 160 40 240 80 C300 110 350 70 400 50 V160 H0Z"
              fill="#3f8f5a"
              opacity="0.55"
            />
            <path
              d="M0 120 C90 80 170 100 250 120 C310 135 360 110 400 100 V160 H0Z"
              fill="#2c6e47"
              opacity="0.8"
            />
            <path
              d="M0 145 C100 120 200 150 300 135 C350 128 380 130 400 135 V160 H0Z"
              fill="#194a33"
            />
          </svg>
        </aside>
      </div>
    </div>
  );
};

export default Login;
