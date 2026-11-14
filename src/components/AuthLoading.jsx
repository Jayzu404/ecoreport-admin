import "./AuthLoading.css";

export default function AuthLoading({ message = "Checking your sign-in…" }) {
  return (
    <div className="auth-check" role="status" aria-live="polite">
      <span className="auth-check__spinner" aria-hidden="true" />
      <p className="auth-check__text">{message}</p>
    </div>
  );
}