import { GoogleGenerativeAI } from "@google/generative-ai";
import { error } from "console";

const GEMINI_API_KEY = process.env.Gemini_API;
if(!GEMINI_API_KEY){
  throw new error("Gemini_API not found in env.")
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function getEditOperations(content: Object, command: string) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json", // 🔑 THIS IS THE KEY
    },
  })

  const prompt = `
You are a text editor engine.

RULES:
- Do NOT rewrite the full document
- Output ONLY valid JSON
- Use character offsets from the ORIGINAL content

CONTENT:
"""${content}"""

COMMAND:
"${command}"

OUTPUT:
{
  "reasoning": "...",
  "operations": [
    {
    "type": "insert",
    "at": number,
    "text": string
    },
    {
      "type": "replace",
      "from": number,
      "to": number,
      "text": string
    },
    {
    "type": "delete",
    "from": number,
    "to": number
    }


  ]
}
`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  return JSON.parse(text)
}

export const useGeminiStream = async (userPrompt: string, systemPrompt: string, command: string) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  // IMPORTANT: do NOT consume the stream here
  const result = await model.generateContentStream(userPrompt);
  // console.log("TOKEN USAGE",(await result.response).usageMetadata)
  return result; // result.stream is the async iterable
};

export default useGeminiStream;
