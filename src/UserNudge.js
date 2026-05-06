/**
 * UserNudge.js
 * Calls Gemini to generate a personalized food nudge.
 */
import { GoogleGenAI } from "@google/genai";

export const UserNudge = {
  async generate(ctx, flags) {
    // Check cache (10 minutes)
    const cached = JSON.parse(localStorage.getItem('nl_nudge_cache'));
    const now = Date.now();
    if (cached && (now - cached.timestamp < 10 * 60 * 1000) && JSON.stringify(cached.ctx) === JSON.stringify(ctx)) {
      return cached.text;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `User context: sleep score ${ctx.sleepScore}/100, stress is ${ctx.stressLevel}, 
      last meal: ${ctx.lastMeal ?? 'unknown'}, time: ${ctx.hour}:00, goal: ${ctx.goal}, diet: ${ctx.diet}.
      Risk flags: ${flags.map(f => f.type).join(', ')}.
      Write a 2-sentence proactive food nudge. Never say "don't". Always offer a Swap-to-Win alternative.
      Be warm, specific, and actionable. Avoid using markdown or bolding in the response.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "Stay hydrated and eat something light!";
      
      // Cache the result
      localStorage.setItem('nl_nudge_cache', JSON.stringify({
        text,
        timestamp: now,
        ctx
      }));

      return text;
    } catch (error) {
      console.error("Gemini Nudge Error:", error);
      return "Listen to your body today. Maybe a piece of fruit and some nuts?";
    }
  }
};
