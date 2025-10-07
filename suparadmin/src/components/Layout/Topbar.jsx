import { useState, useContext, useMemo, useEffect } from "react";
import { FaCog, FaSignOutAlt } from "react-icons/fa";
import avatarImg from "../../assets/avatar.png";
import leftImg from "../../assets/NNTsoftware.png";
import { AuthContext } from "../../context/auth-context";
import axios from "../../utils/axiosConfig";

const Topbar = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user: currentUser } = useContext(AuthContext);

  // 1) API base और ORIGIN अलग करें (ताकि /api strip हो जाए)
  const API_BASE =
    (axios && axios.defaults && axios.defaults.baseURL) ||
    "http://localhost:5000";

  const ASSET_BASE = (() => {
    try {
      // अगर baseURL '/api' है या कोई relative path है, तो window.location.origin fallback
      const u = new URL(API_BASE, window.location.origin);
      return u.origin; // e.g., http://localhost:5000
    } catch {
      return window.location.origin;
    }
  })();

  // Optional: अलग से env से भी दे सकते हैं
  // const ASSET_BASE = import.meta.env.VITE_ASSET_BASE_URL || new URL(API_BASE, window.location.origin).origin;

  // Role check
  const isSuperAdmin = useMemo(() => {
    const role = (
      currentUser?.role ||
      currentUser?.userType ||
      ""
    ).toLowerCase();
    return (
      role === "superadmin" || role === "super_admin" || role === "admin:super"
    );
  }, [currentUser]);

  // CompanyId
  const companyId = useMemo(() => {
    return (
      currentUser?.companyId ||
      currentUser?.company?.id ||
      currentUser?.company?._id ||
      currentUser?.companyID ||
      currentUser?.orgId ||
      currentUser?.organizationId ||
      currentUser?.tenantId ||
      currentUser?.tenant?.id ||
      ""
    );
  }, [currentUser]);

  const [leftSrc, setLeftSrc] = useState(leftImg);

  // 2) helper: logo path को absolute URL बनाना
  const resolveLogoUrl = (logoPath) => {
    if (!logoPath) return leftImg;
    // अगर server ने absolute URL दिया है, वैसे ही यूज़ करें
    if (/^https?:\/\//i.test(logoPath)) return logoPath;
    // वरना ORIGIN + relative path
    return `${ASSET_BASE}${logoPath}`;
  };

  useEffect(() => {
    let cancelled = false;

    const fallback = () => {
      if (!cancelled) setLeftSrc(leftImg);
    };

    if (isSuperAdmin) {
      setLeftSrc(leftImg);
      return () => {
        cancelled = true;
      };
    }

    if (!companyId) {
      fallback();
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const res = await axios.get(`/company/${companyId}`);
        const logoPath = res?.data?.logo; // e.g. "/uploads/company-logos/logo-1758719523491-182595134.jpg"
        const finalSrc = resolveLogoUrl(logoPath);

        if (!cancelled) {
          setLeftSrc(finalSrc || leftImg);
          // Debug: देखें final URL क्या बन रहा है
          // console.debug("Company logo:", { companyId, logoPath, finalSrc, ASSET_BASE, API_BASE });
        }
      } catch (e) {
        // console.warn("Company logo fetch failed:", e);
        fallback();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, companyId]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const email = currentUser?.email || "admin@example.com";

  return (
    <div className="bg-white shadow-md p-4 px-8 flex items-center justify-between relative">
      {/* LEFT */}
      <div className="flex items-center">
        <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-gray-200 bg-white">
          <img
            src={leftSrc}
            alt={
              isSuperAdmin
                ? "N&T Software Logo"
                : `${companyId || "Company"} Logo`
            }
            className="h-full w-full object-cover" // cover = clean circular crop
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = leftImg; // fallback
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* RIGHT */}
      <div className="relative">
        <img
          src={avatarImg}
          alt="Avatar"
          onClick={() => setShowMenu(!showMenu)}
          className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-300 hover:border-blue-500"
        />

        {showMenu && (
          <div className="absolute right-0 top-12 mt-2 w-56 bg-white border rounded shadow-lg z-10 animate-fade-in">
            <div className="px-4 py-2 border-b text-sm text-gray-600">
              {email}
            </div>

            <button
              onClick={() => alert("Settings clicked")}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <FaCog />
              Settings
            </button>

            <button
              onClick={() => {
                setShowLogoutConfirm(true);
                setShowMenu(false);
              }}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white rounded shadow-lg p-6 w-80 text-center">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Confirm Logout
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to logout?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Topbar;
