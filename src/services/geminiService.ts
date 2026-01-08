/// <reference types="vite/client" />
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";
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

export const FALLBACK_MEASUREMENTS: Record<string, any> = {
  'small': {
    capo: { w: 1.2, h: 0.9 }, teto: { w: 1.1, h: 1.4 }, porta_malas: { w: 1.1, h: 0.6 },
    paralamas_dianteiros: { w: 0.8, h: 0.6 }, portas_dianteiras: { w: 0.9, h: 0.6 },
    portas_traseiras: { w: 0, h: 0 }, laterais: { w: 1.5, h: 0.6 }, parachoque_dianteiro: { w: 1.6, h: 0.5 }, parachoque_traseiro: { w: 1.6, h: 0.5 }
  },
  'sedan': {
    capo: { w: 1.4, h: 1.0 }, teto: { w: 1.2, h: 1.5 }, porta_malas: { w: 1.2, h: 0.6 },
    paralamas_dianteiros: { w: 0.9, h: 0.7 }, portas_dianteiras: { w: 1.0, h: 0.7 },
    portas_traseiras: { w: 0.9, h: 0.7 }, laterais: { w: 2.0, h: 0.7 }, parachoque_dianteiro: { w: 1.7, h: 0.5 }, parachoque_traseiro: { w: 1.7, h: 0.5 }
  },
  'suv': {
    capo: { w: 1.5, h: 1.1 }, teto: { w: 1.3, h: 2.0 }, porta_malas: { w: 1.3, h: 0.8 },
    paralamas_dianteiros: { w: 1.0, h: 0.8 }, portas_dianteiras: { w: 1.1, h: 0.8 },
    portas_traseiras: { w: 1.0, h: 0.8 }, laterais: { w: 2.5, h: 0.8 }, parachoque_dianteiro: { w: 1.8, h: 0.6 }, parachoque_traseiro: { w: 1.8, h: 0.6 }
  },
  'pickup': {
    capo: { w: 1.6, h: 1.2 }, teto: { w: 1.4, h: 1.4 }, porta_malas: { w: 1.5, h: 0.6 },
    paralamas_dianteiros: { w: 1.0, h: 0.8 }, portas_dianteiras: { w: 1.1, h: 0.8 },
    portas_traseiras: { w: 1.0, h: 0.8 }, laterais: { w: 2.8, h: 0.8 }, parachoque_dianteiro: { w: 1.9, h: 0.6 }, parachoque_traseiro: { w: 1.9, h: 0.6 }
  }
};

export const getFallbackDimensions = (model: string) => {
  const lowerModel = model.toLowerCase();
  if (lowerModel.includes('saveiro') || lowerModel.includes('strada') || lowerModel.includes('toro') || lowerModel.includes('ranger') || lowerModel.includes('hilux') || lowerModel.includes('s10')) return FALLBACK_MEASUREMENTS['pickup'];
  if (lowerModel.includes('suv') || lowerModel.includes('jeep') || lowerModel.includes('compass') || lowerModel.includes('creta') || lowerModel.includes('hrv')) return FALLBACK_MEASUREMENTS['suv'];
  if (lowerModel.includes('sedan') || lowerModel.includes('corolla') || lowerModel.includes('civic') || lowerModel.includes('virtus')) return FALLBACK_MEASUREMENTS['sedan'];
  return FALLBACK_MEASUREMENTS['small']; // Default to hatch/small
};

export const getVehicleMeasurements = async (make: string, model: string, year: string): Promise<any> => {
  // 1. Check Cache (Supabase)
  try {
    const { data, error } = await supabase
      .from('vehicle_measurements_cache')
      .select('dimensions')
      .eq('make', make)
      .eq('model', model)
      .eq('year', year)
      .single();

    if (data && data.dimensions) {
      console.log("Vehicle found in cache!");
      return data.dimensions;
    }
  } catch (err) {
    console.warn("Cache check failed, proceeding to AI...", err);
  }

  const genAI = getGenAI();

  // Offline Fallback immediately if no API
  if (!genAI) {
    console.warn("Gemini API not found, using generic fallback.");
    return getFallbackDimensions(model);
  }

  const genModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Aja como um orçamentista técnico de uma oficina de envelopamento. 
  Estime as dimensões de largura e altura (em metros) de cada peça do veículo: ${make} ${model} ${year}.
  
  REGRAS DE OURO:
  1. Seja REALISTA: Um capô de Saveiro 93 tem aprox. 1.35m x 0.95m. Jamais retorne áreas absurdas como 2m².
  2. Sangria: Adicione EXATAMENTE 0.05m (5cm) de sobra em cada lado para aplicação.
  3. Veículo 2 portas: Se o modelo for 2 portas (como Saveiro), 'portas_traseiras' DEVE ser {w:0, h:0}.
  4. Formato: Retorne um JSON rigoroso com as chaves: capo, paralamas_dianteiros, portas_dianteiras, portas_traseiras, teto, colunas, porta_malas, traseira, parachoque_dianteiro, parachoque_traseiro, vidro_traseiro_microperfurado, laterais.
  5. Cada chave deve conter um objeto {w: número, h: número}.
  
  IMPORTANTE: Retorne APENAS o JSON, sem markdown, sem aspas triplas.`;

  try {
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    if (!cleanText) throw new Error("Resposta vazia da IA");
    const dimensions = JSON.parse(cleanText);

    // 2. Save to Cache
    try {
      await supabase.from('vehicle_measurements_cache').insert({
        make, model, year, dimensions
      });
    } catch (saveErr) {
      console.warn("Failed to save to cache", saveErr);
    }

    return dimensions;
  } catch (error) {
    console.error("Erro GeminiService:", error);
    // On error, use fallback
    return getFallbackDimensions(model);
  }
};

export const suggestPrice = async (
  productName: string,
  category: string,
  baseCost: number,
  marketContext: string = "comunicação visual e impressão digital"
): Promise<{ conservative: number; moderate: number; aggressive: number; reasoning: string }> => {
  const genAI = getGenAI();
  if (!genAI) throw new Error("API Key não configurada");

  const genModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Atue como um especialista em precificação para ${marketContext}.
  Analise o produto: "${productName}" (Categoria: ${category}).
  Custo Base de Produção (Material + Hora/Máquina): R$ ${baseCost.toFixed(2)}.

  Gere 3 sugestões de preço de venda:
  1. Conservador (Margem baixa/Giro rápido)
  2. Moderado (Margem ideal de mercado)
  3. Agressivo (Alta percepção de valor/Premium)

  Retorne APENAS um JSON neste formato:
  {
    "conservative": 0.00,
    "moderate": 0.00,
    "aggressive": 0.00,
    "reasoning": "Resumo curto de 1 frase explicando a lógica."
  }`;

  try {
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    const cleanText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Erro ao sugerir preço", error);
    // Fallback simples baseado em multiplicadores comuns
    return {
      conservative: baseCost * 2,
      moderate: baseCost * 3,
      aggressive: baseCost * 4,
      reasoning: "Cálculo de fallback (2x, 3x, 4x) devido a erro na IA."
    };
  }
};

export const generateSalesPitch = async (
  customer: Customer,
  items: (QuoteItem & { productName: string, labelData?: any, requirements?: Record<string, any> })[],
  total: number,
  designFee: number,
  installFee: number,
  deadlineDays: number,
  salespersonName: string,
  quoteUrl: string // Changed from quoteId to full URL
): Promise<string> => {
  const genAI = getGenAI();
  const genModel = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

  if (!genModel) {
    return generateSalesPitchFallback(customer, items, total, designFee, installFee, deadlineDays, salespersonName, quoteUrl);
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
    - 🔗 *Link para Aprovação:* ${quoteUrl}

    Instruções: Gere um texto profissional para WhatsApp contendo essas informações. Se houver envelopamento, cite o detalhamento das peças. Assine como "${salespersonName} — Design Phoco".`;

  try {
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Erro ao gerar texto.";
  } catch (error) {
    console.error("Erro GeminiService:", error);
    return generateSalesPitchFallback(customer, items, total, designFee, installFee, deadlineDays, salespersonName, quoteUrl);
  }
};

export const generateSalesPitchFallback = (
  customer: Customer,
  items: (QuoteItem & { productName: string, labelData?: any, requirements?: Record<string, any> })[],
  total: number,
  designFee: number,
  installFee: number,
  deadlineDays: number,
  salespersonName: string,
  quoteUrl: string
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

  return `Olá *${customer.name}*, tudo bem?\n` +
    `Aqui é *${salespersonName}* da PHOCO Impressão Digital.\n\n` +
    `Conforme conversamos, segue o detalhamento do seu orçamento:\n\n` +
    `${itemsList}\n\n` +
    `💰 *INVESTIMENTO TOTAL: R$ ${total.toFixed(2)}*\n\n` +
    `🔗 *Link para Aprovação:*\n` +
    `${quoteUrl}\n\n` +
    `*Condições de Pagamento:*\n` +
    `- 💳 Sinal de 50% (R$ ${downPayment.toFixed(2)}) para início.\n` +
    `- 🗓️ Prazo de produção: ${deadlineDays} dias úteis (após aprovação).\n\n` +
    `Podemos dar andamento?\n\n` +
    `*${salespersonName}*\n` +
    `Design Phoco`;
};


export const refineAddress = async (rawInput: string): Promise<string | null> => {
  const genAI = getGenAI();
  if (!genAI) return null;

  const genModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Aja como um especialista em endereçamento de Minas Gerais (BH e Contagem).
  O usuário digitou um endereço vago ou com erros: "${rawInput}".
  
  Sua missão: Corrigir e padronizar esse endereço para o formato mais provável existente.
  
  Exemplos:
  "Av Joao" -> "Avenida João Gomes Cardoso, Contagem, MG"
  "Rua Rio Mantiqueira" -> "Rua Rio Mantiqueira, Contagem, MG"
  "Centro" -> "Centro, Contagem, MG"
  
  Retorne APENAS o endereço corrigido, sem explicações. Se não conseguir identificar nada plausível, retorne "null".`;

  try {
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    if (text.toLowerCase() === 'null') return null;
    return text;
  } catch (error) {
    console.error("Erro ao refinar endereço com IA:", error);
    return null;
  }
};
