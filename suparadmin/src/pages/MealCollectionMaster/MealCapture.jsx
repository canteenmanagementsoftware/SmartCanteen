import React, { useEffect, useRef, useState, useContext } from "react";
import Webcam from "react-webcam";
import axios from "../../utils/axiosConfig";
import * as faceapi from "face-api.js";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/auth-context";
import MealHistory from "./MealHistory";
import MethodOfSelection from "./methodOfSelection";

const MealCapture = () => {
  const { user: currentUser } = useContext(AuthContext);

  // labels
  const [companyName, setCompanyName] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [locationName, setLocationName] = useState("");

  // camera permission states
  const [camAllowed, setCamAllowed] = useState(false);
  const [camBlocked, setCamBlocked] = useState(false);
  const [camError, setCamError] = useState("");

  // single modal (intro | blocked)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("intro"); // 'intro' | 'blocked'

  const webcamRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mealDetails, setMealDetails] = useState(null);
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [cardInput, setCardInput] = useState("");

  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [isNFCReading, setIsNFCReading] = useState(false);

  const [allCompany, setAllCompany] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  // "face" | "card" | "both"
  const [type, setType] = useState("");

  // disable flags based on role
  const [disableCompany, setDisableCompany] = useState(false);
  const [disablePlace, setDisablePlace] = useState(false);
  const [disableLocation, setDisableLocation] = useState(false);

  const [placeData, setPlacesData] = useState([]);
  const [locationData, setLocationData] = useState([]);

  const getId = (val) => (val && typeof val === "object" ? val._id : val) || "";
  const toList = (res) =>
    Array.isArray(res.data) ? res.data : res.data?.data || [];

  // UA (for concise instructions)
  const uaInfo = React.useMemo(() => {
    const ua = navigator.userAgent || "";
    const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua);
    const isiOS = /iPhone|iPad|iPod/i.test(ua);
    return {
      isChrome: /Chrome|Chromium/i.test(ua) && !/Edg/i.test(ua),
      isEdge: /Edg/i.test(ua),
      isFirefox: /Firefox/i.test(ua),
      isSafari,
      isAndroid: /Android/i.test(ua),
      isiOS,
      isDesktop: !/Android|iPhone|iPad|iPod/i.test(ua),
    };
  }, []);

  // ---- Camera helpers ----
  const cameraErrorText = (e) => {
    const name = e?.name || "";
    if (name === "NotAllowedError") return "Camera permission denied.";
    if (name === "NotFoundError") return "No camera found on this device.";
    if (name === "NotReadableError") return "Camera is busy or not available.";
    if (name === "OverconstrainedError")
      return "Camera constraints not satisfied.";
    if (!window.isSecureContext && location.hostname !== "localhost")
      return "Camera requires HTTPS or localhost.";
    if (!navigator.mediaDevices?.getUserMedia)
      return "Browser does not support camera API.";
    return "Unable to access camera.";
  };

  const handlePermissionFailure = (e) => {
    const text = cameraErrorText(e);
    setCamAllowed(false);
    setCamBlocked(true);
    setCamError(text);
    setModalMode("blocked");
    setModalOpen(true);
  };

  const requestCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw { name: "APINotSupported" };
      if (!window.isSecureContext && location.hostname !== "localhost")
        throw { name: "InsecureContext" };

      const stream = await navigator.mediaDevices.getUserMedia({ video: true }); // native prompt (if not blocked)
      stream.getTracks().forEach((t) => t.stop());
      setCamAllowed(true);
      setCamBlocked(false);
      setCamError("");
      setModalOpen(false);
    } catch (e) {
      handlePermissionFailure(e);
    }
  };

  // NEW: pre-check on first load — if already granted, open camera immediately
  useEffect(() => {
    async function precheckCameraPermission() {
      if (!("permissions" in navigator)) return; // Safari/iOS: no precheck
      try {
        // @ts-ignore
        const status = await navigator.permissions.query({ name: "camera" });
        if (status.state === "granted") {
          setCamAllowed(true); // render Webcam directly
          setCamBlocked(false);
          setCamError("");
          setModalOpen(false);
        } else if (status.state === "denied") {
          setCamAllowed(false);
          setCamBlocked(true);
          setCamError("Camera is blocked for this site.");
          // don't open modal automatically; user can click "Enable Camera"
        } // 'prompt' -> do nothing, wait for user to click Enable
      } catch {
        // ignore — fall back to button flow
      }
    }
    precheckCameraPermission();
  }, []);

  // Ensure we only open native prompt when allowed to ask; otherwise show instructions
  async function ensurePrompt() {
    if (!("permissions" in navigator)) {
      return requestCamera();
    }
    try {
      // @ts-ignore
      const status = await navigator.permissions.query({ name: "camera" });
      if (status.state === "granted") {
        setCamAllowed(true);
        setCamBlocked(false);
        setCamError("");
        setModalOpen(false);
        return;
      }
      if (status.state === "prompt") {
        return requestCamera(); // opens native prompt
      }
      // denied — keep modal open, switch to instructions
      setCamAllowed(false);
      setCamBlocked(true);
      setCamError("Camera is blocked for this site.");
      setModalMode("blocked");
      setModalOpen(true);
    } catch {
      return requestCamera();
    }
  }

  // Optional: live permission change listener
  useEffect(() => {
    if (!("permissions" in navigator)) return;
    try {
      // @ts-ignore
      navigator.permissions.query({ name: "camera" }).then((status) => {
        status.onchange = () => {
          if (status.state === "granted") {
            setCamAllowed(true);
            setCamBlocked(false);
            setCamError("");
            setModalOpen(false);
          } else if (status.state === "denied") {
            setCamAllowed(false);
            setCamBlocked(true);
          }
        };
      });
    } catch {}
  }, []);

  // ---------- role-based defaults ----------
  useEffect(() => {
    const initByRole = async () => {
      const roleRaw = currentUser?.userType || currentUser?.role || "";
      const role = String(roleRaw).toLowerCase();
      const norm = (v) => String(v ?? "");
      const getIdSafe = (v) => (v && typeof v === "object" ? v._id || v.id : v);

      const cid = norm(
        getIdSafe(currentUser?.companyId) || getIdSafe(currentUser?.company)
      );
      const pid = norm(
        getIdSafe(currentUser?.placeId) || getIdSafe(currentUser?.place)
      );
      const rawLid = norm(
        getIdSafe(currentUser?.locationId) || getIdSafe(currentUser?.location)
      );
      const lid = rawLid;

      if (role === "superadmin") {
        setDisableCompany(false);
        setDisablePlace(false);
        setDisableLocation(false);
        return;
      }

      if (!cid) return;

      setSelectedCompany(cid);
      setType("");

      const places = await getAllPlace(cid);

      // collect assigned place IDs (allowedPlaces -> placeIds -> placeId)
      let assignedPlaceIds = [];
      if (
        Array.isArray(currentUser?.allowedPlaces) &&
        currentUser.allowedPlaces.length
      ) {
        assignedPlaceIds = currentUser.allowedPlaces.map(getIdSafe).map(norm);
      } else if (
        Array.isArray(currentUser?.placeIds) &&
        currentUser.placeIds.length
      ) {
        assignedPlaceIds = currentUser.placeIds.map(getIdSafe).map(norm);
      } else if (pid) {
        assignedPlaceIds = [pid];
      }

      const allCompanyPlaceIds = places.map((p) => norm(p._id));
      const usePlaceIds = assignedPlaceIds.length
        ? assignedPlaceIds
        : allCompanyPlaceIds;

      if (role === "admin") {
        // Company & Place locked; Location manual
        setDisableCompany(true);
        setDisablePlace(true);
        setDisableLocation(false);

        setSelectedPlaces(usePlaceIds);
        await getLocationsForPlaces(usePlaceIds); // Locations from ALL selected places
        setSelectedLocation(""); // admin chooses manually
        return;
      }

      if (role === "manager") {
        // Company locked; Place/Location manual
        setDisableCompany(true);
        setDisablePlace(false);
        setDisableLocation(false);

        setSelectedPlaces([]); // user will choose
        setLocationData([]);
        setSelectedLocation("");
        return;
      }

      if (role === "meal_collector") {
        // Everything preselected & locked
        setDisableCompany(true);
        setDisablePlace(true);
        setDisableLocation(true);

        const finalPlaceIds = usePlaceIds.length
          ? usePlaceIds
          : allCompanyPlaceIds[0]
          ? [allCompanyPlaceIds[0]]
          : [];
        setSelectedPlaces(finalPlaceIds);

        const locs = await getLocationsForPlaces(finalPlaceIds);
        const useLoc =
          lid && locs.some((l) => norm(l._id) === lid)
            ? lid
            : locs[0]?.["_id"]
            ? norm(locs[0]._id)
            : "";
        setSelectedLocation(useLoc);
        return;
      }
    };

    initByRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (selectedPlaces.length) {
      getLocationsForPlaces(selectedPlaces);
    } else {
      setLocationData([]);
      setSelectedLocation("");
      setLocationName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaces]);

  // superadmin: load all companies
  useEffect(() => {
    const role = currentUser?.userType || currentUser?.role;
    if (role === "superadmin") {
      axios
        .get(`/company`)
        .then((res) => {
          const list = Array.isArray(res.data)
            ? res.data
            : res.data?.data || [];
          setAllCompany(list);
        })
        .catch(() => setAllCompany([]));
    }
  }, [currentUser]);

  // keep collection "type" in sync with selected company
  useEffect(() => {
    const id =
      selectedCompany ||
      currentUser?.companyId?._id ||
      currentUser?.companyId ||
      currentUser?.company?._id;

    const fetchCompanyType = async () => {
      if (!id) {
        setType("face");
        setCompanyName("");
        return;
      }
      try {
        const res = await axios.get(`/company/${id}`);
        setType(res.data?.collectionType || "face");
        setCompanyName(res.data?.name || res.data?.company?.name || "");
      } catch {
        setType("face");
        setCompanyName("");
      }
    };

    fetchCompanyType();
  }, [selectedCompany, currentUser]);

  // loaders
  const getAllPlace = async (companyId) => {
    try {
      const res = await axios.get(`/places/allplace/${companyId}`);
      const list = toList(res);
      setPlacesData(list);
      return list;
    } catch {
      setPlacesData([]);
      return [];
    }
  };

  const getAllLocation = async (placeId) => {
    try {
      const res = await axios.get(`/locations/getlocation/${placeId}`);
      const list = toList(res);
      setLocationData(list);
      return list;
    } catch {
      setLocationData([]);
      return [];
    }
  };

  const getLocationsForPlaces = async (placeIds = []) => {
    if (!placeIds.length) {
      setLocationData([]);
      return [];
    }
    try {
      const results = await Promise.all(
        placeIds.map((id) => axios.get(`/locations/getlocation/${id}`))
      );
      const merged = [];
      const seen = new Set();
      for (const res of results) {
        const list = toList(res);
        for (const l of list) {
          const id = String(l._id);
          if (!seen.has(id)) {
            seen.add(id);
            merged.push(l);
          }
        }
      }
      setLocationData(merged);
      // keep selectedLocation only if still valid
      if (
        selectedLocation &&
        !merged.some((x) => String(x._id) === String(selectedLocation))
      ) {
        setSelectedLocation("");
        setLocationName("");
      }
      return merged;
    } catch {
      setLocationData([]);
      return [];
    }
  };

  // NFC support
  useEffect(() => {
    setIsNFCSupported("NDEFReader" in window);
  }, []);

  // face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        setModelsLoaded(true);
      } catch {
        toast.error("❌ Failed to load face models");
      }
    };
    loadModels();
  }, []);

  // cleanup webcam tracks on unmount
  useEffect(() => {
    return () => {
      const videoEl = webcamRef.current?.video;
      const stream = videoEl && videoEl.srcObject;
      if (stream && typeof stream.getTracks === "function") {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // record meal
  const recordMeal = async (userId, method) => {
    try {
      const res = await axios.post("/meal/record", { userId, method });
      const { message, details } = res.data;
      toast.success(message);
      setMessage(message);
      setMealDetails(details);
      setCardInput("");
    } catch (err) {
      const msg = err.response?.data?.message || "Meal recording failed";
      toast.error(msg);
      setMessage(msg);
    }
  };

  // face collection
  const handleFaceCollection = async () => {
    setProcessing(true);
    setMessage("🔍 Scanning face...");
    setMealDetails(null);

    try {
      const video = webcamRef.current?.video;
      if (!video) throw new Error("Webcam not available");

      
      const detection = await faceapi
      .detectSingleFace(video)
      .withFaceLandmarks()
      .withFaceDescriptor();
      
      if (!detection) {
        toast.warning("⚠️ Face not detected.");
        setMessage("⚠️ Face not detected.");
        return;
      }

      const res = await axios.get("/usermaster/all");
      const users = res.data;
      
      for (const user of users) {
        console.log(user)
        if (!user.photo) continue;

        const refImg = await faceapi.fetchImage(user.photo);
        const refDetect = await faceapi
          .detectSingleFace(refImg)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!refDetect) continue;

        const distance = faceapi.euclideanDistance(
          detection.descriptor,
          refDetect.descriptor
        );

        if (distance < 0.6) {
          await recordMeal(user._id, "face");
          return;
        }
      }

      toast.error("🚫 No matching user found.");
      setMessage("🚫 No matching user found.");
    } catch (e) {
      const text = cameraErrorText(e);
      toast.error(text);
      setMessage(text);
    } finally {
      setProcessing(false);
    }
  };

  // manual card collection
  const handleCardCollection = async () => {
    if (!cardInput.trim()) {
      toast.warning("Please enter a Card ID");
      return;
    }

    setProcessing(true);
    setMessage("🔍 Verifying card...");
    setMealDetails(null);

    try {
      const res = await axios.get(`/usermaster/card/${cardInput.trim()}`);
      const user = res.data;

      if (!user?._id) {
        toast.error("User not found for this card");
        setMessage("🚫 User not found for this card");
        return;
      }

      setMessage(`👤 User found: ${user.firstName} ${user.lastName}`);
      await recordMeal(user._id, "card");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Card verification failed";
      toast.error(errorMsg);
      setMessage(`❌ ${errorMsg}`);
    } finally {
      setProcessing(false);
    }
  };

  // NFC collection
  const handleNFCCollection = async () => {
    if (!isNFCSupported) {
      toast.error("NFC is not supported on this device");
      return;
    }

    setIsNFCReading(true);
    setMessage("📱 Tap your card on the device...");
    setMealDetails(null);

    try {
      const ndef = new NDEFReader();
      await ndef.scan();

      ndef.addEventListener("reading", async ({ serialNumber }) => {
        setMessage(`✅ Card detected: ${serialNumber}`);
        try {
          const res = await axios.get(`/usermaster/card/${serialNumber}`);
          const user = res.data;

          if (!user?._id) {
            toast.error("User not found for this card");
            setMessage("🚫 User not found for this card");
            return;
          }

          setMessage(`👤 User found: ${user.firstName} ${user.lastName}`);
          await recordMeal(user._id, "card");
        } catch (err) {
          const errorMsg =
            err.response?.data?.message || "Card verification failed";
          toast.error(errorMsg);
          setMessage(`❌ ${errorMsg}`);
        }
      });

      ndef.addEventListener("readingerror", () => {
        toast.error("❌ NFC reading error");
        setMessage("❌ NFC reading error");
      });
    } catch {
      toast.error("❌ NFC setup failed");
      setMessage("❌ NFC setup failed");
    } finally {
      setIsNFCReading(false);
    }
  };

  const viewFullHistory = () => setShowHistory(true);
  if (showHistory) return <MealHistory />;

  const companyId =
    getId(currentUser?.companyId) || getId(currentUser?.company) || "";

  return (
    <div className="container mx-auto px-4 flex ">
      <div className="mx-auto w-[60%] p-6 ">
        <MethodOfSelection
          allCompany={allCompany}
          handleCompany={(e) => {
            const id = e.target.value;
            setSelectedCompany(id);
            setSelectedPlaces([]);
            setSelectedLocation("");
            setLocationName("");
            if (id) getAllPlace(id);
          }}
          // 👇 NEW: array of placeIds
          onPlacesChange={(ids) => {
            setSelectedPlaces(ids);
            // multi-place → merged locations load
            if (ids?.length) {
              getLocationsForPlaces(ids);
            } else {
              setLocationData([]);
              setSelectedLocation("");
              setLocationName("");
            }
          }}
          handleLocation={(e) => {
            const id = e.target.value;
            setSelectedLocation(id);
            const l = locationData.find((x) => String(x._id) === String(id));
            setLocationName(l?.locationName || "");
          }}
          selectedCompany={selectedCompany}
          selectedPlaces={selectedPlaces}
          selectedLocation={selectedLocation}
          placeData={placeData}
          locationData={locationData}
          disableCompany={disableCompany}
          disablePlace={disablePlace}
          disableLocation={disableLocation}
          selectedCompanyLabel={companyName}
          selectedLocationLabel={locationName}
        />
      </div>

      <div className="w-[40%] flex flex-col items-center justify-center mt-6">
        <h2 className="text-lg font-semibold mb-4">🍽️ Meal Collection</h2>

        {companyId && (
          <div className="mb-4 text-sm text-gray-600">
            Company ID: {companyId}
          </div>
        )}

        {/* FACE SECTION */}
        {(type === "face" || type === "both" || !type) && (
          <>
            {/* If not allowed -> show only one entry button */}
            {!camAllowed && (
              <div className="w-full max-w-md border rounded-lg px-4 py-3 mb-4 bg-yellow-50 border-yellow-300 text-yellow-900">
                <div className="font-medium mb-2">Camera access needed</div>
                <div className="text-sm mb-3">
                  To use face verification, please enable your camera.
                </div>
                <button
                  onClick={() => {
                    setModalMode("intro");
                    setModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
                >
                  Enable Camera
                </button>
              </div>
            )}

            {/* If allowed -> render webcam immediately */}
            {camAllowed && (
              <>
                {modelsLoaded ? (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      width={350}
                      height={280}
                      videoConstraints={{ facingMode: "user" }}
                      className="rounded-lg shadow-md mb-4"
                      onUserMedia={() => {
                        setCamAllowed(true);
                        setCamBlocked(false);
                        setCamError("");
                      }}
                      onUserMediaError={(e) => {
                        handlePermissionFailure(e);
                      }}
                    />
                    <button
                      onClick={handleFaceCollection}
                      disabled={processing}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-6 py-2 rounded-full mb-6"
                    >
                      {processing ? "Verifying..." : "Collect via Face"}
                    </button>
                  </>
                ) : (
                  <div className="text-center text-blue-700 mb-4">
                    Loading face recognition models...
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* CARD / NFC SECTION */}
        {(type === "card" || type === "both" || !type) && (
          <>
            {isNFCSupported && (
              <div className="mb-6 text-center">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                  <div className="text-green-800 font-medium mb-2">
                    📱 Tap-to-Card (NFC)
                  </div>
                  <div className="text-green-600 text-sm">
                    Hold your card near the device
                  </div>
                </div>
                <button
                  onClick={handleNFCCollection}
                  disabled={processing || isNFCReading}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-8 py-3 rounded-full font-medium shadow-lg"
                >
                  {isNFCReading ? "📱 Tap Card..." : "📱 Tap to Card"}
                </button>
              </div>
            )}

            <div className="mb-6 text-center">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
                <div className="text-purple-800 font-medium mb-2">
                  💳 Manual Card Entry
                </div>
                <div className="text-purple-600 text-sm">
                  Enter your card number manually
                </div>
              </div>
              <input
                type="text"
                placeholder="Enter Card ID manually"
                value={cardInput}
                onChange={(e) => setCardInput(e.target.value)}
                className="p-3 border-2 border-purple-300 rounded-lg mb-4 w-80 text-center font-mono"
                disabled={processing}
              />
              <br />
              <button
                onClick={handleCardCollection}
                disabled={processing}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-8 py-3 rounded-full font-medium shadow-lg"
              >
                {processing ? "Processing..." : "💳 Collect via Card"}
              </button>
            </div>
          </>
        )}

        <button
          onClick={viewFullHistory}
          className="mt-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full"
        >
          📜 View Full History
        </button>

        {message && (
          <div className="mt-6 text-sm text-center">
            <p className="text-green-700 font-medium">{message}</p>
            {mealDetails && (
              <div className="mt-4 bg-white p-6 rounded shadow-md text-sm">
                <p>
                  <strong>👤 User:</strong> {mealDetails.user}
                </p>
                <p>
                  <strong>🍽️ Meal:</strong> {mealDetails.mealType}
                </p>
                <p>
                  <strong>📦 Package:</strong> {mealDetails.package}
                </p>
                <p>
                  <strong>⏰ Time:</strong> {mealDetails.collectionTime}
                </p>
                <p>
                  <strong>🕒 Window:</strong> {mealDetails.mealWindow}
                </p>
                <p>
                  <strong>⏭️ Next:</strong> {mealDetails.nextAvailable}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SINGLE MODAL (intro OR blocked) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[min(560px,92vw)]">
            {modalMode === "intro" ? (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  Allow camera to continue
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  We use your camera for face verification. When you press{" "}
                  <strong>Continue</strong>, your browser may ask for
                  permission.
                </p>
                <ul className="text-sm list-disc pl-5 space-y-1 mb-4">
                  <li>Your video is not auto-saved to the server.</li>
                  <li>
                    You can change permission anytime in your browser settings.
                  </li>
                  <li>
                    On iOS/Safari, a user tap is required to request access.
                  </li>
                </ul>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={ensurePrompt}
                    className="px-4 py-2 rounded bg-blue-600 text-white"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  Enable camera for this site
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  {camError ||
                    "Your browser blocked the camera. Please allow it from the site settings (🔒)."}
                </p>
                <ol className="text-sm space-y-2 list-decimal pl-5">
                  {(uaInfo.isChrome || uaInfo.isEdge || uaInfo.isFirefox) &&
                    uaInfo.isDesktop && (
                      <>
                        <li>
                          Click the <strong>lock (🔒)</strong> icon in the
                          address bar.
                        </li>
                        <li>
                          Open <em>Site settings</em>/<em>Permissions</em> and
                          set <em>Camera</em> to <strong>Allow</strong>.
                        </li>
                        <li>
                          Come back here and press <strong>Retry</strong>.
                        </li>
                      </>
                    )}
                  {uaInfo.isChrome && uaInfo.isAndroid && (
                    <>
                      <li>
                        Tap the <strong>🔒</strong> icon in the address bar.
                      </li>
                      <li>
                        Go to <em>Permissions → Camera</em> and choose{" "}
                        <strong>Allow</strong>.
                      </li>
                      <li>
                        Return and press <strong>Retry</strong>.
                      </li>
                    </>
                  )}
                  {uaInfo.isSafari && uaInfo.isDesktop && (
                    <>
                      <li>
                        Open <em>Safari → Settings for This Website…</em>.
                      </li>
                      <li>
                        Set <em>Camera</em> to <strong>Allow</strong>.
                      </li>
                      <li>
                        Return and press <strong>Retry</strong>.
                      </li>
                    </>
                  )}
                  {uaInfo.isSafari && uaInfo.isiOS && (
                    <>
                      <li>
                        Open the iOS <em>Settings</em> app → <em>Safari</em> →{" "}
                        <em>Camera</em>.
                      </li>
                      <li>
                        Set it to <strong>Allow</strong>, then return to the
                        browser.
                      </li>
                      <li>
                        Press <strong>Retry</strong>.
                      </li>
                    </>
                  )}
                </ol>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded border"
                  >
                    Close
                  </button>
                  <button
                    onClick={requestCamera}
                    className="px-4 py-2 rounded bg-blue-600 text-white"
                  >
                    I allowed, Retry
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MealCapture;
