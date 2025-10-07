import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "../../utils/axiosConfig";
import { AuthContext } from "../../context/auth-context";

const AddPackageForm = ({ open, onClose, onSubmit, user }) => {
  const { user: currentUser } = useContext(AuthContext);

  // helpers
  const idOf = (v) => (v && typeof v === "object" ? v._id || v.id : v);
  const toId = (v) => (v == null ? "" : String(idOf(v)));
  const fmtDate = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
  const todayYMD = () => new Date().toISOString().slice(0, 10);

  // roles
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

  const allowedCompanyId = toId(currentUser?.companyId || currentUser?.company);
  const allowedPlaceId = toId(currentUser?.placeId);
  const allowedLocationIds = useMemo(
    () =>
      Array.isArray(currentUser?.locationId)
        ? currentUser.locationId.map(toId)
        : currentUser?.locationId
        ? [toId(currentUser.locationId)]
        : [],
    [currentUser]
  );
  const allowedCompanyName = currentUser?.companyName || "My Company";

  // 🚩 NEW: Parent (User) provided selections
  const parentCompanyId = toId(user?.companyId);
  const parentCompanyName = user?.companyId?.name || allowedCompanyName || "Selected Company";
  const parentPlaceId = toId(user?.placeId);
  const parentPlaceName = user?.placeId?.name || "Selected Place";
  // Intentionally NOT using parent location (you'll choose manually)
  const lockCompanyFromParent = !!parentCompanyId;
  const lockPlaceFromParent = !!parentPlaceId;

  // selections
  const [companyId, setCompanyId] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [packageId, setPackageId] = useState("");

  // lists
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);
  const [locations, setLocations] = useState([]);
  const [packages, setPackages] = useState([]);

  // dates (always visible)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // loading/errors
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const [errCompanies, setErrCompanies] = useState("");
  const [errPlaces, setErrPlaces] = useState("");
  const [errLocations, setErrLocations] = useState("");
  const [errPackages, setErrPackages] = useState("");

  const firstRef = useRef(null);

  // scroll lock + focus
  useEffect(() => {
    if (!open) return;
    setTimeout(() => firstRef.current?.focus(), 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ✅ Preselect from parent user for ALL roles (company & place locked), location left manual
  useEffect(() => {
    if (!open) return;

    // Company preselect priority: parent -> role-based allowed -> empty
    setCompanyId(
      parentCompanyId ||
        ((isManager || isAdmin || isCollector) ? (allowedCompanyId || "") : "")
    );

    // Place preselect priority: parent -> role-based allowed -> empty
    setPlaceId(
      parentPlaceId ||
        ((isAdmin || isCollector) ? (allowedPlaceId || "") : "")
    );

    // Location always manual (empty) as requested
    setLocationId("");

    // reset downstream
    setPackages([]); setPackageId("");
    setStartDate(""); setEndDate("");
  // include deps for parent/user-driven behavior
  }, [
    open,
    parentCompanyId,
    parentPlaceId,
    isManager,
    isAdmin,
    isCollector,
    allowedCompanyId,
    allowedPlaceId
  ]);

  // fetch: companies
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setErrCompanies(""); setLoadingCompanies(true);
        const res = await axios.get("/company");
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setCompanies(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) { setErrCompanies("Failed to load companies."); setCompanies([]); }
      } finally {
        if (!cancelled) setLoadingCompanies(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // fetch: places by company
  useEffect(() => {
    if (!companyId) { setPlaces([]); setPlaceId(""); return; }
    let cancelled = false;
    (async () => {
      try {
        setErrPlaces(""); setLoadingPlaces(true);
        const res = await axios.get(`/places/company/${companyId}`);
        if (cancelled) return;
        let list = res?.data?.data || res?.data || [];
        list = Array.isArray(list) ? list : [];

        // 🔒 If parent provided place, narrow to that place so only its locations show
        if (lockPlaceFromParent && parentPlaceId) {
          list = list.filter((p) => String(p._id) === String(parentPlaceId));
        } else if ((isAdmin || isCollector) && allowedPlaceId) {
          // original role-based restriction (if no parent lock)
          list = list.filter((p) => String(p._id) === String(allowedPlaceId));
        }

        setPlaces(list);

        // If current placeId not in list, clear only when NOT parent-locked
        const placeInList = list.find((p) => String(p._id) === String(placeId));
        if (!placeInList) {
          if (!(isAdmin || isCollector) && !lockPlaceFromParent) setPlaceId("");
          setLocationId("");
          setPackages([]); setPackageId("");
          setStartDate(""); setEndDate("");
        }
      } catch {
        if (!cancelled) { setErrPlaces("Failed to load places."); setPlaces([]); }
      } finally {
        if (!cancelled) setLoadingPlaces(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, isAdmin, isCollector, allowedPlaceId, placeId, lockPlaceFromParent, parentPlaceId]);

  // fetch: locations by place
  useEffect(() => {
    if (!placeId) {
      setLocations([]); setLocationId("");
      setPackages([]); setPackageId("");
      setStartDate(""); setEndDate("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setErrLocations(""); setLoadingLocations(true);
        const res = await axios.get(`/locations?placeId=${placeId}`);
        if (cancelled) return;
        let list = res?.data?.data || res?.data || [];
        list = Array.isArray(list) ? list : [];

        if (isCollector && allowedLocationIds.length) {
          const allowedSet = new Set(allowedLocationIds.map(String));
          list = list.filter((l) => allowedSet.has(String(l._id)));
        }
        setLocations(list);

        // Always manual location selection, so if current not present, just clear it
        const locInList = list.find((l) => String(l._id) === String(locationId));
        if (!locInList) {
          setLocationId("");
          setPackages([]); setPackageId("");
          setStartDate(""); setEndDate("");
        }
      } catch {
        if (!cancelled) { setErrLocations("Failed to load locations."); setLocations([]); }
      } finally {
        if (!cancelled) setLoadingLocations(false);
      }
    })();
    return () => { cancelled = true; };
  }, [placeId, isCollector, allowedLocationIds, locationId]);

  // fetch: packages by location AND set dates
  useEffect(() => {
    if (!locationId) {
      setPackages([]); setPackageId("");
      setStartDate(""); setEndDate("");
      return;
    }
    let cancelled = false;
    (async () => {
      // Location select → startDate = today
      setStartDate(todayYMD());
      setEndDate(""); // will set from packages below

      try {
        setErrPackages(""); setLoadingPackages(true);
        const res = await axios.get(`/packages/by-location?locationId=${locationId}`);
        if (cancelled) return;

        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        const norm = Array.isArray(list) ? list : [];
        setPackages(norm);

        const targetPkg = norm.length >= 1 ? norm[0] : null;
        const v = targetPkg?.validity_date ? fmtDate(targetPkg.validity_date) : "";
        setEndDate(v || "");
      } catch {
        if (!cancelled) {
          setErrPackages("Failed to load packages for this location.");
          setPackages([]); setEndDate("");
        }
      } finally {
        if (!cancelled) setLoadingPackages(false);
      }
    })();
    return () => { cancelled = true; };
  }, [locationId]);

  // handlers
  const handleCompanyChange = (e) => {
    // 🔒 Locked if parent provided OR role-based lock
    if (lockCompanyFromParent || isManager || isAdmin || isCollector) return;
    const v = String(e.target.value || "");
    setCompanyId(v);
    setPlaceId(""); setLocationId("");
    setPackages([]); setPackageId("");
    setStartDate(""); setEndDate("");
  };
  const handlePlaceChange = (e) => {
    // 🔒 Locked if parent provided OR role-based lock
    if (lockPlaceFromParent || isAdmin || isCollector) return;
    const v = String(e.target.value || "");
    setPlaceId(v);
    setLocationId("");
    setPackages([]); setPackageId("");
    setStartDate(""); setEndDate("");
  };
  const handleLocationChange = (e) => {
    if (isCollector) {
      // if collector is locked to certain locations, still allow within list
      // (no hard lock here)
    }
    const v = String(e.target.value || "");
    setLocationId(v);
    setPackages([]); setPackageId("");
  };
  const handlePackageChange = (e) => {
    const v = String(e.target.value || "");
    setPackageId(v);
    const selected = packages.find((p) => String(p._id) === v);
    setEndDate(selected?.validity_date ? fmtDate(selected.validity_date) : "");
  };

  const ensureLockedOption = (list, value, label) => {
    const exists = list.some((x) => String(x._id) === String(value));
    return !value || exists ? null : <option value={value}>{label}</option>;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.({
      companyId: companyId || null,
      placeId: placeId || null,
      locationId: locationId || null,
      packageId: packageId || null,
      startDate: startDate || null,
      endDate: endDate || null,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Card */}
      <div className="relative z-10 w-[min(560px,92vw)] rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add Package</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="text-gray-500 hover:text-gray-900">✕</button>
        </div>

        {/* error banners */}
        {[errCompanies, errPlaces, errLocations, errPackages].some(Boolean) && (
          <div className="mb-2 text-sm space-y-1">
            {errCompanies && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{errCompanies}</div>}
            {errPlaces && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{errPlaces}</div>}
            {errLocations && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{errLocations}</div>}
            {errPackages && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{errPackages}</div>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 1) Company */}
          <div>
            <label className="mb-1 block text-sm">Company</label>
            <select
              ref={firstRef}
              name="companyId"
              required
              value={companyId}
              onChange={handleCompanyChange}
              disabled={lockCompanyFromParent || isManager || isAdmin || isCollector || loadingCompanies}
              className={`w-full rounded-md border bg-white px-3 py-2 ${ (lockCompanyFromParent || isManager || isAdmin || isCollector) ? "bg-gray-100 cursor-not-allowed" : "" }`}
            >
              {!lockCompanyFromParent && !isManager && !isAdmin && !isCollector && <option value="">Select company</option>}
              {(lockCompanyFromParent || isManager || isAdmin || isCollector) &&
                ensureLockedOption(companies, companyId, parentCompanyName)}
              {companies.map((c) => (
                <option key={String(c._id)} value={String(c._id)}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 2) Place */}
          <div>
            <label className="mb-1 block text-sm">Place</label>
            <select
              name="placeId"
              required
              value={placeId}
              onChange={handlePlaceChange}
              disabled={lockPlaceFromParent || isAdmin || isCollector || !companyId || loadingPlaces}
              className={`w-full rounded-md border bg-white px-3 py-2 ${ (lockPlaceFromParent || isAdmin || isCollector) ? "bg-gray-100 cursor-not-allowed" : "" }`}
            >
              {!lockPlaceFromParent && !isAdmin && !isCollector && <option value="">{companyId ? "Select place" : "Select company first"}</option>}
              {(lockPlaceFromParent || isAdmin || isCollector) &&
                ensureLockedOption(places, placeId, parentPlaceName)}
              {places.map((p) => (
                <option key={String(p._id)} value={String(p._id)}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 3) Location */}
          <div>
            <label className="mb-1 block text-sm">Location</label>
            <select
              name="locationId"
              required
              value={locationId}
              onChange={handleLocationChange}
              disabled={!placeId || loadingLocations}
              className="w-full rounded-md border bg-white px-3 py-2"
            >
              <option value="">{placeId ? "Select location" : "Select place first"}</option>
              {locations.map((l) => (
                <option key={String(l._id)} value={String(l._id)}>{l.locationName || l.name}</option>
              ))}
            </select>
          </div>

          {/* 4) Package (by location) */}
          <div>
            <label className="mb-1 block text-sm">Package</label>
            <select
              name="packageId"
              required
              value={packageId}
              onChange={handlePackageChange}
              disabled={!locationId || loadingPackages}
              className="w-full rounded-md border bg-white px-3 py-2"
            >
              {!locationId ? (
                <option value="">Select location first</option>
              ) : loadingPackages ? (
                <option value="">Loading packages…</option>
              ) : (
                <>
                  <option value="">Select package</option>
                  {packages.map((pkg) => (
                    <option key={String(pkg._id)} value={String(pkg._id)}>
                      {pkg.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* 5–6) Dates (ALWAYS visible) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm">Start date</label>
              <input
                type="date"
                name="startDate"
                value={startDate || ""}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">End date</label>
              <input
                type="date"
                name="endDate"
                value={endDate || ""}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-1">
            <button type="submit" className="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
              Add package
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPackageForm;
