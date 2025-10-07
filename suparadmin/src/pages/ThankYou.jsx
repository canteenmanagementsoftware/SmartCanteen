import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function ThankYou() {
  return (
    <>
      <Navbar />

      <section className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 gap-3 bg-gradient-to-b from-blue-50 to-white">
        {/* ✅ Thank you illustration / icon */}
        <img
          src="https://cdn-icons-png.flaticon.com/512/190/190411.png"
          alt="Thank You Icon"
          className="w-24 h-24 md:w-28 md:h-28 mb-4"
          loading="lazy"
        />

        <h1 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
          🎉 Thank You for contacting us!
        </h1>

        <p className="text-slate-600 text-lg md:text-2xl max-w-2xl mb-6">
          One of our representatives will get in touch with you shortly regarding your inquiry.
        </p>

        <p className="text-slate-700 text-lg mb-2">
          If you would like to speak to someone immediately, please feel free to call:
        </p>

        {/* ✅ Phone number with icon */}
        <div className="flex items-center justify-center gap-2 text-blue-700 text-xl font-semibold mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            className="w-6 h-6"
          >
            <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.9 19.9 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.15 9.81 19.9 19.9 0 0 1 .08 1.18 2 2 0 0 1 2.06 0h2a2 2 0 0 1 2 1.72c.12.86.34 1.7.66 2.5a2 2 0 0 1-.45 2.11L5.1 7.52a16 16 0 0 0 6.38 6.38l1.19-1.16a2 2 0 0 1 2.11-.45c.8.32 1.64.54 2.5.66A2 2 0 0 1 22 16.92Z" />
          </svg>
          <a href="tel:+918487080659" className="hover:text-blue-500 transition-colors">
            +91 84870 80659
          </a>
        </div>
      </section>
    </>
  );
}
