import prisma from "../utils/prisma.js";
import { generateTrailerAI } from "../services/trailerGenerationService.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { spawn } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getVideoDuration = (videoPath) => new Promise((resolve, reject) => {
  const ffmpeg = spawn(ffmpegInstaller.path, ["-hide_banner", "-i", videoPath]);
  let output = "";

  ffmpeg.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  ffmpeg.on("close", () => {
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!match) return reject(new Error("FFmpeg could not read video duration"));

    const [, hours, minutes, seconds] = match;
    resolve(Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds));
  });

  ffmpeg.on("error", reject);
});

export const getAllTrailers = async (req, res) => {
  try {
    const trailers = await prisma.book_trailers.findMany({
      where: { status: "completed" },
      include: {
        story: {
          select: {
            story_id: true,
            title: true,
            description: true,
            cover_url: true,
          },
        },
        author: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.json(trailers);
  } catch (error) {
    console.error("Error fetching trailers:", error);
    res.status(500).json({ message: "Failed to fetch trailers" });
  }
};

export const getTrailerById = async (req, res) => {
  try {
    const { id } = req.params;

    const trailer = await prisma.book_trailers.findUnique({
      where: { trailer_id: parseInt(id) },
      include: {
        story: {
          select: {
            story_id: true,
            title: true,
            description: true,
            cover_url: true,
          },
        },
        author: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!trailer) {
      return res.status(404).json({ message: "Trailer not found" });
    }

    res.json(trailer);
  } catch (error) {
    console.error("Error fetching trailer:", error);
    res.status(500).json({ message: "Failed to fetch trailer" });
  }
};

export const getTrailersByStory = async (req, res) => {
  try {
    const { storyId } = req.params;

    const trailers = await prisma.book_trailers.findMany({
      where: { 
        story_id: parseInt(storyId),
        status: "completed"
      },
      include: {
        author: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.json(trailers);
  } catch (error) {
    console.error("Error fetching story trailers:", error);
    res.status(500).json({ message: "Failed to fetch story trailers" });
  }
};

export const getUserTrailers = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const trailers = await prisma.book_trailers.findMany({
      where: { 
        author_id: userId,
        status: { in: ["completed", "processing", "failed"] }
      },
      include: {
        story: {
          select: {
            story_id: true,
            title: true,
            description: true,
            cover_url: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.json(trailers);
  } catch (error) {
    console.error("Error fetching user trailers:", error);
    res.status(500).json({ message: "Failed to fetch user trailers" });
  }
};

export const getAITrailerLimit = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        ai_trailer_limit: true,
        ai_trailer_used: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      limit: user.ai_trailer_limit,
      used: user.ai_trailer_used,
      remaining: user.ai_trailer_limit - user.ai_trailer_used,
    });
  } catch (error) {
    console.error("Error fetching AI trailer limit:", error);
    res.status(500).json({ message: "Failed to fetch AI trailer limit" });
  }
};

export const createTrailerAI = async (req, res) => {
  try {
    const { story_id } = req.body;
    const userId = req.user.user_id;

    if (!story_id) {
      return res.status(400).json({ message: "Story ID is required" });
    }

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        ai_trailer_limit: true,
        ai_trailer_used: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.ai_trailer_used >= user.ai_trailer_limit) {
      return res.status(403).json({ 
        message: `You have reached your AI trailer generation limit (${user.ai_trailer_limit}). Please upgrade your plan for more.`,
        limit: user.ai_trailer_limit,
        used: user.ai_trailer_used
      });
    }

    const story = await prisma.stories.findUnique({
      where: { story_id: parseInt(story_id) },
      select: {
        story_id: true,
        title: true,
        description: true,
        author_id: true,
      },
    });

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (story.author_id !== userId) {
      return res.status(403).json({ message: "You can only create trailers for your own stories" });
    }

    const existingTrailer = await prisma.book_trailers.findFirst({
      where: {
        story_id: parseInt(story_id),
        author_id: userId,
        status: { in: ["processing", "completed"] },
      },
    });

    if (existingTrailer) {
      return res.status(400).json({ message: "A trailer for this story already exists or is being processed" });
    }

    const trailer = await prisma.book_trailers.create({
      data: {
        story_id: parseInt(story_id),
        author_id: userId,
        video_url: "",
        source: "AI_GENERATED",
        status: "processing",
      },
    });

    generateTrailerAI(trailer.trailer_id, story)
      .then(async (result) => {
        await prisma.book_trailers.update({
          where: { trailer_id: trailer.trailer_id },
          data: {
            video_url: result.videoUrl,
            video_path: result.videoPath,
            status: "completed",
          },
        });
        
        await prisma.users.update({
          where: { user_id: userId },
          data: {
            ai_trailer_used: {
              increment: 1,
            },
          },
        });
      })
      .catch(async (error) => {
        console.error("Trailer generation failed:", error);
        await prisma.book_trailers.update({
          where: { trailer_id: trailer.trailer_id },
          data: { status: "failed" },
        });
      });

    res.status(202).json({
      message: "Trailer generation started",
      trailer_id: trailer.trailer_id,
      status: "processing",
      remaining: user.ai_trailer_limit - user.ai_trailer_used - 1,
    });
  } catch (error) {
    console.error("Error creating AI trailer:", error);
    res.status(500).json({ message: "Failed to create trailer" });
  }
};

export const uploadTrailer = async (req, res) => {
  try {
    const { story_id } = req.body;
    const userId = req.user.user_id;

    if (!req.file) {
      return res.status(400).json({ message: "Video file is required" });
    }

    if (!story_id) {
      return res.status(400).json({ message: "Story ID is required" });
    }

    const story = await prisma.stories.findUnique({
      where: { story_id: parseInt(story_id) },
      select: {
        story_id: true,
        title: true,
        author_id: true,
      },
    });

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (story.author_id !== userId) {
      return res.status(403).json({ message: "You can only upload trailers for your own stories" });
    }

    const duration = await getVideoDuration(req.file.path).catch(async (probeError) => {
      console.error("Unable to validate trailer duration:", probeError);
      await fs.unlink(req.file.path).catch(() => {});
      return null;
    });

    if (duration === null || !Number.isFinite(duration)) {
      return res.status(400).json({ message: "Unable to validate video duration" });
    }

    if (duration < 5 || duration > 15) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: "Trailer video must be between 5 and 15 seconds" });
    }

    const videoUrl = `/uploads/trailers/${req.file.filename}`;
    const videoPath = req.file.path;

    const trailer = await prisma.book_trailers.create({
      data: {
        story_id: parseInt(story_id),
        author_id: userId,
        video_url: videoUrl,
        video_path: videoPath,
        source: "WRITER_UPLOADED",
        status: "completed",
        duration_seconds: Math.ceil(duration),
      },
    });

    res.status(201).json({
      message: "Trailer uploaded successfully",
      trailer,
    });
  } catch (error) {
    console.error("Error uploading trailer:", error);
    res.status(500).json({ message: "Failed to upload trailer" });
  }
};

export const deleteTrailer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const trailer = await prisma.book_trailers.findUnique({
      where: { trailer_id: parseInt(id) },
    });

    if (!trailer) {
      return res.status(404).json({ message: "Trailer not found" });
    }

    if (trailer.author_id !== userId) {
      return res.status(403).json({ message: "You can only delete your own trailers" });
    }

    // Delete the video file from the file system if it exists
    if (trailer.video_path) {
      try {
        await fs.unlink(trailer.video_path);
      } catch (fileError) {
        console.error("Error deleting video file:", fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    await prisma.book_trailers.delete({
      where: { trailer_id: parseInt(id) },
    });

    res.json({ message: "Trailer deleted successfully" });
  } catch (error) {
    console.error("Error deleting trailer:", error);
    res.status(500).json({ message: "Failed to delete trailer" });
  }
};

export const getTrailerStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const trailer = await prisma.book_trailers.findUnique({
      where: { trailer_id: parseInt(id) },
      select: {
        trailer_id: true,
        status: true,
        video_url: true,
      },
    });

    if (!trailer) {
      return res.status(404).json({ message: "Trailer not found" });
    }

    res.json(trailer);
  } catch (error) {
    console.error("Error fetching trailer status:", error);
    res.status(500).json({ message: "Failed to fetch trailer status" });
  }
};
