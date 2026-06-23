import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import streamifier from "streamifier";
import { MAX_UPLOAD_SIZE } from "../constants.js";
import prisma from "../utils/prisma.js";

// Configure Cloudinary 
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    secure: true
  });
}

/* ----------------------------------------------------
   Multer Setup (Memory Storage)
----------------------------------------------------- */
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid file type. Allowed: JPG, PNG, WEBP"), false);
    }
    cb(null, true);
  }
}).single("cover");

/* ----------------------------------------------------
   Upload Handler
----------------------------------------------------- */
export async function handleUpload(fileBuffer, mimetype, ownerId) {
  if (!fileBuffer) throw new Error("No file buffer provided");

  // --- CLOUDINARY UPLOAD ---
  if (process.env.CLOUDINARY_URL) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "covers",
          resource_type: "image",
          transformation: [
            { width: 1400, crop: "limit" } // resize for performance
          ]
        },
        async (error, result) => {
          if (error) return reject(error);

          try {
            const media = await prisma.media.create({
              data: {
                owner_id: ownerId || null,
                url: result.secure_url,
                mime_type: result.format,
                size_bytes: result.bytes,
                source: "cloudinary"
              }
            });
            resolve(media);
          } catch (dbError) {
            reject(dbError);
          }
        }
      );

      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }

  /* ----------------------------------------------------
     LOCAL FALLBACK (if Cloudinary is NOT configured)
     Saves file to "/uploads" folder + DB entry
  ----------------------------------------------------- */
  const fileName = `cover_${Date.now()}.webp`;
  const filePath = `uploads/${fileName}`;

  // dynamic import FS for ES modules
  const fs = await import("fs");

  await fs.promises.writeFile(filePath, fileBuffer);

  const media = await prisma.media.create({
    data: {
      owner_id: ownerId || null,
      url: `/${filePath}`,
      mime_type: mimetype,
      size_bytes: fileBuffer.length,
      source: "local"
    }
  });

  return media;
}
