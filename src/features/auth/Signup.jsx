import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Signup.css";

import { auth, db } from "../../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import toast from "react-hot-toast";

// Simple leaf icon used as the ECOREPORT logo mark
const LeafMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="brand-mark">
    <path d="M20 4C10 4 4 9 4 15c0 2 .8 3.6 2 4.7C6.4 14 10 10.5 15 9c-3.6 2.2-6 5.4-7 9.2 1 .5 2 .8 3 .8 6 0 9-5.5 9-15z" />
  </svg>
);

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isCoolingDown || isSubmitting) {
      return;
    }

    setIsCoolingDown(true);

    setTimeout(() => {
      setIsCoolingDown(false);
    }, 5000);

    if (!fullName.trim() || !email.trim() || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    await signup();
  };

  const signup = async () => {
    try {
      setIsSubmitting(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);

      await setDoc(userRef, {
        fullName: fullName,
        email: user.email,
        role: "admin",
        createdAt: serverTimestamp(),
      });

      toast.success("Account created successfully!", {
        duration: 2500,
      });

      navigate("/login", { replace: true });
    } catch (error) {
      console.log("Error code:", error.code);
      console.log("Error message:", error.message);

      if (error.code === "auth/email-already-in-use") {
        toast.error("This email is already registered.");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else if (error.code === "auth/weak-password") {
        toast.error("Please choose a stronger password.");
      } else if (error.code === "auth/missing-email") {
        toast.error("Please enter your email.");
      } else if (error.code === "auth/missing-password") {
        toast.error("Please enter your password.");
      } else if (error.code === "permission-denied") {
        toast.error(
          "Your account was created, but your profile could not be saved. Please contact support.",
        );
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        {/* Left panel: switch-to-sign-in prompt */}
        <aside className="signup-panel">
          <div className="signup-brand">
            <LeafMark />
            <span>ECOREPORT</span>
          </div>

          <div className="signup-panel-body">
            <h2>Already an admin?</h2>
            <p>
              Sign in to review, verify and resolve reports from your community.
            </p>
            <Link to="/login" className="btn btn-outline">
              Sign in
            </Link>
          </div>

          {/* Layered hills at the bottom of the panel */}
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

        {/* Right panel: the form */}
        <main className="signup-form-wrap">
          <h1>Create admin account</h1>
          <p className="signup-hint">
            Manage the environmental reports your community sends in.
          </p>

          <form className="signup-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="sr-only">Full name</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
              <input
                type="text"
                name="name"
                placeholder="Full name"
                autoComplete="name"
                onChange={(e) => setFullName(e.target.value)}
                value={fullName}
                required
              />
            </label>

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
                onChange={(e) => setEmail(e.target.value)}
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
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
              />
            </label>

            <button
              type="disable"
              className="btn btn-solid"
              disabled={isSubmitting || isCoolingDown}
            >
              {isSubmitting
                ? "Creating Account..."
                : isCoolingDown
                  ? "Please wait..."
                  : "Create Account"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default Signup;
