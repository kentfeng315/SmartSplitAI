import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ReceiptData {
  title: string;
  amount: number;
}

export const parseReceiptImage = async (base64Image: string): Promise<ReceiptData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming jpeg/png, standardizing request
              data: base64Image
            }
          },
          {
            text: "Analyze this receipt. Extract the merchant name (or a short description) as the title, and the total amount. Return JSON."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Merchant name or short title of the bill" },
            amount: { type: Type.NUMBER, description: "Total grand total amount of the receipt" }
          },
          required: ["title", "amount"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as ReceiptData;
  } catch (error) {
    console.error("Error parsing receipt:", error);
    throw error;
  }
};