import axios from "axios";

// Get API base URL from .env or default to localhost
const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  if (import.meta.env.DEV) {
    console.log("API Base URL:", url);
  }
  return url;
};

const instance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  withCredentials: false,
  // ❌ Don't set Content-Type globally here
  // headers: { 'Content-Type': 'application/json' }
});

// Add token + set proper headers per request
instance.interceptors.request.use(
  (config) => {
    // ensure headers object exists
    config.headers = config.headers || {};

    // attach token
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // handle content-type based on payload
    const isFD =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    if (isFD) {
      // VERY IMPORTANT: let the browser set multipart boundary
      delete config.headers["Content-Type"];
    } else {
      const m = (config.method || "").toLowerCase();
      if (
        ["post", "put", "patch"].includes(m) &&
        !config.headers["Content-Type"]
      ) {
        config.headers["Content-Type"] = "application/json";
      }
    }

    if (import.meta.env.DEV) {
      console.log("Axios request - URL:", config.url);
      console.log("Axios request - Method:", config.method);
      console.log("Axios request - Token present:", !!token);
      console.log("Axios request - Content-Type:", config.headers["Content-Type"]);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle errors globally
instance.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log("Axios response - URL:", response.config.url);
      console.log("Axios response - Status:", response.status);
      console.log("Axios response - Success");
    }
    return response;
  },
  async (error) => {
    console.log("Axios error - URL:", error.config?.url);
    console.log("Axios error - Status:", error.response?.status);
    console.log(
      "Axios error - Message:",
      error.response?.data?.message || error.message
    );

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    const errorMessage = error.response?.data?.message || error.message;
    error.message = errorMessage;

    console.error("API Error:", {
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data,
    });

    return Promise.reject(error);
  }
);

export default instance;
