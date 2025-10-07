import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import axios from "../../utils/axiosConfig";
import { AuthContext } from "../../context/auth-context";
import Select, { components as RSComponents } from "react-select";

const COLS = 10; // table colSpan

// ---------- helpers ----------
const toStrId = (x) =>
  x && typeof x === "object" ? String(x._id || x.id || "") : String(x || "");

// truncate labels for compact chips
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

const UserReport = () => {
  const { user: currentUser } = useContext(AuthContext);

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
  const [selectedCompany, setSelectedCompany] = useState("");
  const [placesSelected, setPlacesSelected] = useState([]); // array<string> placeIds
  const [selectedLocation, setSelectedLocation] = useState("");
  const [searchText, setSearchText] = useState("");

  // ---------- dropdown data ----------
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);       // [{_id,name}]
  const [locations, setLocations] = useState([]); // merged across placesSelected

  // ---------- report data ----------
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ---------- pagination ----------
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  useEffect(() => setPage(1), [pageSize]);
  const isAll = pageSize === "ALL";
  const pageSizeNum = isAll ? (reportData.length || 1) : Number(pageSize);
  const totalPages = Math.max(1, isAll ? 1 : Math.ceil(reportData.length / pageSizeNum));
  const currentPage = Math.min(page, totalPages);
  const startIdx = isAll ? 0 : (currentPage - 1) * pageSizeNum;
  const endIdx = isAll ? reportData.length : Math.min(startIdx + pageSizeNum, reportData.length);
  const pagedRows = reportData.slice(startIdx, endIdx);

  // ---------- preselect readiness & autofetch gate ----------
  const didAutoFetch = useRef(false);
  const preselectReady = useMemo(() => {
    if (isSuperadmin) return true;
    if (isManager || isAdmin) return !!selectedCompany && (isAdmin ? placesSelected.length > 0 : true);
    if (isCollector) {
      return !!selectedCompany && placesSelected.length > 0 && !!selectedLocation;
    }
    return true;
  }, [isSuperadmin, isManager, isAdmin, isCollector, selectedCompany, placesSelected, selectedLocation]);

  // ---------- companies ----------
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

        // role-based preselect/normalize
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

  // ---------- locations merged from placesSelected ----------
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

  // ---------- auto fetch once after preselects ready ----------
  useEffect(() => {
    if (didAutoFetch.current) return;
    if (!preselectReady) return;
    didAutoFetch.current = true;
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectReady]);

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

  // ---------- UI lock flags ----------
  const companyDisabled = !isSuperadmin; // locked for manager/admin/collector
  const placeDisabled = (isAdmin && assignedPlaceIds.length > 0) || isCollector;
  const locationDisabled = isCollector || placesSelected.length === 0;

  // ---------- params & API ----------
  const buildParams = () => {
    const params = {};
    if (selectedCompany) params.company = selectedCompany;
    if (placesSelected.length === 1) params.place = placesSelected[0];
    else if (placesSelected.length > 1) params.placeIds = placesSelected;
    if (selectedLocation) params.location = selectedLocation;
    if (searchText.trim()) params.search = searchText.trim();
    return params;
  };

  const fetchReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.get("/reports/user-report", { params: buildParams() });
      const rows = res?.data?.data || [];
      setReportData(Array.isArray(rows) ? rows : []);
      setMessage(rows?.length ? "" : "No users found");
      setPage(1);
    } catch (e) {
      setMessage("Error fetching user report");
      setReportData([]);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  // Export the CURRENT dataset (no need to force selects)
  const handleExportCSV = () => {
    if (!reportData.length) {
      setMessage("No rows to export");
      return;
    }
    const header = [
      "Unique Number",
      "Name",
      "Mobile",
      "User Type",
      "Start Date",
      "Expiry Date",
      "Total Packages",
      "Active Packages",
      "Place",
      "Location",
    ];
    const rows = reportData.map((u) => [
      u.unique_number ?? "-",
      u.name ?? "-",
      u.mobile ?? "-",
      u.user_type ?? "-",
      (u.start_date || "").slice(0, 10) || "-",
      (u.expiry_date || "").slice(0, 10) || "-",
      u.total_package ?? 0,
      u.active_package ?? 0,
      u.place ?? "-",
      u.location ?? "-",
    ]);
    const csv =
      "\uFEFF" +
      [header, ...rows]
        .map((r) =>
          r
            .map((cell) => {
              const s = String(cell ?? "");
              return /[\",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `user_report_${new Date().toISOString().slice(0, 10)}.csv`;

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
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 0);
  };

  // ---------- handlers ----------
  const handleCompanyChange = (e) => {
    if (companyDisabled) return;
    setSelectedCompany(e.target.value);
    setPlacesSelected([]);
    setSelectedLocation("");
    setPage(1);
  };

  const handlePlacesChange = (vals) => {
    if (placeDisabled) return;
    const ids = (vals || []).map((v) => v.value);
    setPlacesSelected(ids);
    setSelectedLocation("");
    setPage(1);
  };

  const handleLocationChange = (e) => {
    if (locationDisabled) return;
    setSelectedLocation(String(e.target.value || ""));
    setPage(1);
  };

  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">User Report</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Company */}
        <select
          className={`px-3 py-2 border rounded-md shadow-sm text-sm ${
            companyDisabled
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

        {/* Place (multi, compact) */}
        <Select
          instanceId="userreport-place-multi"
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

        {/* Location (merged from selected places) */}
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

        {/* Search text */}
        <input
          type="text"
          placeholder="Search by name, ID, or mobile"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchReport()}
          className="border p-2 rounded"
        />

        <button
          onClick={fetchReport}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Loading..." : "Search"}
        </button>

        <button
          onClick={handleExportCSV}
          disabled={loading || reportData.length === 0}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-500"
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

      {message && <div className="text-center text-blue-600 mb-4">{message}</div>}

      {/* Table */}
      <div className="overflow-auto max-h-[500px] border rounded">
        <table className="min-w-full text-sm border border-gray-300">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-2 border">Unique Number</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Mobile</th>
              <th className="p-2 border">User Type</th>
              <th className="p-2 border">Start Date</th>
              <th className="p-2 border">Expiry Date</th>
              <th className="p-2 border">Total Packages</th>
              <th className="p-2 border">Active Packages</th>
              <th className="p-2 border">Place</th>
              <th className="p-2 border">Location</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLS} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : reportData.length > 0 ? (
              pagedRows.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="p-2 border">{user.unique_number || "-"}</td>
                  <td className="p-2 border">{user.name || "-"}</td>
                  <td className="p-2 border">{user.mobile || "-"}</td>
                  <td className="p-2 border">{user.user_type || "-"}</td>
                  <td className="p-2 border">{user.start_date?.slice(0, 10) || "-"}</td>
                  <td className="p-2 border">{user.expiry_date?.slice(0, 10) || "-"}</td>
                  <td className="p-2 border text-center">{user.total_package || 0}</td>
                  <td className="p-2 border text-center">{user.active_package || 0}</td>
                  <td className="p-2 border">{user.place || "-"}</td>
                  <td className="p-2 border">{user.location || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={COLS} className="text-center text-gray-500 p-4">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {reportData.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-600">
            Showing <b>{reportData.length ? startIdx + 1 : 0}</b>–<b>{endIdx}</b> of{" "}
            <b>{reportData.length}</b> rows
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

export default UserReport;
