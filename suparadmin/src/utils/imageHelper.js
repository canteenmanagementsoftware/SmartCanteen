// src/utils/imageHelper.js
export const getImageUrl = (imagePath) => {
  // dev debug
  if (import.meta.env?.DEV) {
    console.log("[imageHelper] raw imagePath =>", imagePath);
  }

  if (!imagePath) return "https://via.placeholder.com/160";

  // already absolute?
  if (/^https?:\/\//i.test(imagePath)) {
    if (import.meta.env?.DEV) {
      console.log("[imageHelper] using absolute URL =>", imagePath);
    }
    return imagePath;
  }

  // base api (e.g. http://localhost:5000/api) -> strip trailing /api
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  const apiUrl = baseUrl.replace(/\/api\/?$/i, "");

  // normalise relative path
  const finalUrl = imagePath.startsWith("/")
    ? `${apiUrl}${imagePath}`
    : `${apiUrl}/${imagePath}`;

  if (import.meta.env?.DEV) {
    console.log("[imageHelper] built URL =>", finalUrl);
  }
  return finalUrl;
};
