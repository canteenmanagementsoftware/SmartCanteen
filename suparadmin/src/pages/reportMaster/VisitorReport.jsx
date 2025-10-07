import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import axios from "../../utils/axiosConfig";
import { AuthContext } from "../../context/auth-context";
import { DateRangePicker } from "rsuite";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import Select, { components as RSComponents } from "react-select";

const RSUITE_CSS_URL = "https://unpkg.com/rsuite/dist/rsuite-no-reset.min.css";

// ---------- Helpers ----------
const COLS = 7;
const fmtIST = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  }).format(d);
};
const ymd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toStrId = (x) =>
  x && typeof x === "object" ? String(x._id || x.id || "") : String(x || "");

// truncate helper (3–4 letters then “…”)
const t4 = (s = "", n = 4) => (s.length > n ? `${s.slice(0, n)}…` : s);

// react-select compact styles (no wrap + ellipsis)
const placeSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 42,
    borderColor: "#d1d5db", // gray-300
    boxShadow: "none",
    ":hover": { borderColor: "#9ca3af" }, // gray-400
  }),
  valueContainer: (base) => ({
    ...base,
    display: "flex",
    flexWrap: "nowrap",
    overflow: "hidden",
    paddingTop: 2,
    paddingBottom: 2,
  }),
  multiValue: (base) => ({
    ...base,
    maxWidth: 90, // each chip max ~90px
    overflow: "hidden",
  }),
  multiValueLabel: (base) => ({
    ...base,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    paddingRight: 4,
  }),
  menu: (base) => ({ ...base, zIndex: 40 }),
  placeholder: (base) => ({ ...base, color: "#6b7280" }), // gray-500
};

// only chip label truncated; menu shows full label
const MultiValueLabel = (props) => (
  <RSComponents.MultiValueLabel {...props}>
    {t4(props.data.label, 4)}
  </RSComponents.MultiValueLabel>
);

const VisitorReport = () => {
  const { user: currentUser } = useContext(AuthContext);

  // Load RSuite CSS once
  useEffect(() => {
    let link = document.querySelector("link[data-rsuite]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = RSUITE_CSS_URL;
      link.setAttribute("data-rsuite", "true");
      document.head.appendChild(link);
    }
    return () => {
      if (link && link.parentNode) link.parentNode.removeChild(link);
    };
  }, []);

  // ------- filters / selections -------
  const [company, setCompany] = useState("");
  const [placesSelected, setPlacesSelected] = useState([]); // array<string> place IDs
  const [location, setLocation] = useState(""); // single location id
  const [searchText, setSearchText] = useState("");
  const [range, setRange] = useState(null);

  // ------- data -------
  const [meals, setMeals] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);         // [{_id,name}]
  const [locations, setLocations] = useState([]);   // merged from selected places
  const [loading, setLoading] = useState(false);

  // init gating
  const [mealsLoaded, setMealsLoaded] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const didInitRef = useRef(false);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  // ---------- Roles & assignments ----------
  const roleStr = useMemo(
    () =>
      String(
        currentUser?.userType || currentUser?.type || currentUser?.role || ""
      ).toLowerCase(),
    [currentUser]
  );
  const isSuperadmin = roleStr === "superadmin";
  const isManager = roleStr === "manager";
  const isAdmin = roleStr === "admin";
  const isCollector = roleStr === "meal_collector";

  const allowedCompanyId = toStrId(currentUser?.companyId || currentUser?.company);
  const allowedCompanyName = currentUser?.companyName || "My Company";

  // place assignments: supports array or object
  const rawPlaces = currentUser?.placeId ?? currentUser?.placeIds ?? [];
  // const assignedPlaceIds = Array.isArray(rawPlaces)
  //   ? rawPlaces.map(toStrId)
  //   : rawPlaces
  //   ? [toStrId(rawPlaces)]
  //   : [];

  const assignedPlaceIds = useMemo(() => {
  const raw = currentUser?.placeId ?? currentUser?.placeIds ?? [];
  if (Array.isArray(raw)) return raw.map(toStrId);
  const one = raw ? toStrId(raw) : "";
  return one ? [one] : [];
}, [currentUser]);

  // location assignments (optional)
  const assignedLocationIds = useMemo(
    () =>
      Array.isArray(currentUser?.locationId)
        ? currentUser.locationId.map(toStrId)
        : [],
    [currentUser]
  );

  // ---------- dropdown disable rules ----------
  const companyDisabled = !isSuperadmin;                   // locked for manager/admin/collector
  const placesDisabled = isAdmin || isCollector;           // admin/collector preselected & locked
  const locationDisabled = isCollector;                    // collector preselected & locked

  // ---------- Fetch Companies ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get("/company");
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setCompanies(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setCompanies([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- Fetch Meals ----------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await axios.get("/meal/history");
        if (cancelled) return;
        const list = res?.data?.data ?? [];
        setMeals(Array.isArray(list) ? list : []);
        setReportData([]);
      } catch {
        if (!cancelled) {
          setMeals([]);
          setReportData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setMealsLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- Role-based preselects ----------
  // Manager: preselect company only
  useEffect(() => {
    if (!isManager) return;
    if (allowedCompanyId && company !== allowedCompanyId) {
      setCompany(allowedCompanyId);
      setPlacesSelected([]);
      setLocation("");
    }
  }, [isManager, allowedCompanyId, company]);

  // Admin: preselect company + ALL assigned places
  useEffect(() => {
    if (!isAdmin) return;
    let changed = false;
    if (allowedCompanyId && company !== allowedCompanyId) {
      setCompany(allowedCompanyId);
      changed = true;
    }
    if (assignedPlaceIds.length && placesSelected.length === 0) {
      setPlacesSelected(assignedPlaceIds);
      changed = true;
    }
    if (changed) setLocation("");
  }, [isAdmin, allowedCompanyId, assignedPlaceIds, company, placesSelected]);

  // Collector: preselect company + ALL assigned places + a location
  useEffect(() => {
    if (!isCollector) return;
    let changed = false;
    if (allowedCompanyId && company !== allowedCompanyId) {
      setCompany(allowedCompanyId);
      changed = true;
    }
    if (assignedPlaceIds.length && placesSelected.length === 0) {
      setPlacesSelected(assignedPlaceIds);
      changed = true;
    }
    // location will be finalized after locations are loaded (see below)
    if (changed) { /* noop */ }
  }, [isCollector, allowedCompanyId, assignedPlaceIds, company, placesSelected]);

  // ---------- Fetch Places when Company changes ----------
useEffect(() => {
  if (!company) { setPlaces([]); return; }
  let cancelled = false;
  (async () => {
    try {
      const res = await axios.get(`/places/company/${company}`);
      let list = res?.data?.data || res?.data || [];
      list = Array.isArray(list) ? list : [];

      if ((isAdmin || isCollector) && assignedPlaceIds.length) {
        const allow = new Set(assignedPlaceIds);
        list = list.filter((p) => allow.has(toStrId(p._id)));
      }
      setPlaces(list);

      // normalize selection to available only when list changes
      const available = new Set(list.map((p) => toStrId(p._id)));
      const keep = placesSelected.filter((id) => available.has(id));
      if (keep.length !== placesSelected.length) {
        setPlacesSelected(keep);
        setLocation("");
      }
    } catch {
      if (!cancelled) setPlaces([]);
    }
  })();
  return () => { cancelled = true; };
}, [company, isAdmin, isCollector, assignedPlaceIds]);
  // ---------- Fetch & merge Locations when placesSelected changes ----------
useEffect(() => {
  let cancelled = false;
  if (!placesSelected.length) { setLocations([]); return; }
  (async () => {
    try {
      const results = await Promise.all(
        placesSelected.map((pid) =>
          axios.get(`/locations/places/${pid}`).catch(() => ({ data: [] }))
        )
      );
      let merged = [];
      for (const res of results) {
        const raw = res?.data?.data || res?.data || [];
        if (Array.isArray(raw)) merged = merged.concat(raw);
      }
      if ((isAdmin || isCollector) && assignedLocationIds.length) {
        const allow = new Set(assignedLocationIds.map(String));
        merged = merged.filter((l) => allow.has(toStrId(l._id)));
      }
      // de-dupe
      const map = new Map();
      merged.forEach((l) => map.set(toStrId(l._id), l));
      const unique = Array.from(map.values());
      if (cancelled) return;
      setLocations(unique);

      // collector ke liye safe preselect/repair
      if (isCollector) {
        const has = (id) => unique.some((l) => toStrId(l._id) === String(id));
        if (!location || !has(location)) {
          const preferred = unique.find((l) =>
            assignedLocationIds.includes(toStrId(l._id))
          );
          const pick = preferred || unique[0];
          if (pick) setLocation(toStrId(pick._id));
        }
      }
    } catch {
      if (!cancelled) setLocations([]);
    }
  })();
  return () => { cancelled = true; };
}, [placesSelected, isAdmin, isCollector, assignedLocationIds]);
  // ---------- preselect readiness ----------
  const preselectReady = useMemo(() => {
    if (isSuperadmin) return true; // manual
    if (isManager) {
      return !!company && company === allowedCompanyId;
    }
    if (isAdmin) {
      const companyReady = !!company && company === allowedCompanyId;
      const placesReady = assignedPlaceIds.length ? placesSelected.length > 0 : true;
      return companyReady && placesReady;
    }
    if (isCollector) {
      const companyReady = !!company && company === allowedCompanyId;
      const placesReady = placesSelected.length > 0;
      const locReady = locations.length ? !!location : true;
      return companyReady && placesReady && locReady;
    }
    return true;
  }, [
    isSuperadmin, isManager, isAdmin, isCollector,
    company, placesSelected, location, locations.length,
    allowedCompanyId, assignedPlaceIds
  ]);

  // ---------- initial table fill ----------
  useEffect(() => {
    if (didInitRef.current) return;
    if (!mealsLoaded) return;
    if (!preselectReady) return;

    let filtered = meals;
    if (!isSuperadmin && company) {
      filtered = filtered.filter((m) => String(m.companyId) === String(company));
    }
    if (placesSelected.length) {
      const allow = new Set(placesSelected.map(String));
      filtered = filtered.filter((m) => allow.has(toStrId(m.placeId)));
    }
    if (isCollector && location) {
      filtered = filtered.filter((m) => String(m.locationId) === String(location));
    }

    setReportData(filtered);
    setPage(1);
    didInitRef.current = true;
    setInitialized(true);
  }, [mealsLoaded, preselectReady, meals, company, placesSelected, location, isSuperadmin, isCollector]);

  // ---------- react-select data (Place) ----------
  const placeOptions = useMemo(
    () =>
      places.map((p) => ({
        value: toStrId(p._id),
        label: p.name || "Unnamed",
      })),
    [places]
  );

  const selectedPlaceOptions = useMemo(() => {
    const set = new Set(placesSelected);
    return placeOptions.filter((o) => set.has(o.value));
  }, [placeOptions, placesSelected]);

  const handlePlacesChangeRS = (vals) => {
    if (placesDisabled) return; // respect lock
    const ids = (vals || []).map((v) => v.value);
    setPlacesSelected(ids);
    setLocation("");
  };

  // ---------- Handlers ----------
  const handleCompanyChange = (e) => {
    if (companyDisabled) return;
    const v = String(e.target.value || "");
    setCompany(v);
    setPlacesSelected([]);
    setLocation("");
  };

  const handleRangeChange = (val) => {
    if (!val) {
      setRange(null);
      return;
    }
    const [start, end] = val;
    if (start && !end) setRange([start, start]);
    else setRange(val);
  };

  const handleSearch = () => {
    if (!range && !company && !placesSelected.length && !location && !searchText.trim()) {
      setReportData(meals);
      setPage(1);
      if (!initialized) setInitialized(true);
      return;
    }

    const text = searchText.trim().toLowerCase();
    const start = range ? new Date(ymd(range[0]) + "T00:00:00") : null;
    const end = range ? new Date(ymd(range[1]) + "T23:59:59.999") : null;
    const allowPlaces = new Set(placesSelected.map(String));

    const filtered = meals.filter((m) => {
      if (company && String(m.companyId) !== String(company)) return false;
      if (placesSelected.length && !allowPlaces.has(toStrId(m.placeId))) return false;
      if (location && String(m.locationId) !== String(location)) return false;

      if (start || end) {
        const t = m.timestamp ? new Date(m.timestamp) : null;
        if (t) {
          if (start && t < start) return false;
          if (end && t > end) return false;
        }
      }

      if (text) {
        const fullName = `${m.userFirstName || ""} ${m.userLastName || ""}`
          .trim()
          .toLowerCase();
        const uid = (m.userUniqueId || "").toLowerCase();
        const pkg = (m.packageName || "").toLowerCase();
        if (![fullName, uid, pkg].some((s) => s.includes(text))) return false;
      }

      return true;
    });

    setReportData(filtered);
    setPage(1);
    if (!initialized) setInitialized(true);
  };

  const exportCSV = () => {
    if (!reportData.length) {
      alert("No rows to export");
      return;
    }
    const header = [
      "Unique Id",
      "User",
      "User Type",
      "Package",
      "Meal Type",
      "Location",
      "Log Time (IST)",
    ];
    const rows = reportData.map((m) => [
      m.userUniqueId || "-",
      `${m.userFirstName || ""} ${m.userLastName || ""}`.trim() || "-",
      m.userRole || "-",
      m.packageName || "-",
      m.mealType || "-",
      m.locationName || "-",
      fmtIST(m.timestamp),
    ]);

    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `meal_report_${new Date().toISOString().slice(0, 10)}.csv`;
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, fileName);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ---------- UI flags ----------
  const showNoData = initialized && !loading && reportData.length === 0;

  // ---------- pagination ----------
  useEffect(() => { setPage(1); }, [pageSize]);
  const isAll = pageSize === "ALL";
  const pageSizeNum = isAll ? (reportData.length || 1) : Number(pageSize);
  const totalPages = useMemo(
    () => Math.max(1, isAll ? 1 : Math.ceil(reportData.length / pageSizeNum)),
    [reportData.length, isAll, pageSizeNum]
  );
  const currentPage = Math.min(page, totalPages);
  const startIdx = isAll ? 0 : (currentPage - 1) * pageSizeNum;
  const endIdx = isAll ? reportData.length : Math.min(startIdx + pageSizeNum, reportData.length);
  const pagedRows = reportData.slice(startIdx, endIdx);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Meal Collection Report</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
        {/* Date range */}
        <div className="md:col-span-2">
          <DateRangePicker
            className="w-full"
            value={range}
            onChange={handleRangeChange}
            placeholder="Select date range (optional)"
            format="yyyy-MM-dd"
            showHeader
            oneTap={false}
            editable={false}
            cleanable
            ranges={[
              { label: "Today", value: [new Date(), new Date()] },
              {
                label: "Yesterday",
                value: [
                  new Date(new Date().setDate(new Date().getDate() - 1)),
                  new Date(new Date().setDate(new Date().getDate() - 1)),
                ],
              },
              {
                label: "This Month",
                value: [startOfMonth(new Date()), endOfMonth(new Date())],
              },
              {
                label: "Last Month",
                value: [
                  startOfMonth(subMonths(new Date(), 1)),
                  endOfMonth(subMonths(new Date(), 1)),
                ],
              },
            ]}
          />
        </div>

        {/* Company */}
        <select
          value={String(company)}
          onChange={handleCompanyChange}
          disabled={companyDisabled}
          className={`border p-2 rounded ${companyDisabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
        >
          <option value="">All Companies</option>
          {companyDisabled && company && !companies.some((c) => String(c._id) === String(company)) && (
            <option value={company}>{allowedCompanyName}</option>
          )}
          {companies.map((c) => (
            <option key={String(c._id)} value={String(c._id)}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Place (react-select multi, compact, role-locked if needed) */}
        <Select
          instanceId="place-multi"
          isMulti
          closeMenuOnSelect={false}
          options={placeOptions}
          value={selectedPlaceOptions}
          onChange={handlePlacesChangeRS}
          placeholder="Select place(s)"
          styles={placeSelectStyles}
          components={{ MultiValueLabel }}
          isDisabled={placesDisabled}
          menuPortalTarget={typeof document !== "undefined" ? document.body : null}
          menuPosition="fixed"
          className="z-30"
        />

        {/* Location (merged from selected places) */}
        <select
          key={`location-${placesSelected.join(",")}-${locations.length}`}
          value={location || ""}
          onChange={(e) => {
            if (locationDisabled) return;
            setLocation(String(e.target.value || ""));
          }}
          disabled={locationDisabled}
          autoComplete="off"
          className={`border p-2 rounded ${locationDisabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={String(l._id)} value={String(l._id)}>
              {l.locationName}
            </option>
          ))}
        </select>

        {/* Search Text */}
        <input
          type="text"
          placeholder="Search by Name, ID, Package"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={handleSearch}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Search
        </button>

        <button
          onClick={exportCSV}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Export CSV
        </button>
      </div>

      {/* Rows per page */}
      <div className="mb-2 flex justify-end items-center gap-2">
        <label htmlFor="rowsPerPage" className="text-xs text-gray-600">
          Rows per page:
        </label>
        <select
          id="rowsPerPage"
          aria-label="Rows per page"
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value)}
          className="border p-2 rounded h-9"
        >
          <option value="ALL">All</option>
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Unique Id</th>
              <th className="border p-2">User</th>
              <th className="border p-2">User Type</th>
              <th className="border p-2">Package</th>
              <th className="border p-2">Meal Type</th>
              <th className="border p-2">Location</th>
              <th className="border p-2">Log Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLS} className="p-4 text-center">Loading...</td>
              </tr>
            ) : !initialized ? (
              <tr>
                <td colSpan={COLS} className="p-4 text-center">Preparing data…</td>
              </tr>
            ) : showNoData ? (
              <tr>
                <td colSpan={COLS} className="p-4 text-center">No data found</td>
              </tr>
            ) : (
              pagedRows.map((m) => (
                <tr key={m.id || `${m.userUniqueId}-${m.timestamp}`}>
                  <td className="border p-2">{m.userUniqueId || "-"}</td>
                  <td className="border p-2">{`${m.userFirstName || ""} ${m.userLastName || ""}`.trim() || "-"}</td>
                  <td className="border p-2">{m.userRole || "-"}</td>
                  <td className="border p-2">{m.packageName || "-"}</td>
                  <td className="border p-2">{m.mealType || "-"}</td>
                  <td className="border p-2">{m.locationName || "-"}</td>
                  <td className="border p-2">{fmtIST(m.timestamp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {reportData.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-600">
            Showing <b>{reportData.length ? startIdx + 1 : 0}</b>–<b>{endIdx}</b> of <b>{reportData.length}</b> rows
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="border px-3 py-1 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs">
              Page <b>{currentPage}</b> of <b>{totalPages}</b>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="border px-3 py-1 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorReport;
