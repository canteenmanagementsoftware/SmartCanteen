import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/auth-context";
import axios from "../utils/axiosConfig";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import dayjs from "dayjs";
import { DateRangePicker } from "rsuite";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Link } from "react-router-dom";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

const RSUITE_CSS_URL = "https://unpkg.com/rsuite/dist/rsuite-no-reset.min.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const animatedComponents = makeAnimated();
const emptyMetrics = { todayUsers: 0, todayFees: 0, totalUsers: 0 };
const idOf = (v) => (v && typeof v === "object" ? v._id || v.id : v);

const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#f59e0b",
  "#06b6d4",
  "#8b5cf6",
  "#10b981",
  "#f97316",
  "#e11d48",
];

const METHOD_COLORS = {
  cash: "#22c55e",
  card: "#3b82f6",
  upi: "#ef4444",
  netbanking: "#a855f7",
};

const toId = (v) =>
  v == null ? "" : String(typeof v === "object" ? v._id ?? v.id ?? v : v);

const MealCollectorDashboard = () => {
  const { user: currentUser } = useContext(AuthContext);

  const disabledSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "#f3f4f6",
      borderColor: "#000000",
      borderColor: "2",
      minHeight: 40,
      boxShadow: "none",
      cursor: "not-allowed",
      "&:hover": { borderColor: "#d1d5db" },
    }),
    singleValue: (base) => ({ ...base, color: "#374151" }),
    placeholder: (base) => ({ ...base, color: "#374151" }),
    input: (base) => ({ ...base, color: "#374151" }),
    multiValue: (base) => ({ ...base, backgroundColor: "#e5e7eb" }), 
    multiValueLabel: (base) => ({ ...base, color: "#374151" }),
    indicatorSeparator: (base) => ({ ...base, display: "none" }),
    dropdownIndicator: (base) => ({ ...base, color: "#6b7280" }), 
  };

  // --------- ROLE / ASSIGNMENTS ----------
  const role = String(
    currentUser?.userType || currentUser?.type || currentUser?.role || ""
  ).toLowerCase();
  const isFixedRole = ["admin", "meal_collector"].includes(role);

  const assignedCompanyId = toId(currentUser?.companyId) || "";

  const assignedPlaceIds =
    Array.isArray(currentUser?.placeIds) && currentUser.placeIds.length
      ? currentUser.placeIds.map(toId)
      : currentUser?.placeId
      ? [toId(currentUser.placeId)]
      : currentUser?.place?._id
      ? [toId(currentUser.place._id)]
      : [];

  const assignedLocationIds = Array.isArray(currentUser?.locationId)
    ? currentUser.locationId.map(toId)
    : currentUser?.location?._id
    ? [toId(currentUser.location._id)]
    : [];

  // --------- CORE STATE ----------
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  const [range, setRange] = useState(null);
  const [chartDate, setChartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [intervalHours] = useState(1);

  const [metrics, setMetrics] = useState(emptyMetrics);
  const [summary, setSummary] = useState([]);
  const [hourlySummary, setHourlySummary] = useState([]);

  const [overview, setOverview] = useState({
    breakfastActual: 0,
    breakfastUtilized: 0,
    lunchActual: 0,
    lunchUtilized: 0,
    dinnerActual: 0,
    dinnerUtilized: 0,
    supperActual: 0,
    supperUtilized: 0,
    lateSnackActual: 0,
    lateSnackUtilized: 0,
    totalUsers: 0,
    locationName: "",
    date: null,
  });

  // --------- FILTERS / DROPDOWNS ----------
  const [companyName, setCompanyName] = useState("");
  const [places, setPlaces] = useState([]); // filtered places (visible to user)
  const [selectedCompany] = useState(assignedCompanyId);

  const [selectedPlace, setSelectedPlace] = useState(""); // dynamic, uses assignedPlaceIds
  const [placeLocked, setPlaceLocked] = useState(false);

  const [locations, setLocations] = useState([]); // [{value,label}]
  const [selectedLocations, setSelectedLocations] = useState([]); // array of {value,label}
  const [locationLocked, setLocationLocked] = useState(false);
  const [locationMulti, setLocationMulti] = useState(false);

  // --------- DONUT STATES ----------
  const [revByLocation, setRevByLocation] = useState([]);
  const [pmTotals, setPmTotals] = useState({
    cash: 0,
    card: 0,
    upi: 0,
    netbanking: 0,
  });

  // --------- CSS (RSuite) ----------
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

  // --------- HELPERS ----------
  const handleDateChange = (value) => {
    setRange(value);
    if (value && value.length) {
      setChartDate(dayjs(value[0]).format("YYYY-MM-DD"));
    } else {
      setChartDate(dayjs().format("YYYY-MM-DD"));
    }
  };

  const getChartRange = (centerDate) => {
    const fromDate = dayjs(centerDate).subtract(3, "day").format("YYYY-MM-DD");
    const toDate = dayjs(centerDate).add(3, "day").format("YYYY-MM-DD");
    return { fromDate, toDate };
  };

  // generic fetcher with fallback for locations
  const fetchLocationsRaw = async (placeId) => {
    try {
      let res = await axios.get(`/locations?placeId=${placeId}`);
      let data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      if (!data.length) {
        res = await axios.get(`/locations/getlocation/${placeId}`);
        data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      }
      return data;
    } catch {
      return [];
    }
  };

  const loadLocationsForPlace = async (placeId) => {
    const raw = await fetchLocationsRaw(placeId);

    const visible =
      isFixedRole && assignedLocationIds.length
        ? raw.filter((l) => assignedLocationIds.includes(toId(l._id)))
        : raw;

    const formatted = visible.map((l) => ({
      value: toId(l._id),
      label: l.locationName,
    }));
    setLocations(formatted);

    const isSingleOption = formatted.length === 1;
    const isSingleAssigned = isFixedRole && assignedLocationIds.length === 1;
    const shouldLockLocation = isSingleOption || isSingleAssigned;

    setLocationLocked(shouldLockLocation);
    setLocationMulti(!shouldLockLocation && formatted.length > 1);

    if (shouldLockLocation) {
      const only = isSingleAssigned
        ? formatted.find((x) => x.value === assignedLocationIds[0]) ||
          formatted[0]
        : formatted[0];
      setSelectedLocations(only ? [only] : []);
    } else {
      if (isFixedRole && assignedLocationIds.length > 1) {
        const picks = formatted.filter((x) =>
          assignedLocationIds.includes(x.value)
        );
        setSelectedLocations(picks);
      } else {
        setSelectedLocations([]);
      }
    }
  };

  const handlePlaceChange = async (e) => {
    const placeId = e.target.value;
    setSelectedPlace(placeId);
    setSelectedLocations([]);
    if (placeId) await loadLocationsForPlace(placeId);
    else {
      setLocations([]);
      setLocationLocked(false);
    }
  };

  // --------- INIT ----------
  useEffect(() => {
    (async () => {
      try {
        if (!assignedCompanyId) {
          setError("No company assigned to your account.");
          setInitialLoading(false);
          return;
        }

        // Company Name
        try {
          const res = await axios.get("/company");
          const list = Array.isArray(res.data)
            ? res.data
            : res.data?.data || [];
          const mine = list.find(
            (c) => String(c._id) === String(assignedCompanyId)
          );
          setCompanyName(mine?.name || "My Company");
        } catch {
          setCompanyName("My Company");
        }

        // All places for this company
        const placesRes = await axios.get(
          `/places/company/${assignedCompanyId}`
        );

        const placesData = Array.isArray(placesRes.data)
          ? placesRes.data
          : placesRes.data?.data || [];

        let visiblePlaces = placesData;
        if (isFixedRole && assignedPlaceIds.length) {
          const allow = new Set(assignedPlaceIds);
          visiblePlaces = placesData.filter((p) => allow.has(toId(p._id)));
        }
        setPlaces(visiblePlaces);

        // (we won't lock Place; user can change Place)
        setPlaceLocked(false);

        // selectedPlace set/update
        let useId = selectedPlace;
        if (
          !useId ||
          !visiblePlaces.find((p) => String(p._id) === String(useId))
        ) {
          useId = toId(visiblePlaces[0]?._id) || "";
        }
        setSelectedPlace(useId);

        // locations load
        if (useId) await loadLocationsForPlace(useId);
        else {
          setLocations([]);
          setSelectedLocations([]);
        }
      } catch (e) {
        setError(
          e?.response?.data?.message || "Failed to initialize dashboard."
        );
      } finally {
        setInitialLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedCompanyId]);

  // --------- API CALLS ----------
  const fetchMetrics = async (locationIds) => {
    try {
      const params = {
        companyId: assignedCompanyId,
        placeId: selectedPlace,
        locationIds,
        ...(range && { fromDate: range[0], toDate: range[1] }),
        ...(chartDate && { date: chartDate }),
      };
      const res = await axios.get("/dashboard/metrics", { params });
      setMetrics({
        todayUsers: res.data.todayUsers || 0,
        todayFees: res.data.todayFees || 0,
        totalUsers: res.data.totalUsers || 0,
      });
    } catch (err) {
      console.error("metrics error:", err);
      setMetrics(emptyMetrics);
    }
  };

  const fetchSummary = async () => {
    if (
      !assignedCompanyId ||
      !selectedPlace ||
      selectedLocations.length === 0
    ) {
      setSummary([]);
      return;
    }
    try {
      const { fromDate, toDate } = getChartRange(chartDate);
      const params = {
        fromDate,
        toDate,
        companyId: assignedCompanyId,
        placeId: selectedPlace,
        locationIds: selectedLocations.map((l) => l.value),
      };
      const res = await axios.get("/dashboard/summary", { params });
      setSummary(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("summary error:", err);
      setSummary([]);
    }
  };

  const fetchSummaryHourly = async () => {
    if (
      !assignedCompanyId ||
      !selectedPlace ||
      selectedLocations.length === 0
    ) {
      setHourlySummary([]);
      return;
    }
    try {
      let fromDate, toDate;
      if (range && Array.isArray(range) && range.length === 2) {
        fromDate = dayjs(range[0]).toISOString();
        toDate = dayjs(range[1]).toISOString();
      } else {
        const start = dayjs(chartDate).startOf("day");
        fromDate = start.toISOString();
        toDate = start.add(1, "day").toISOString();
      }
      const params = {
        fromDate,
        toDate,
        intervalHours: 1,
        companyId: assignedCompanyId,
        placeId: selectedPlace,
        locationIds: selectedLocations.map((l) => l.value),
      };
      const res = await axios.get("/dashboard/summary", { params });
      setHourlySummary(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("hourly error:", err);
      setHourlySummary([]);
    }
  };

  const fetchOverview = async () => {
    if (!assignedCompanyId || !selectedPlace || selectedLocations.length === 0)
      return;
    try {
      const response = await axios.get("/dashboard/overview", {
        params: {
          companyId: assignedCompanyId,
          placeId: selectedPlace,
          locationIds: selectedLocations.map((l) => l.value),
          ...(range && { fromDate: range[0], toDate: range[1] }),
          ...(chartDate && { fromDate: chartDate, toDate: chartDate }),
        },
      });
      if (response.data?.success) setOverview(response.data.data || {});
      else setOverview({});
    } catch {
      setOverview({});
    }
  };

  const fetchRevenueByLocation = async () => {
    if (
      !assignedCompanyId ||
      !selectedPlace ||
      selectedLocations.length === 0
    ) {
      setRevByLocation([]);
      return;
    }
    try {
      let fromDate, toDate;
      if (range && Array.isArray(range) && range.length === 2) {
        fromDate = dayjs(range[0]).format("YYYY-MM-DD");
        toDate = dayjs(range[1]).format("YYYY-MM-DD");
      } else {
        fromDate = chartDate;
        toDate = chartDate;
      }
      const params = {
        fromDate,
        toDate,
        companyId: assignedCompanyId,
        placeId: selectedPlace,
        locationIds: selectedLocations.map((l) => l.value),
      };
      const res = await axios.get("/dashboard/revenue-by-location", { params });
      const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      setRevByLocation(rows);
    } catch (e) {
      console.error("revenue-by-location error:", e);
      setRevByLocation([]);
    }
  };

  const fetchPaymentAmountsTotals = async () => {
    if (
      !assignedCompanyId ||
      !selectedPlace ||
      selectedLocations.length === 0
    ) {
      setPmTotals({ cash: 0, card: 0, upi: 0, netbanking: 0 });
      return;
    }
    try {
      let fromDate, toDate;
      if (range && Array.isArray(range) && range.length === 2) {
        fromDate = dayjs(range[0]).format("YYYY-MM-DD");
        toDate = dayjs(range[1]).format("YYYY-MM-DD");
      } else {
        fromDate = chartDate;
        toDate = chartDate;
      }
      const params = {
        fromDate,
        toDate,
        companyId: assignedCompanyId,
        placeId: selectedPlace,
        locationIds: selectedLocations.map((l) => l.value),
      };
      const res = await axios.get("/dashboard/payment-amounts-daily", {
        params,
      });
      const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      const totals = rows.reduce(
        (acc, r) => {
          const k = String(r.method || "").toLowerCase();
          const v = Number(r.totalAmount || 0);
          if (k === "cash") acc.cash += v;
          else if (k === "card") acc.card += v;
          else if (k === "upi") acc.upi += v;
          else if (k === "netbanking") acc.netbanking += v;
          return acc;
        },
        { cash: 0, card: 0, upi: 0, netbanking: 0 }
      );
      setPmTotals(totals);
    } catch (e) {
      console.error("payment-amounts-daily error:", e);
      setPmTotals({ cash: 0, card: 0, upi: 0, netbanking: 0 });
    }
  };

  // --------- REFRESH ON FILTER CHANGE ----------
  useEffect(() => {
    if (selectedPlace && selectedLocations.length > 0) {
      const locIds = selectedLocations.map((l) => l.value);
      fetchMetrics(locIds);
      fetchSummary();
      fetchSummaryHourly();
      fetchOverview();
      fetchRevenueByLocation();
      fetchPaymentAmountsTotals();
    } else {
      setMetrics(emptyMetrics);
      setSummary([]);
      setHourlySummary([]);
      setOverview({});
      setRevByLocation([]);
      setPmTotals({ cash: 0, card: 0, upi: 0, netbanking: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlace, selectedLocations, range, chartDate]);

  // --------- CHART DATA ----------
  const chartData = useMemo(() => {
    const labels = summary.map((item) => {
      const parsedDate = dayjs(item.date);
      return parsedDate.isValid() ? parsedDate.format("DD/MM") : "Invalid";
    });
    return {
      labels,
      datasets: [
        {
          label: "Breakfast",
          data: summary.map((i) => Number(i.breakfast || 0)),
          backgroundColor: "#6366f1",
        },
        {
          label: "Lunch",
          data: summary.map((i) => Number(i.lunch || 0)),
          backgroundColor: "#4f46e5",
        },
        {
          label: "Supper",
          data: summary.map((i) => Number(i.supper || 0)),
          backgroundColor: "#a78bfa",
        },
        {
          label: "Dinner",
          data: summary.map((i) => Number(i.dinner || 0)),
          backgroundColor: "#f0abfc",
        },
        {
          label: "Late Snack",
          data: summary.map((i) => Number(i.lateSnack || 0)),
          backgroundColor: "#f472b6",
        },
      ],
    };
  }, [summary]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Meal Summary Over Days" },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  const chartDataHourly = useMemo(() => {
    const labels = hourlySummary.map((b) => {
      const start = dayjs(b.date);
      const end = start.add(intervalHours, "hour");
      return `${start.format("HH:mm")}–${end.format("HH:mm")}`;
    });
    return {
      labels,
      datasets: [
        {
          label: "Breakfast",
          data: hourlySummary.map((b) => Number(b.breakfast || 0)),
          backgroundColor: "#6366f1",
        },
        {
          label: "Lunch",
          data: hourlySummary.map((b) => Number(b.lunch || 0)),
          backgroundColor: "#4f46e5",
        },
        {
          label: "Supper",
          data: hourlySummary.map((b) => Number(b.supper || 0)),
          backgroundColor: "#a78bfa",
        },
        {
          label: "Dinner",
          data: hourlySummary.map((b) => Number(b.dinner || 0)),
          backgroundColor: "#f0abfc",
        },
        {
          label: "Late Snack",
          data: hourlySummary.map((b) => Number(b.lateSnack || 0)),
          backgroundColor: "#f472b6",
        },
      ],
    };
  }, [hourlySummary, intervalHours]);

  const chartOptionsHourly = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: `Meal Summary (Every ${intervalHours}h)` },
      tooltip: {
        callbacks: {
          title(items) {
            return items?.[0]?.label || "";
          },
        },
      },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  // revenue donut
  const revenueDonutData = useMemo(() => {
    if (!revByLocation.length) {
      return {
        labels: ["No revenue"],
        datasets: [{ data: [1], backgroundColor: ["#e5e7eb"], borderWidth: 0 }],
      };
    }
    const labels = revByLocation.map((r) => r.locationName || "Location");
    const data = revByLocation.map((r) => Number(r.total || 0));
    const sum = data.reduce((a, b) => a + (Number(b) || 0), 0);
    if (sum === 0) {
      return {
        labels: ["No revenue"],
        datasets: [{ data: [1], backgroundColor: ["#e5e7eb"], borderWidth: 0 }],
      };
    }
    const colors =
      revByLocation.length === 1
        ? ["#3b82f6"]
        : PALETTE.slice(0, revByLocation.length);
    return {
      labels,
      datasets: [
        { data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 },
      ],
    };
  }, [revByLocation]);

  const revenueDonutOptions = {
    responsive: true,
    cutout: "60%",
    plugins: {
      legend: { position: "right" },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ` ${ctx.label}: ₹${Number(ctx.raw || 0).toLocaleString("en-IN")}`,
        },
      },
      title: { display: true, text: "Revenue share by Location" },
    },
  };

  // center total plugin
  const centerTotalPlugin = {
    id: "centerTotal",
    afterDraw(chart) {
      const labels = chart.data?.labels || [];
      if (labels.length === 1 && labels[0] === "No revenue") return;
      const ds = chart.data?.datasets?.[0];
      if (!ds || !ds.data || !ds.data.length) return;
      const total = ds.data.reduce((a, b) => a + (Number(b) || 0), 0);
      const meta = chart.getDatasetMeta(0);
      const firstArc = meta?.data?.[0];
      if (!firstArc) return;
      const { x, y } = firstArc;
      const ctx = chart.ctx;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#111";
      ctx.fillText(`₹${Math.round(total).toLocaleString("en-IN")}`, x, y);
      ctx.restore();
    },
  };

  // payment split donut
  const methodDonutData = useMemo(() => {
    const vals = [
      pmTotals.cash || 0,
      pmTotals.card || 0,
      pmTotals.upi || 0,
      pmTotals.netbanking || 0,
    ];
    const total = vals.reduce((a, b) => a + b, 0);
    if (total === 0) {
      return {
        labels: ["No revenue"],
        datasets: [{ data: [1], backgroundColor: ["#e5e7eb"], borderWidth: 0 }],
      };
    }
    return {
      labels: ["Cash", "Card", "UPI", "Net Banking"],
      datasets: [
        {
          data: vals,
          backgroundColor: [
            METHOD_COLORS.cash,
            METHOD_COLORS.card,
            METHOD_COLORS.upi,
            METHOD_COLORS.netbanking,
          ],
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    };
  }, [pmTotals]);

  const methodDonutOptions = {
    responsive: true,
    cutout: "65%",
    plugins: {
      legend: { position: "bottom" },
      title: {
        display: true,
        text:
          selectedLocations.length === 1
            ? `Payment Split — ${selectedLocations[0]?.label || "Location"}`
            : "Payment Split — Selected (Combined)",
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ` ${ctx.label}: ₹${Number(ctx.raw || 0).toLocaleString("en-IN")}`,
        },
      },
    },
  };

  // --------- RENDER ----------
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gray-800 mb-2">
                    Welcome back, {currentUser?.name || "Meal Collector"}! 🍽️
                  </h1>
                  <p className="text-xl text-gray-600">
                    Meal Collector Dashboard
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Capture & monitor collections
                  </p>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 rounded-full">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:grid md:grid-cols-4 gap-4 mb-6">
            {/* Date range */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Date Range
              </label>
              <DateRangePicker
                className="w-full"
                value={range}
                onChange={handleDateChange}
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
                      new Date(Date.now() - 86400000),
                      new Date(Date.now() - 86400000),
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

            {/* Company (as-is) */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Company
              </label>
              <select
                value={selectedCompany}
                disabled
                className="border p-2 rounded w-full bg-gray-100 text-gray-700 cursor-not-allowed"
              >
                <option value={selectedCompany}>
                  {companyName || "My Company"}
                </option>
              </select>
            </div>

            {/* Place (ENABLED now) */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Place</label>
              <select
                value={selectedPlace}
                disabled
                className="border p-2 rounded w-full bg-gray-100 text-gray-700 cursor-not-allowed"
              >
                {!selectedPlace && <option value="">Select Place</option>}
                {places.map((p) => (
                  <option key={String(p._id)} value={String(p._id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location (ONLY DISABLED) */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Location{locationMulti ? "s" : ""}
              </label>
              <Select
                components={animatedComponents}
                isMulti={locationMulti}
                isSearchable={false}
                options={locations}
                value={
                  locationMulti
                    ? selectedLocations
                    : selectedLocations[0] || null
                }
                isDisabled={true}
                placeholder="Assigned Location"
                styles={disabledSelectStyles}
                className="cursor-not-allowed"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">
                Today's Users
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {metrics.todayUsers}
              </p>
            </div>
            <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">
                Today's Revenue
              </h3>
              <p className="text-3xl font-bold text-green-600">
                ₹{Number(metrics.todayFees || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
              <p className="text-3xl font-bold text-purple-600">
                {metrics.totalUsers}
              </p>
            </div>
          </div>

          {/* Daily stacked chart */}
          <div className="bg-white p-6 shadow rounded-lg mb-6">
            <Bar data={chartData} options={chartOptions} />
          </div>

          {/* Overview Table */}
          <div className="bg-white shadow rounded-lg overflow-x-auto mb-6">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-black text-white text-sm">
                  <th className="px-4 py-2 text-left">LOCATION</th>
                  <th className="px-4 py-2 text-center" colSpan={2}>
                    BREAKFAST
                  </th>
                  <th className="px-4 py-2 text-center" colSpan={2}>
                    LUNCH
                  </th>
                  <th className="px-4 py-2 text-center" colSpan={2}>
                    SUPPER
                  </th>
                  <th className="px-4 py-2 text-center" colSpan={2}>
                    DINNER
                  </th>
                </tr>
                <tr className="bg-black text-white text-xs">
                  <th></th>
                  <th className="px-2 py-1 text-center">Actual</th>
                  <th className="px-2 py-1 text-center">Utilized</th>
                  <th className="px-2 py-1 text-center">Actual</th>
                  <th className="px-2 py-1 text-center">Utilized</th>
                  <th className="px-2 py-1 text-center">Actual</th>
                  <th className="px-2 py-1 text-center">Utilized</th>
                  <th className="px-2 py-1 text-center">Actual</th>
                  <th className="px-2 py-1 text-center">Utilized</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2">
                    {locationMulti
                      ? selectedLocations.map((l) => l.label).join(", ") ||
                        "N/A"
                      : selectedLocations[0]?.label || "N/A"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {overview.breakfastActual}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {overview.breakfastUtilized}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {overview.lunchActual}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {overview.lunchUtilized}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {overview.supperActual}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {overview.supperUtilized}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {overview.dinnerActual}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {overview.dinnerUtilized}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Hourly buckets */}
          <div className="bg-white p-6 shadow rounded-lg mb-6">
            <Bar data={chartDataHourly} options={chartOptionsHourly} />
          </div>

          {/* Revenue by Location + Payment Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div
              className="bg-white p-6 shadow rounded-lg"
              style={{ height: 320 }}
            >
              <div style={{ width: "100%", height: "100%" }}>
                <Doughnut
                  data={revenueDonutData}
                  options={{
                    ...revenueDonutOptions,
                    maintainAspectRatio: false,
                  }}
                  plugins={[centerTotalPlugin]}
                />
              </div>
            </div>
            <div
              className="bg-white p-6 shadow rounded-lg"
              style={{ height: 320 }}
            >
              <div style={{ width: "100%", height: "100%" }}>
                <Doughnut
                  data={methodDonutData}
                  options={{
                    ...methodDonutOptions,
                    maintainAspectRatio: false,
                  }}
                  plugins={[centerTotalPlugin]}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                <Link to="/report/visitor" className="block">
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center mb-4">
                      <div className="bg-orange-500 p-2 rounded-lg">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 ml-3">
                        Meal Collection
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Capture meal entries for users quickly and efficiently
                    </p>
                  </div>
                </Link>

                <Link to="/report/exceptional" className="block">
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-4">
                      <div className="bg-green-500 p-2 rounded-lg">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 ml-3">
                        View History
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Access meal history and past collections
                    </p>
                  </div>
                </Link>

                <Link to="/users" className="block">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-4">
                      <div className="bg-blue-500 p-2 rounded-lg">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 ml-3">
                        User Search
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Quickly find and verify user information
                    </p>
                  </div>
                </Link>

                <Link to="/report/daily-utilized" className="block">
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-4">
                      <div className="bg-purple-500 p-2 rounded-lg">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 ml-3">
                        Daily Reports
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Generate daily collection reports
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Activity (sample UI) */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Recent Activity
              </h2>
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="bg-green-500 p-2 rounded-full">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      Meal collected for John Doe
                    </p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="bg-blue-500 p-2 rounded-full">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      New user registered: Jane Smith
                    </p>
                    <p className="text-xs text-gray-500">15 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="bg-orange-500 p-2 rounded-full">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      Daily collection started
                    </p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealCollectorDashboard;

// import React, { useContext } from "react";
// import { AuthContext } from "../context/auth-context";

// const MealCollectorDashboard = () => {
//   const { user: currentUser } = useContext(AuthContext);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
//       <div className="p-6">
//         <div className="max-w-6xl mx-auto">
//           {/* Header Section */}
//           <div className="mb-8">
//             <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <h1 className="text-4xl font-bold text-gray-800 mb-2">
//                     Welcome back, {currentUser?.name || 'Meal Collector'}! 🍽️
//                   </h1>
//                   <p className="text-xl text-gray-600">
//                     Meal Collector Dashboard
//                   </p>
//                   <p className="text-sm text-gray-500 mt-2">
//                     Capture meal entries and manage collections efficiently
//                   </p>
//                 </div>
//                 <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 rounded-full">
//                   <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
//                   </svg>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Quick Stats */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//             <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
//               <div className="flex items-center">
//                 <div className="bg-orange-100 p-3 rounded-lg">
//                   <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//                   </svg>
//                 </div>
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-600">Today's Collections</p>
//                   <p className="text-2xl font-bold text-gray-900">156</p>
//                 </div>
//               </div>
//             </div>

//             <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
//               <div className="flex items-center">
//                 <div className="bg-green-100 p-3 rounded-lg">
//                   <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                   </svg>
//                 </div>
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-600">Successful Entries</p>
//                   <p className="text-2xl font-bold text-gray-900">142</p>
//                 </div>
//               </div>
//             </div>

//             <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
//               <div className="flex items-center">
//                 <div className="bg-blue-100 p-3 rounded-lg">
//                   <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//                   </svg>
//                 </div>
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-600">Total Users</p>
//                   <p className="text-2xl font-bold text-gray-900">1,234</p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Features Grid */}
//           <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
//             <h2 className="text-2xl font-bold text-gray-800 mb-6">Quick Actions</h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//               <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 hover:shadow-md transition-shadow">
//                 <div className="flex items-center mb-4">
//                   <div className="bg-orange-500 p-2 rounded-lg">
//                     <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
//                     </svg>
//                   </div>
//                   <h3 className="text-lg font-semibold text-gray-800 ml-3">Meal Collection</h3>
//                 </div>
//                 <p className="text-gray-600 text-sm">Capture meal entries for users quickly and efficiently</p>
//               </div>

//               <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 hover:shadow-md transition-shadow">
//                 <div className="flex items-center mb-4">
//                   <div className="bg-green-500 p-2 rounded-lg">
//                     <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
//                     </svg>
//                   </div>
//                   <h3 className="text-lg font-semibold text-gray-800 ml-3">View History</h3>
//                 </div>
//                 <p className="text-gray-600 text-sm">Access meal history and past collections</p>
//               </div>

//               <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
//                 <div className="flex items-center mb-4">
//                   <div className="bg-blue-500 p-2 rounded-lg">
//                     <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                     </svg>
//                   </div>
//                   <h3 className="text-lg font-semibold text-gray-800 ml-3">User Search</h3>
//                 </div>
//                 <p className="text-gray-600 text-sm">Quickly find and verify user information</p>
//               </div>

//               <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 hover:shadow-md transition-shadow">
//                 <div className="flex items-center mb-4">
//                   <div className="bg-purple-500 p-2 rounded-lg">
//                     <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                     </svg>
//                   </div>
//                   <h3 className="text-lg font-semibold text-gray-800 ml-3">Daily Reports</h3>
//                 </div>
//                 <p className="text-gray-600 text-sm">Generate daily collection reports</p>
//               </div>

//               <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-xl border border-red-200 hover:shadow-md transition-shadow">
//                 <div className="flex items-center mb-4">
//                   <div className="bg-red-500 p-2 rounded-lg">
//                     <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
//                     </svg>
//                   </div>
//                   <h3 className="text-lg font-semibold text-gray-800 ml-3">Error Handling</h3>
//                 </div>
//                 <p className="text-gray-600 text-sm">Handle collection errors and exceptions</p>
//               </div>

//               <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-200 hover:shadow-md transition-shadow">
//                 <div className="flex items-center mb-4">
//                   <div className="bg-indigo-500 p-2 rounded-lg">
//                     <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                     </svg>
//                   </div>
//                   <h3 className="text-lg font-semibold text-gray-800 ml-3">Settings</h3>
//                 </div>
//                 <p className="text-gray-600 text-sm">Configure collection preferences and settings</p>
//               </div>
//             </div>
//           </div>

//           {/* Recent Activity */}
//           <div className="mt-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
//             <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Activity</h2>
//             <div className="space-y-4">
//               <div className="flex items-center p-4 bg-gray-50 rounded-lg">
//                 <div className="bg-green-500 p-2 rounded-full">
//                   <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                   </svg>
//                 </div>
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-900">Meal collected for John Doe</p>
//                   <p className="text-xs text-gray-500">2 minutes ago</p>
//                 </div>
//               </div>

//               <div className="flex items-center p-4 bg-gray-50 rounded-lg">
//                 <div className="bg-blue-500 p-2 rounded-full">
//                   <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
//                   </svg>
//                 </div>
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-900">New user registered: Jane Smith</p>
//                   <p className="text-xs text-gray-500">15 minutes ago</p>
//                 </div>
//               </div>

//               <div className="flex items-center p-4 bg-gray-50 rounded-lg">
//                 <div className="bg-orange-500 p-2 rounded-full">
//                   <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//                   </svg>
//                 </div>
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-900">Daily collection started</p>
//                   <p className="text-xs text-gray-500">1 hour ago</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MealCollectorDashboard;
