import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

import imgShahnavaz from "../assets/team/shahnavaz.jpeg";
import imgDivyesh     from "../assets/team/divyesh.jpeg";
import imgadnan  from "../assets/team/adnan.jpeg";
import imgjaymin     from "../assets/team/jaymin.jpeg";
import imgpraven     from "../assets/team/praven.jpeg";

// --- Team data (replace photos with your assets if needed) ---
const TEAM = [
  {
    name: "Shahnavaz Saiyed",
    role: "Director & Project Manager",
    photo: imgShahnavaz,
    work: [
      "Leading Projects with vision, precision, and teamwork",
    ],
  },
  {
    name: "Divyesh Bhambhana",
    role: "Full-stack Engineer (MERN)",
    photo: imgDivyesh,
    work: [
      "Built most core features of our canteen system",
    ],
  },
  {
    name: "Adnan Sjyed",
    role: "Support & Sales Head",
    photo: imgadnan,
    work: [
      "Ensuring clients get the right solutions",
    ],
  },
  {
    name: "Jaimin Prajapati",
    role: "Software Testing",
    photo: imgjaymin ,
    work: [
      "Delivering bug-free quality products",
    ],
  },
  {
    name: "Pravin Patel",
    role: "DevOps Engineer",
    photo: imgpraven ,
    work: [
      "Bridging development & operations",
    ],
  },
];

const CONTRIBUTIONS = [
  "“Leading Projects with vision, precision, and teamwork”",
  "“Built most core features of our canteen system”",
  "“Ensuring clients get the right solutions”",
  "“Delivering bug-free quality products”",
  "“Bridging development & operations”",
];

// --- tiny inline icon set for Our Story (no external libs) ---
const StoryIcon = ({ name, className = "h-5 w-5" }) => {
  const props = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };
  switch (name) {
    case "device":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="14" height="12" rx="2" />
          <path d="M10 17v2h8a1 1 0 0 0 1-1v-3" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3l7 4v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7z" />
        </svg>
      );
    case "globe":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M2.5 12h19M12 2.5v19M7 12a11 11 0 0 0 10 0M7 12a11 11 0 0 1 10 0" />
        </svg>
      );
    case "clock":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" />
        </svg>
      );

    case "bolt":
      return (
        <svg {...props}>
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      );
    case "rupee":
      return (
        <svg {...props}>
          <path d="M7 5h10M7 9h10M7 5c6 0 6 8 0 8l10 6" />
        </svg>
      );
    case "chart":
      return (
        <svg {...props}>
          <path d="M4 20V6M4 20h16" />
          <path d="M8 18V9M12 18V7M16 18v-5" />
        </svg>
      );
    case "layers":
      return (
        <svg {...props}>
          <path d="M12 3l9 5-9 5-9-5 9-5z" />
          <path d="M3 12l9 5 9-5" />
        </svg>
      );

    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
};

export default function About() {
  return (
    <>
      {/* Shared Navbar */}
      <Navbar />

      {/* HERO (same visual language as ProductIntro) */}
      <section className="relative overflow-hidden py-12 md:py-16 bg-gradient-to-tr from-blue-600 to-sky-400 text-white">
        {/* Decorative blobs */}
        <svg
          className="pointer-events-none absolute -top-28 right-[-8%] w-[55vw] max-w-none opacity-60 mix-blend-overlay"
          viewBox="0 0 600 600"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="blobA" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#22D3EE" />
            </radialGradient>
          </defs>
          <path
            fill="url(#blobA)"
            d="M388,71.4c46.1,22.9,91.2,66.6,103.8,117c12.7,50.3-7,107.2-38.2,153.9c-31.1,46.6-73.7,83-121.1,96.9 c-47.4,13.8-99.6,5.2-141.8-20.3c-42.3-25.7-74.6-67.1-85-113.4c-10.3-46.4,1.2-97.6,28.3-139.2c27-41.6,68.6-73.6,114.9-89.6 C295.2,61,341.9,48.5,388,71.4z"
          />
        </svg>
        <svg
          className="pointer-events-none absolute bottom-[-20%] left-[-10%] w-[60vw] max-w-none opacity-50 mix-blend-overlay"
          viewBox="0 0 600 600"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="blobB" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#0EA5E9" />
            </radialGradient>
          </defs>
        </svg>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[360px] flex items-center justify-center text-center">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
                N&T Smart Canteen Management System
              </h1>
              <p className="text-base md:text-lg/relaxed mb-6 text-white/90">
                From costly hardware to a device-light, Face/RFID canteen
                platform—built for Hospital Catering, Industrial Catering, Campuses Catering, Corporate Catering.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  to="/product#features"
                  className="inline-flex items-center justify-center rounded-md bg-white text-blue-700 font-medium px-5 py-2.5 shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-white/40 transition-all"
                >
                  Explore Features
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-md border border-white/80 text-white font-medium px-5 py-2.5 hover:bg-white/10"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR STORY */}
      <section id="story" className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8 items-stretch">
            {/* Text card */}
            <div className="md:col-span-7 h-full">
              {/* Gradient border wrapper */}
              <div className="h-full rounded-2xl bg-gradient-to-r from-blue-500/20 via-emerald-500/20 to-blue-500/20 p-[1px] shadow-lg">
                <div className="h-full rounded-2xl bg-white p-6 md:p-8 flex flex-col">
                  <div className="mb-5">
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                      Our Story
                    </span>
                  </div>

                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-5">
                    Built for real canteen operations
                  </h2>

                  <div className="space-y-5 text-slate-700 text-lg md:text-xl leading-8">
                    <p>
                      We visited hospitals, colleges, corporate offices and
                      campuses to observe real canteen workflows.
                      Everywhere we saw the same issues: long queues, expensive
                      proprietary devices, slow upgrades, heavy maintenance and
                      scattered data that made audits hard.
                    </p>

                    <p>
                      We chose a different path — make meal capture{" "}
                      <strong>device-light</strong>: run it in a browser with
                      Face/ID and a secure cloud backend. We built privacy-first
                      face flows (no raw face storage), added RFID/ID card
                      fallback for offline safety, and designed multi-tenant
                      RBAC to run multiple canteens on one platform.
                    </p>

                    <p className="font-semibold text-slate-900">
                      <strong>
                        Our focus is simple: faster serving, cleaner audits, and
                        lower total cost.
                      </strong>
                    </p>
                  </div>

                  {/* Icon bullets */}
                  <div className="grid sm:grid-cols-2 gap-3 mt-6">
                    <div className="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-200 hover:shadow-md transition">
                      <div className="shrink-0 rounded-lg bg-blue-50 text-blue-600 p-2.5 group-hover:bg-blue-100">
                        <StoryIcon name="device" className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          Device-light Approach
                        </div>
                        <div className="text-sm text-slate-600">
                          Works on any browser—no costly terminals.
                        </div>
                      </div>
                    </div>

                    <div className="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-200 hover:shadow-md transition">
                      <div className="shrink-0 rounded-lg bg-emerald-50 text-emerald-600 p-2.5 group-hover:bg-emerald-100">
                        <StoryIcon name="shield" className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          Privacy-first Face Flow
                        </div>
                        <div className="text-sm text-slate-600">
                          Template matching only, no raw face storage.
                        </div>
                      </div>
                    </div>

                    <div className="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-sky-200 hover:shadow-md transition">
                      <div className="shrink-0 rounded-lg bg-sky-50 text-sky-600 p-2.5 group-hover:bg-sky-100">
                        <StoryIcon name="globe" className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          One Platform, Many Sites
                        </div>
                        <div className="text-sm text-slate-600">
                          Multi-tenant RBAC across locations.
                        </div>
                      </div>
                    </div>

                    <div className="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-indigo-200 hover:shadow-md transition">
                      <div className="shrink-0 rounded-lg bg-indigo-50 text-indigo-600 p-2.5 group-hover:bg-indigo-100">
                        <StoryIcon name="clock" className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          Operations, Not Devices
                        </div>
                        <div className="text-sm text-slate-600">
                          Dashboards, hourly reports & clean audits.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right image — equal height, fills container */}
            <div className="md:col-span-5 h-full">
              {/* Gradient border wrapper */}
              <div className="h-full rounded-2xl bg-gradient-to-b from-blue-500/20 to-emerald-500/20 p-[1px] shadow-lg">
                <div className="relative h-full rounded-2xl overflow-hidden bg-slate-50">
                  {/* Ensure both sides feel equal height */}
                  <div className="absolute inset-0">
                    <img
                      src="https://images.unsplash.com/photo-1681949103006-70066fb25dfe?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                      alt="Team collaborating on canteen operations and rollout"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  {/* Optional soft overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
                  {/* Spacer to create minimum height; matches text area nicely */}
                  <div className="invisible md:visible md:min-h-[560px]" />
                </div>
              </div>
              <p className="text-slate-500 text-sm mt-2">
                Cross-functional team working with canteen admins, managers and
                collectors to refine real-world workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VISION */}
 <section id="vision" className="py-12 md:py-16 relative">
  <div className="pointer-events-none absolute inset-0 overflow-x-hidden">
    <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
    <div className="absolute bottom-0 -left-10 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
  </div>

  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 p-[1px] shadow-lg">
            <div className="rounded-2xl bg-white p-6 md:p-10">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="max-w-3xl">
                  <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">
                    Our Vision
                  </h3>
                  <p className="text-slate-800 text-lg md:text-xl leading-8">
                    To democratize canteen technology—replace expensive hardware
                    with smart, secure software so every hospital, campus,
                    office and Industrial Canteen can serve faster, audit better and spend
                    less.
                  </p>
                </div>
                
                <div className="shrink-0 hidden md:block">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 p-[1px]">
                    <div className="h-full w-full rounded-2xl bg-white flex items-center justify-center text-blue-700">
                      <StoryIcon name="layers" className="h-7 w-7" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section id="team" className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              The team
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {TEAM.map((m, i) => (
              <div
                key={i}
                className="group relative flex flex-col items-center text-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm
                 hover:shadow-lg hover:border-blue-200 transition-all duration-200 hover:-translate-y-0.5"
              >

                <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-blue-600 to-emerald-500" />


                <div className="relative mt-2 mb-3">
                  <div
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 blur-[8px] opacity-40
                        group-hover:opacity-60 transition-opacity"
                  />
                  <img
                    src={m.photo}
                    alt={m.name}
                    className="relative h-20 w-20 md:h-24 md:w-24 rounded-full object-cover ring-2 ring-white shadow-md"
                    loading="lazy"
                    decoding="async"
                  />
                </div>


                <h3 className="text-base md:text-lg font-semibold text-slate-900">
                  {m.name}
                </h3>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-medium">
                    {m.role}
                  </span>
                </div>


                <div className="my-4 h-px w-16 bg-gradient-to-r from-blue-600 to-emerald-500 opacity-70" />


                <blockquote className="relative text-slate-700 italic leading-relaxed">
                  
                  <svg
                    className="absolute -top-2 -left-2 h-4 w-4 text-blue-300"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M7.2 11.2C6 11.2 5 10.2 5 9s1-2.2 2.2-2.2S9.4 7.8 9.4 9s-1 2.2-2.2 2.2zm0 1.6C9.5 12.8 11 11 11 9S9.5 5.2 7.2 5.2 3.4 7 3.4 9c0 2.1 1.6 3.8 3.8 3.8zM16.8 11.2C15.6 11.2 14.6 10.2 14.6 9s1-2.2 2.2-2.2S19 7.8 19 9s-1 2.2-2.2 2.2zm0 1.6c2.3 0 3.8-1.8 3.8-3.8S19.1 5.2 16.8 5.2 13 7 13 9c0 2.1 1.6 3.8 3.8 3.8z" />
                  </svg>
                  <span>{CONTRIBUTIONS[i]}</span>
                </blockquote>

                <div
                  className="pointer-events-none absolute -right-3 -bottom-3 h-12 w-12 rounded-full bg-blue-500/10 blur-xl opacity-0
                      group-hover:opacity-100 transition"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
