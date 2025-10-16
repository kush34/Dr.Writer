import { GoogleGenerativeAI } from "@google/generative-ai";

export const useGemini = async (userPrompt) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.Gemini_API);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(userPrompt);
    const rawText = result.response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .join("") || "";

    return {
      success: true,
      rawText,
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      success: false,
      error: "Something went wrong with Gemini API",
    };
  }
};



export default useGemini;



