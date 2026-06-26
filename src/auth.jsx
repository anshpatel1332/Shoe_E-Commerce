import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = "luxe-step-user";
const AUTH_SESSION_KEY = "luxe-step-session-active";
const USERS_STORAGE_KEY = "luxe-step-users";

const defaultUsers = [
  { id: "admin", email: "admin@luxestep.com", password: "admin123", name: "Admin", role: "Admin", createdAt: "2026-01-01", status: "Active" },
  { id: "customer", email: "customer@luxestep.com", password: "customer123", name: "Customer", role: "Customer", createdAt: "2026-01-01", status: "Active" },
];

function readUsers() {
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    const users = saved ? JSON.parse(saved) : defaultUsers;
    const withDefaults = defaultUsers.reduce((list, account) => list.some((user) => user.email === account.email) ? list : [account, ...list], Array.isArray(users) ? users : []);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(withDefaults));
    return withDefaults;
  } catch {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
    return defaultUsers;
  }
}

const publicUser = (account) => ({ id: account.id, email: account.email, name: account.name, role: account.role, status: account.status });

function readUser() {
  try {
    if (!sessionStorage.getItem(AUTH_SESSION_KEY)) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.setItem(AUTH_SESSION_KEY, "true");
      return null;
    }
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return;
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, [user]);

  const login = ({ email, password }) => {
    const match = readUsers().find((account) => account.email === email.trim().toLowerCase() && account.password === password);
    if (!match) return { ok: false, message: "Invalid email or password." };
    if (match.status !== "Active") return { ok: false, message: "This account is inactive." };
    const nextUser = publicUser(match);
    setUser(nextUser);
    return { ok: true, user: nextUser };
  };

  const register = ({ name, email, password, confirmPassword }) => {
    const nextName = name.trim();
    const nextEmail = email.trim().toLowerCase();
    if (!nextName) return { ok: false, message: "Full name is required." };
    if (!nextEmail) return { ok: false, message: "Email is required." };
    if (password.length < 6) return { ok: false, message: "Password must be at least 6 characters." };
    if (password !== confirmPassword) return { ok: false, message: "Passwords do not match." };
    const users = readUsers();
    if (users.some((account) => account.email === nextEmail)) return { ok: false, message: "An account with this email already exists." };
    const account = { id: `user-${Date.now()}`, name: nextName, email: nextEmail, password, role: "Customer", createdAt: new Date().toISOString(), status: "Active" };
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([account, ...users]));
    const nextUser = publicUser(account);
    setUser(nextUser);
    return { ok: true, user: nextUser };
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setUser(null);
  };
  const isAuthenticated = Boolean(user);

  return <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
