import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

async function generateScript(story) {
  try {
    if (!genAI) throw new Error("GEMINI_API_KEY is not configured");
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: { responseMimeType: "application/json" },
    });
    
    const prompt = `Generate a compelling 15-second movie trailer script for a book with the following details:
Title: ${story.title}
Book description (the source of truth for the trailer): ${story.description || "No description available"}

Requirements:
- Base the characters, setting, conflict, mood, and visual search terms only on the book description above.
- The script should be exactly 15 seconds when spoken at normal pace
- Create 3-4 dramatic scenes with visual descriptions
- Include voiceover narration text
- Make it cinematic and engaging
- Create 3-5 concrete Pexels search terms that describe the locations, action, atmosphere, and subject matter in the description. Do not use generic terms such as "cinematic" unless the description supports them.
- Format as JSON with structure: { "scenes": [{"visual": "description", "voiceover": "text"}], "search_terms": ["keyword1", "keyword2"] }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error("Failed to parse AI response");
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
}

async function searchPexelsVideos(searchTerms) {
  try {
    if (!PEXELS_API_KEY) throw new Error("PEXELS_API_KEY is not configured");
    const terms = Array.isArray(searchTerms)
      ? searchTerms.filter((term) => typeof term === "string" && term.trim()).slice(0, 5)
      : [];
    const videos = [];

    for (const term of terms.length ? terms : ["book atmosphere"]) {
      const response = await axios.get("https://api.pexels.com/videos/search", {
        params: { query: term.trim(), per_page: 5, orientation: "landscape" },
        headers: { Authorization: PEXELS_API_KEY },
      });

      for (const video of response.data?.videos || []) {
        const file = video.video_files
          ?.filter((candidate) => candidate.link)
          .sort((a, b) => (b.width || 0) - (a.width || 0))[0];
        if (file?.link) videos.push({ url: file.link, duration: video.duration, term });
      }

      if (videos.length >= 5) break;
    }

    return videos;
  } catch (error) {
    console.error("Error searching Pexels:", error);
    return [];
  }
}

async function downloadVideo(url, outputPath) {
  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Error downloading video:", error);
    throw error;
  }
}

async function generateVoiceover(text, outputPath) {
  try {
    const edgeTTS = await import("edge-tts/out/index.js");
    if (typeof edgeTTS.tts !== "function") throw new Error("Edge TTS is unavailable");
    const audioBuffer = await edgeTTS.tts(text, { voice: "en-US-JennyNeural" });
    fs.writeFileSync(outputPath, audioBuffer);
    
    return true;
  } catch (error) {
    console.error("Error generating voiceover:", error);
    throw error;
  }
}

async function combineVideoAndAudio(videoPath, audioPath, outputPath, bookTitle) {
  return new Promise((resolve, reject) => {
    const args = [
      "-stream_loop", "-1",
      "-i", videoPath,
      "-i", audioPath,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-c:a", "aac",
      "-metadata", `title=${bookTitle}`,
      "-metadata", `comment=@${bookTitle}`,
      "-t", "15",
      "-y",
      outputPath,
    ];

    const ffmpeg = spawn(ffmpegInstaller.path, args);

    ffmpeg.stderr.on("data", (data) => {
      console.log("FFmpeg:", data.toString());
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
}

async function createFallbackVideo(outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegInstaller.path, [
      "-f", "lavfi",
      "-i", "color=c=0b1220:s=1280x720:r=30",
      "-t", "15",
      "-pix_fmt", "yuv420p",
      "-y", outputPath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg fallback exited with code ${code}`));
    });
    ffmpeg.on("error", reject);
  });
}

async function createSilentAudio(outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegInstaller.path, [
      "-f", "lavfi",
      "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-t", "15",
      "-q:a", "9",
      "-acodec", "libmp3lame",
      "-y", outputPath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg silent audio exited with code ${code}`));
    });
    ffmpeg.on("error", reject);
  });
}

async function ensureUploadDir() {
  const uploadDir = path.join(__dirname, "../../uploads/trailers");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

export async function generateTrailerAI(trailerId, story) {
  try {
    await ensureUploadDir();

    const script = await generateScript(story);
    console.log("Generated script:", script);

    const tempDir = path.join(__dirname, "../../uploads/trailers/temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const videoPath = path.join(tempDir, `source_${timestamp}.mp4`);
    const audioPath = path.join(tempDir, `audio_${timestamp}.mp3`);
    const outputPath = path.join(__dirname, "../../uploads/trailers", `trailer_${trailerId}_${timestamp}.mp4`);

    const videos = await searchPexelsVideos(script.search_terms);
    if (videos.length > 0) {
      await downloadVideo(videos[0].url, videoPath);
    } else {
      console.warn("Pexels unavailable; using local fallback trailer background");
      await createFallbackVideo(videoPath);
    }

    const voiceoverText = script.scenes?.map((s) => s.voiceover).join(" ") || "Experience this amazing story.";
    try {
      await generateVoiceover(voiceoverText, audioPath);
    } catch (voiceoverError) {
      console.warn("Voiceover unavailable; using silent audio:", voiceoverError.message);
      await createSilentAudio(audioPath);
    }

    await combineVideoAndAudio(videoPath, audioPath, outputPath, story.title || "Untitled");

    fs.unlinkSync(videoPath);
    fs.unlinkSync(audioPath);

    const videoUrl = `/uploads/trailers/trailer_${trailerId}_${timestamp}.mp4`;

    return {
      videoUrl,
      videoPath: outputPath,
      bookTitle: story.title || "Untitled",
    };
  } catch (error) {
    console.error("Error in generateTrailerAI:", error);
    throw error;
  }
}
