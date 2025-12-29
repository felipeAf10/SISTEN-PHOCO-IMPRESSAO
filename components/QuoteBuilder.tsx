
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Search, UserPlus, MessageSquare, Sparkles, Loader2, Trash2, ShoppingCart,
  Layers, Paintbrush, Hammer, Copy, Check, Calculator, Info, X, FileText,
  Clock, Zap, Star, LayoutGrid, List, ChevronRight, Image as ImageIcon,
  Sticker, Flag, Gift, HardHat, Tv, Type, Files, Printer, Wrench, Shirt,
  Maximize2, ArrowRight, ClipboardCheck, Ruler, Truck, Scissors, Sparkle, Car
} from 'lucide-react';
import { Product, Customer, Quote, QuoteItem, QuoteStatus, FinancialConfig, User } from '../types';
import { generateSalesPitch, getVehicleMeasurements } from '../services/geminiService';
import IndicatorPanel from './IndicatorPanel';
import { api } from '../src/services/api';

interface QuoteBuilderProps {
  products: Product[];
  customers: Customer[];
  quotes: Quote[];
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  finConfig: FinancialConfig;
  currentUser: User;
  onFinish: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Adesivos': Sticker,
  'Banners': Flag,
  'Brindes': Gift,
  'Chapas': HardHat,
  'Letra Caixa': Type,
  'Lonas': Files,
  'Envelopamento': Car,
  'LED': Tv,
  'Impressão': Printer,
  'Serviços': Wrench,
  'Têxtil': Shirt,
  'Default': Layers
};

const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ products, customers, quotes, setQuotes, finConfig, currentUser, onFinish }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<(QuoteItem & { labelData?: any })[]>([]);
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const [designFee, setDesignFee] = useState(0);
  const [installFee, setInstallFee] = useState(0);
  const [deadlineDays, setDeadlineDays] = useState(5);

  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [productSearch, setProductSearch] = useState('');

  // Estados dos Modais
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [showStickerChoice, setShowStickerChoice] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  // Dados do Configurador de Item
  const [dims, setDims] = useState({ width: 1, height: 1, qty: 1 });
  const [selectedRollWidth, setSelectedRollWidth] = useState<number>(0);
  const [itemChecklist, setItemChecklist] = useState<Record<string, string | boolean | number>>({});

  // Dados de Envelopamento Automotivo
  const [autoForm, setAutoForm] = useState({ make: '', model: '', year: '' });
  const [isSearchingAuto, setIsSearchingAuto] = useState(false);
  const [autoBreakdown, setAutoBreakdown] = useState<Record<string, { w: number, h: number }> | null>(null);
  const [selectedAutoParts, setSelectedAutoParts] = useState<Set<string>>(new Set());

  // Dados de Etiquetas
  const [stickerDims, setStickerDims] = useState({ width: 5, height: 5, gapMm: 3 });
  const [stickerMode, setStickerMode] = useState<'half' | 'full'>('full');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ['Todos', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = activeCategory === 'Todos' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, activeCategory, productSearch]);

  const itemsTotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const total = itemsTotal + designFee + installFee;

  // Cálculo de Área Automotiva Selecionada
  const currentAutoArea = useMemo(() => {
    if (!autoBreakdown) return 0;
    return Object.entries(autoBreakdown).reduce((acc, [key, dim]) => {
      const d = dim as { w: number, h: number };
      if (selectedAutoParts.has(key)) {
        return acc + (d.w * d.h);
      }
      return acc;
    }, 0);
  }, [autoBreakdown, selectedAutoParts]);

  const stickerCalculation = useMemo(() => {
    if (!activeProduct || !stickerDims.width || !stickerDims.height) return null;
    const targetArea = stickerMode === 'full' ? 1.0 : 0.5;
    const wCm = stickerDims.width + (stickerDims.gapMm / 10);
    const hCm = stickerDims.height + (stickerDims.gapMm / 10);
    const rollW = activeProduct.availableRollWidths?.[0] || 1.0;
    const rollWCm = rollW * 100;
    const cols = Math.floor(rollWCm / wCm);
    if (cols === 0) return { cols: 0, rows: 0, totalLabels: 0, finalArea: targetArea, unitPrice: activeProduct.salePrice };
    const linearM = targetArea / rollW;
    const rows = Math.floor((linearM * 100) / hCm);
    return { cols, rows, totalLabels: cols * rows, finalArea: targetArea, unitPrice: activeProduct.salePrice };
  }, [activeProduct, stickerDims, stickerMode]);

  const currentItemSubtotal = useMemo(() => {
    if (!activeProduct) return 0;
    if (activeProduct.category === 'Envelopamento') {
      return currentAutoArea * activeProduct.salePrice;
    }
    const unitArea = activeProduct.unitType === 'm2' ? (dims.width * dims.height) : 1;
    return unitArea * activeProduct.salePrice * dims.qty;
  }, [activeProduct, dims, currentAutoArea]);

  const startAddToCart = (product: Product) => {
    setActiveProduct(product);
    setItemChecklist({});
    setDims({ width: 1, height: 1, qty: 1 });
    setAutoBreakdown(null);
    setSelectedAutoParts(new Set());

    if (product.category === 'Envelopamento') {
      setShowAutoModal(true);
    } else if (product.category.toLowerCase().includes('adesivo') || product.name.toLowerCase().includes('etiqueta')) {
      setShowStickerChoice(true);
    } else {
      setSelectedRollWidth(product.availableRollWidths?.[0] || 0);
      setShowConfigModal(true);
    }
  };

  const addProductToCart = (product: Product, qty: number, w: number, h: number, labelData?: any, overrideUnitPrice?: number) => {
    const subtotal = labelData ? (overrideUnitPrice! * labelData.finalArea * qty) : currentItemSubtotal;

    const requirements: Record<string, string | boolean | number> = {
      ...itemChecklist,
      ...(autoBreakdown ? {
        auto_vehicle: `${autoForm.make} ${autoForm.model} ${autoForm.year}`,
        auto_breakdown: Object.entries(autoBreakdown)
          .filter(([key]) => selectedAutoParts.has(key))
          .map(([k, v]) => {
            const val = v as { w: number, h: number };
            return `${k.replace(/_/g, ' ')} (${(val.w * val.h).toFixed(2)}m²)`;
          }).join(', ')
      } : {})
    };

    setCart([...cart, {
      productId: product.id, quantity: qty, width: w, height: h,
      unitPrice: overrideUnitPrice || product.salePrice, subtotal,
      labelData, requirements
    }]);

    setShowConfigModal(false); setShowStickerModal(false); setShowStickerChoice(false); setShowAutoModal(false);
    setGeneratedPitch('');
  };

  const handleSearchVehicle = async () => {
    if (!autoForm.make || !autoForm.model) return;
    setIsSearchingAuto(true);
    try {
      const breakdown = (await getVehicleMeasurements(autoForm.make, autoForm.model, autoForm.year)) as any;
      if (breakdown) {
        setAutoBreakdown(breakdown);
        const initialParts = new Set<string>();
        Object.entries(breakdown).forEach(([key, val]: [string, any]) => {
          if (val.w > 0 && val.h > 0) initialParts.add(key);
        });
        setSelectedAutoParts(initialParts);
      } else {
        alert("Não foi possível obter medidas para este veículo. Tente ser mais específico na marca/modelo.");
      }
    } catch (err) {
      alert("Erro na conexão com a IA. Verifique sua chave de API ou conexão.");
    } finally {
      setIsSearchingAuto(false);
    }
  };

  const toggleAutoPart = (key: string) => {
    const newParts = new Set(selectedAutoParts);
    if (newParts.has(key)) newParts.delete(key);
    else newParts.add(key);
    setSelectedAutoParts(newParts);
  };

  const handleGenerateBudget = async () => {
    if (!selectedCustomerId || cart.length === 0) return;
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;
    setIsGeneratingPitch(true);
    try {
      const itemsForPitch = cart.map(item => ({
        ...item,
        productName: products.find(p => p.id === item.productId)?.name || 'Produto'
      }));
      const pitch = await generateSalesPitch(customer, itemsForPitch, total, designFee, installFee, deadlineDays, currentUser.name);
      setGeneratedPitch(pitch);
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const handleFinalize = async () => {
    try {
      const newQuote: Quote = {
        id: `PH-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        customerId: selectedCustomerId,
        items: cart,
        totalAmount: total,
        downPayment: total / 2,
        designFee,
        installFee,
        status: 'draft',
        deadlineDays
      };
      await api.quotes.create(newQuote);
      setQuotes(prev => [...prev, newQuote]);
      onFinish();
    } catch (error) {
      console.error("Error creating quote:", error);
      alert("Erro ao criar orçamento.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20 animate-in fade-in duration-500">
      <div className="lg:col-span-7 space-y-6">
        <div className="glass-card bg-white/70 p-6 rounded-[2rem] shadow-sm border border-white/50">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Cliente do Orçamento</label>
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold outline-none text-sm focus:ring-2 focus:ring-brand-cyan transition-all shadow-inner">
                <option value="">Selecione o cliente...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="w-full md:w-40">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Prazo (Dias)</label>
              <input type="number" value={deadlineDays} onChange={e => setDeadlineDays(parseInt(e.target.value) || 0)} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold outline-none text-sm transition-all shadow-inner focus:ring-2 focus:ring-brand-cyan" />
            </div>
          </div>
        </div>

        <div className="glass-card bg-white/70 rounded-[2rem] shadow-sm border border-white/50 overflow-hidden flex flex-col h-[600px]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight flex items-center gap-2"><LayoutGrid size={18} className="text-brand-magenta" /> Materiais & Projetos</h3>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Buscar material..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-cyan shadow-sm" />
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <div className="w-56 bg-slate-50/30 border-r border-slate-100 overflow-y-auto custom-scrollbar p-3 space-y-1">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${activeCategory === cat ? 'bg-brand-cyan text-white shadow-lg shadow-cyan-500/30' : 'hover:bg-white text-slate-600'}`}>
                  {React.createElement(CATEGORY_ICONS[cat] || Layers, { size: 18 })}
                  <span className="text-[11px] font-black uppercase tracking-tight">{cat}</span>
                </button>
              ))}
            </div>
            <div className="flex-1 p-6 overflow-y-auto bg-white/50">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                  <button key={product.id} onClick={() => startAddToCart(product)} className="flex flex-col border border-white/60 bg-white rounded-2xl overflow-hidden hover:border-brand-magenta hover:shadow-xl hover:shadow-pink-500/10 transition-all group text-left relative active:scale-[0.98]">
                    <div className="h-28 bg-slate-50/50 flex items-center justify-center border-b border-slate-50 group-hover:bg-pink-50/30 transition-colors">
                      {React.createElement(CATEGORY_ICONS[product.category] || ImageIcon, { size: 40, className: "text-slate-300 group-hover:text-brand-magenta transition-colors" })}
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-black text-slate-800 uppercase leading-tight line-clamp-2">{product.name}</p>
                      <p className="text-xs font-black text-brand-cyan mt-1">R$ {product.salePrice.toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {generatedPitch && (
          <div className="glass-card bg-white/80 p-8 rounded-[2rem] shadow-md border-2 border-brand-magenta/10 animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight"><FileText size={24} className="text-brand-magenta" /> Projeto Pronto</h3>
              <button onClick={() => { navigator.clipboard.writeText(generatedPitch); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95 ${copied ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-slate-100 text-slate-600'}`}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <textarea value={generatedPitch} onChange={(e) => setGeneratedPitch(e.target.value)} className="w-full h-80 p-6 bg-slate-50 border-none rounded-[1.5rem] font-mono text-sm leading-relaxed outline-none shadow-inner resize-none" />
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowIndicators(true)} className="px-10 py-5 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-900/20 flex items-center gap-3 transition-all active:scale-95">Revisar & Salvar <ArrowRight size={18} /></button>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-5">
        <div className="bg-[#0F172A] text-white p-10 rounded-[3rem] shadow-2xl sticky top-8 border border-white/5">
          <h3 className="text-2xl font-black mb-10 flex items-center gap-3 uppercase tracking-tight"><ShoppingCart size={28} className="text-brand-cyan" /> Carrinho</h3>
          <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start py-4 border-b border-slate-800 group">
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-100 uppercase">{products.find(p => p.id === item.productId)?.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                    {item.quantity}un {item.width && item.height && item.height !== 1 ? `(${item.width}x${item.height}m)` : (item.width ? `${item.width.toFixed(2)}m²` : '')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-black text-brand-cyan">R$ {item.subtotal.toFixed(2)}</p>
                  <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-brand-magenta p-1 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4 pt-6 border-t border-slate-800">
            <div className="flex justify-between items-center text-white">
              <span className="text-lg font-black uppercase">Total do Projeto</span>
              <span className="text-3xl font-black text-white">R$ {total.toFixed(2)}</span>
            </div>
            <button disabled={isGeneratingPitch || !selectedCustomerId || cart.length === 0} onClick={handleGenerateBudget} className="w-full py-5 bg-gradient-to-br from-brand-magenta to-pink-600 hover:from-pink-500 hover:to-pink-600 text-white rounded-[1.5rem] flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-pink-500/20 mt-6 transition-all active:scale-95 disabled:opacity-50">
              {isGeneratingPitch ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} {isGeneratingPitch ? 'Gerando Orçamento...' : 'Gerar Texto p/ WhatsApp'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL ENVELOPAMENTO AUTOMOTIVO */}
      {showAutoModal && activeProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="glass-card bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh] border border-white/20">
            <div className="p-8 lg:p-10 bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-brand-cyan rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20"><Car size={32} /></div>
                <div>
                  <h4 className="text-xl lg:text-2xl font-black uppercase tracking-tight">IA Automotiva Phoco</h4>
                  <p className="text-slate-400 text-xs font-bold uppercase mt-1">Cálculo Preciso de Envelopamento</p>
                </div>
              </div>
              <button onClick={() => setShowAutoModal(false)} className="text-slate-500 hover:text-white transition-colors"><X size={32} /></button>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Marca</label>
                  <input type="text" value={autoForm.make} onChange={e => setAutoForm({ ...autoForm, make: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" placeholder="Ex: VW" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Modelo</label>
                  <input type="text" value={autoForm.model} onChange={e => setAutoForm({ ...autoForm, model: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" placeholder="Ex: Saveiro G1" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ano</label>
                  <input type="text" value={autoForm.year} onChange={e => setAutoForm({ ...autoForm, year: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" placeholder="Ex: 1993" />
                </div>
                <button onClick={handleSearchVehicle} disabled={isSearchingAuto} className="bg-brand-cyan text-white h-[52px] rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                  {isSearchingAuto ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Consultar IA
                </button>
              </div>

              {autoBreakdown && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Scissors size={14} /> Selecione as peças desejadas (sangria de 5cm incluída)</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(autoBreakdown).map(([part, dim]) => {
                      const d = dim as { w: number, h: number };
                      const area = d.w * d.h;
                      if (area <= 0.01) return null;
                      const isSelected = selectedAutoParts.has(part);

                      return (
                        <button
                          key={part}
                          onClick={() => toggleAutoPart(part)}
                          className={`p-5 rounded-[1.5rem] border-2 text-left transition-all relative overflow-hidden group ${isSelected ? 'border-brand-magenta bg-pink-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className={`text-[8px] font-black uppercase tracking-widest ${isSelected ? 'text-brand-magenta' : 'text-slate-400'}`}>{part.replace(/_/g, ' ')}</p>
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-magenta border-brand-magenta' : 'border-slate-200'}`}>
                              {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                            </div>
                          </div>
                          <p className={`text-sm font-black ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>{area.toFixed(2)} m²</p>
                          <p className="text-[8px] font-bold text-slate-400 mt-1">{d.w}m x {d.h}m</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ClipboardCheck size={14} /> Detalhes Técnicos</h5>
                        <div className="grid grid-cols-1 gap-4">
                          {/* Simplified technical requirements */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Marca do Vinil</label>
                            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none">
                              <option>Avery Dennison</option>
                              <option>3M Premium</option>
                              <option>Oracal 651</option>
                              <option>Alltak</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-brand-cyan to-cyan-600 p-8 rounded-[2.5rem] text-white flex flex-col justify-between shadow-xl shadow-cyan-500/20">
                        <div>
                          <p className="text-[10px] font-black uppercase text-cyan-200 tracking-widest">Resumo do Projeto Selecionado</p>
                          <div className="mt-4 space-y-1">
                            <p className="text-4xl font-black">R$ {currentItemSubtotal.toFixed(2)}</p>
                            <p className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest">Área Total Marcada: {currentAutoArea.toFixed(2)}m²</p>
                          </div>
                        </div>
                        <button
                          onClick={() => addProductToCart(activeProduct, 1, currentAutoArea, 1)}
                          disabled={selectedAutoParts.size === 0}
                          className="bg-white text-brand-cyan w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-cyan-50 transition-all active:scale-95 disabled:opacity-50"
                        >
                          Confirmar Seleção <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURADOR PADRÃO */}
      {showConfigModal && activeProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
            <div className="p-8 lg:p-10 bg-[#0F172A] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">{React.createElement(CATEGORY_ICONS[activeProduct.category] || ImageIcon, { size: 32 })}</div>
                <div>
                  <h4 className="text-xl lg:text-2xl font-black uppercase tracking-tight">{activeProduct.name}</h4>
                  <p className="text-slate-400 text-xs font-bold uppercase mt-1">Configuração de Medidas</p>
                </div>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-500 hover:text-white transition-colors"><X size={32} /></button>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10 bg-white">
              {activeProduct.unitType === 'm2' && (
                <div className="space-y-6">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Ruler size={14} /> Dimensões</h5>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase">Largura (m)</label>
                      <input type="number" step="0.01" value={dims.width} onChange={e => setDims({ ...dims, width: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase">Altura (m)</label>
                      <input type="number" step="0.01" value={dims.height} onChange={e => setDims({ ...dims, height: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase">Quantidade</label>
                      <input type="number" value={dims.qty} onChange={e => setDims({ ...dims, qty: parseInt(e.target.value) || 1 })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-xl shadow-indigo-500/20 shrink-0">
                <div>
                  <p className="text-[10px] font-black uppercase text-indigo-200 tracking-widest">Preço do Item</p>
                  <p className="text-4xl font-black">R$ {currentItemSubtotal.toFixed(2)}</p>
                </div>
                <button onClick={() => addProductToCart(activeProduct, dims.qty, dims.width, dims.height)} className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-50 transition-all active:scale-95">
                  Confirmar Item <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ETIQUETAS */}
      {showStickerChoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-200">
            <h4 className="text-xl font-black text-slate-800 uppercase mb-6 flex items-center gap-2"><Scissors size={20} className="text-indigo-500" /> Formato do Pedido</h4>
            <div className="space-y-4">
              <button onClick={() => { setShowStickerChoice(false); setShowConfigModal(true); }} className="w-full p-6 border-2 border-slate-100 rounded-[1.5rem] hover:border-indigo-500 hover:bg-indigo-50 text-left transition-all group active:scale-[0.98]">
                <p className="font-black text-slate-800 uppercase text-sm group-hover:text-indigo-600">Impressão / M² Simples</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Ideal para grandes formatos.</p>
              </button>
              <button onClick={() => { setShowStickerChoice(false); setShowStickerModal(true); }} className="w-full p-6 border-2 border-slate-100 rounded-[1.5rem] hover:border-indigo-500 hover:bg-indigo-50 text-left transition-all group active:scale-[0.98]">
                <p className="font-black text-slate-800 uppercase text-sm group-hover:text-indigo-600">Aproveitamento Etiquetas</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Cálculo de quantidade automática.</p>
              </button>
            </div>
            <button onClick={() => setShowStickerChoice(false)} className="w-full mt-6 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {showStickerModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl max-h-[95vh] rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col">
            <div className="p-8 lg:p-10 bg-[#0F172A] text-white flex justify-between items-center shrink-0"><div><h4 className="text-xl lg:text-2xl font-black uppercase tracking-tight">Cálculo de Etiquetas</h4><p className="text-slate-400 text-xs font-bold mt-1">Aproveitamento do material.</p></div><button onClick={() => setShowStickerModal(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button></div>
            <div className="p-8 lg:p-10 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 mb-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Largura (cm)</label><input type="number" value={stickerDims.width} onChange={e => setStickerDims({ ...stickerDims, width: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Altura (cm)</label><input type="number" value={stickerDims.height} onChange={e => setStickerDims({ ...stickerDims, height: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" /></div></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Espaçamento (mm)</label><input type="number" step="1" value={stickerDims.gapMm} onChange={e => setStickerDims({ ...stickerDims, gapMm: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" placeholder="Ex: 3mm" /></div>
                </div>
                <div className="bg-slate-50 p-6 lg:p-8 rounded-[3rem] border border-slate-200 flex flex-col gap-6">
                  <div className="text-center py-2"><p className="text-5xl lg:text-6xl font-black text-indigo-600 tabular-nums">{stickerCalculation?.totalLabels || 0}</p></div>
                </div>
              </div>
              <div className="flex gap-4 pt-4 shrink-0"><button onClick={() => setShowStickerModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">Voltar</button><button onClick={() => activeProduct && stickerCalculation && addProductToCart(activeProduct, 1, stickerCalculation.finalArea, 1, { w: stickerDims.width, h: stickerDims.height, totalLabels: stickerCalculation.totalLabels, mode: stickerMode, gapMm: stickerDims.gapMm }, stickerCalculation.unitPrice)} className="flex-[2] py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-[0.98] text-white bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-600/20">Adicionar ao Pedido</button></div>
            </div>
          </div>
        </div>
      )}

      {showIndicators && (
        <IndicatorPanel items={cart.map(item => ({ ...item, productName: products.find(p => p.id === item.productId)?.name || 'Produto' }))} total={total} designFee={designFee} installFee={installFee} config={finConfig} onClose={() => setShowIndicators(false)} onSave={handleFinalize} />
      )}
    </div>
  );
};

export default QuoteBuilder;
