import React, { useEffect, useRef, useState } from "react";
import axios from "../../utils/axiosConfig";
import { DateRangePicker } from "rsuite";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

const RSUITE_CSS_URL = "https://unpkg.com/rsuite/dist/rsuite-no-reset.min.css";

// ---------- helpers ----------
const HH_LABELS = Array.from({ length: 24 }, (_, h) =>
  `${String(h).padStart(2, "0")}:00–${String(h).padStart(2, "0")}:59`
);
const COLS = 2 + 24 + 1; // Date + Location + 24 hours + Total

// YYYY-MM-DD in IST (for grouping)
const istDateStr = (iso) => {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};
// IST hour 0..23 (for hourly bucket)
const istHour = (iso) => {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value || "00";
  return Number(h);
};
// local YYYY-MM-DD (for DateRangePicker comparison)
const ymd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

function HourlyReport() {
  // inject RSuite CSS once
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

  // filters
  const [range, setRange] = useState(null); // [Date, Date] or null
  const [locFilter, setLocFilter] = useState(""); // "" = All

  // NEW: page-size dropdown ('ALL' | '10' | '20' | '50')
  const [pageSize, setPageSize] = useState("10");

  // data
  const [meals, setMeals] = useState([]);
  const [rows, setRows] = useState([]);
  const [locations, setLocations] = useState([]); // [{id,name}]
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");

  // pagination
  const [page, setPage] = useState(1);

  const mealsLoadedRef = useRef(false);

  // fetch meals
  useEffect(() => {
    let stop = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const res = await axios.get("/meal/history");
        if (stop) return;
        const list = res?.data?.data ?? [];
        const arr = Array.isArray(list) ? list : [];
        setMeals(arr);

        // unique locations
        const map = new Map();
        for (const r of arr) {
          const id = r.locationId?._id || r.locationId || r.locationName || "N/A";
          const name = r.locationName || "N/A";
          if (!map.has(String(id))) map.set(String(id), name);
        }
        const locs = Array.from(map.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setLocations(locs);
      } catch (e) {
        if (!stop) {
          setMeals([]);
          setLocations([]);
          setError(
            e?.response?.status === 403
              ? "You are not authorized to view meal history."
              : "Failed to fetch meal history."
          );
        }
      } finally {
        if (!stop) {
          mealsLoadedRef.current = true;
          setLoading(false);
        }
      }
    })();
    return () => { stop = true; };
  }, []);

  // build rows (group by IST date + location, then 24 buckets)
  const buildRows = (list, dateRange, locKey) => {
    const start = dateRange ? new Date(ymd(dateRange[0]) + "T00:00:00") : null;
    const end   = dateRange ? new Date(ymd(dateRange[1]) + "T23:59:59.999") : null;

    const filtered = list.filter((m) => {
      if (!m?.timestamp) return false;

      // location filter
      if (locKey) {
        const mKey = String(m.locationId?._id || m.locationId || m.locationName || "N/A");
        if (String(mKey) !== String(locKey)) return false;
      }

      // date range filter
      const t = new Date(m.timestamp);
      if (start && t < start) return false;
      if (end && t > end) return false;
      return true;
    });

    const map = new Map();
    for (const rec of filtered) {
      const dateStr = istDateStr(rec.timestamp);
      const locName = rec.locationName || "N/A";
      const locKey2 = rec.locationId?._id || rec.locationId || locName;
      const key = `${dateStr}|${String(locKey2)}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          date: dateStr,
          locationName: locName,
          hours: Array(24).fill(0),
          total: 0,
        });
      }
      const row = map.get(key);
      const h = istHour(rec.timestamp);
      if (h >= 0 && h <= 23) {
        row.hours[h] += 1;
        row.total += 1;
      }
    }

    const out = Array.from(map.values()).sort((a, b) => {
      if (a.date === b.date) return a.locationName.localeCompare(b.locationName);
      return a.date < b.date ? -1 : 1;
    });

    setRows(out);
    setPage(1); // reset to first page whenever data rebuilt
    if (!initialized) setInitialized(true);
  };

  // default: page load -> show all (first page in pagination)
  useEffect(() => {
    if (!mealsLoadedRef.current) return;
    buildRows(meals, range, locFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals]);

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
    buildRows(meals, range, locFilter);
  };

  // UPDATED: reliable CSV download (with UTF-8 BOM for Excel)
  const exportCSV = () => {
    if (!rows.length) {
      alert("No rows to export");
      return;
    }
    const header = ["Date", "Location", ...HH_LABELS, "Total"];
    const data = rows.map((r) => [
      r.date,
      r.locationName,
      ...r.hours.map((n) => String(n)),
      String(r.total),
    ]);
    const lines = [header, ...data].map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[\",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    );
    const csv = "\uFEFF" + lines.join("\n"); // BOM helps Excel read UTF-8

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `hourly_meal_counts_${new Date().toISOString().slice(0, 10)}.csv`;

    // IE/Edge Legacy fallback
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
    // clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  // Reset to page 1 whenever pageSize changes
  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  // pagination math (respects pageSize dropdown)
  const isAll = pageSize === "ALL";
  const pageSizeNum = isAll ? (rows.length || 1) : Number(pageSize);

  const totalPages = Math.max(1, isAll ? 1 : Math.ceil(rows.length / pageSizeNum));
  const clampedPage = Math.min(page, totalPages);
  const startIdx = isAll ? 0 : (clampedPage - 1) * pageSizeNum;
  const endIdx = isAll ? rows.length : Math.min(startIdx + pageSizeNum, rows.length);
  const pagedRows = rows.slice(startIdx, endIdx);

  // ----- simple table styles -----
  const cell = { border: "1px solid #ddd", padding: "6px", textAlign: "center" };
  const hcell = { ...cell, background: "#f5f5f5", fontWeight: 600 };
  const lcell = { ...cell, textAlign: "left" };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Hourly Meal Counts
      </h2>

      {/* Filters row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 240px auto auto",
          gap: 8,
          alignItems: "end",
          marginBottom: 8,
        }}
      >
        <div>
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

        <select
          value={locFilter}
          onChange={(e) => setLocFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-2 rounded">
          Search
        </button>

        <button onClick={exportCSV} className="bg-green-500 text-white px-4 py-2 rounded">
          Export CSV
        </button>
      </div>

      {/* NEW: top-right Rows per page control (under filters, above table) */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 6,
          margin: "2px 0 8px",
        }}
      >
        <label
          htmlFor="rowsPerPage"
          style={{ fontSize: 12, color: "#555" }}
        >
          Rows per page:
        </label>
        <select
          id="rowsPerPage"
          aria-label="Rows per page"
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value)}
          className="border p-2 rounded"
          style={{ height: 36 }}
        >
          <option value="ALL">All</option>
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>

      {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={hcell}>Date</th>
              <th style={hcell}>Location</th>
              {HH_LABELS.map((label, i) => (
                <th key={i} style={hcell}>{label}</th>
              ))}
              <th style={hcell}>Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={cell} colSpan={COLS}>Loading…</td></tr>
            ) : !initialized ? (
              <tr><td style={cell} colSpan={COLS}>Preparing data…</td></tr>
            ) : pagedRows.length === 0 ? (
              <tr><td style={cell} colSpan={COLS}>No data found</td></tr>
            ) : (
              pagedRows.map((r) => (
                <tr key={r.key}>
                  <td style={lcell}>{r.date}</td>
                  <td style={lcell}>{r.locationName}</td>
                  {r.hours.map((n, i) => (
                    <td key={i} style={cell}>{n}</td>
                  ))}
                  <td style={{ ...cell, fontWeight: 600 }}>{r.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      {rows.length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 12, color: "#555" }}>
            Showing <strong>{rows.length ? startIdx + 1 : 0}</strong>–
            <strong>{endIdx}</strong> of <strong>{rows.length}</strong> groups
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={clampedPage <= 1}
              className="border px-3 py-1 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span style={{ fontSize: 12 }}>
              Page <strong>{clampedPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={clampedPage >= totalPages}
              className="border px-3 py-1 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
        * Hours computed in Asia/Kolkata (IST).
      </div>
    </div>
  );
}

export default HourlyReport;
