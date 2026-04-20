import cloudinary from "../utils/cloudinary.js";

// Upload a generic moodboard asset to Cloudinary and return its URL/public_id.
// No database writes here; the frontend should take the returned URL and
// save it via the appropriate moodboard section endpoint.
export const uploadMoodboardAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Expected field name: 'file'" });
    }

    const folder = req.body.folder || "aurora/moodboards";

    const cloudUpload = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    return res.json({
      url: cloudUpload.secure_url,
      public_id: cloudUpload.public_id,
      resource_type: cloudUpload.resource_type,
      folder: cloudUpload.folder,
    });
  } catch (error) {
    console.error("uploadMoodboardAsset error:", error);
    return res.status(500).json({ message: "Upload failed", error: error.message });
  }
};
