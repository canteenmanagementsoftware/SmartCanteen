// middleware/uploadUserPhoto.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const dest = path.join(__dirname, "..", "uploads", "user-photos");
fs.mkdirSync(dest, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dest),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `webcam_${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (/^image\/(jpe?g|png|webp)$/i.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG/PNG/WEBP images allowed"), false);
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 5*1024*1024 } });
