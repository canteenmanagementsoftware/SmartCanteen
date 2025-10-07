
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../../utils/axiosConfig";
import { useAuth } from "../../hooks/useAuth";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });
  const [userType, setUserType] = useState("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Determine userType based on URL
    if (location.pathname.includes("/superadmin/register")) {
      setUserType("superadmin");
    } else {
      setUserType("admin"); // Default to admin for /register and /admin/register
    }
  }, [location.pathname]);

  const getRegisterTitle = () => {
    switch (userType) {
      case "superadmin":
        return "Super Admin Registration";
      default:
        return "Registration";
    }
  };

  const getRegisterDescription = () => {
    switch (userType) {
      case "superadmin":
        return "Create a new super admin account";
      default:
        return "Create a new account";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Register the user with userType
      const registerRes = await axios.post("/auth/register", { ...form, userType });
      
      if (registerRes.data) {
        // For admin registration, check if company setup is required
        if (userType === "admin" && registerRes.data.requiresCompanySetup) {
          // Store admin data temporarily and redirect to company creation
          localStorage.setItem("tempAdminData", JSON.stringify({
            adminId: registerRes.data.adminId,
            email: form.email,
            password: form.password
          }));
          navigate('/admin/company-setup');
          return;
        }

        // Auto-login after successful registration for other user types
        try {
          const loginRes = await axios.post("/auth/login", {
            identifier: form.email,
            password: form.password,
            userType
          });

          if (loginRes.data.token && loginRes.data.user) {
            // Login the user
            login(loginRes.data.token, loginRes.data.user);
            
            // Redirect based on role
            if (loginRes.data.user.role === 'superadmin') {
              navigate('/superadmin/dashboard');
            } else if (loginRes.data.user.role === 'admin') {
              // For admin users, redirect to admin dashboard
              navigate('/admin/dashboard');
            } else {
              // If somehow a user registers, redirect to admin dashboard
              navigate('/admin/dashboard');
            }
          } else {
            setError("Auto-login failed. Please login manually.");
          }
        } catch (loginError) {
          console.error("Auto-login failed:", loginError);
          setError("Registration successful! Please login manually.");
          // Redirect to appropriate login page
          if (userType === "superadmin") {
            navigate('/superadmin/login');
          } else {
            navigate('/login');
          }
        }
      }
    } catch (error) {
      setError(error.response?.data?.message || "Registration failed. Please try again.");
      console.error("Registration failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">{getRegisterTitle()}</h2>
          <p className="text-gray-600 mt-2">{getRegisterDescription()}</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          {userType !== "superadmin" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="Enter your phone number"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required={userType !== "superadmin"}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a 
              href={userType === "superadmin" ? "/superadmin/login" : "/login"} 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Login here
            </a>
          </p>
        </div>

        {/* Role indicator */}
        <div className="mt-4 text-center">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
            userType === "superadmin" 
              ? "bg-purple-100 text-purple-800" 
              : userType === "admin" 
                ? "bg-blue-100 text-blue-800" 
                : "bg-green-100 text-green-800"
          }`}>
            {userType === "superadmin" ? "Super Admin" : "Admin"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Register;
