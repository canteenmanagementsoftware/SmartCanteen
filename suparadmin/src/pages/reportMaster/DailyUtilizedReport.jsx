import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import axios from "../../utils/axiosConfig";
import { AuthContext } from "../../context/auth-context";
import { DateRangePicker } from "rsuite";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import Select, { components as RSComponents } from "react-select";

const RSUITE_CSS_URL = "https://unpkg.com/rsuite/dist/rsuite-no-reset.min.css";

const COLS = 12;

// ------------- helpers -------------
const toStrId = (x) =>
  x && typeof x === "object" ? String(x._id || x.id || "") : String(x || "");

const t4 = (s = "", n = 4) => (s.length > n ? `${s.slice(0, n)}…` : s);

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

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const DailyUtilizedReport = () => {
  const { user: currentUser } = useContext(AuthContext);

  // load RSuite CSS only for this page
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

  // ---------- role flags ----------
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

  const allowedCompanyId = toStrId(currentUser?.companyId || currentUser?.company);
  const allowedCompanyName = currentUser?.companyName || "My Company";

  // admin may have multiple places; normalize to array of strings
  const assignedPlaceIds = useMemo(() => {
    const raw = currentUser?.placeIds ?? currentUser?.placeId ?? [];
    if (Array.isArray(raw)) return raw.map(toStrId).filter(Boolean);
    const one = toStrId(raw);
    return one ? [one] : [];
  }, [currentUser]);

  const assignedLocationIds = useMemo(() => {
    const raw = currentUser?.locationId ?? [];
    return Array.isArray(raw) ? raw.map(toStrId).filter(Boolean) : [];
  }, [currentUser]);

  // ---------- filters ----------
  const [range, setRange] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [placesSelected, setPlacesSelected] = useState([]); // array of place ids
  const [selectedLocation, setSelectedLocation] = useState("");
  const [searchText, setSearchText] = useState("");

  // ---------- dropdown data ----------
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);       // [{_id,name}]
  const [locations, setLocations] = useState([]); // merged from selected places

  // ---------- report data ----------
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const didAutoFetch = useRef(false);

  // ---------- pagination ----------
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  useEffect(() => setPage(1), [pageSize]);
  const rows = Array.isArray(reportData?.users)
    ? reportData.users
    : Array.isArray(reportData)
    ? reportData
    : [];
  const isAll = pageSize === "ALL";
  const pageSizeNum = isAll ? (rows.length || 1) : Number(pageSize);
  const totalPages = Math.max(1, isAll ? 1 : Math.ceil(rows.length / pageSizeNum));
  const currentPage = Math.min(page, totalPages);
  const startIdx = isAll ? 0 : (currentPage - 1) * pageSizeNum;
  const endIdx = isAll ? rows.length : Math.min(startIdx + pageSizeNum, rows.length);
  const pagedRows = rows.slice(startIdx, endIdx);

  // ---------- preselect readiness (for auto-fetch) ----------
  const preselectReady = useMemo(() => {
    if (isSuperadmin) return true;
    if (isManager || isAdmin) return !!selectedCompany; // places handled below
    if (isCollector) {
      return !!selectedCompany && placesSelected.length > 0 && !!selectedLocation;
    }
    return true;
  }, [isSuperadmin, isManager, isAdmin, isCollector, selectedCompany, placesSelected, selectedLocation]);

  // ---------- companies (role-aware) ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isSuperadmin && allowedCompanyId) {
          if (!cancelled) {
            setCompanies([{ _id: allowedCompanyId, name: allowedCompanyName }]);
            setSelectedCompany(allowedCompanyId);
          }
          return;
        }
        const res = await axios.get("/company");
        if (cancelled) return;
        const list = res?.data?.data || res?.data || [];
        setCompanies(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setCompanies([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isSuperadmin, allowedCompanyId, allowedCompanyName]);

  // ---------- places by company ----------
  useEffect(() => {
    if (!selectedCompany) {
      setPlaces([]);
      setPlacesSelected([]);
      setSelectedLocation("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`/places/company/${selectedCompany}`);
        if (cancelled) return;
        let list = res?.data?.data || res?.data || [];
        list = Array.isArray(list) ? list : [];

        // lock to assigned for admin/collector
        if ((isAdmin || isCollector) && assignedPlaceIds.length) {
          const allow = new Set(assignedPlaceIds);
          list = list.filter((p) => allow.has(toStrId(p._id)));
        }
        setPlaces(list);

        // role-based preselect
        const availableIds = new Set(list.map((p) => toStrId(p._id)));
        if (isAdmin) {
          const target = assignedPlaceIds.filter((id) => availableIds.has(id));
          setPlacesSelected(target);
          setSelectedLocation("");
        } else if (isCollector) {
          const first = assignedPlaceIds.find((id) => availableIds.has(id)) || list[0]?._id || "";
          setPlacesSelected(first ? [first] : []);
          setSelectedLocation("");
        } else {
          // manager / superadmin keep manual; normalize selection to available
          setPlacesSelected((old) => old.filter((id) => availableIds.has(id)));
        }
      } catch {
        if (!cancelled) {
          setPlaces([]);
          setPlacesSelected([]);
          setSelectedLocation("");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCompany, isAdmin, isCollector, assignedPlaceIds]);

  // ---------- locations (merged from selected places) ----------
  useEffect(() => {
    let cancelled = false;
    if (!placesSelected.length) {
      setLocations([]);
      setSelectedLocation("");
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
        const merged = Array.from(map.values());
        setLocations(merged);

        if (isCollector) {
          const available = new Set(merged.map((l) => toStrId(l._id)));
          const preferred = assignedLocationIds.find((id) => available.has(id));
          setSelectedLocation(preferred || merged[0]?._id || "");
        } else {
          if (selectedLocation && !merged.some((l) => toStrId(l._id) === selectedLocation)) {
            setSelectedLocation("");
          }
        }
      } catch {
        if (!cancelled) {
          setLocations([]);
          setSelectedLocation("");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [placesSelected, isCollector, assignedLocationIds, selectedLocation]);

  // ---------- auto fetch once after preselects are ready ----------
  useEffect(() => {
    if (didAutoFetch.current) return;
    if (!preselectReady) return;
    didAutoFetch.current = true;
    fetchReport();
  }, [preselectReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- react-select data ----------
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

  const handlePlacesChange = (vals) => {
    if ((isAdmin && assignedPlaceIds.length) || isCollector) return; // locked
    const ids = (vals || []).map((v) => v.value);
    setPlacesSelected(ids);
    setSelectedLocation("");
  };

  // ---------- params + API ----------
  const buildParams = () => {
    const params = {};
    if (selectedCompany) params.companyId = selectedCompany;
    if (placesSelected.length === 1) params.placeId = placesSelected[0];
    else if (placesSelected.length > 1) params.placeIds = placesSelected;
    if (selectedLocation) params.locationId = selectedLocation;

    if (range?.[0] && range?.[1]) {
      const fmtYMD = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
      const ymdFrom = fmtYMD(range[0]);
      const ymdTo = fmtYMD(range[1]);
      params.from = `${ymdFrom}T00:00:00.000+05:30`;
      params.to = `${ymdTo}T23:59:59.999+05:30`;
    }
    if (searchText.trim()) params.searchText = searchText.trim();
    return params;
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get("/reports/daily-utilized-report", {
        params: buildParams(),
      });
      if (res.data?.success) {
        setReportData(res.data.data);
        setPage(1);
      } else {
        setError(res.data?.message || "Failed to fetch report");
        setReportData([]);
        setPage(1);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch report");
      setReportData([]);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  // ---------- handlers ----------
  const companyDisabled = !isSuperadmin; // manager/admin/collector locked
  const placeDisabled = (isAdmin && assignedPlaceIds.length > 0) || isCollector;
  const locationDisabled = isCollector || placesSelected.length === 0;

  const handleCompanyChange = (e) => {
    if (companyDisabled) return;
    setSelectedCompany(e.target.value);
    setPlacesSelected([]);
    setSelectedLocation("");
    setPage(1);
  };

  const handleLocationChange = (e) => {
    if (locationDisabled) return;
    setSelectedLocation(String(e.target.value || ""));
    setPage(1);
  };

  const handleSearchChange = (e) => setSearchText(e.target.value);
  const handleKeyDown = (e) => e.key === "Enter" && fetchReport();

  // ---------- CSV export ----------
  const handleExportCSV = () => {
    if (!rows.length) return;

    const header = [
      "Date",
      "Name",
      "Breakfast Actual",
      "Breakfast Utilized",
      "Lunch Actual",
      "Lunch Utilized",
      "Supper Actual",
      "Supper Utilized",
      "Dinner Actual",
      "Dinner Utilized",
      "Late Snacks Actual",
      "Late Snacks Utilized",
    ];

    const csvRows = rows.map((item) => [
      formatDate(item.date),
      item?.userName || "",
      item?.breakfast?.actual ?? 0,
      item?.breakfast?.utilized ?? 0,
      item?.lunch?.actual ?? 0,
      item?.lunch?.utilized ?? 0,
      item?.supper?.actual ?? 0,
      item?.supper?.utilized ?? 0,
      item?.dinner?.actual ?? 0,
      item?.dinner?.utilized ?? 0,
      item?.lateSnack?.actual ?? 0,
      item?.lateSnack?.utilized ?? 0,
    ]);

    const csv = "\uFEFF" + [header, ...csvRows]
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `daily_utilized_report_${new Date().toISOString().slice(0, 10)}.csv`;

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

  return (
    <div className="p-6 bg-white rounded shadow-md">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        {/* Date range (RSuite) */}
        <div className="md:col-span-2">
          <DateRangePicker
            className="w-full"
            value={range}
            onChange={setRange}
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
              : "text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500"
          }`}
          value={selectedCompany}
          onChange={handleCompanyChange}
          disabled={companyDisabled}
        >
          <option value="">Select Company</option>
          {!isSuperadmin &&
            selectedCompany &&
            !companies.some((c) => String(c._id) === String(selectedCompany)) && (
              <option value={selectedCompany}>{allowedCompanyName}</option>
            )}
          {companies.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Place (multi) */}
        <Select
          instanceId="du-place-multi"
          isMulti
          closeMenuOnSelect={false}
          options={places.map((p) => ({ value: toStrId(p._id), label: p.name || "Unnamed" }))}
          value={(() => {
            const set = new Set(placesSelected);
            return places
              .map((p) => ({ value: toStrId(p._id), label: p.name || "Unnamed" }))
              .filter((o) => set.has(o.value));
          })()}
          onChange={handlePlacesChange}
          placeholder="Select place(s)"
          styles={placeSelectStyles}
          components={{ MultiValueLabel }}
          isDisabled={placeDisabled}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          className="z-30"
        />

        {/* Location (merged) */}
        <select
          value={selectedLocation || ""}
          onChange={handleLocationChange}
          disabled={locationDisabled}
          className={`border p-2 rounded ${
            locationDisabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
          }`}
        >
          <option value="">
            {placesSelected.length ? "Select Location" : "Select place(s) first"}
          </option>
          {locations.map((l) => (
            <option key={l._id} value={l._id}>
              {l.locationName}
            </option>
          ))}
        </select>

        {/* Search Text */}
        <input
          type="text"
          placeholder="Search by Name, ID, Package"
          value={searchText}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          className="border p-2 rounded"
        />

        {/* Search Button */}
        <button
          onClick={fetchReport}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Search
        </button>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Export CSV
        </button>
      </div>

      {/* Rows per page (top-right, above table) */}
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

      {/* Error & Loading */}
      {loading && <div className="text-center py-4">Loading...</div>}
      {error && <div className="text-red-600 mb-4">{error}</div>}

      {/* Report Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">DATE</th>
              <th className="border p-2">NAME</th>
              <th className="border p-2" colSpan="2">BREAKFAST</th>
              <th className="border p-2" colSpan="2">LUNCH</th>
              <th className="border p-2" colSpan="2">SUPPER</th>
              <th className="border p-2" colSpan="2">DINNER</th>
              <th className="border p-2" colSpan="2">LATE SNACKS</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="border p-2"></th>
              <th className="border p-2"></th>
              <th className="border p-2">Actual</th>
              <th className="border p-2">Utilized</th>
              <th className="border p-2">Actual</th>
              <th className="border p-2">Utilized</th>
              <th className="border p-2">Actual</th>
              <th className="border p-2">Utilized</th>
              <th className="border p-2">Actual</th>
              <th className="border p-2">Utilized</th>
              <th className="border p-2">Actual</th>
              <th className="border p-2">Utilized</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLS} className="text-center p-4">Loading...</td>
              </tr>
            ) : pagedRows.length > 0 ? (
              pagedRows.map((item, index) => (
                <tr
                  key={`${item._id ?? item.userId?._id ?? item.userId}-${new Date(item.date).toISOString()}`}
                  className={index % 2 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="p-2 border">{formatDate(item.date)}</td>
                  <td className="p-2 border">{item?.userName || ""}</td>
                  <td className="p-2 border text-center">{item.breakfast?.actual ?? 0}</td>
                  <td className="p-2 border text-center">{item.breakfast?.utilized ?? 0}</td>
                  <td className="p-2 border text-center">{item.lunch?.actual ?? 0}</td>
                  <td className="p-2 border text-center">{item.lunch?.utilized ?? 0}</td>
                  <td className="p-2 border text-center">{item.supper?.actual ?? 0}</td>
                  <td className="p-2 border text-center">{item.supper?.utilized ?? 0}</td>
                  <td className="p-2 border text-center">{item.dinner?.actual ?? 0}</td>
                  <td className="p-2 border text-center">{item.dinner?.utilized ?? 0}</td>
                  <td className="p-2 border text-center">{item.lateSnack?.actual ?? 0}</td>
                  <td className="p-2 border text-center">{item.lateSnack?.utilized ?? 0}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={COLS} className="text-center py-4">No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {rows.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-600">
            Showing <b>{rows.length ? startIdx + 1 : 0}</b>–<b>{endIdx}</b> of <b>{rows.length}</b> rows
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

export default DailyUtilizedReport;
