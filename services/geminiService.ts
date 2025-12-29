import { GoogleGenerativeAI } from "@google/generative-ai";
import { Customer, QuoteItem } from "../types";

// Initialize the API with the key
const genAI = new GoogleGenerativeAI(process.env.API_KEY || '');

export const getVehicleMeasurements = async (make: string, model: string, year: string): Promise<any> => {
  const genModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Aja como um orçamentista técnico de uma oficina de envelopamento. 
  Estime as dimensões de largura e altura (em metros) de cada peça do veículo: ${make} ${model} ${year}.
  
  REGRAS DE OURO:
  1. Seja REALISTA: Um capô de Saveiro 93 tem aprox. 1.35m x 0.95m. Jamais retorne áreas absurdas como 2m².
  2. Sangria: Adicione EXATAMENTE 0.05m (5cm) de sobra em cada lado para aplicação.
  3. Veículo 2 portas: Se o modelo for 2 portas (como Saveiro), 'portas_traseiras' DEVE ser {w:0, h:0}.
  4. Formato: Retorne um JSON rigoroso com as chaves: capo, paralamas_dianteiros, portas_dianteiras, portas_traseiras, teto, colunas, porta_malas, traseira, para_choque_dianteiro, para_choque_traseiro, vidro_traseiro_microperfurado.
  5. Cada chave deve conter um objeto {w: número, h: número}.
  
  IMPORTANTE: Retorne APENAS o JSON, sem markdown, sem aspas triplas.`;

  try {
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    if (!cleanText) throw new Error("Resposta vazia da IA");
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Erro GeminiService:", error);
    return null;
  }
};

export const generateSalesPitch = async (
  customer: Customer,
  items: (QuoteItem & { productName: string, labelData?: any, requirements?: Record<string, any> })[],
  total: number,
  designFee: number,
  installFee: number,
  deadlineDays: number,
  salespersonName: string
): Promise<string> => {
  const genModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const itemsList = items.map(i => {
    let details = i.width && i.height && i.height !== 1 ? ` [${i.width}x${i.height}m]` : '';
    if (i.labelData) {
      details = ` (${i.labelData.totalLabels} etiquetas de ${i.labelData.w}x${i.labelData.h}cm)`;
    } else if (i.width && (!i.height || i.height === 1)) {
      details = ` [Área Total: ${i.width.toFixed(2)}m²]`;
    }

    let reqText = '';
    if (i.requirements && Object.entries(i.requirements).length > 0) {
      if (i.requirements.auto_vehicle) {
        reqText += `\n   🚗 _Veículo:_ ${i.requirements.auto_vehicle}`;
      }
      if (i.requirements.auto_breakdown) {
        reqText += `\n   _Peças inclusas:_ ${i.requirements.auto_breakdown}`;
      }
    }

    return `✅ *${i.productName}${details}*\n   Qtd: ${i.quantity} | Sub: *R$ ${i.subtotal.toFixed(2)}*${reqText}`;
  }).join('\n\n');

  const downPayment = total / 2;

  const prompt = `
    Aja como um assistente comercial da "PHOCO Impressão Digital". 
    Cliente: ${customer.name}. Design: ${salespersonName}.
    
    *Pedido:*
    ${itemsList}
    
    💰 *INVESTIMENTO TOTAL: R$ ${total.toFixed(2)}*
    
    *Condições:*
    - 💳 *Sinal de 50% (R$ ${downPayment.toFixed(2)})*.
    - 🗓️ *Prazo:* ${deadlineDays} dias úteis.

    Instruções: Gere um texto profissional para WhatsApp. Se houver envelopamento, cite o detalhamento das peças. Assine como "${salespersonName} — Design Phoco".`;

  try {
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Erro ao gerar texto.";
  } catch (error) {
    console.error("Erro GeminiService:", error);
    return "Erro na comunicação com a IA.";
  }
};
