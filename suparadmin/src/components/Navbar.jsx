import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoPng from "../assets/Smart Canteen Management.png"; // path adjust if needed
import whatsappPng from "../assets/icons/whatsapp.png";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const onProduct = location.pathname.startsWith("/product");

  // Build hash links to Product page from anywhere
  const go = (hash) => (onProduct ? `#${hash}` : `/product#${hash}`);

  // WhatsApp config
  const WHATSAPP_NUMBER = "917600907288"; 
  const DEFAULT_MESSAGE = "Hello! I’m interested in Smart Canteen Management.";
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    DEFAULT_MESSAGE
  )}`;

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
        <Link
          to="/product"
          className="flex items-center gap-2"
          aria-label="N&T Canteen Management"
        >
          <img
            src={logoPng}
            alt="N&T Canteen Management"
            className="h-9 w-auto md:h-16"
            loading="eager"
            decoding="async"
          />
          <span className="sr-only">N&T Canteen Management</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/product"
            className="text-[16px] lg:text-[18px] font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            Home
          </Link>

          <Link
            to="/about"
            className="text-[16px] lg:text-[18px] font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            About
          </Link>
          <Link
            to="/contact"
            className="text-[16px] lg:text-[18px] font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            Contact
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 text-white
                       text-[15px] lg:text-[17px] font-semibold px-4 py-2 hover:bg-blue-700
                       focus-visible:ring-2 focus-visible:ring-blue-400/70 active:scale-[0.98] transition-all"
            title="Login"
          >
            Login
          </Link>
                    {/* WhatsApp icon button */}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white
             ring-1 ring-emerald-200 shadow-sm hover:shadow-md hover:ring-emerald-300
             active:scale-95 transition-all focus-visible:outline-none
             focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Chat on WhatsApp"
            title="Chat on WhatsApp"
          >
            <img
              src={whatsappPng}
              alt="WhatsApp"
              className="w-10 h-10"
              loading="lazy"
              decoding="async"
            />
          </a>
        </nav>

        {/* Mobile */}
        <div className="md:hidden">
          <select
            className="border rounded-md px-3 py-2 text-[15px] font-medium"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "home") navigate("/product");
              else if (v === "about") navigate("/about");
              else if (v === "login") navigate("/login");
              else if (["features", "usecases", "contact"].includes(v)) {
                navigate(`/product#${v}`);
              } else if (v === "whatsapp") {
                window.open(whatsappHref, "_blank", "noopener,noreferrer");
              }
            }}
          >
            <option value="home">Home</option>
            <option value="about">About</option>
            <option value="features">Features</option>
            <option value="usecases">Use Cases</option>
            <option value="contact">Contact</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="login">Login</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>
    </div>
  );
}
