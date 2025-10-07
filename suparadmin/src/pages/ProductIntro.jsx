import React from "react";
import { Link } from "react-router-dom";
import Login from "../components/auth/Login"; // only if you embed login later
import logoPng from "../assets/Smart Canteen Management.png"; // adjust path if needed
import Navbar from "../components/Navbar";
import mainimg1 from "../assets/productimg/mainimg1.png";
import mainimg2 from "../assets/productimg/mainimg2.jpg";
import mainimg3 from "../assets/productimg/mainimg3.png";
import mainimg4 from "../assets/productimg/mainimg4.png";

const useCaseImages = [mainimg2, mainimg1, mainimg4, mainimg3];

// Mini collage used inside cards (right side)
const MiniCollage = () => (
  <div className="relative w-full h-full min-h-[180px] md:min-h-[220px] lg:min-h-[260px]">
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
      <img
        src={mainimg1}
        alt=""
        className="w-full h-full object-cover rounded-lg"
      />
      <img
        src={mainimg2}
        alt=""
        className="w-full h-full object-cover rounded-lg"
      />
      <img
        src={mainimg3}
        alt=""
        className="w-full h-full object-cover rounded-lg"
      />
      <img
        src={mainimg4}
        alt=""
        className="w-full h-full object-cover rounded-lg"
      />
    </div>
    {/* subtle overlay so photos don’t overpower content if card is tall */}
    <div className="absolute inset-0 bg-black/10 rounded-lg" />
  </div>
);

// ---------- Tiny inline icon set (no external libs) ----------
const Icon = ({ name, className = "h-5 w-5" }) => {
  const props = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };
  switch (name) {
    case "camera":
      return (
        <svg {...props}>
          <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
    case "rfid":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case "devices":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="12" height="10" rx="2" />
          <path d="M9 17v2h9a1 1 0 0 0 1-1v-3" />
          <rect x="15" y="7" width="6" height="6" rx="1" />
        </svg>
      );
    case "user":
      return (
        <svg {...props}>
          <path d="M16 19a4 4 0 0 0-8 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      );
    case "map":
      return (
        <svg {...props}>
          <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3V3" />
          <path d="M15 6v15" />
        </svg>
      );
    case "clock":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" />
        </svg>
      );
    case "rupee":
      return (
        <svg {...props}>
          <path d="M7 5h10M7 9h10M7 5c6 0 6 8 0 8l10 6" />
        </svg>
      );
    case "reports":
      return (
        <svg {...props}>
          <path d="M4 19V5h6v14zM14 19V9h6v10z" />
        </svg>
      );
    case "layers":
      return (
        <svg {...props}>
          <path d="M12 3l9 5-9 5-9-5 9-5z" />
          <path d="M3 12l9 5 9-5" />
        </svg>
      );
    case "utensils":
      return (
        <svg {...props}>
          <path d="M6 3v7a2 2 0 0 0 2 2v7M10 3v7a2 2 0 0 1-2 2M18 3v6M18 9c-2 0-2 2-2 4v6" />
        </svg>
      );
    case "calendarClock":
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M12 14v3l2 1" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...props}>
          <path d="M6 2l1 1 1-1 1 1 1-1 1 1 1-1v20l-1-1-1 1-1-1-1 1-1-1-1 1z" />
          <path d="M8 7h6M8 11h6M8 15h4" />
        </svg>
      );
    case "chart":
      return (
        <svg {...props}>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 17V9M12 17V7M16 17v-5" />
        </svg>
      );
    case "card":
      return (
        <svg {...props}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "boxes":
      return (
        <svg {...props}>
          <path d="M7 7h10v10H7z" />
          <path d="M7 7l-4 2v6l4 2M17 7l4 2v6l-4 2" />
        </svg>
      );
    case "cart":
      return (
        <svg {...props}>
          <path d="M6 6h15l-1.5 8H7z" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
        </svg>
      );
    case "fileChart":
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case "users":
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        </svg>
      );
    case "globe":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M2.5 12h19M12 2.5v19M7 12a11 11 0 0 0 10 0M7 12a11 11 0 0 1 10 0" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3l7 4v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7z" />
        </svg>
      );
    // Use-case icons:
    case "hospital":
      return (
        <svg {...props}>
          <path d="M3 21V7l9-4 9 4v14H3z" />
          <path d="M12 9v6M9 12h6" />
        </svg>
      );
    case "office":
      return (
        <svg {...props}>
          <path d="M4 22V4h8v18M12 10h8v12H4" />
          <path d="M8 8h2M8 12h2M8 16h2M16 14h2M16 18h2" />
        </svg>
      );
    case "campus":
      return (
        <svg {...props}>
          <path d="M3 10l9-5 9 5-9 5-9-5z" />
          <path d="M6 12v6l6 3 6-3v-6" />
        </svg>
      );
    case "factory":
      return (
        <svg {...props}>
          <path d="M3 21V9l6 4V9l6 4V9l6 4v8H3z" />
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

// ---------- Data ----------
const features = [
  {
    title: "Device-less Smart Meal Collection",
    desc: "Face recognition ya card number se meal collection—dedicated hardware ki zarurat nahi.",
    icon: "camera",
  },
  {
    title: "RFID Card Integration",
    desc: "Contactless cards se fast & accurate meal capture.",
    icon: "rfid",
  },
  {
    title: "Compatible on Any Device",
    desc: "Mobile, tablet, desktop—browser based access.",
    icon: "devices",
  },
  {
    title: "User-wise Login",
    desc: "Super Admin, Admin, Manager, Meal Collector ke liye role-based secure access.",
    icon: "user",
  },
  {
    title: "Multi Place & Location Access",
    desc: "Multiple canteens/branches ko ek hi platform se manage karein.",
    icon: "map",
  },
  {
    title: "Hourly Reports",
    desc: "Hour-wise meal utilization & footfall insights.",
    icon: "clock",
  },
  {
    title: "Fees Control",
    desc: "Rates, discounts, entitlements & dues par granular control.",
    icon: "rupee",
  },
  {
    title: "Multiple Reports",
    desc: "Utilization, exceptions, daily/weekly/monthly summaries & more.",
    icon: "reports",
  },
  {
    title: "Centralized User & Menu Management",
    desc: "Users, menus, rates & timings ka centralized configuration.",
    icon: "layers",
  },
  {
    title: "Food Tracking (Patented Devices—No Extra Charge)",
    desc: "Free-of-charge patented tracking devices ke saath detailed meal trails.",
    icon: "utensils",
  },
  {
    title: "Time-wise Meal Records",
    desc: "Specific time windows par meal distribution tracking for better planning.",
    icon: "calendarClock",
  },
  {
    title: "Fees Collection Tracking",
    desc: "Payments & outstanding dues ka clear ledger.",
    icon: "receipt",
  },
  {
    title: "Analytical Dashboard",
    desc: "Usage, sales & performance trends par visual insights.",
    icon: "chart",
  },
  {
    title: "Payment Gateway Integration",
    desc: "UPI, cards, net banking, wallets—smooth digital payments.",
    icon: "card",
  },
  {
    title: "Supply & Inventory Tracking",
    desc: "Raw material flows, wastage & stock levels par nazar.",
    icon: "boxes",
  },
  {
    title: "Expense & Purchasing Control",
    desc: "POs, vendor bills & cost control workflows.",
    icon: "cart",
  },
  {
    title: "Custom Reports & Analytics",
    desc: "Apne templates ke hisaab se exportable insights.",
    icon: "fileChart",
  },
  {
    title: "Staff Scheduling & Attendance",
    desc: "Shifts & attendance mapping with operational roles.",
    icon: "users",
  },
  {
    title: "Multi-location Management",
    desc: "Har location ka alag-alag dashboard + consolidated view.",
    icon: "globe",
  },
  {
    title: "Advanced Data Security",
    desc: "JWT, refresh tokens, audit logs & role permissions.",
    icon: "shield",
  },
];

const useCases = [
  {
    title: "Institute Canteen",
    icon: "campus",
    points: [
      "RFID/Face meal capture",
      "Hotel/college Canteen Seamless canteen management /Meal collection system",
      "Self pos System For Smart Canteen management System in every institutes",
    ],
  },
  {
    title: "Hospitals & Healthcare Canteen",
    icon: "hospital",
    points: [
      "Smart canteen management System for Hospital Canteen System",
      "Smart meal collection for Patient ,doctor,nurse and visitor",
      "Self pos for Hospital Cafeteria",
    ],
  },
  {
    title: "Corporate Offices Canteen",
    icon: "office",
    points: [
      "Smart Canteen Management System for Office staff meal collection",
    ],
  },
  {
    title: "Industrial Canteen",
    icon: "factory", // 'hostel' undefined tha
    points: [
      "Industrial Canteen management software",
      "Smart canteen management system for industrial canteen",
      "For staff ,vendor ,visitor collection of smart canteen System",
      "Smart analysis Report",
    ],
  },
];

// ---------- Section header ----------
const SectionHeader = ({ id, title, subtitle }) => (
  <div id={id} className="py-6">
    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
    {subtitle && <p className="text-slate-600 mt-1">{subtitle}</p>}
  </div>
);

export default function ProductIntro() {
  const meta = {
    title:
      "Best Canteen Management Software—RFID, Face ID & Reports | N&T Software",
    description:
      "Smart canteen/cafeteria software with Face/RFID meal collection, fees & billing, inventory, POS, payment gateways and real-time dashboards for hospitals, colleges, corporates & factories.",
  };

  // ✅ SEO: most-searched mixed keywords (global + India) — keep unique per page
  const keywords = [
    "canteen management software",
    "cafeteria management software",
    "canteen management system",
    "RFID canteen software",
    "face recognition canteen system",
    "hospital canteen software",
    "college canteen software",
    "corporate cafeteria software",
    "manufacturing plant canteen software",
    "hostel mess management software",
    "canteen billing POS",
    "meal tracking software",
    "canteen inventory management",
    "meal subsidy management",
    "multi location canteen",
    "canteen reports and analytics",
    "payment gateway canteen",
    "cloud canteen software",
  ].join(", ");

  return (
    <>
      {/* React 19 metadata */}
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="keywords" content={keywords} />
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Smart Canteen Management",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            publisher: { "@type": "Organization", name: "N&T Software" },
            description: meta.description,
          }),
        }}
      />

      <div id="top" />

      {/* NAV */}
      <Navbar />
      {/* HERO with blobs */}
      <section className="relative overflow-hidden py-12 md:py-16">
        {/* Background collage */}
        <div aria-hidden className="absolute inset-0">
          <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-2">
            <img
              src={mainimg1}
              alt=""
              className="w-full h-full object-cover select-none pointer-events-none"
            />
            <img
              src={mainimg2}
              alt=""
              className="w-full h-full object-cover select-none pointer-events-none"
            />
            <img
              src={mainimg3}
              alt=""
              className="w-full h-full object-cover select-none pointer-events-none"
            />
            <img
              src={mainimg4}
              alt=""
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          </div>
          {/* Transparent overlay to improve text contrast */}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[380px] flex items-center justify-center text-center">
            <div className="max-w-3xl text-white">
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
                Welcome to Your Smart Canteen Management System
              </h1>
              <p className="text-base md:text-lg/relaxed mb-6 text-white/90">
                Smart Meals. Clean Audits. Happier Queues.
              </p>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-md bg-white text-blue-700 font-medium px-5 py-2.5 shadow hover:shadow-md
                     focus-visible:ring-2 focus-visible:ring-white/40 transition-all"
              >
                Explore Features
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-10 text-[15px] md:text-base">
        {" "}
        {/* ↑ base size bump for this section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
          <SectionHeader id="features" title="Features" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md
                     hover:border-blue-200 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-xl bg-blue-50 text-blue-600 p-3 group-hover:bg-blue-100">
                    <Icon name={f.icon} className="h-6 w-6" />{" "}
                    {/* was h-5 w-5 */}
                  </div>
                  <div>
                    <h5 className="text-lg md:text-xl font-semibold mb-1">
                      {f.title}
                    </h5>{" "}
                    {/* was text-base */}
                    <p className="text-slate-700 leading-relaxed">
                      {f.desc}
                    </p>{" "}
                    {/* removed text-sm (inherits bigger base) */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            id="usecases"
            title="Industry Use Cases"
            subtitle="Different industries, tailored workflows"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {useCases.map((u, idx) => {
              const imgSrc = useCaseImages[idx % useCaseImages.length];
              return (
                <div
                  key={idx}
                  className="h-full min-h-[260px] md:min-h-[280px] rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden"
                >
                  {/* Inside each card: left = details, right = image */}
                  <div className="grid grid-cols-1 md:grid-cols-[1.8fr_1fr] xl:grid-cols-[1.5fr_1fr] items-stretch h-full">
                    {/* LEFT: text */}
                    <div className="p-5 md:p-6 h-full md:min-h-[220px] lg:min-h-[260px]">
                      <div className="flex items-start gap-3 h-full">
                        <div className="shrink-0 rounded-xl bg-emerald-50 text-emerald-600 p-2.5">
                          <Icon name={u.icon} className="h-6 w-6" />
                        </div>
                        <div className="flex-1 flex flex-col gap-3">
                          <h5 className="text-lg md:text-xl font-semibold mb-2">
                            {u.title}
                          </h5>

                          {/* Mobile par normal spacing; md+ par 3 points ko equal distribute */}
                          <ul className=" list-disc pl-5 text-slate-700 text-[15px] md:text-base space-y-1.5 md:space-y-0 md:flex md:flex-1 md:flex-col md:justify-between gap-8">
                            {u.points.map((p, j) => (
                              <li key={j}>{p}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: single image */}
                    <div className="relative flex md:h-full min-h-[220px] lg:min-h-[260px]">
                      <img
                        src={imgSrc}
                        alt={`${u.title} illustration`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
