import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";

export function Login() {
  const { login, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const from = location.state?.from?.pathname || "/products";
  const loginMessage = location.state?.message || "";

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = mode === "login" ? login({ email, password }) : register({ name, email, password, confirmPassword });
    if (!result.ok) {
      setError(result.message);
      setSuccess("");
      return;
    }
    if (mode === "register") setSuccess("Account created successfully.");
    navigate(mode === "login" ? from : "/products", { replace: true });
  };

  const fillCredentials = (nextEmail, nextPassword) => {
    setEmail(nextEmail);
    setPassword(nextPassword);
    setError("");
  };

  const switchMode = () => {
    setMode((current) => current === "login" ? "register" : "login");
    setError("");
    setSuccess("");
  };

  return (
    <main className="login-page">
      <section className="login-shell">
        <NavLink to="/" className="login-logo" aria-label="Luxe Step home"><img src="/luxe-step-logo.svg" alt="" /><span>LUXE STEP</span></NavLink>
        <div className="login-panel">
          <div className="login-copy">
            <span className="eyebrow">Member Access</span>
            <h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
            <p>{mode === "login" ? "Sign in to view your shopping bag, continue checkout, and keep your Luxe Step picks ready." : "Create a Luxe Step customer account to shop, place orders, and track your purchases."}</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            {loginMessage && <p className="login-info">{loginMessage}</p>}
            {mode === "register" && <label>Full Name<input value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="Your full name" required /></label>}
            <label>Email<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="customer@luxestep.com" required /></label>
            <label>Password<input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="customer123" required /></label>
            {mode === "register" && <label>Confirm Password<input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(""); }} placeholder="Confirm password" required /></label>}
            {mode === "login" && <div className="quick-login">
              <span>Quick credentials</span>
              <button type="button" onClick={() => fillCredentials("admin@luxestep.com", "admin123")}>Admin</button>
              <button type="button" onClick={() => fillCredentials("customer@luxestep.com", "customer123")}>Customer</button>
            </div>}
            {error && <p className="login-error">{error}</p>}
            {success && <p className="login-success">{success}</p>}
            <button className="primary-button" type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
            <p className="auth-toggle">{mode === "login" ? "Don't have an account?" : "Already have an account?"} <button type="button" onClick={switchMode}>{mode === "login" ? "Create account" : "Login"}</button></p>
          </form>
        </div>
      </section>
    </main>
  );
}
