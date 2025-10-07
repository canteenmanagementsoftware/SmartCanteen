import React, { useEffect, useState, useContext, useMemo } from "react";
import axios from "../../utils/axiosConfig";
import { AuthContext } from "../../context/auth-context";

const rupee = (n) => {
  const x = Number.isFinite(+n) ? +n : 0;
  return `₹ ${x.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const FeesForm = ({ user = {}, fee = {}, onSuccess, onCancel }) => {
  const localYmd = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10); // YYYY-MM-DD in local time
  }, []);

  const applyTaxBreakup = (profile) => {
    // backend returns { breakup: { sgstPct, cgstPct, totalPct } }
    const br = profile?.breakup;
    if (br) {
      setSgstPct(Number(br.sgstPct) || 0);
      setCgstPct(Number(br.cgstPct) || 0);
      setTaxPercent(
        Number(br.totalPct) || Number(br.sgstPct || 0) + Number(br.cgstPct || 0)
      );
    } else {
      // fallback if breakup not sent
      const total = Number(profile?.taxPercentage) || 0;
      setTaxPercent(total);
      setSgstPct(total / 2);
      setCgstPct(total / 2);
    }
  };

  const pkgs = Array.isArray(fee?.assignments) ? fee.assignments : [];

  const pkgNames =
    fee?.ui?.packageNames ||
    pkgs
      .map((p) => p.packageName)
      .filter(Boolean)
      .join(" + ");

  const amountExpr =
    fee?.ui?.amountExpr ||
    pkgs
      .map((p) => Number(p.price) || 0)
      .map((p) => `₹${p}`)
      .join(" + ");

  const computedSum = pkgs.reduce((s, p) => s + (Number(p.price) || 0), 0);

  useEffect(() => {
    const pref =
      typeof fee?.amount === "number"
        ? String(fee.amount)
        : String(computedSum);
    setFormData((prev) => ({ ...prev, amount: pref }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedSum, fee?.amount]);

  const { user: currentUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    userId: "",
    companyId: "",
    placeId: "",
    locationId: "",
    batchId: "",
    semester: "",
    amount: "",
    paymentMode: "Cash",
    paymentDate: "",
    includingGST: false,
    packageId: "",
  });

  const [batches, setBatches] = useState([]);

  // DB-driven Tax Profiles
  const [taxProfiles, setTaxProfiles] = useState([]);
  const [selectedTaxProfileId, setSelectedTaxProfileId] = useState("");
  const [taxPercent, setTaxPercent] = useState(5); // total GST (for badge)
  const [sgstPct, setSgstPct] = useState(2.5);
  const [cgstPct, setCgstPct] = useState(2.5);

  // ===== GST Derived values (from dropdown) =====
  const SGST_RATE = useMemo(() => sgstPct / 100, [sgstPct]); // decimal
  const CGST_RATE = useMemo(() => cgstPct / 100, [cgstPct]); // decimal
  const GST_RATE = useMemo(() => (sgstPct + cgstPct) / 100, [sgstPct, cgstPct]); // decimal
  const FACTOR = useMemo(() => 1 + GST_RATE, [GST_RATE]);

  const amountNum = useMemo(() => {
    const n = parseFloat(formData.amount);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [formData.amount]);

  // includingGST = true => Amount is GROSS; else Amount is NET
  const net = useMemo(
    () => (formData.includingGST ? amountNum / FACTOR : amountNum),
    [amountNum, formData.includingGST, FACTOR]
  );
  const sgst = useMemo(() => net * SGST_RATE, [net, SGST_RATE]);
  const cgst = useMemo(() => net * CGST_RATE, [net, CGST_RATE]);
  const gross = useMemo(
    () => (formData.includingGST ? amountNum : net + sgst + cgst),
    [amountNum, net, sgst, cgst, formData.includingGST]
  );

  const linkFeeToUser = async (feeId) => {
    try {
      if (!user?._id) return null;
      const res = await axios.put(`/usermaster/addfee/${user._id}`, {
        id: feeId,
      });
      return res.data?.user || res.data || null;
    } catch (err) {
      console.warn("Link fee to user failed", err);
      return null;
    }
  };

  const loadBatchesByPlace = async (placeId) => {
    try {
      if (!placeId) {
        setBatches([]);
        return;
      }
      const res = await axios.get(`/batches/place/${placeId}/batch`);
      setBatches(res.data || []);
    } catch (err) {
      console.error("Error fetching batches:", err);
      setBatches([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/fees/tax-profiles");
        setTaxProfiles(Array.isArray(data) ? data : []);
        // default selection (if editing, we’ll set later)
        if (!fee?.taxProfileId && data?.length) {
          const firstId = data[0]._id;
          setSelectedTaxProfileId(firstId);
          // breakup ke liye detail hit
          try {
            const { data: tp } = await axios.get(
              `/fees/tax-profiles/${firstId}`
            );
            applyTaxBreakup(tp);
          } catch {
            const total = Number(data[0].taxPercentage) || 0;
            setTaxPercent(total);
            setSgstPct(total / 2);
            setCgstPct(total / 2);
          }
        }
      } catch (e) {
        console.error("Failed to load tax profiles", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (fee?.taxProfileId && taxProfiles.length) {
      const id = String(fee.taxProfileId?._id || fee.taxProfileId);
      setSelectedTaxProfileId(id);
      (async () => {
        try {
          const { data } = await axios.get(`/fees/tax-profiles/${id}`);
          applyTaxBreakup(data);
        } catch {
          const found = taxProfiles.find((t) => t._id === id);
          const total = found ? Number(found.taxPercentage) || 0 : 0;
          setTaxPercent(total);
          setSgstPct(total / 2);
          setCgstPct(total / 2);
        }
      })();
    }
  }, [fee?.taxProfileId, taxProfiles]);

  useEffect(() => {
    if (!user && !fee) return;

    setFormData((prev) => ({
      ...prev,
      userId: user?._id ?? prev.userId,
      companyId:
        (user?.companyId && user.companyId._id) ||
        user?.companyId ||
        prev.companyId,
      placeId:
        (user?.placeId && user.placeId._id) || user?.placeId || prev.placeId,
      locationId:
        (user?.locationId && user.locationId._id) ||
        user?.locationId ||
        prev.locationId,
      packageId:
        (user?.packageId && user.packageId._id) ||
        user?.packageId ||
        prev.packageId,
      batchId:
        (fee?.batchId && fee.batchId._id) || fee?.batchId || prev.batchId,
      semester: fee?.semester ?? prev.semester,
      includingGST: fee?.includingGST ?? prev.includingGST,
    }));
  }, [fee, user]);

  useEffect(() => {
    const pid = (user?.placeId && user.placeId._id) || user?.placeId;
    if (pid) loadBatchesByPlace(pid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.placeId, user?.placeId?._id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((s) => ({
      ...s,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);

    // Optional: persist calculated values to backend (and selected GST%)
    // data.append("gstPercent", String(taxPercent));
    // data.append("netAmount",   String(net));
    // data.append("sgstAmount",  String(sgst));
    // data.append("cgstAmount",  String(cgst));
    // data.append("totalAmount", String(gross));

    try {
      const { data: created } = await axios.post("/fees", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedUser = await linkFeeToUser(created._id);
      alert("✅ Fees created successfully!");
      onSuccess && onSuccess({ fee: created, updatedUser });
    } catch (err) {
      alert("❌ Something went wrong. Check console.");
      console.error(err);
    }
  };

  const safeCompanyName = user?.companyId?.name ?? "";
  const safePlaceName = user?.placeId?.name ?? "";
  const safeLocationName = user?.locationId?.locationName ?? "";
  const safeUserName = `${user?.firstName ?? ""} ${
    user?.lastName ?? ""
  }`.trim();

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-4"
    >
      {/* <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Add New Fees</h2>
        <span className="text-xs text-gray-500">Fields marked * are required</span>
      </div> */}

      <div className="grid gap-4 md:grid-cols-12">
        {/* RIGHT: Cards */}
        <div className="order-1 md:order-2 md:col-span-5 space-y-4 md:sticky md:top-4 self-start">
          {/* Canteen Packages */}
          <div className="rounded-2xl border border-amber-300 bg-amber-50">
            <div className="p-3 sm:p-4 flex items-center justify-between border-b border-amber-200">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white border border-amber-300">
                  🍽️
                </span>
                <div className="font-semibold text-amber-900">
                  Canteen Packages
                </div>
              </div>
              {pkgNames ? (
                <span className="text-[11px] sm:text-xs text-amber-700/80">
                  {pkgNames}
                </span>
              ) : null}
            </div>

            <div className="p-3 sm:p-4">
              {pkgs && pkgs.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {pkgs.map((p, idx) => {
                      const linePrice = Number(p.price) || 0;
                      return (
                        <div
                          key={p.assignmentId || p._id || idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="text-amber-900">
                            {p.packageName || `Package ${idx + 1}`}
                          </div>
                          <div className="font-semibold text-amber-900">
                            {rupee(linePrice)}
                          </div>
                          <input
                            type="hidden"
                            name="assignmentIds[]"
                            value={p.assignmentId || p._id || ""}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-amber-200 my-3" />

                  <div className="flex items-center justify-between">
                    <div className="text-[15px] font-semibold text-amber-900">
                      Packages Total
                    </div>
                    <div className="text-[15px] font-bold text-amber-900">
                      {rupee(computedSum)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-amber-800">
                  No packages selected.
                </div>
              )}
            </div>
          </div>

          {/* Tax Summary */}
          <div
            className={`rounded-2xl border ${
              formData.includingGST ? "border-emerald-300" : "border-gray-200"
            } bg-white`}
          >
            <div className="p-3 sm:p-4 flex items-center justify-between border-b">
              <div className="font-semibold">Tax Summary</div>
              {formData.includingGST ? (
                <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  GST Inclusive ({taxPercent}%)
                </span>
              ) : (
                <span className="text-[11px] px-2 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200">
                  GST Extra ({taxPercent}%)
                </span>
              )}
            </div>

            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">
                  Amount {formData.includingGST ? "(Gross)" : "(Net)"}
                </div>
                <div className="text-right font-medium">
                  {rupee(formData.includingGST ? amountNum : net)}
                </div>

                <div className="text-gray-600">
                  SGST ({sgstPct.toFixed(2)}%)
                </div>
                <div className="text-right font-medium">{rupee(sgst)}</div>

                <div className="text-gray-600">
                  CGST ({cgstPct.toFixed(2)}%)
                </div>
                <div className="text-right font-medium">{rupee(cgst)}</div>
              </div>

              <div className="border-t my-3" />

              {formData.includingGST && (
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[15px] font-semibold">Net Value</div>
                  <div className="text-[15px] font-bold">{rupee(net)}</div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-[15px] font-semibold">Total</div>
                <div className="text-[15px] font-bold">{rupee(gross)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* LEFT: Form fields */}
        <div className="order-2 md:order-1 md:col-span-7 space-y-4">
          <input type="hidden" name="status" value="pending" />

          {/* Payer & Context */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <div className="font-semibold">Payer & Context</div>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Company</label>
                <input
                  type="hidden"
                  name="companyId"
                  value={user?.companyId?._id ?? user?.companyId ?? ""}
                />
                <input
                  type="text"
                  value={safeCompanyName}
                  className="w-full border rounded px-3 py-2"
                  disabled
                />
                {(currentUser?.userType === "admin" ||
                  currentUser?.userType === "manager" ||
                  currentUser?.userType === "meal_collector") && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Auto-selected based on your role
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-600">Place</label>
                <input
                  type="hidden"
                  name="placeId"
                  value={user?.placeId?._id ?? user?.placeId ?? ""}
                />
                <input
                  type="text"
                  value={safePlaceName}
                  className="w-full border rounded px-3 py-2"
                  disabled
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">Location</label>
                <input
                  type="hidden"
                  name="locationId"
                  value={user?.locationId?._id ?? user?.locationId ?? ""}
                />
                <input
                  name="locationId"
                  type="text"
                  value={safeLocationName}
                  disabled
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">User</label>
                <input type="hidden" name="userId" value={user?._id ?? ""} />
                <input
                  name="userId"
                  type="text"
                  value={safeUserName}
                  disabled
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Fee Inputs */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 7h18M3 12h18M3 17h18"
                />
              </svg>
              <div className="font-semibold">Fee Inputs</div>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Semester *</label>
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select Semester</option>
                  <option value="1st">1st Semester</option>
                  <option value="2nd">2nd Semester</option>
                  <option value="3rd">3rd Semester</option>
                  <option value="4th">4th Semester</option>
                  <option value="5th">5th Semester</option>
                  <option value="6th">6th Semester</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600">Batch *</label>
                <select
                  name="batchId"
                  value={formData.batchId}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select Batch</option>
                  {batches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.batch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600">Payment Mode *</label>
                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600">Payment Date</label>
                <input type="hidden" name="paymentDate" value={localYmd} />
                <input
                  type="text"
                  value={new Date().toLocaleDateString()}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-50"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">
                  Amount (₹){" "}
                  {amountExpr ? (
                    <span className="text-gray-400">( {amountExpr} )</span>
                  ) : null}
                </label>
                <input
                  name="amount"
                  type="number"
                  min={0}
                  inputMode="decimal"
                  step="any"
                  value={formData.amount === "" ? "" : String(formData.amount)}
                  onChange={(e) =>
                    setFormData((s) => ({ ...s, amount: e.target.value }))
                  }
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (v === "") return;
                    const n = parseFloat(v);
                    if (!Number.isFinite(n) || n < 0) return;
                    setFormData((s) => ({ ...s, amount: String(n) }));
                  }}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">GST Profile</label>
                <select
                  name="taxProfileId"
                  value={selectedTaxProfileId}
                  onChange={async (e) => {
                    const id = e.target.value;
                    setSelectedTaxProfileId(id);
                    if (!id) {
                      setTaxPercent(0);
                      setSgstPct(0);
                      setCgstPct(0);
                      return;
                    }
                    try {
                      const { data } = await axios.get(
                        `/fees/tax-profiles/${id}`
                      );
                      applyTaxBreakup(data);
                    } catch (err) {
                      console.error("Failed to load tax profile detail", err);
                      const found = taxProfiles.find((t) => t._id === id);
                      const total = found
                        ? Number(found.taxPercentage) || 0
                        : 0;
                      setTaxPercent(total);
                      setSgstPct(total / 2);
                      setCgstPct(total / 2);
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select GST Profile</option>
                  {taxProfiles.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.taxPercentage}%
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  SGST {sgstPct.toFixed(2)}% + CGST {cgstPct.toFixed(2)}%
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600">Upload Receipt</label>
                <input
                  type="file"
                  name="receipt"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="w-full border rounded px-3 py-2 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="includingGST"
                    checked={formData.includingGST}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Including GST (SGST {sgstPct.toFixed(2)}% + CGST{" "}
                  {cgstPct.toFixed(2)}%)
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-[.99]"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 active:scale-[.99]"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default FeesForm;
