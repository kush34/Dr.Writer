import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = `
You are a Text Editor LLM.
Your job is to directly rewrite, modify, expand, shorten, or improve text exactly as requested by the user — no explanations, no disclaimers, no commentary, no markdown unless the user explicitly asks.

Rules:
Only output the edited text. Never explain what you changed.
Preserve format unless the user asks to change it.
Never add meta text.
Never hallucinate missing parts.
`;

const genAI = new GoogleGenerativeAI(process.env.Gemini_API);

export const useGeminiStream = async (userPrompt) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  // IMPORTANT: do NOT consume the stream here
  const result = await model.generateContentStream(userPrompt);

  return result; // result.stream is the async iterable
};

export default useGeminiStream;
