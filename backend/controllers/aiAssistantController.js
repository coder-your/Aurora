import * as aiAssistantService from "../services/aiAssistant.service.js";

// Get AI assistant usage for a story
export const getUsage = async (req, res) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    const userId = req.user.user_id;

    if (!storyId) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    const usage = await aiAssistantService.getUsage(storyId, userId);
    res.json(usage);
  } catch (error) {
    console.error("AI Assistant getUsage error:", error);
    res.status(500).json({ message: error.message || "Failed to get AI usage" });
  }
};

// Request AI assistance
export const assist = async (req, res) => {
  try {
    const storyId = parseInt(req.params.storyId, 10);
    const userId = req.user.user_id;
    const { capability, context, tone, emotion, target, theme, relationship } = req.body;

    console.log("[AI DEBUG] Request received:", { storyId, userId, capability, hasContext: !!context, contextLength: context?.length });

    if (!storyId) {
      return res.status(400).json({ message: "Invalid story ID" });
    }

    if (!capability) {
      return res.status(400).json({ message: "Capability is required" });
    }

    if (!context || context.trim().length === 0) {
      return res.status(400).json({ message: "Context is required" });
    }

    // Limit context length
    const trimmedContext = context.slice(0, 3000);

    const result = await aiAssistantService.assist(
      storyId,
      userId,
      capability,
      trimmedContext,
      { tone, emotion, target, theme, relationship }
    );

    console.log("[AI DEBUG] Service result:", { success: result.success, error: result.error, message: result.message });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("AI Assistant assist error:", error);
    res.status(500).json({ message: error.message || "AI assistant failed" });
  }
};

// Get list of available capabilities
export const getCapabilities = async (req, res) => {
  try {
    const capabilities = aiAssistantService.getCapabilities();
    res.json({ capabilities });
  } catch (error) {
    console.error("AI Assistant getCapabilities error:", error);
    res.status(500).json({ message: "Failed to get capabilities" });
  }
};
