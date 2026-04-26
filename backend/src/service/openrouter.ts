import { Response } from "express";
import { AppError } from "../utils/appError";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const getHeaders = () => ({
  "Authorization": `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
  "Content-Type": "application/json",
  "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
});

export const openRouterStream = async (
  prompt: string,
  modelName: string,
  res: Response,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void
) => {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
  });
  // console.log("KEY:", process.env.OPEN_ROUTER_API_KEY);
  if (response.status === 429) {
    throw new AppError(429, "Model is currently rate limited. Please try a different model or try again later.");
  }
  if (!response.ok || !response.body) {
    throw new Error(`OpenRouter error: ${response.status} ${await response.text()}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split("\n").filter(Boolean);

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        onDone(fullText);
        return;
      }

      try {
        const parsed = JSON.parse(data);
        const text = parsed.choices?.[0]?.delta?.content || "";
        if (text) {
          fullText += text;
          onChunk(text);
        }
      } catch { }
    }
  }

  onDone(fullText);
};

export const openRouterComplete = async (
  prompt: string,
  modelName: string
): Promise<string> => {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};