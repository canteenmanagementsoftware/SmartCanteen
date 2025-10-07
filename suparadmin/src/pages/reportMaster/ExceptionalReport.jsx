import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import axios from "../../utils/axiosConfig";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { DateRangePicker } from "rsuite";
import { AuthContext } from "../../context/auth-context";
import Select, { components as RSComponents } from "react-select";

const RSUITE_CSS_URL = "https://unpkg.com/rsuite/dist/rsuite-no-reset.min.css";

// table columns (for colSpan)
const COLS = 7;

// ---- helpers
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
const idOf = (v) => (v && typeof v === "object" ? v._id || v.id : v);
const toId = (v) => (v == null ? "" : String(idOf(v)));
const toStrId = (x) =>
  x && typeof x === "object" ? String(x._id || x.id || "") : String(x || "");

// truncate helper for compact chips
const t4 = (s = "", n = 4) => (s.length > n ? `${s.slice(0, n)}…` : s);

// react-select compact styles
const placeSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 42,
    borderColor: "#d1d5db",
    boxShadow: "none",
    ":hover": { borderColor: "#9ca3af" },
  }),
  valueContainer: (base) => ({
    ...base,
    display: "flex",
    flexWrap: "nowrap",
    overflow: "hidden",
    paddingTop: 2,
    paddingBottom: 2,
  }),
  multiValue: (base) => ({ ...base, maxWidth: 90, overflow: "hidden" }),
  multiValueLabel: (base) => ({
    ...base,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    paddingRight: 4,
  }),
  menu: (base) => ({ ...base, zIndex: 40 }),
  placeholder: (base) => ({ ...base, color: "#6b7280" }),
};
const MultiValueLabel = (props) => (
  <RSComponents.MultiValueLabel {...props}>
    {t4(props.data.label, 4)}
  </RSComponents.MultiValueLabel>
);

const ExceptionalReport = () => {
  const { user: currentUser } = useContext(AuthContext);

  // load rsuite css
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

  // ---- role flags
  const roleStr = useMemo(
    () =>
      String(
        currentUser?.userType || currentUser?.type || currentUser?.role || ""
      ).toLowerCase(),
    [currentUser]
  );
  const isSuperadmin = roleStr === "superadmin";
  const isAdmin = roleStr === "admin";
  const isManager = roleStr === "manager";
  const isCollector = roleStr === "meal_collector";

  // allowed ids from profile
  const allowedCompanyId = toId(currentUser?.companyId || currentUser?.company);
  const allowedCompanyName = currentUser?.companyName || "My Company";

  // normalize places (admin can have many)
  const assignedPlaceIds = useMemo(() => {
    const raw = currentUser?.placeIds ?? currentUser?.placeId ?? [];
    if (Array.isArray(raw)) return raw.map(toStrId).filter(Boolean);
    const one = toStrId(raw);
    return one ? [one] : [];
  }, [currentUser]);

  // normalize locations (collector may have many)
  const assignedLocationIds = useMemo(() => {
    const raw = currentUser?.locationId ?? [];
    return Array.isArray(raw) ? raw.map(toStrId).filter(Boolean) : [];
  }, [currentUser]);

  // ---- filters (UI states)
  const [company, setCompany] = useState("");
  const [placesSelected, setPlacesSelected] = useState([]); // array<string>
  const [location, setLocation] = useState("");
  const [searchText, setSearchText] = useState("");
  const [range, setRange] = useState(null); // [Date, Date] or null

  // ---- data (source + view)
  const [allRows, setAllRows] = useState([]);      // full dataset (fetched once)
  const [tableRows, setTableRows] = useState([]);  // rows shown in table

  // ---- dropdown options
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);       // [{_id,name}]
  const [locations, setLocations] = useState([]); // merged across placesSelected

  // ---- ui states
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false); // to avoid flicker
  const didInitRef = useRef(false);
  const [rowsLoaded, setRowsLoaded] = useState(false);

  // ---- pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10"); // "ALL" | "10" | "20" | "50"

  // -------- Fetch base data (once) ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get("/meal/history");
        if (cancelled) return;
        const list = res?.data?.data ?? [];
        setAllRows(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setAllRows([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRowsLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // -------- Companies list ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isSuperadmin && allowedCompanyId) {
          if (!cancelled) {
            setCompanies([{ _id: allowedCompanyId, name: allowedCompanyName }]);
            setCompany(allowedCompanyId);
          }
          return;
        }
        const res = await axios.get("/company");
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setCompanies(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setCompanies([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isSuperadmin, allowedCompanyId, allowedCompanyName]);

  // -------- Places when company changes ----------
  useEffect(() => {
    if (!company) {
      setPlaces([]);
      setPlacesSelected([]);
      setLocation("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`/places/company/${company}`);
        if (cancelled) return;
        let list = res?.data?.data || res?.data || [];
        list = Array.isArray(list) ? list : [];

        // restrict for admin/collector to assigned places
        if ((isAdmin || isCollector) && assignedPlaceIds.length) {
          const allow = new Set(assignedPlaceIds);
          list = list.filter((p) => allow.has(toStrId(p._id)));
        }
        setPlaces(list);

        // role-based preselect/normalize
        const availableIds = new Set(list.map((p) => toStrId(p._id)));
        if (isAdmin) {
          const deflt = assignedPlaceIds.filter((id) => availableIds.has(id));
          setPlacesSelected(deflt);
          setLocation("");
        } else if (isCollector) {
          const first = assignedPlaceIds.find((id) => availableIds.has(id)) || list[0]?._id || "";
          setPlacesSelected(first ? [first] : []);
          setLocation("");
        } else {
          // superadmin/manager: keep only still-available selected ids
          setPlacesSelected((old) => old.filter((id) => availableIds.has(id)));
        }
      } catch {
        if (!cancelled) {
          setPlaces([]);
          setPlacesSelected([]);
          setLocation("");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [company, isAdmin, isCollector, assignedPlaceIds]);

  // -------- Locations when placesSelected changes (merge) ----------
  useEffect(() => {
    let cancelled = false;
    if (!placesSelected.length) {
      setLocations([]);
      setLocation("");
      return;
    }
    (async () => {
      try {
        const results = await Promise.all(
          placesSelected.map((pid) =>
            axios.get(`/locations/places/${pid}`).catch(() => ({ data: [] }))
          )
        );
        const map = new Map();
        for (const res of results) {
          const raw = res?.data?.data || res?.data || [];
          (Array.isArray(raw) ? raw : []).forEach((l) => {
            map.set(toStrId(l._id), l);
          });
        }
        let merged = Array.from(map.values());

        // optional: restrict to assigned locations if provided
        if ((isAdmin || isCollector) && assignedLocationIds.length) {
          const allow = new Set(assignedLocationIds);
          merged = merged.filter((l) => allow.has(toStrId(l._id)));
        }

        setLocations(merged);

        // collector: auto-pick first assigned/available location
        if (isCollector) {
          const available = new Set(merged.map((l) => toStrId(l._id)));
          const preferred = assignedLocationIds.find((id) => available.has(id));
          setLocation(preferred || merged[0]?._id || "");
        } else {
          // if current selection no longer available, clear it
          if (location && !merged.some((l) => toStrId(l._id) === location)) {
            setLocation("");
          }
        }
      } catch {
        if (!cancelled) {
          setLocations([]);
          setLocation("");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [placesSelected, isAdmin, isCollector, assignedLocationIds, location]);

  // -------- Preselect readiness ----------
  const preselectReady = useMemo(() => {
    if (isSuperadmin) return true;
    if (isManager) return !!company && company === allowedCompanyId;
    if (isAdmin) {
      const cOK = !!company && company === allowedCompanyId;
      const pOK = assignedPlaceIds.length ? placesSelected.length > 0 : true;
      return cOK && pOK;
    }
    if (isCollector) {
      const cOK = !!company && company === allowedCompanyId;
      const pOK = placesSelected.length > 0;
      const lOK = assignedLocationIds.length ? !!location : true;
      return cOK && pOK && lOK;
    }
    return true;
  }, [
    isSuperadmin,
    isManager,
    isAdmin,
    isCollector,
    company,
    placesSelected,
    location,
    allowedCompanyId,
    assignedPlaceIds,
    assignedLocationIds,
  ]);

  // -------- Table init (once after preselects) ----------
  useEffect(() => {
    if (didInitRef.current) return;
    if (!rowsLoaded) return;
    if (!preselectReady) return;

    let baseline = allRows;

    if (!isSuperadmin) {
      if (company) baseline = baseline.filter((r) => String(r.companyId) === String(company));
    }
    if (placesSelected.length) {
      const allow = new Set(placesSelected);
      baseline = baseline.filter((r) => allow.has(toStrId(r.placeId)));
    }
    if (isCollector && location) {
      baseline = baseline.filter((r) => String(r.locationId) === String(location));
    }

    setTableRows(baseline);
    setPage(1);
    setInitialized(true);
    didInitRef.current = true;
  }, [rowsLoaded, preselectReady, allRows, isSuperadmin, company, placesSelected, isCollector, location]);

  // -------- Search (client-side) ----------
  const handleSearch = () => {
    if (!range && !searchText.trim() && !company && !placesSelected.length && !location) {
      setTableRows(allRows);
      setInitialized(true);
      setPage(1);
      return;
    }

    const text = searchText.trim().toLowerCase();
    const start = range ? new Date(ymd(range[0]) + "T00:00:00") : null;
    const end = range ? new Date(ymd(range[1]) + "T23:59:59.999") : null;
    const allowPlaces = new Set(placesSelected.map(String));

    const filtered = allRows.filter((m) => {
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

    setTableRows(filtered);
    setInitialized(true);
    setPage(1); // reset page on new search
  };

  // -------- Date range handler ----------
  const handleRangeChange = (val) => {
    if (!val) {
      setRange(null);
      return;
    }
    const [start, end] = val;
    if (start && !end) setRange([start, start]);
    else setRange(val);
  };

  // -------- Export: current filtered rows ----------
  const handleExportCSV = () => {
    if (!tableRows.length) return;
    const header = [
      "Unique Id",
      "User",
      "User Type",
      "Package",
      "Meal Type",
      "Location",
      "Log Time (IST)",
    ];
    const rows = tableRows.map((m) => [
      m.userUniqueId || "-",
      `${m.userFirstName || ""} ${m.userLastName || ""}`.trim() || "-",
      m.userRole || "-",
      m.packageName || "-",
      m.mealType || "-",
      m.locationName || "-",
      fmtIST(m.timestamp),
    ]);

    const lines = [header, ...rows].map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    );
    const csv = "\uFEFF" + lines.join("\n"); // BOM for Excel UTF-8

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `exceptional_report_${new Date().toISOString().slice(0, 10)}.csv`;

    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, fileName);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", fileName);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  // reset page on pageSize change
  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  // ---- pagination math (dynamic page size)
  const isAll = pageSize === "ALL";
  const pageSizeNum = isAll ? (tableRows.length || 1) : Number(pageSize);
  const totalPages = Math.max(1, isAll ? 1 : Math.ceil(tableRows.length / pageSizeNum));
  const currentPage = Math.min(page, totalPages);
  const startIdx = isAll ? 0 : (currentPage - 1) * pageSizeNum;
  const endIdx = isAll ? tableRows.length : Math.min(startIdx + pageSizeNum, tableRows.length);
  const pagedRows = tableRows.slice(startIdx, endIdx);

  const showNoData = initialized && !loading && tableRows.length === 0;

  // ---------- UI lock flags ----------
  const companyDisabled = !isSuperadmin; // locked for manager/admin/collector
  const placeDisabled = (isAdmin && assignedPlaceIds.length > 0) || isCollector;
  const locationDisabled = isCollector || placesSelected.length === 0;

  // react-select values
  const placeOptions = useMemo(
    () => places.map((p) => ({ value: toStrId(p._id), label: p.name || "Unnamed" })),
    [places]
  );
  const selectedPlaceOptions = useMemo(() => {
    const set = new Set(placesSelected);
    return placeOptions.filter((o) => set.has(o.value));
  }, [placeOptions, placesSelected]);

  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Exceptional User Report</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3">
        {/* Date Range */}
        <div className="md:col-span-2">
          <DateRangePicker
            className="w-full"
            value={range}
            onChange={handleRangeChange}
            placeholder="Select date range"
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
              { label: "This Month", value: [startOfMonth(new Date()), endOfMonth(new Date())] },
              {
                label: "Last Month",
                value: [startOfMonth(subMonths(new Date(), 1)), endOfMonth(subMonths(new Date(), 1))],
              },
            ]}
          />
        </div>

        {/* Company */}
        <select
          className={`px-3 py-2 border rounded-md shadow-sm text-sm ${
            companyDisabled
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          }`}
          value={company}
          onChange={(e) => {
            if (companyDisabled) return;
            setCompany(e.target.value);
            setPlacesSelected([]);
            setLocation("");
          }}
          disabled={companyDisabled}
        >
          <option value="">{isSuperadmin ? "All Companies" : "Select Company"}</option>
          {!isSuperadmin &&
            company &&
            !companies.some((c) => String(c._id) === String(company)) && (
              <option value={company}>{allowedCompanyName}</option>
            )}
          {companies.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Place (multi) */}
        <Select
          instanceId="exceptional-place-multi"
          isMulti
          closeMenuOnSelect={false}
          options={placeOptions}
          value={selectedPlaceOptions}
          onChange={(vals) => {
            if (placeDisabled) return;
            const ids = (vals || []).map((v) => v.value);
            setPlacesSelected(ids);
            setLocation("");
          }}
          placeholder="Select place(s)"
          styles={placeSelectStyles}
          components={{ MultiValueLabel }}
          isDisabled={placeDisabled || !company}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          className="z-30"
        />

        {/* Location */}
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={`border p-2 rounded ${locationDisabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
          disabled={locationDisabled}
        >
          <option value="">
            {placesSelected.length ? "All Locations" : "Select place(s) first"}
          </option>
          {locations.map((l) => (
            <option key={l._id} value={l._id}>
              {l.locationName}
            </option>
          ))}
        </select>

        {/* Search box (put after filters on md layouts) */}
        <input
          type="text"
          placeholder="Search by name, ID, or package"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="border p-2 rounded md:col-span-2"
        />

        {/* Actions */}
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Loading..." : "Search"}
        </button>

        <button
          onClick={handleExportCSV}
          disabled={loading || tableRows.length === 0}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-500"
        >
          Export CSV
        </button>
      </div>

      {/* Rows per page (top-right, above table) */}
      <div className="mb-2 flex justify-end items-center gap-2">
        <label htmlFor="rowsPerPage" className="text-xs text-gray-600">Rows per page:</label>
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

      {/* Table */}
      <div className="overflow-auto max-h-[500px] border rounded">
        <table className="min-w-full text-sm border border-gray-300">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-2 border">Unique ID</th>
              <th className="p-2 border">User</th>
              <th className="p-2 border">User Type</th>
              <th className="p-2 border">Package</th>
              <th className="p-2 border">Meal Type</th>
              <th className="p-2 border">Location</th>
              <th className="p-2 border">Log Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={COLS} className="text-center p-4">Loading...</td></tr>
            ) : !initialized ? (
              <tr><td colSpan={COLS} className="text-center p-4">Preparing data…</td></tr>
            ) : tableRows.length === 0 ? (
              <tr><td colSpan={COLS} className="text-center text-gray-500 p-4">No exceptional users found</td></tr>
            ) : (
              pagedRows.map((row) => (
                <tr key={row._id || `${row.userUniqueId}-${row.timestamp}`} className="hover:bg-gray-50">
                  <td className="p-2 border">{row.userUniqueId || "-"}</td>
                  <td className="p-2 border">
                    {`${row.userFirstName || ""} ${row.userLastName || ""}`.trim() || "-"}
                  </td>
                  <td className="p-2 border">{row.userRole || "-"}</td>
                  <td className="p-2 border">{row.packageName || "-"}</td>
                  <td className="p-2 border">{row.mealType || "-"}</td>
                  <td className="p-2 border">{row.locationName || "-"}</td>
                  <td className="p-2 border">{fmtIST(row.timestamp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      {tableRows.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-600">
            Showing <b>{tableRows.length ? startIdx + 1 : 0}</b>–<b>{endIdx}</b> of <b>{tableRows.length}</b> rows
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

export default ExceptionalReport;
