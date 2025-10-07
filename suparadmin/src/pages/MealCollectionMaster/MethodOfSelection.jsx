// MethodOfSelection.jsx
import React, { useEffect, useRef, useState } from "react";

/* --- helper: click-outside --- */
function useClickOutside(ref, onOutside) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside?.();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

/* --- helper: '2–3 words + …' --- */
const truncateWords = (str, maxWords = 3) => {
  if (!str) return "";
  const words = String(str).trim().split(/\s+/);
  return words.length <= maxWords
    ? String(str)
    : words.slice(0, maxWords).join(" ") + "…";
};

/* --- Custom MultiSelect that looks like your normal select --- */
function MultiPlaceSelect({
  options = [],                 // [{_id, name}]
  value = [],                   // array of ids
  onChange,                     // (ids[]) => void
  disabled = false,
  placeholder = "Select place(s)"
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  useClickOutside(rootRef, () => setOpen(false));

  const toggle = (id) => {
    if (disabled) return;
    const s = new Set(value.map(String));
    const k = String(id);
    s.has(k) ? s.delete(k) : s.add(k);
    onChange?.(Array.from(s));
  };

  const allSelectedLabels = options
    .filter(o => value.map(String).includes(String(o._id)))
    .map(o => truncateWords(o.name, 3));

  const displayText =
    allSelectedLabels.length > 0 ? allSelectedLabels.join(", ") : placeholder;

  const selectAll = () => onChange?.(options.map(o => String(o._id)));
  const clearAll = () => onChange?.([]);

  return (
    <div className="relative" ref={rootRef}>
      {/* Control (same look as your selects) */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={[
          "block w-full rounded-xl border bg-white px-3 py-2.5 pr-10 text-left text-gray-900 shadow-sm outline-none transition",
          "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500",
          disabled ? "border-gray-300 bg-gray-100 cursor-not-allowed" : "border-gray-300"
        ].join(" ")}
      >
        <span className={["block truncate", allSelectedLabels.length ? "text-gray-900" : "text-gray-400"].join(" ")}>
          {displayText}
        </span>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 text-sm">
            <div className="text-gray-600">Select Places</div>
            <div className="space-x-2">
              <button onClick={selectAll} className="text-indigo-600 hover:underline">All</button>
              <button onClick={clearAll} className="text-gray-500 hover:underline">Clear</button>
            </div>
          </div>
          <ul className="max-h-60 overflow-auto py-1">
            {options.map((o) => {
              const checked = value.map(String).includes(String(o._id));
              return (
                <li
                  key={o._id}
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center"
                  onClick={() => toggle(o._id)}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={checked}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="ml-2 text-gray-900">
                    {o.name}
                  </span>
                </li>
              );
            })}
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No places</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const MethodOfSelection = ({
  allCompany,
  handleCompany,
  handleLocation,
  // 👇 changed: we use 'onPlacesChange' + 'selectedPlaces'
  onPlacesChange,
  selectedCompany,
  selectedPlaces = [],
  selectedLocation,
  placeData,
  locationData,
  disableCompany = false,
  disablePlace = false,
  disableLocation = false,
  selectedCompanyLabel = "",
  selectedLocationLabel = "",
}) => {
  const hasSelectedCompany =
    !!selectedCompany && allCompany?.some(c => (c?._id || c?.id) === selectedCompany);
  const hasSelectedLocation =
    !!selectedLocation && locationData?.some(l => String(l?._id) === String(selectedLocation));

  return (
    <div className="rounded-2xl bg-white shadow-lg ring-1 ring-gray-200">
      <div className="border-b border-gray-100 px-6 py-5">
        <h1 className="text-lg font-semibold text-gray-900">Select Details</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose a <span className="font-medium">Company</span>,{" "}
          <span className="font-medium">Place</span>, and{" "}
          <span className="font-medium">Location</span>.
        </p>
      </div>

      <form className="p-6" action="#" method="GET">
        {/* same grid → all fields equal width/height */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Company (single select look) */}
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700">
              Company <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-2">
              <select
                id="company"
                name="company"
                value={selectedCompany}
                onChange={handleCompany}
                required
                disabled={disableCompany}
                className="block w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 pr-10 text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              >
                {!selectedCompany && <option value="">Company</option>}
                {selectedCompany && !hasSelectedCompany && selectedCompanyLabel && (
                  <option value={selectedCompany}>{selectedCompanyLabel}</option>
                )}
                {allCompany.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>

          {/* Place (MULTI) — same look/size as others */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Place <span className="text-red-500">*</span>
            </label>
            <div className="mt-2">
              <MultiPlaceSelect
                options={placeData}
                value={selectedPlaces}
                onChange={onPlacesChange}
                disabled={disablePlace}
                placeholder="Select place(s)"
              />
            </div>
          </div>

          {/* Location (single select look) */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-2">
              <select
                id="location"
                name="location"
                value={selectedLocation}
                onChange={handleLocation}
                required
                disabled={disableLocation}
                className="block w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 pr-10 text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              >
                {!selectedLocation && <option value="">Location</option>}
                {selectedLocation && !hasSelectedLocation && selectedLocationLabel && (
                  <option value={selectedLocation}>{selectedLocationLabel}</option>
                )}
                {locationData.map((e) => (
                  <option key={e._id} value={e._id}>{e.locationName}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MethodOfSelection;
