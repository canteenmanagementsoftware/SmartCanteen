import React, { useEffect, useState, useContext, useMemo } from "react";
import axios from "../../utils/axiosConfig";
import { AuthContext } from "../../context/auth-context";
import Select, { components as RSComponents } from "react-select";

const COLS = 7;

// -------- helpers --------
const toStrId = (x) =>
  x && typeof x === "object" ? String(x._id || x.id || "") : String(x || "");
const t4 = (s = "", n = 4) => (s.length > n ? `${s.slice(0, n)}…` : s);

// react-select compact chips + ellipsis
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

const semesterOptions = [
  { label: "Semester 1", value: "1st" },
  { label: "Semester 2", value: "2nd" },
  { label: "Semester 3", value: "3rd" },
  { label: "Semester 4", value: "4th" },
];

const PandingFeesReport = () => {
  const { user: currentUser } = useContext(AuthContext);

  // -------- roles --------
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

  // -------- filters --------
  const [company, setCompany] = useState("");
  const [placesSelected, setPlacesSelected] = useState([]); // array of placeIds
  const [location, setLocation] = useState("");
  const [semester, setSemester] = useState("");

  // -------- dropdown data --------
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);       // [{_id,name}]
  const [locations, setLocations] = useState([]); // merged from selected places

  // -------- table --------
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // -------- pagination --------
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  useEffect(() => setPage(1), [pageSize]);
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

  // -------- companies (role-aware) --------
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
        const list = res?.data?.data || res?.data || [];
        setCompanies(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setCompanies([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isSuperadmin, allowedCompanyId, allowedCompanyName]);

  // -------- places by company --------
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

        // restrict for admin/collector
        if ((isAdmin || isCollector) && assignedPlaceIds.length) {
          const allow = new Set(assignedPlaceIds);
          list = list.filter((p) => allow.has(toStrId(p._id)));
        }
        setPlaces(list);

        const availableIds = new Set(list.map((p) => toStrId(p._id)));
        // role-based preselect
        if (isAdmin) {
          const target = assignedPlaceIds.filter((id) => availableIds.has(id));
          setPlacesSelected(target);
          setLocation("");
        } else if (isCollector) {
          const first = assignedPlaceIds.find((id) => availableIds.has(id)) || list[0]?._id || "";
          setPlacesSelected(first ? [first] : []);
          setLocation("");
        } else {
          // manager/superadmin keep manual, normalize selection to available
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

  // -------- locations merged from selected places --------
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
        const merged = Array.from(map.values());
        setLocations(merged);

        if (isCollector) {
          const available = new Set(merged.map((l) => toStrId(l._id)));
          const preferred = assignedLocationIds.find((id) => available.has(id));
          setLocation(preferred || merged[0]?._id || "");
        } else {
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
  }, [placesSelected, isCollector, assignedLocationIds, location]);

  // -------- react-select data --------
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
    setLocation("");
  };

  // -------- params builder & API --------
  const buildParams = () => {
    const params = {};
    if (company) params.companyId = company;
    if (placesSelected.length === 1) params.place = placesSelected[0];
    else if (placesSelected.length > 1) params.placeIds = placesSelected;
    if (location) params.locationId = location;
    if (semester) params.semester = semester;
    return params;
  };

  const fetchReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.get("/reports/panding-fees-report", {
        params: buildParams(),
      });
      if (res.data?.message) setMessage(res.data.message);
      const rows = res.data?.data || [];
      setReportData(Array.isArray(rows) ? rows : []);
      setPage(1);
    } catch {
      setMessage("Error fetching report. Please try again.");
      setReportData([]);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = { ...buildParams(), exportType: "csv" };

      // (Optional) enforce required fields if your backend needs them:
      if (!params.companyId || (!params.place && !params.placeIds) || !params.locationId) {
        setMessage("Please select company, place(s) and location");
        return;
      }

      const res = await axios.get("/reports/panding-fees-report", {
        params,
        responseType: "blob",
      });

      const blob = new Blob(["\uFEFF", res.data], {
        type: "text/csv;charset=utf-8;",
      });
      const fileName = `pending_fees_report_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

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
    } catch {
      setMessage("CSV Export failed");
    }
  };

  // -------- disable logic --------
  const companyDisabled = !isSuperadmin; // manager/admin/collector locked
  const placeDisabled = (isAdmin && assignedPlaceIds.length > 0) || isCollector;
  const locationDisabled = isCollector || placesSelected.length === 0;

  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Pending Fees Report</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Company */}
        <select
          className={`px-3 py-2 border rounded-md shadow-sm text-sm ${
            companyDisabled
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
          <option value="">Select Company</option>
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
          instanceId="pending-fees-place-multi"
          isMulti
          closeMenuOnSelect={false}
          options={placeOptions}
          value={selectedPlaceOptions}
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
          value={location || ""}
          onChange={(e) => {
            if (locationDisabled) return;
            setLocation(String(e.target.value || ""));
          }}
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

        {/* Semester */}
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Semesters</option>
          {semesterOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          onClick={fetchReport}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Search
        </button>

        <button
          onClick={handleExportCSV}
          disabled={loading || reportData.length === 0}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-green-500"
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

      {message && (
        <div className="text-center text-blue-600 mb-4">{message}</div>
      )}

      {/* Table */}
      <div className="overflow-auto max-h-[500px] border rounded">
        <table className="min-w-full text-sm border border-gray-300">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Contact</th>
              <th className="p-2 border">Total Fees</th>
              <th className="p-2 border">Paid Fees</th>
              <th className="p-2 border">Pending Amount</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Semester</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLS} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : pagedRows.length > 0 ? (
              pagedRows.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="p-2 border">
                    {`${item.userId?.firstName || ""} ${item.userId?.lastName || ""}`}
                  </td>
                  <td className="p-2 border">
                    {item.userId?.email || item.userId?.mobileNo || "-"}
                  </td>
                  <td className="p-2 border text-right">
                    ₹{(item.totalFees ?? 0).toLocaleString()}
                  </td>
                  <td className="p-2 border text-right">
                    ₹{(item.paidFees ?? 0).toLocaleString()}
                  </td>
                  <td className="p-2 border text-right">
                    ₹{(((item.totalFees || 0) - (item.paidFees || 0)) || 0).toLocaleString()}
                  </td>
                  <td className="p-2 border">{item.status || "pending"}</td>
                  <td className="p-2 border">{item.semester || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={COLS} className="text-center text-gray-500 p-4">
                  No pending fees found
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

export default PandingFeesReport;
