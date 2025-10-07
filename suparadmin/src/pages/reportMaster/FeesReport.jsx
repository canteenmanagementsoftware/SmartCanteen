import React, { useEffect, useMemo, useState, useContext } from "react";
import axios from "../../utils/axiosConfig";
import { AuthContext } from "../../context/auth-context";
import { DateRangePicker } from "rsuite";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import Select, { components as RSComponents } from "react-select";

const RSUITE_CSS_URL = "https://unpkg.com/rsuite/dist/rsuite-no-reset.min.css";
const COLS = 8;

// -------- helpers --------
const toStrId = (x) =>
  x && typeof x === "object" ? String(x._id || x.id || "") : String(x || "");
const t4 = (s = "", n = 4) => (s.length > n ? `${s.slice(0, n)}…` : s);

// react-select compact styles (chips truncated)
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

const FeesReport = () => {
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

  // admin/collector may have many placeIds
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
  const [range, setRange] = useState(null);
  const [company, setCompany] = useState("");
  const [placesSelected, setPlacesSelected] = useState([]); // array of placeIds
  const [location, setLocation] = useState("");
  const [searchText, setSearchText] = useState("");

  // -------- dropdown data --------
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);         // [{_id,name}]
  const [locations, setLocations] = useState([]);   // merged locations

  // -------- table --------
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // -------- pagination --------
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
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
  useEffect(() => setPage(1), [pageSize]);

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

        // restrict for admin/collector to assigned places
        if ((isAdmin || isCollector) && assignedPlaceIds.length) {
          const allow = new Set(assignedPlaceIds);
          list = list.filter((p) => allow.has(toStrId(p._id)));
        }
        setPlaces(list);

        const availableIds = new Set(list.map((p) => toStrId(p._id)));
        // role based preselect
        if (isAdmin) {
          const target = assignedPlaceIds.filter((id) => availableIds.has(id));
          setPlacesSelected(target); // lock later in UI
          setLocation("");
        } else if (isCollector) {
          const first = assignedPlaceIds.find((id) => availableIds.has(id)) || list[0]?._id || "";
          setPlacesSelected(first ? [first] : []);
          setLocation("");
        } else {
          // manager/superadmin -> manual
          setPlacesSelected((old) => old.filter((id) => availableIds.has(id)));
          // keep location, will be normalized when loading locations
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
        // merge + de-dupe
        const map = new Map();
        for (const res of results) {
          const raw = res?.data?.data || res?.data || [];
          (Array.isArray(raw) ? raw : []).forEach((l) => {
            map.set(toStrId(l._id), l);
          });
        }
        const merged = Array.from(map.values());
        setLocations(merged);

        // collector: preselect assigned/first
        if (isCollector) {
          const available = new Set(merged.map((l) => toStrId(l._id)));
          const preferred = assignedLocationIds.find((id) => available.has(id));
          setLocation(preferred || merged[0]?._id || "");
        } else {
          // normalize location if not available anymore
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

  // -------- react-select data for places --------
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
    // disabled when locked; guard anyway
    if (isAdmin && assignedPlaceIds.length) return;
    if (isCollector) return;
    const ids = (vals || []).map((v) => v.value);
    setPlacesSelected(ids);
    setLocation("");
  };

  // -------- params builder --------
  const buildParams = () => {
    const params = {};
    if (Array.isArray(range) && range[0]) {
      const toISO = (d) =>
        new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10);
      params.fromDate = toISO(range[0]);
      params.toDate = toISO(range[1] || range[0]);
    }
    if (company) params.companyId = company;

    // backend unknown: support single or multi
    if (placesSelected.length === 1) {
      params.place = placesSelected[0];
    } else if (placesSelected.length > 1) {
      // many backends accept array or comma string—sending array is usually safe
      params.placeIds = placesSelected;
    }

    if (location) params.locationId = location;
    if (searchText.trim()) params.userName = searchText.trim();
    return params;
    // NOTE: if your backend only supports "place" (single),
    // remove placeIds and filter server-side by company + (optional) location.
  };

  // -------- fetch report (manual) --------
  const fetchReport = async () => {
    try {
      setLoading(true);
      setErr("");
      const params = buildParams();
      const res = await axios.get("/fees", { params });
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setReportData(list);
      setPage(1);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load fees");
      setReportData([]);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- disable logic --------
  const companyDisabled = !isSuperadmin; // manager/admin/collector locked
  // Admin: ALWAYS locked if has assigned places (single or multi)
  const placeDisabled = (isAdmin && assignedPlaceIds.length > 0) || isCollector;
  const locationDisabled = isCollector || placesSelected.length === 0;

  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Fees Report</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Date range */}
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
          className={`px-3 py-2 border rounded-md shadow-sm text-sm ${
            companyDisabled
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "text-gray-700 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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

        {/* Place (multi, merged locations) */}
        <Select
          instanceId="fees-place-multi"
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

        {/* Location (from merged selected places) */}
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

        {/* Search Text */}
        <input
          type="text"
          placeholder="Search by User (partial allowed)"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={fetchReport}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Search
        </button>

        <button
          onClick={async () => {
            try {
              const params = { ...buildParams(), exportType: "csv" };
              const res = await axios.get("/reports/fees-report", {
                params,
                responseType: "blob",
              });
              const blob = new Blob(["\uFEFF", res.data], {
                type: "text/csv;charset=utf-8;",
              });
              const fileName = `fees_report_${new Date().toISOString().slice(0, 10)}.csv`;
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
              alert("CSV Export failed");
            }
          }}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
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

      {err && (
        <div className="mb-3 p-3 rounded bg-red-50 text-red-700">{err}</div>
      )}

      <div className="overflow-auto max-h-[500px] border rounded">
        <table className="min-w-full text-sm border border-gray-300">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-2 border">Unique Number</th>
              <th className="p-2 border">User</th>
              <th className="p-2 border">Semester</th>
              <th className="p-2 border">Payment Mode</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Place</th>
              <th className="p-2 border">Location</th>
              <th className="p-2 border">Status</th>
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
              pagedRows.map((item, index) => (
                <tr
                  key={item._id || index}
                  className={index % 2 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="p-2 border">{item.userId?.uniqueId || "-"}</td>
                  <td className="p-2 border">
                    {`${item.userId?.firstName || ""} ${item.userId?.lastName || ""}`}
                  </td>
                  <td className="p-2 border">{item.semester || "-"}</td>
                  <td className="p-2 border">{item.paymentMode || "-"}</td>
                  <td className="p-2 border">{item.amount ?? "-"}</td>
                  <td className="p-2 border">{item.placeId?.name || "-"}</td>
                  <td className="p-2 border">
                    {item.locationId?.locationName || "-"}
                  </td>
                  <td className="p-2 border">{item.status || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={COLS} className="text-center text-gray-500 p-4">
                  No records found
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

export default FeesReport;
