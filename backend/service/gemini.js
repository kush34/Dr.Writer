// import { GoogleGenerativeAI } from "@google/generative-ai";


// const useGemini = async (Userprompt)=>{
//     const genAI = new GoogleGenerativeAI(process.env.Gemini_API);
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
//     const finalPrompt =  Userprompt;
    
//     const result = await model.generateContent(finalPrompt);
//     return result.response.text();
// }
import { GoogleGenerativeAI } from "@google/generative-ai";

export const useGemini = async (userPrompt) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.Gemini_API);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(userPrompt);

    // Get raw markdown content instead of plain text
    const rawText = result.response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .join("") || "";

    return {
      success: true,
      rawText, // preserve markdown, code blocks, math
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      success: false,
      error: error.message || "Something went wrong with Gemini API",
    };
  }
};


export default useGemini;