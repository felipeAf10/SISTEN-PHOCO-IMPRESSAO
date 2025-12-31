import { GoogleGenerativeAI } from "@google/generative-ai";
import { Customer, QuoteItem } from "../types";

// Initialize the API lazily
const getGenAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    console.warn("Gemini API Key is missing");
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

export const getVehicleMeasurements = async (make: string, model: string, year: string): Promise<any> => {
  const genAI = getGenAI();
  if (!genAI) return null;
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
  const genAI = getGenAI();
  const genModel = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-flash" }) : null;

  if (!genModel) {
    return generateSalesPitchFallback(customer, items, total, designFee, installFee, deadlineDays, salespersonName);
  }

  const itemsList = items.map(i => {
    let details = i.width && i.height && i.height !== 1 ? ` [${i.width}x${i.height}m]` : '';

    if (i.labelData) {
      if (typeof i.labelData.totalLabels === 'number' || i.labelData.type === 'sticker') {
        // Sticker Format
        const w = i.labelData.w || i.labelData.singleWidth || 0;
        const h = i.labelData.h || i.labelData.singleHeight || 0;
        details = ` (${i.labelData.totalLabels || i.quantity} etiquetas de ${w}x${h}cm)`;
      } else if (i.labelData.type === 'laser') {
        // Laser Format
        if (i.labelData.mode === 'promotional') {
          details = ` [Brinde: ${i.labelData.promoProduct}]`;
        } else {
          details = ` [Material: ${i.labelData.material} ${i.labelData.thickness}]`;
        }
      } else if (i.labelData.type === 'automotive') {
        // Automotive Format
        details = ` [Veículo: ${i.labelData.vehicle}]`;
      }
    } else if (i.width && (!i.height || i.height === 1)) {
      details = ` [Área Total: ${i.width.toFixed(2)}m²]`;
    }

    let reqText = '';
    if (i.requirements && Object.entries(i.requirements).length > 0) {
      if (i.requirements.auto_vehicle) {
        reqText += `\n   🚗 _Veículo:_ ${i.requirements.auto_vehicle}`;
      }
      if (i.requirements.auto_breakdown) {
        reqText += `\n   _Peças:_ ${i.requirements.auto_breakdown}`;
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
    return generateSalesPitchFallback(customer, items, total, designFee, installFee, deadlineDays, salespersonName);
  }
};

export const generateSalesPitchFallback = (
  customer: Customer,
  items: (QuoteItem & { productName: string, labelData?: any, requirements?: Record<string, any> })[],
  total: number,
  designFee: number,
  installFee: number,
  deadlineDays: number,
  salespersonName: string
): string => {
  const itemsList = items.map(i => {
    let details = i.width && i.height && i.height !== 1 ? ` [${i.width}x${i.height}m]` : '';

    if (i.labelData) {
      if (typeof i.labelData.totalLabels === 'number' || i.labelData.type === 'sticker') {
        const w = i.labelData.w || i.labelData.singleWidth || 0;
        const h = i.labelData.h || i.labelData.singleHeight || 0;
        details = ` (${i.labelData.totalLabels || i.quantity} etiquetas de ${w}x${h}cm)`;
      } else if (i.labelData.type === 'laser') {
        if (i.labelData.mode === 'promotional') {
          details = ` [Brinde: ${i.labelData.promoProduct}]`;
        } else {
          details = ` [Material: ${i.labelData.material} ${i.labelData.thickness}]`;
        }
      } else if (i.labelData.type === 'automotive') {
        details = ` [Veículo: ${i.labelData.vehicle}]`;
      }
    } else if (i.width && (!i.height || i.height === 1)) {
      details = ` [Área Total: ${i.width.toFixed(2)}m²]`;
    }

    let reqText = '';
    if (i.requirements) {
      if (i.requirements.auto_vehicle) reqText += `\n   🚗 Veículo: ${i.requirements.auto_vehicle}`;
      if (i.requirements.auto_breakdown) reqText += `\n   Peças: ${i.requirements.auto_breakdown}`;
    }

    return `✅ *${i.productName}${details}*\n   Qtd: ${i.quantity} | Sub: *R$ ${i.subtotal.toFixed(2)}*${reqText}`;
  }).join('\n\n');

  const downPayment = total / 2;

  return `Olá *${customer.name}*, tudo bem?\nAqui é *${salespersonName}* da PHOCO Impressão Digital.\n\nSegue o detalhamento do seu orçamento:\n\n${itemsList}\n\n💰 *INVESTIMENTO TOTAL: R$ ${total.toFixed(2)}*\n\n*Condições de Pagamento:*\n- 💳 Sinal de 50% (R$ ${downPayment.toFixed(2)}) para início.\n- 🗓️ Prazo de produção: ${deadlineDays} dias úteis.\n\nFico à disposição para qualquer dúvida!\n\n*${salespersonName}*\nDesign Phoco`;
};
