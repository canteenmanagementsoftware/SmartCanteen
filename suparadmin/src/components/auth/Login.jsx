import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../../utils/axiosConfig";
import { useAuth } from "../../hooks/useAuth";
import bg1 from "../../assets/loginpageimg/face-recognition-personal-identification-collage.jpg";
import bg2 from "../../assets/loginpageimg/foodimgone.jpg";
import bg3 from "../../assets/loginpageimg/foodimgtwo.png";
import bg4 from "../../assets/loginpageimg/scan_card.jpg";

const Icon = ({ name, className = "h-5 w-5" }) => {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    className,
  };
  switch (name) {
    case "shield": // header
      return (
        <svg {...common}>
          <path d="M12 3l7 3v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-3z" />
        </svg>
      );
    case "mail": // email field
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "lock": // password field
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "eye-off":
      return (
        <svg {...common}>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4M9.9 4.2A10.8 10.8 0 0 1 12 5c7 0 11 7 11 7a19.9 19.9 0 0 1-5.1 5.7M5.2 6.3A19.6 19.6 0 0 0 1 12s4 7 11 7c1.5 0 2.9-.3 4.2-.8" />
        </svg>
      );
    case "arrow-right": // button icon
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="M13 5l7 7-7 7" />
        </svg>
      );
    case "spinner":
      return (
        <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            opacity="0.25"
          />
          <path
            d="M21 12a9 9 0 0 1-9 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
};

const Login = () => {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [userType, setUserType] = useState("admin"); // internal only
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const backgrounds = [bg1, bg2, bg3, bg4];
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgrounds.length);
    }, 5000); // change image every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location.pathname.includes("/superadmin/login")) {
      setUserType("superadmin");
    } else {
      setUserType("admin");
    }
  }, [location.pathname]);

  const getLoginTitle = () =>
    userType === "superadmin" ? "Super Admin Login" : "Login";

  const getLoginDescription = () =>
    userType === "superadmin"
      ? "Access system-wide administration"
      : "Welcome back";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("/auth/login", { ...form, userType });
      if (res.data.token && res.data.user) {
        login(res.data.token, res.data.user);
        const utype =
          res.data.user.userType || res.data.user.type || res.data.user.role;
        if (utype === "superadmin") navigate("/superadmin/dashboard");
        else if (utype === "admin") navigate("/admin/dashboard");
        else if (utype === "manager") navigate("/manager/dashboard");
        else if (utype === "meal_collector") navigate("/meal-capture");
        else navigate("/admin/dashboard");
      } else {
        setError("Login failed - Invalid response from server");
      }
    } catch (err) {
      console.error(
        "Login failed:",
        err.response?.data?.message || err.message
      );
      setError(
        err.response?.data?.message ||
          "Invalid credentials. Please check your email/phone and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background images */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[2px] bg-black">
        {[bg1, bg2, bg3, bg4].map((img, i) => (
          <div key={i} className="w-full h-full">
            <img
              src={img}
              alt={`Background ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Overlay (for better text readability) */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Centered Login Card */}
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white/90 backdrop-blur-md shadow-2xl ring-1 ring-slate-200 overflow-hidden">
          {/* Decorative top bar */}
          <div className="h-2 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500" />

          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
              <Icon name="shield" className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {getLoginTitle()}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {getLoginDescription()}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon name="mail" />
                </span>
                <input
                  type="text"
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-slate-200 bg-white px-10 py-2.5 text-slate-900
                           outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  value={form.identifier}
                  onChange={(e) =>
                    setForm({ ...form, identifier: e.target.value })
                  }
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon name="lock" />
                </span>
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 bg-white px-10 py-2.5 text-slate-900
                           outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 pr-10"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  <Icon name={showPwd ? "eye-off" : "eye"} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg
                       bg-gradient-to-r from-blue-600 to-emerald-500 px-5 py-2.5 font-semibold text-white
                       shadow-sm hover:from-blue-700 hover:to-emerald-600 active:scale-[0.99]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 transition-all disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Icon name="spinner" className="h-5 w-5" />
                  Logging in…
                </>
              ) : (
                <>
                  Continue
                  <Icon name="arrow-right" className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
