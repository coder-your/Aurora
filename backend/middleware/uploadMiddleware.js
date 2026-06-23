import multer from "multer";

// Use memoryStorage for Cloudinary upload_stream
const storage = multer.memoryStorage();

// File type filter (only images)
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, or WEBP images allowed"), false);
  }
};

// Multer middleware
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

export default upload;
