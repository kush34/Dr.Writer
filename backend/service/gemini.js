import { GoogleGenerativeAI } from "@google/generative-ai";


const useGemini = async (Userprompt)=>{
    const genAI = new GoogleGenerativeAI(process.env.Gemini_API);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const finalPrompt =  Userprompt;
    
    const result = await model.generateContent(finalPrompt);
    return result.response.text();
}

export default useGemini;