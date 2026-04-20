// controllers/uploadController.js
import cloudinary from "../utils/cloudinary.js";
import prisma from "../utils/prisma.js";

export const uploadCover = async (req, res) => {
  try {
    // Log request body for debugging
    console.log("Upload request body:", req.body);
    console.log("Upload request file:", req.file ? "File received" : "No file");

    const { story_id } = req.body;

    if (!req.file) {
      console.error("No file in req.file. Request body keys:", Object.keys(req.body));
      return res.status(400).json({ 
        message: "No file uploaded. Please select an image file.",
        receivedFields: Object.keys(req.body)
      });
    }

    if (!story_id) {
      console.error("story_id is missing from request body. Body:", req.body);
      return res.status(400).json({ 
        message: "story_id is missing. Cannot upload cover.",
        receivedFields: Object.keys(req.body)
      });
    }

    // Step 1 — Find story and verify ownership
    const story = await prisma.stories.findUnique({
      where: { story_id: Number(story_id) },
    });

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Verify user owns the story
    if (story.author_id !== req.user.user_id) {
      return res.status(403).json({ message: "Not authorized to upload cover for this story" });
    }

    // Step 2 — delete old cover if exists
    if (story.cover_public_id) {
      await cloudinary.uploader.destroy(story.cover_public_id);
    }

    // Step 3 — Upload to Cloudinary via stream
    const cloudUpload = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "aurora/covers",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    // Step 4 — Update story record
    const updated = await prisma.stories.update({
      where: { story_id: Number(story_id) },
      data: {
        cover_url: cloudUpload.secure_url,
        cover_public_id: cloudUpload.public_id,
      },
    });

    res.json({
      url: updated.cover_url,
      public_id: updated.cover_public_id,
      message: "Cover updated successfully",
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};
