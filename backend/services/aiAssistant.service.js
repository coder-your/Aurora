import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import prisma from "../utils/prisma.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// AI Assistant Capabilities
const CAPABILITIES = {
  OPENING_LINE: "opening_line",
  SCENE_CONTINUATION: "scene_continuation",
  ENDING_ASSISTANCE: "ending_assistance",
  CHARACTER_DESCRIPTION: "character_description",
  DIALOGUE_IMPROVEMENT: "dialogue_improvement",
  WRITERS_BLOCK: "writers_block",
  TONE_ENHANCEMENT: "tone_enhancement",
  EMOTION_ENHANCEMENT: "emotion_enhancement",
  CHARACTER_CONSISTENCY: "character_consistency",
  PLOT_HOLE: "plot_hole",
  WORLDBUILDING: "worldbuilding",
  CHAPTER_TITLE: "chapter_title",
  DESCRIPTION: "description",
  CONFLICT: "conflict",
  PACING: "pacing",
  READING_LEVEL: "reading_level",
  GRAMMAR: "grammar",
  THEME: "theme",
  SUSPENSE: "suspense",
  RELATIONSHIP: "relationship",
};

const CAPABILITY_LABELS = {
  [CAPABILITIES.OPENING_LINE]: "Opening Line Ideas",
  [CAPABILITIES.SCENE_CONTINUATION]: "Continue Scene",
  [CAPABILITIES.ENDING_ASSISTANCE]: "Ending Suggestions",
  [CAPABILITIES.CHARACTER_DESCRIPTION]: "Character Description",
  [CAPABILITIES.DIALOGUE_IMPROVEMENT]: "Improve Dialogue",
  [CAPABILITIES.WRITERS_BLOCK]: "Writer's Block Help",
  [CAPABILITIES.TONE_ENHANCEMENT]: "Tone Enhancement",
  [CAPABILITIES.EMOTION_ENHANCEMENT]: "Emotion Enhancement",
  [CAPABILITIES.CHARACTER_CONSISTENCY]: "Check Consistency",
  [CAPABILITIES.PLOT_HOLE]: "Plot Hole Check",
  [CAPABILITIES.WORLDBUILDING]: "Worldbuilding Ideas",
  [CAPABILITIES.CHAPTER_TITLE]: "Title Suggestions",
  [CAPABILITIES.DESCRIPTION]: "Enhance Description",
  [CAPABILITIES.CONFLICT]: "Conflict Suggestions",
  [CAPABILITIES.PACING]: "Pacing Check",
  [CAPABILITIES.READING_LEVEL]: "Adjust Reading Level",
  [CAPABILITIES.GRAMMAR]: "Grammar & Clarity",
  [CAPABILITIES.THEME]: "Theme Reinforcement",
  [CAPABILITIES.SUSPENSE]: "Build Suspense",
  [CAPABILITIES.RELATIONSHIP]: "Relationship Development",
};

// System prompt for the AI
const SYSTEM_PROMPT = `You are a creative writing assistant for Aurora, a writing platform.

Your role is to help writers improve their own ideas and overcome creative blocks.

CRITICAL RULES:
1. NEVER write full chapters or complete scenes - only provide suggestions, ideas, and short excerpts (max 150-300 words)
2. Keep all responses concise and focused
3. Give multiple options when appropriate (2-5 suggestions)
4. Encourage the writer's creativity - don't replace their voice
5. Match and continue the user's writing style
6. Focus on assistance, not authorship
7. End responses with encouraging questions to keep the writer engaged

When given text, analyze it and provide specific, actionable suggestions that help the writer improve their own work.

Remember: You are a supportive assistant, not a ghostwriter.`;

// Prompt templates for each capability
const PROMPT_TEMPLATES = {
  [CAPABILITIES.OPENING_LINE]: (context) =>
    `Help me write opening lines for my scene/chapter.

Context: ${context}

Provide 3-5 compelling opening line options. Each should be 1-2 sentences maximum. Vary the style:
- One atmospheric/descriptive
- One action-oriented  
- One dialogue-based
- One introspective
- One mysterious/suspenseful

Make each opening immediately engaging and appropriate for the context.`,

  [CAPABILITIES.SCENE_CONTINUATION]: (context) =>
    `I need help continuing this scene.

What I've written so far:
"${context}"

What could happen next? Provide 2-3 brief direction suggestions (2-3 sentences each). Focus on:
- What the characters might do
- How tension could escalate
- What revelation might occur
- What obstacle could appear

DO NOT write the full scene - only suggest directions.`,

  [CAPABILITIES.ENDING_ASSISTANCE]: (context) =>
    `Help me end this scene/chapter effectively.

Context:
"${context}"

Provide 3 ending options:
1. A cliffhanger that creates suspense
2. An emotional resolution (bittersweet or hopeful)
3. A revelation/twist that changes understanding

Each should be 2-4 sentences maximum - just the ending beat, not a full conclusion.`,

  [CAPABILITIES.CHARACTER_DESCRIPTION]: (context) =>
    `Help me describe a character vividly.

Character context: ${context}

Provide a concise description (max 100 words) covering:
- Physical appearance (distinctive features)
- Clothing/style that reveals personality
- Body language or posture indicating emotional state
- One telling detail that suggests backstory

Keep it showing, not telling. Use sensory details.`,

  [CAPABILITIES.DIALOGUE_IMPROVEMENT]: (context) =>
    `Improve this dialogue to make it more natural and impactful.

Current dialogue:
"${context}"

Provide:
1. What's working well (1 sentence)
2. 2-3 specific improvements to consider
3. One revised excerpt showing the improvement (max 4 lines)

Focus on: subtext, distinct voices, pacing, and emotional authenticity.`,

  [CAPABILITIES.WRITERS_BLOCK]: (context) =>
    `I'm stuck writing. Help me get unstuck.

Current situation: ${context}

Provide 4-5 brief "what if" scenarios or unexpected directions I could take (1-2 sentences each). Make them creative and varied:
- One introduces a complication
- One reveals hidden information
- One shifts the emotional tone
- One brings in an outside force
- One changes a character's motivation

Your goal: spark ideas, not write for me.`,

  [CAPABILITIES.TONE_ENHANCEMENT]: (context, tone) =>
    `Rewrite this excerpt with a ${tone} tone while keeping the same content.

Original:
"${context}"

Provide:
1. One revised version in the ${tone} tone (max 100 words)
2. 2-3 specific word choices or techniques that create this tone
3. One additional suggestion for enhancing the ${tone} atmosphere

Focus on word choice, sentence rhythm, and sensory details.`,

  [CAPABILITIES.EMOTION_ENHANCEMENT]: (context, emotion) =>
    `Make this scene feel more ${emotion}.

Current text:
"${context}"

Provide:
1. One revised excerpt showing stronger ${emotion} (max 100 words)
2. 2-3 specific techniques to amplify ${emotion} (physical reactions, sensory details, pacing, word choice)
3. One suggestion for a metaphor or comparison that enhances the ${emotion}

Show, don't tell. Use body language and sensory details.`,

  [CAPABILITIES.CHARACTER_CONSISTENCY]: (context, characterInfo) =>
    `Check if character actions are consistent with established traits.

Established character: ${characterInfo}

Scene to check:
"${context}"

Provide:
1. Any inconsistencies detected (if none, say so)
2. Suggested adjustments if needed (max 2 sentences per issue)
3. One observation about what IS working well with the characterization

Be constructive and specific.`,

  [CAPABILITIES.PLOT_HOLE]: (context, storyContext) =>
    `Check this scene for plot holes or contradictions.

Story context so far: ${storyContext}

Scene to check:
"${context}"

Identify:
1. Any timeline inconsistencies
2. Forgotten events/established facts that are contradicted
3. Impossible actions given the world rules
4. Conflicting information

Provide brief fixes (1 sentence each) only for real issues. If no issues, confirm it's consistent.`,

  [CAPABILITIES.WORLDBUILDING]: (context) =>
    `Help me expand my story's world.

Current setting/context: ${context}

Provide 4-5 evocative suggestions for:
- Place names, organizations, or institutions
- Cultural details or customs
- Historical events that shaped the world
- Unique features of the setting
- Magical or technological systems

Keep each to 1-2 sentences. Make them specific and atmospheric.`,

  [CAPABILITIES.CHAPTER_TITLE]: (context) =>
    `Suggest chapter titles for this content.

Chapter summary:
${context}

Provide 5 title options:
1. Symbolic/metaphorical
2. Character-focused
3. Event/action-focused  
4. Emotion-focused
5. Mysterious/intriguing

Keep titles under 5 words. Explain briefly why each works.`,

  [CAPABILITIES.DESCRIPTION]: (context) =>
    `Enhance this description with more sensory detail.

Current:
"${context}"

Provide:
1. Enhanced version with added sensory details (sight, sound, smell, texture, temperature) - max 100 words
2. 2-3 specific additions that make the description more immersive
3. One metaphor or comparison that strengthens the atmosphere

Focus on atmosphere and mood.`,

  [CAPABILITIES.CONFLICT]: (context) =>
    `Suggest ways to increase conflict/tension in this scene.

Current situation:
${context}

Provide 4 options for conflict:
1. Interpersonal (between characters)
2. Internal (within one character)
3. External (environmental/circumstantial)
4. Plot complication (unexpected obstacle)

Each should be 1-2 sentences describing the conflict direction, not a full scene.`,

  [CAPABILITIES.PACING]: (context) =>
    `Analyze the pacing of this excerpt.

Text:
"${context}"

Identify:
1. Whether the pacing feels appropriate for the content
2. Any sections that drag or rush
3. Specific suggestions to fix pacing issues (2-3 brief tips)
4. One technique that would improve the rhythm

Be specific about which sentences or moments need adjustment.`,

  [CAPABILITIES.READING_LEVEL]: (context, target) =>
    `Adjust this text to be more ${target}.

Original:
"${context}"

Provide:
1. Adjusted version (max 100 words)
2. 2-3 specific changes made (word substitutions, sentence structure changes)
3. How this affects the reader's experience

Maintain the same meaning and tone while changing complexity.`,

  [CAPABILITIES.GRAMMAR]: (context) =>
    `Improve the grammar, clarity, and flow of this text.

Original:
"${context}"

Provide:
1. Cleaned version with fixes applied (max 100 words)
2. List of 3-5 specific improvements made
3. One optional stylistic suggestion beyond grammar

Focus on clarity and professional polish.`,

  [CAPABILITIES.THEME]: (context, theme) =>
    `Strengthen the theme of ${theme} in this excerpt.

Current text:
"${context}"

Provide:
1. Revised excerpt that reinforces ${theme} more strongly (max 100 words)
2. 2-3 techniques used (imagery, word choice, symbolism, character reactions)
3. One additional subtle way to weave in the theme

Enhance without being heavy-handed.`,

  [CAPABILITIES.SUSPENSE]: (context) =>
    `Increase suspense and tension in this scene.

Current:
"${context}"

Provide:
1. Revised excerpt with added suspense (max 100 words)
2. 2-3 suspense techniques to apply (foreshadowing, pacing, withholding info, sensory narrowing)
3. One suggestion for a cliffhanger moment or unsettling detail

Build anticipation without revealing too much.`,

  [CAPABILITIES.RELATIONSHIP]: (context, relationship) =>
    `Improve the depiction of this ${relationship} relationship.

Scene:
"${context}"

Provide:
1. Enhanced excerpt showing relationship dynamics more vividly (max 100 words)
2. 2-3 ways to show the relationship through action rather than exposition
3. One suggestion for dialogue or interaction that reveals relationship depth

Focus on emotional authenticity and showing through behavior.`,
};

// Count words in text
function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// Check if user has remaining turns
async function checkTurns(storyId, userId) {
  const story = await prisma.stories.findUnique({
    where: { story_id: storyId },
    select: { author_id: true, ai_turns_used: true, ai_turns_limit: true },
  });

  if (!story) {
    throw new Error("Story not found");
  }

  if (story.author_id !== userId) {
    throw new Error("Not authorized for this story");
  }

  return {
    remaining: Math.max(0, story.ai_turns_limit - story.ai_turns_used),
    used: story.ai_turns_used,
    limit: story.ai_turns_limit,
    locked: story.ai_turns_used >= story.ai_turns_limit,
  };
}

// Record AI turn usage
async function recordTurn(storyId, userId, capability, prompt, response) {
  const wordCount = countWords(response);

  await prisma.$transaction([
    prisma.ai_assistant_history.create({
      data: {
        story_id: storyId,
        user_id: userId,
        capability,
        prompt: prompt.slice(0, 2000),
        response: response.slice(0, 4000),
        word_count: wordCount,
      },
    }),
    prisma.stories.update({
      where: { story_id: storyId },
      data: { ai_turns_used: { increment: 1 } },
    }),
  ]);

  return wordCount;
}

// Main AI assistance function
export async function assist(storyId, userId, capability, context, options = {}) {
  // Check turns first
  const turns = await checkTurns(storyId, userId);
  if (turns.locked) {
    return {
      success: false,
      error: "AI_ASSISTANT_LOCKED",
      message: "You've used all 5 AI assistance turns for this book. Continue writing without AI assistance.",
      turns,
    };
  }

  // Validate capability (check if it's a valid value in CAPABILITIES)
  const validCapabilities = Object.values(CAPABILITIES);
  if (!validCapabilities.includes(capability)) {
    return {
      success: false,
      error: "INVALID_CAPABILITY",
      message: `Unknown capability: ${capability}`,
    };
  }

  // Build prompt
  const templateFn = PROMPT_TEMPLATES[capability] || PROMPT_TEMPLATES[CAPABILITIES.WRITERS_BLOCK];
  const userPrompt = templateFn(context, options.tone || options.emotion || options.target || options.theme || options.relationship);

  // Call Gemini API with OpenRouter fallback
  try {
    let response;
    try {
      // Try Gemini first
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT }],
          },
          {
            role: "model",
            parts: [{ text: "I understand. I will act as a creative writing assistant, providing suggestions and help while never writing complete chapters or scenes. I'll keep responses concise (under 300 words) and encourage the writer's creativity." }],
          },
        ],
      });

      const result = await chat.sendMessage(userPrompt);
      response = result.response.text();
    } catch (geminiError) {
      console.error("Gemini API failed, trying OpenRouter fallback:", geminiError.message);

      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("Both Gemini and OpenRouter API keys are unavailable");
      }

      // Fallback to OpenRouter
      const openRouterResponse = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "openai/gpt-3.5-turbo",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 300,
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      response = openRouterResponse.data.choices[0].message.content;
    }

    // Record the turn
    const wordCount = await recordTurn(storyId, userId, capability, userPrompt, response);

    // Get updated turns
    const updatedTurns = await checkTurns(storyId, userId);

    return {
      success: true,
      capability,
      capabilityLabel: CAPABILITY_LABELS[capability],
      response,
      wordCount,
      turns: updatedTurns,
    };
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return {
      success: false,
      error: "AI_SERVICE_ERROR",
      message: "The AI assistant encountered an error. Please try again.",
      turns,
    };
  }
}

// Get AI usage stats for a story
export async function getUsage(storyId, userId) {
  const story = await prisma.stories.findUnique({
    where: { story_id: storyId },
    select: { author_id: true, ai_turns_used: true, ai_turns_limit: true },
  });

  if (!story || story.author_id !== userId) {
    throw new Error("Not authorized");
  }

  const history = await prisma.ai_assistant_history.findMany({
    where: { story_id: storyId, user_id: userId },
    orderBy: { created_at: "desc" },
    take: 20,
    select: {
      id: true,
      capability: true,
      word_count: true,
      created_at: true,
    },
  });

  return {
    remaining: Math.max(0, story.ai_turns_limit - story.ai_turns_used),
    used: story.ai_turns_used,
    limit: story.ai_turns_limit,
    locked: story.ai_turns_used >= story.ai_turns_limit,
    history,
  };
}

// Get all capabilities list
export function getCapabilities() {
  return Object.entries(CAPABILITY_LABELS).map(([key, label]) => ({
    key,
    label,
    category: getCategory(key),
  }));
}

function getCategory(capability) {
  const categories = {
    Structure: ["opening_line", "scene_continuation", "ending_assistance", "chapter_title", "pacing"],
    Characters: ["character_description", "dialogue_improvement", "character_consistency", "relationship"],
    Style: ["tone_enhancement", "emotion_enhancement", "description", "grammar", "reading_level"],
    Story: ["writers_block", "plot_hole", "conflict", "suspense", "theme"],
    World: ["worldbuilding"],
  };

  for (const [cat, items] of Object.entries(categories)) {
    if (items.includes(capability)) return cat;
  }
  return "General";
}

export { CAPABILITIES, CAPABILITY_LABELS };
