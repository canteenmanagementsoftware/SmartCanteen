import { useEffect, useMemo, useState } from "react";
import axios from "../utils/axiosConfig";
import { useAuth } from "../hooks/useAuth";
import Select from "react-select";
import makeAnimated from "react-select/animated";
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
import dayjs from "dayjs";
import { DateRangePicker } from "rsuite";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

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

const emptyMetrics = { todayUsers: 0, todayFees: 0, totalUsers: 0 };

const idOf = (v) => (v && typeof v === "object" ? v._id || v.id : v);

const Dashboard = () => {
  const animatedComponents = makeAnimated();
  const { user } = useAuth();

  // --- STATE ---
  const [range, setRange] = useState(null);
  const [chartDate, setChartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [summary, setSummary] = useState([]);
  // NEW: hourly chart state & controls
  const [hourlySummary, setHourlySummary] = useState([]);
  const [intervalHours, setIntervalHours] = useState(1); // 2 or 4 (or anything)

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

  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedPlace, setSelectedPlace] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revByLocation, setRevByLocation] = useState([]);
  // stable palette
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

  const [pmTotals, setPmTotals] = useState({
    cash: 0,
    card: 0,
    upi: 0,
    netbanking: 0,
  });

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

  // DateRangePicker or ChartDate Selection
  const handleDateChange = (value) => {
    // If range is selected, update the range state
    setRange(value);

    // If a specific date is selected, update the chartDate state
    if (value && value.length) {
      const fromDate = dayjs(value[0]).format("YYYY-MM-DD");
      setChartDate(fromDate);
    } else {
      // Handle clearing the range (e.g., show "Today" by default)
      setChartDate(dayjs().format("YYYY-MM-DD"));
    }
  };

  const revenueDonutData = useMemo(() => {
    // no rows -> placeholder
    if (!revByLocation.length) {
      return {
        labels: ["No revenue"],
        datasets: [{ data: [1], backgroundColor: ["#e5e7eb"], borderWidth: 0 }],
      };
    }
    const labels = revByLocation.map((r) => r.locationName || "Location");
    const data = revByLocation.map((r) => Number(r.total || 0));
    const sum = data.reduce((a, b) => a + (Number(b) || 0), 0);

    // all zeros -> placeholder
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

  // center total ₹ plugin
  const centerTotalPlugin = {
    id: "centerTotal",
    afterDraw(chart) {
      // skip center text for placeholder ring
      const labels = chart.data?.labels || [];
      if (labels.length === 1 && labels[0] === "No revenue") return;
      const ds = chart.data?.datasets?.[0];
      if (!ds || !ds.data || !ds.data.length) return;
      const total = ds.data.reduce((a, b) => a + (Number(b) || 0), 0);
      const meta = chart.getDatasetMeta(0);
      const firstArc = meta?.data?.[0];
      if (!firstArc) return;
      const { x, y } = firstArc; // center of the doughnut
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

  const revenueDonutOptions = {
    responsive: true,
    cutout: "60%", // doughnut (ring) look
    plugins: {
      legend: { position: "right" },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = Number(ctx.raw || 0);
            return ` ${ctx.label}: ₹${v.toLocaleString("en-IN")}`;
          },
        },
      },
      title: { display: true, text: "Revenue share by Location" },
    },
  };

  // --- API CALLS ---

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

  const fetchPaymentAmountsTotals = async () => {
    if (!selectedCompany || !selectedPlace || selectedLocations.length === 0) {
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
        companyId: selectedCompany,
        placeId: selectedPlace,
        // NOTE: single location -> usi ka split, multiple -> combined split
        locationIds: selectedLocations.map((l) => l.value),
      };

      const res = await axios.get("/dashboard/payment-amounts-daily", {
        params,
      });
      const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      const totals = rows.reduce(
        (acc, r) => {
          const k = String(r.method || "").toLowerCase(); // 'cash'|'card'|'upi'|'netbanking'
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
      console.error("Error fetching payment-amounts totals:", e);
      setPmTotals({ cash: 0, card: 0, upi: 0, netbanking: 0 });
    }
  };

  const fetchRevenueByLocation = async () => {
    if (!selectedCompany || !selectedPlace || selectedLocations.length === 0) {
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
        companyId: selectedCompany,
        placeId: selectedPlace,
        locationIds: selectedLocations.map((l) => l.value),
      };

      const res = await axios.get("/dashboard/revenue-by-location", { params });
      const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      setRevByLocation(rows);
    } catch (e) {
      console.error("Error fetching revenue-by-location:", e);
      setRevByLocation([]);
    }
  };

  const fetchCompanies = async () => {
    const res = await axios.get("/company");
    const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
    setCompanies(list);
    return list;
  };

  const loadPlaces = async (companyId) => {
    if (!companyId) return setPlaces([]);
    const res = await axios.get(`/places/company/${companyId}`);
    const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
    setPlaces(data);
  };

  const loadLocationsForPlace = async (placeId) => {
    if (!placeId) return setLocations([]);
    try {
      const res = await axios.get(`/locations?placeId=${placeId}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const formattedLocations = data.map((location) => ({
        value: location._id,
        label: location.locationName,
      }));
      setLocations(formattedLocations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
    }
  };

  const fetchMetrics = async (locationIds) => {
    try {
      const params = {
        companyId: selectedCompany,
        placeId: selectedPlace,
        locationIds: locationIds,
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
      console.error("Error fetching metrics:", err);
    }
  };

  const fetchSummary = async () => {
    if (!selectedCompany || !selectedPlace || selectedLocations.length === 0)
      return setSummary([]);
    try {
      const { fromDate, toDate } = getChartRange(chartDate);
      const params = {
        fromDate,
        toDate,
        companyId: selectedCompany,
        placeId: selectedPlace,
        locationIds: selectedLocations.map((loc) => loc.value),
      };
      const res = await axios.get("/dashboard/summary", { params });
      console.log(res.data);
      setSummary(res.data || []);
    } catch (err) {
      console.error("Error fetching summary:", err);
      setSummary([]);
    }
  };

  // ADD: alongside your existing effect that calls fetchSummary()
  useEffect(() => {
    if (selectedLocations.length > 0) {
      fetchSummaryHourly();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocations, range, chartDate, intervalHours]);

  // NEW: fetch hourly buckets without touching your old fetchSummary()
  const fetchSummaryHourly = async () => {
    if (!selectedCompany || !selectedPlace || selectedLocations.length === 0) {
      setHourlySummary([]);
      return;
    }

    try {
      let fromDate, toDate;

      // If user selected a range in RSuite DateRangePicker
      if (range && Array.isArray(range) && range.length === 2) {
        fromDate = dayjs(range[0]).toISOString();
        toDate = dayjs(range[1]).toISOString();
      } else {
        // For a single selected date, from start of day to next day
        const start = dayjs(chartDate).startOf("day");
        fromDate = start.toISOString();
        toDate = start.add(1, "day").toISOString();
      }

      const params = {
        fromDate,
        toDate,
        intervalHours: 1, // Set interval for hourly data
        companyId: selectedCompany,
        placeId: selectedPlace,
        locationIds: selectedLocations.map((loc) => loc.value),
      };

      const res = await axios.get("/dashboard/summary", { params });
      console.log("---------res.data------", res.data);
      setHourlySummary(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching hourly summary:", err);
      setHourlySummary([]);
    }
  };

  // NEW: hourly chart data

  const chartDataHourly = useMemo(() => {
    // labels = each bucket's start time window, e.g. "10:00–12:00"
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

  // NEW: hourly chart options — category x-axis (no time scale, no adapter)
  const chartOptionsHourly = {
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: `Meal Summary (Every ${intervalHours}h)` },
      tooltip: {
        callbacks: {
          // optional: nicer tooltip
          title(items) {
            return items?.[0]?.label || "";
          },
        },
      },
    },
    scales: {
      x: { stacked: true }, // category axis; labels are our formatted strings
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          // user counts usually small per bucket; show integers
          precision: 0,
        },
      },
    },
  };

  const fetchOverview = async () => {
    if (!selectedCompany || !selectedPlace || selectedLocations.length === 0)
      return;
    try {
      const response = await axios.get("/dashboard/overview", {
        params: {
          companyId: selectedCompany,
          placeId: selectedPlace,
          locationIds: selectedLocations.map((loc) => loc.value),
          ...(range && { fromDate: range[0], toDate: range[1] }),
          ...(chartDate && { fromDate: chartDate, toDate: chartDate }),
        },
      });
      if (response.data?.success) {
        setOverview(response.data.data || {});
      } else {
        setOverview({});
      }
    } catch (err) {
      setOverview({});
    }
  };

  const getChartRange = (centerDate) => {
    const from = dayjs(centerDate).subtract(3, "day").format("YYYY-MM-DD");
    const to = dayjs(centerDate).add(3, "day").format("YYYY-MM-DD");
    return { fromDate: from, toDate: to };
  };

  // --- EFFECTS ---
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No authentication token found. Please login again.");
          return;
        }

        await fetchCompanies();
        const role = (user?.role || "").toLowerCase();
        const userCompanyId = idOf(user?.companyId);
        const userPlaceId = idOf(user?.placeId);
        const userLocationId = idOf(user?.locationId);

        if (role === "admin" && userCompanyId) {
          setSelectedCompany(userCompanyId);
          await loadPlaces(userCompanyId);
          if (userPlaceId) {
            setSelectedPlace(userPlaceId);
            await loadLocationsForPlace(userPlaceId);
            if (userLocationId) {
              setSelectedLocation(userLocationId);
            }
          }
        }
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load companies.");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedLocations.length > 0) {
      const locationIds = selectedLocations.map((loc) => loc.value);
      fetchMetrics(locationIds);
      fetchSummary();
      fetchOverview();
      fetchRevenueByLocation();
      fetchPaymentAmountsTotals();
    }
  }, [selectedLocations, range, chartDate, intervalHours]);

  // --- HANDLERS ---
  const handleCompanyChange = async (e) => {
    const companyId = e.target.value;
    setSelectedCompany(companyId);
    setSelectedPlace("");
    setSelectedLocation("");
    setPlaces([]);
    setLocations([]);
    setMetrics(emptyMetrics);
    setSummary([]);
    setOverview({});
    if (companyId) await loadPlaces(companyId);
  };

  const handlePlaceChange = async (e) => {
    const placeId = e.target.value;
    setSelectedPlace(placeId);
    setSelectedLocation("");
    setSelectedLocations([]);
    if (placeId) await loadLocationsForPlace(placeId);
    else setLocations([]);
  };

  const handleLocationChange = (selectedOptions) => {
    setSelectedLocations(selectedOptions);
    const locationIds = selectedOptions.map((loc) => loc.value);
    fetchMetrics(locationIds);
  };

  // --- CHART DATA ---

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
          data: summary.map((item) => Number(item.breakfast || 0)),
          backgroundColor: "#6366f1",
        },
        {
          label: "Lunch",
          data: summary.map((item) => Number(item.lunch || 0)),
          backgroundColor: "#4f46e5",
        },
        {
          label: "Supper",
          data: summary.map((item) => Number(item.supper || 0)),
          backgroundColor: "#a78bfa",
        },
        {
          label: "Dinner",
          data: summary.map((item) => Number(item.dinner || 0)),
          backgroundColor: "#f0abfc",
        },
        {
          label: "Late Snack",
          data: summary.map((item) => Number(item.lateSnack || 0)),
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
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          stepSize: 100,
          callback: function (value) {
            return value;
          },
        },
      },
    },
  };

  // --- RENDER ---
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gray-800 mb-2">
                    Welcome back, {user?.name}! 👑
                  </h1>
                  <p className="text-xl text-gray-600">Super Admin Dashboard</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Manage system-wide operations and monitor all companies
                  </p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-full">
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="md:col-span-2 ">
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
                      new Date(new Date().setDate(new Date().getDate() - 1)),
                      new Date(new Date().setDate(new Date().getDate() - 1)),
                    ],
                  },
                  { label: "This Week", value: [new Date(), new Date()] },
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
              value={selectedCompany}
              onChange={handleCompanyChange}
              className="border p-1 rounded w-full md:w-1/4"
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company._id} value={company._id}>
                  {company.name}
                </option>
              ))}
            </select>

            <select
              value={selectedPlace}
              onChange={handlePlaceChange}
              disabled={!selectedCompany}
              className="border p-1 rounded w-full md:w-1/4"
            >
              <option value="">Select Place</option>
              {places.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="border rounded w-full md:w-1/4">
              <Select
                closeMenuOnSelect={false}
                components={animatedComponents}
                isMulti
                isSearchable={false}
                options={locations}
                value={selectedLocations}
                onChange={handleLocationChange}
                styles={{
                  control: (provided) => ({
                    ...provided,
                    border: "none",
                    boxShadow: "none",
                    cursor: "pointer",
                    flexWrap: "nowrap",
                    display: "flex",
                    alignItems: "center",
                  }),
                  multiValue: (provided) => ({
                    ...provided,
                    backgroundColor: "#e0e0e0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    marginRight: "4px",
                  }),
                  multiValueLabel: (provided) => ({
                    ...provided,
                    color: "#333",
                    maxWidth: "50px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }),
                }}
                placeholder="Select Location"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <svg
                    className="w-8 h-8 text-blue-600"
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
                  <h3 className="text-sm font-medium text-gray-600">
                    Today's Users
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {metrics.todayUsers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-600">
                    Today's Revenue
                  </h3>
                  <p className="text-3xl font-bold text-green-600">
                    ₹{Number(metrics.todayFees || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-600">
                    Total Users
                  </h3>
                  <p className="text-3xl font-bold text-purple-600">
                    {metrics.totalUsers}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
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
                    {overview.locationName || "N/A"}
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

          {/* NEW: Hourly buckets chart */}
          <div className="bg-white p-6 shadow rounded-lg mb-6">
            <Bar data={chartDataHourly} options={chartOptionsHourly} />
          </div>

          {/* Revenue by Location (left) + Payment Split (right) — same size */}
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

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
