import {GoogleGenAI} from "@google/genai";

const getApiKey = () => {
  // Try process.env first (standard for this environment)
  if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  // Fallback for standard Vite/Vercel deployments
  // @ts-ignore
  return import.meta.env.VITE_GEMINI_API_KEY || "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function generateComment(keywords: string, backlinkUrl: string, tone: string = "santai") {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Buatlah sebuah komentar blog yang menarik dan relevan dalam Bahasa Indonesia.
    Kata Kunci: ${keywords}
    Nada: ${tone}
    
    Tugas Anda:
    1. Buat komentar singkat (2-3 kalimat).
    2. Pastikan salah satu kata kunci dari daftar di atas muncul dalam teks.
    3. Bungkus kata kunci tersebut dengan tag HTML link ke: ${backlinkUrl}. Contoh: <a href="${backlinkUrl}">kata kunci</a>.
    4. Komentar harus terlihat alami dan tidak seperti spam.`,
    config: {
      systemInstruction: "Anda adalah pakar SEO dan pemberi komentar blog profesional. Gunakan Bahasa Indonesia yang baik dan benar namun tetap santai.",
    }
  });

  return response.text;
}

export async function searchBlogs(keyword: string, count: number = 10, engine: string = "google") {
  const query = keyword 
    ? `Cari ${count} postingan blog terbaru yang relevan dengan kata kunci: "${keyword}".`
    : `Cari ${count} postingan blog terbaru dari berbagai topik (lifestyle, tech, personal) yang memiliki kolom komentar aktif.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `${query}
    Gunakan perspektif hasil pencarian dari mesin pencari: ${engine}.
    Target: Blog yang menggunakan platform Blogger/Blogspot (termasuk yang menggunakan custom domain).
    Pastikan blog tersebut aktif dan memiliki fitur komentar terbuka.
    Berikan daftar URL dan judulnya.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  const searchResults = chunks?.map(chunk => ({
    title: chunk.web?.title || "Postingan Blog",
    url: chunk.web?.uri || ""
  })).slice(0, count) || [];

  return {
    text: response.text,
    results: searchResults
  };
}
