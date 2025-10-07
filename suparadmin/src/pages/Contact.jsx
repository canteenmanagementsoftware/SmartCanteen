import {React, useEffect} from "react";
import Navbar from "../components/Navbar";
import emailjs from "@emailjs/browser";
import { useNavigate } from "react-router-dom";

const ContactIcon = ({ name, className = "h-5 w-5" }) => {
  const props = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };
  switch (name) {
    case "phone":
      return (
        <svg {...props}>
          <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.9 19.9 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.15 9.81 19.9 19.9 0 0 1 .08 1.18 2 2 0 0 1 2.06 0h2a2 2 0 0 1 2 1.72c.12.86.34 1.7.66 2.5a2 2 0 0 1-.45 2.11L5.1 7.52a16 16 0 0 0 6.38 6.38l1.19-1.16a2 2 0 0 1 2.11-.45c.8.32 1.64.54 2.5.66A2 2 0 0 1 22 16.92Z" />
        </svg>
      );
    case "mail":
      return (
        <svg {...props}>
          <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="m22 6-10 7L2 6" />
        </svg>
      );
    case "mapPin":
      return (
        <svg {...props}>
          <path d="M12 22s8-4.5 8-12a8 8 0 1 0-16 0c0 7.5 8 12 8 12Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "clock":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...props}>
          <path d="M20 11.5A8.5 8.5 0 1 1 11.5 3 8.5 8.5 0 0 1 20 11.5Z" />
          <path d="m6 20 2.5-.7" />
          <path d="M8.5 11.5c1.5 3 4 4 6 4" />
          <path d="M13 13c.5-1 .5-1.5 0-2" />
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

// Tiny inline icon set (no external libs)
const Icon = ({ name, className = "h-5 w-5" }) => {
  const props = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };
  switch (name) {
    case "phone":
      return (
        <svg {...props}>
          <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.92 4.18 2 2 0 0 1 4.92 2h2a2 2 0 0 1 2 1.72c.09.66.24 1.3.45 1.92a2 2 0 0 1-.45 2.11l-1.2 1.2a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.11-.45c.62.21 1.26.36 1.92.45A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case "mail":
      return (
        <svg {...props}>
          <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
      );
    case "map":
      return (
        <svg {...props}>
          <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "send":
      return (
        <svg {...props}>
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      );
    case "user":
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "subject":
      return (
        <svg {...props}>
          <path d="M7 7h10M7 12h10M7 17h6" />
          <rect x="3" y="4" width="18" height="16" rx="2" />
        </svg>
      );
    case "message":
      return (
        <svg {...props}>
          <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
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

export default function Contact() {
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user location on mount
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        // Fill hidden inputs
        document.getElementById("user_country").value = data.country_name || "";
        document.getElementById("user_city").value = data.city || "";
      })
      .catch((err) => console.error("Location fetch failed:", err));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    try {
      await emailjs.sendForm(
        "service_75lv9bd", // ✅ Updated Service ID
        "template_5aqzwzr", // ✅ Updated Template ID
        form,
        { publicKey: "1jenyyqeQ5WTzQgP1" } // ✅ Updated Public Key
      );

      form.reset();
      navigate("/thank-you");
    } catch (err) {
      console.error(err);
      alert("Failed to send. Try again later.");
    }
  };

  return (
    <>
      {/* Shared Navbar */}
      <Navbar />

      {/* HERO (same visual language, new slogan) */}
      <section className="relative overflow-hidden py-12 md:py-16 bg-gradient-to-tr from-blue-600 to-sky-400 text-white">
        {/* Decorative blobs */}
        <svg
          className="pointer-events-none absolute -top-28 right-[-8%] w-[55vw] max-w-none opacity-60 mix-blend-overlay"
          viewBox="0 0 600 600"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="blobContactA" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#22D3EE" />
            </radialGradient>
          </defs>
          <path
            fill="url(#blobContactA)"
            d="M388,71.4c46.1,22.9,91.2,66.6,103.8,117c12.7,50.3-7,107.2-38.2,153.9c-31.1,46.6-73.7,83-121.1,96.9
               c-47.4,13.8-99.6,5.2-141.8-20.3c-42.3-25.7-74.6-67.1-85-113.4c-10.3-46.4,1.2-97.6,28.3-139.2c27-41.6,68.6-73.6,114.9-89.6
               C295.2,61,341.9,48.5,388,71.4z"
          />
        </svg>
        <svg
          className="pointer-events-none absolute bottom-[-20%] left-[-10%] w-[60vw] max-w-none opacity-50 mix-blend-overlay"
          viewBox="0 0 600 600"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="blobContactB" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#0EA5E9" />
            </radialGradient>
          </defs>
          <path
            fill="url(#blobContactB)"
            d="M425.9,98.5c40.9,26.5,73.7,66.7,83.2,108.7c9.5,42.2-3.5,86.1-28.8,125.2c-25.4,39.2-63,73.6-108.7,89.6
               c-45.8,16.1-100,13.9-142.1-8.2C187.3,392,158.2,350,149,305.2c-9.2-44.9,0.1-96.2,25.8-135.9c25.6-39.7,67.5-67.9,110.7-78.4
               C329.3,80.4,385,72,425.9,98.5z"
          />
        </svg>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[320px] flex items-center justify-center text-center">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
                Get in Touch
              </h1>
              <p className="text-base md:text-lg/relaxed mb-6 text-white/90">
                Questions, demos, partnerships—let’s build smarter canteens
                together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT CONTENT */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8 items-start">
            {/* LEFT: Contact Information — full height, bigger text, spaced items */}
            <div className="md:col-span-5 h-full ">
              <div className="h-full min-h-[600px] rounded-2xl bg-gradient-to-b from-blue-500/20 to-emerald-500/20 p-[1px] shadow-lg">
                <div className="h-full rounded-2xl bg-blue-100 p-6 md:p-8 flex flex-col">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
                    Contact Information
                  </h2>

                  <ul className="space-y-10 md:space-y-12 lg:space-y-16 flex-1">
                    {/* Phone */}
                    <li className="flex items-start gap-4">
                      <div className="shrink-0 rounded-xl bg-blue-50 text-blue-600 p-3">
                        <ContactIcon name="phone" className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg md:text-xl font-semibold text-slate-900">
                          Phone
                        </div>
                        <a
                          href="tel:+918487080659"
                          className="text-base md:text-lg text-slate-700 hover:text-blue-600"
                        >
                          +91 84870 80659
                        </a>
                      </div>
                    </li>

                    {/* Email */}
                    <li className="flex items-start gap-4">
                      <div className="shrink-0 rounded-xl bg-emerald-50 text-emerald-600 p-3">
                        <ContactIcon name="mail" className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg md:text-xl font-semibold text-slate-900">
                          Email
                        </div>
                        <a
                          href="mailto:sales@nntsoftware.com"
                          className="text-base md:text-lg text-slate-700 hover:text-blue-600"
                        >
                          sales@nntsoftware.com
                        </a>
                      </div>
                    </li>

                    {/* Address */}
                    <li className="flex items-start gap-4">
                      <div className="shrink-0 rounded-xl bg-sky-50 text-sky-600 p-3">
                        <ContactIcon name="mapPin" className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg md:text-xl font-semibold text-slate-900">
                          Address
                        </div>
                        <p className="text-base md:text-lg text-slate-700">
                          3rd Floor, Diamond Complex, SH 41, Industrial Area,
                          Chhapi, North Gujarat, India. 385210
                        </p>
                      </div>
                    </li>
                  </ul>

                  {/* optional bottom note — remove if not needed */}
                  <div className="mt-auto rounded-xl bg-slate-50 p-4 text-sm md:text-base text-slate-600">
                    Typically responds within{" "}
                    <span className="font-semibold text-slate-800">
                      1–2 business days
                    </span>
                    .
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Send Us a Message */}
            <div className="md:col-span-7">
              <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 p-[1px] shadow-lg">
                <div className="rounded-2xl bg-white p-6 md:p-8">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-4">
                    Send Us a Message
                  </h2>
                  <p className="text-slate-600 mb-6">
                    Tell us a bit about your canteen and what you’re looking
                    for. We’ll get back with next steps.
                  </p>

                  <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
                    {/* Name */}
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1">
                        Name
                      </span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Icon name="user" />
                        </span>
                        <input
                          type="text"
                          name="user_name"
                          required
                          placeholder="Your name"
                          className="w-full rounded-lg border border-slate-200 px-10 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </label>

                    {/* Phone Number */}
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1">
                        Mobile Number
                      </span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Icon name="phone" />
                        </span>
                        <input
                          type="tel"
                          name="user_phone"
                          required
                          placeholder="+91 98765 43210"
                          pattern="[0-9+\s()-]{7,15}"
                          className="w-full rounded-lg border border-slate-200 px-10 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </label>

                    {/* Email */}
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1">
                        Email
                      </span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Icon name="mail" />
                        </span>
                        <input
                          type="email"
                          name="user_email"
                          required
                          placeholder="you@company.com"
                          className="w-full rounded-lg border border-slate-200 px-10 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </label>

                    {/* Subject */}
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1">
                        Subject
                      </span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Icon name="subject" />
                        </span>
                        <input
                          type="text"
                          name="subject"
                          placeholder="Demo request, pricing, integration…"
                          className="w-full rounded-lg border border-slate-200 px-10 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </label>

                    {/* Message */}
                    <label className="block">
                      <span className="block text-sm font-medium text-slate-700 mb-1">
                        Your Message
                      </span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-3 text-slate-400">
                          <Icon name="message" />
                        </span>
                        <textarea
                          name="message"
                          rows={5}
                          required
                          placeholder="Share your requirements or questions…"
                          className="w-full rounded-lg border border-slate-200 px-10 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </label>

                    <input
                      type="hidden"
                      name="user_country"
                      id="user_country"
                    />
                    <input type="hidden" name="user_city" id="user_city" />

                    {/* Submit */}
                    <button
                      type="submit"
                      className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400/70 active:scale-[0.98] transition-all"
                    >
                      <Icon name="send" className="h-5 w-5" />
                      Send Message
                    </button>
                  </form>
                </div>
              </div>

              {/* Optional: quick mail link */}
              <div className="mt-4 text-sm text-slate-600">
                Prefer email? Write to{" "}
                <a
                  href="mailto:sales@nntsoftware.com"
                  className="text-blue-600 hover:underline"
                >
                  sales@nntsoftware.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
