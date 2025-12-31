import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Search, UserPlus, MessageSquare, Sparkles, Loader2, Trash2, ShoppingCart,
  Layers, Paintbrush, Hammer, Copy, Check, Calculator, Info, X, FileText,
  Clock, Zap, Star, LayoutGrid, List, ChevronRight, Image as ImageIcon,
  Sticker, Flag, Gift, HardHat, Tv, Type, Files, Printer, Wrench, Shirt, Package,
  Maximize2, ArrowRight, ClipboardCheck, Ruler, Truck, Scissors, Sparkle, Car, ShieldAlert
} from 'lucide-react';
import { Product, Customer, Quote, QuoteItem, QuoteStatus, FinancialConfig, User } from '../types';
import { generateSalesPitch, getVehicleMeasurements } from '../services/geminiService';
import IndicatorPanel from './IndicatorPanel';
import { api } from '../src/services/api';
import LaserPriceModal from './LaserPriceModal';
import StickerModal from './StickerModal';
import AutomotiveModal from './AutomotiveModal';

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
  'Corte Laser': Zap,
  'Gravação': Zap,
  'Fachadas': LayoutGrid,
  'Sinalização': ShieldAlert,
  'Default': Layers
};

const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ products = [], customers = [], quotes = [], setQuotes, finConfig, currentUser, onFinish }) => {
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
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [showLaserModal, setShowLaserModal] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  // Modo de Calculadora (Service Mode)
  const [calculationMode, setCalculationMode] = useState<'auto' | 'standard' | 'sticker' | 'laser' | 'auto_wrap'>('auto');

  // Dados do Configurador de Item
  const [dims, setDims] = useState({ width: 1, height: 1, qty: 1 });
  const [selectedRollWidth, setSelectedRollWidth] = useState<number>(0);
  const [itemChecklist, setItemChecklist] = useState<Record<string, string | boolean | number>>({});

  // Dados de Etiquetas



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





  const currentItemSubtotal = useMemo(() => {
    if (!activeProduct) return 0;
    if (activeProduct.category === 'Envelopamento' || calculationMode === 'auto_wrap') return 0; // Calculated in Modal

    const unitArea = activeProduct.unitType === 'm2' ? (dims.width * dims.height) : 1;
    return unitArea * activeProduct.salePrice * dims.qty;
  }, [activeProduct, dims, calculationMode]);

  // Sync Category when Mode changes
  const handleModeChange = (mode: 'auto' | 'standard' | 'sticker' | 'laser' | 'auto_wrap') => {
    setCalculationMode(mode);
    if (mode === 'laser') setActiveCategory('Rígidos');
    else if (mode === 'sticker') setActiveCategory('Mídia Flexível');
    else if (mode === 'auto_wrap') setActiveCategory('Envelopamento');
    else setActiveCategory('Todos');
  };

  // Sync Mode when Category changes
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'Rígidos' || cat === 'Corte Laser') setCalculationMode('laser');
    else if (cat === 'Mídia Flexível' || cat === 'Adesivos') setCalculationMode('sticker');
    else if (cat === 'Envelopamento') setCalculationMode('auto_wrap');
    else setCalculationMode('auto');
  };

  const startAddToCart = (product: Product) => {
    // console.log("StartAddToCart:", product, "Mode:", calculationMode);

    setActiveProduct(product);
    setItemChecklist({});
    setDims({ width: 1, height: 1, qty: 1 });

    // Lógica de Prioridade: Modo Selecionado > Categoria do Produto
    if (calculationMode === 'sticker') {
      setShowStickerModal(true);
    } else if (calculationMode === 'laser') {
      setShowLaserModal(true);
    } else if (calculationMode === 'auto_wrap') {
      setShowAutoModal(true);
    } else if (calculationMode === 'standard') {
      setSelectedRollWidth(product.availableRollWidths?.[0] || 0);
      setShowConfigModal(true);
    } else {
      // Modo 'auto' (comportamento original inteligente)
      if (product.category === 'Envelopamento') {
        setShowAutoModal(true);
      } else if (product.category.toLowerCase().includes('laser') || product.name.toLowerCase().includes('laser') || product.category === 'Corte Laser' || product.category === 'Rígidos') {
        setShowLaserModal(true);
      } else if (product.category.toLowerCase().includes('adesivo') || product.name.toLowerCase().includes('etiqueta')) {
        setShowStickerModal(true);
      } else {
        setSelectedRollWidth(product.availableRollWidths?.[0] || 0);
        setShowConfigModal(true);
      }
    }
  };

  const addProductToCart = (product: Product, qty: number, w: number, h: number, labelData?: any, overrideUnitPrice?: number) => {
    const subtotal = labelData ? (overrideUnitPrice! * (labelData.finalArea || labelData.areaM2 || 1) * qty) : currentItemSubtotal;

    const requirements: Record<string, string | boolean | number> = {
      ...itemChecklist,
      ...itemChecklist,
    };

    setCart([...cart, {
      productId: product.id, quantity: qty, width: w, height: h,
      unitPrice: overrideUnitPrice || product.salePrice, subtotal,
      labelData, requirements
    }]);

    setShowConfigModal(false); setShowStickerModal(false); setShowAutoModal(false); setShowLaserModal(false);
    setGeneratedPitch('');
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

  const [isSaving, setIsSaving] = useState(false);

  const handleFinalize = async () => {
    if (!selectedCustomerId) {
      alert("Erro: Cliente não selecionado.");
      return;
    }

    setIsSaving(true);
    console.log("Saving quote started...");

    try {
      // Sanitize items explicitly to avoid any non-serializable data
      const sanitizedItems = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        width: item.width,
        height: item.height,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        labelData: item.labelData ? JSON.parse(JSON.stringify(item.labelData)) : undefined,
        requirements: item.requirements ? JSON.parse(JSON.stringify(item.requirements)) : undefined,
        productName: products.find(p => p.id === item.productId)?.name || 'Unknown' // Adding name for easier debugging/display
      }));

      const newQuote: Quote = {
        id: `PH-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        customerId: selectedCustomerId,
        items: sanitizedItems as any, // Cast to avoid strict type issues with JSONB
        totalAmount: total,
        downPayment: total / 2,
        designFee,
        installFee,
        status: 'draft',
        deadlineDays
      };

      console.log("Payload:", newQuote);

      // Create a timeout promise (extended to 30s)
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: O servidor demorou muito para responder (30s). Verifique sua conexão.")), 30000)
      );

      // Race against the API call
      await Promise.race([
        api.quotes.create(newQuote),
        timeout
      ]);

      console.log("Quote saved successfully!");
      setQuotes(prev => [...prev, newQuote]);
      onFinish();
    } catch (error: any) {
      console.error("Error creating quote:", error);
      alert(`Erro ao salvar: ${error.message || "Falha desconhecida"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 animate-in fade-in duration-500">
      {/* Main Content Area (Products) */}
      <div className="lg:col-span-9 space-y-6">
        {/* Controls Header */}
        <div className="glass-nav p-4 rounded-2xl shadow-sm border border-white/5 sticky top-0 z-10">
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-center">

            {/* Search */}
            <div className="relative w-full xl:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl font-medium focus:ring-2 focus:ring-cyan-500 transition-all text-sm text-slate-100 placeholder-slate-500"
              />
            </div>

            {/* Service Mode Selector */}
            <div className="flex overflow-x-auto custom-scrollbar bg-slate-900/50 p-1 rounded-xl w-full xl:w-auto gap-1 border border-white/5">
              {[
                { id: 'auto', label: 'Auto (IA)', icon: Sparkles },
                { id: 'standard', label: 'Padrão', icon: Layers },
                { id: 'sticker', label: 'Adesivos', icon: Sticker },
                { id: 'laser', label: 'Laser/CNC', icon: Zap },
                { id: 'auto_wrap', label: 'Veículos', icon: Car }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id as any)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 xl:py-2 rounded-lg text-xs xl:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${calculationMode === mode.id ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                  <mode.icon size={14} className="xl:w-3 xl:h-3" />
                  {mode.id === 'auto_wrap' ? 'Veículos' : mode.label}
                </button>
              ))}
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 w-full xl:w-auto custom-scrollbar">
              {categories.map(cat => {
                const Icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS['Default'];
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-xs font-black uppercase tracking-wider transition-all border ${activeCategory === cat ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white border-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.4)]' : 'bg-slate-800/50 text-slate-500 border-white/5 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-slate-800'}`}
                  >
                    <Icon size={14} />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => {
            const CategoryIcon = CATEGORY_ICONS[product.category] || CATEGORY_ICONS['Default'];
            return (
              <div key={product.id} className="group glass-card rounded-2xl border border-white/5 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 relative overflow-hidden flex flex-col bg-slate-900/40">
                <div className="p-5 flex-1 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors mb-2 border border-white/5">
                    <Package size={32} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors border border-white/5">
                      <CategoryIcon size={10} />
                      {product.category}
                    </div>
                    <h3 className="font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">{product.name}</h3>
                  </div>
                  <div className="mt-auto pt-4 border-t border-white/10 w-full animate-in fade-in slide-in-from-bottom-2">
                    <span className="text-sm text-slate-500 font-medium">R$ </span>
                    <span className="text-2xl font-black text-slate-100 tracking-tight">{product.salePrice.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase ml-1">/{product.unitType}</span>
                  </div>
                </div>
                <button
                  onClick={() => startAddToCart(product)}
                  className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:brightness-90 transition-all flex items-center justify-center gap-2 shadow-[0_4px_10px_rgba(6,182,212,0.3)]"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="lg:col-span-3">
        <div className="glass-nav rounded-2xl border border-white/5 shadow-xl sticky top-6 overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-emerald-400" />
              <span className="font-black uppercase tracking-widest text-xs">Itens do Orçamento</span>
            </div>
            <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold">{cart.length}</span>
          </div>

          {/* Customer Select */}
          <div className="p-4 border-b border-white/5 bg-slate-900/30">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Cliente</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-cyan-500 outline-none text-slate-200"
            >
              <option value="">Selecione um cliente...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <ShoppingCart size={40} className="mx-auto mb-3 text-slate-600" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carrinho Vazio</p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={idx} className="bg-slate-800/50 border border-white/5 rounded-xl p-3 shadow-sm relative group hover:bg-slate-800 transition-colors">
                    <button
                      onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                    >
                      <X size={14} />
                    </button>
                    <div className="pr-6">
                      <h4 className="font-bold text-xs text-slate-200 leading-tight mb-1">{product?.name || 'Item Removido'}</h4>
                      <div className="flex gap-2 text-[10px] text-slate-500 font-medium">
                        <span>{item.quantity}x</span>
                        <span>{item.width.toFixed(2)}x{item.height.toFixed(2)}m</span>
                      </div>
                      <div className="mt-2 text-right">
                        <span className="text-sm font-black text-cyan-400">R$ {item.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Totals & Actions */}
          <div className="p-4 bg-slate-900/50 border-t border-white/5 space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Estimado</span>
              <div className="text-right">
                <p className="text-xs text-slate-600 line-through decoration-rose-500">R$ {(total * 1.1).toFixed(2)}</p>
                <p className="text-2xl font-black text-slate-100 tracking-tighter">R$ {total.toFixed(2)}</p>
              </div>
            </div>

            <button
              onClick={() => setShowIndicators(true)}
              className="w-full py-3 bg-slate-800 border border-slate-700 hover:border-cyan-500/50 hover:text-cyan-400 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <Calculator size={14} /> Ver Indicadores
            </button>

            <button
              onClick={handleGenerateBudget}
              disabled={isGeneratingPitch || !selectedCustomerId}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              {isGeneratingPitch ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isGeneratingPitch ? 'Gerando IA...' : 'Gerar Pitch'}
            </button>

            <button
              onClick={handleFinalize}
              disabled={isSaving}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showConfigModal && activeProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          {/* Standard Config Modal Layout */}
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-lg text-slate-800">{activeProduct.name}</h3>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Configuração Padrão</p>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Largura (m)</label>
                  <div className="relative">
                    <Ruler size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" step="0.01" value={dims.width} onChange={(e) => setDims({ ...dims, width: Number(e.target.value) })} className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Altura (m)</label>
                  <div className="relative">
                    <Maximize2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" step="0.01" value={dims.height} onChange={(e) => setDims({ ...dims, height: Number(e.target.value) })} className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantidade</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setDims(d => ({ ...d, qty: Math.max(1, d.qty - 1) }))} className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black text-slate-600 transition-colors">-</button>
                  <input type="number" value={dims.qty} onChange={(e) => setDims({ ...dims, qty: Number(e.target.value) })} className="flex-1 text-center py-3 bg-slate-50 rounded-xl font-black text-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <button onClick={() => setDims(d => ({ ...d, qty: d.qty + 1 }))} className="w-12 h-12 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center font-black text-indigo-600 transition-colors">+</button>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtotal</span>
                  <span className="text-3xl font-black text-indigo-600 tracking-tighter">R$ {currentItemSubtotal.toFixed(2)}</span>
                </div>
                <button onClick={() => addProductToCart(activeProduct, dims.qty, dims.width, dims.height)} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98]">
                  Adicionar ao Orçamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Modals */}
      {showStickerModal && activeProduct && (
        <StickerModal
          key={activeProduct.id}
          isOpen={showStickerModal}
          onClose={() => setShowStickerModal(false)}
          activeProduct={activeProduct}
          onConfirm={(item) => addProductToCart(activeProduct, item.quantity, item.width, item.height, item.labelData, item.overrideUnitPrice)}
        />
      )}

      {showAutoModal && activeProduct && (
        <AutomotiveModal
          key={activeProduct.id}
          isOpen={showAutoModal}
          onClose={() => setShowAutoModal(false)}
          activeProduct={activeProduct}
          onConfirm={(items) => {
            items.forEach(i => {
              addProductToCart(activeProduct, 1, i.w, i.h, undefined, activeProduct.salePrice); // Simplification, ideally batched
            });
            setShowAutoModal(false);
          }}
        />
      )}

      {showLaserModal && activeProduct && (
        <LaserPriceModal
          key={activeProduct.id}
          isOpen={showLaserModal}
          onClose={() => setShowLaserModal(false)}
          activeProduct={activeProduct}
          onConfirm={(finalPrice, details) => {
            // Special handling for Laser (fixed price usually)
            addProductToCart(activeProduct, 1, 1, 1, { ...details, finalArea: 1 }, finalPrice);
          }}
        />
      )}

      {/* Pitch Modal */}
      {generatedPitch && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <div className="p-8 pb-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 mb-1">Pitch de Vendas IA</h2>
                  <p className="text-sm text-slate-500 font-medium">Gerado com base no perfil do cliente</p>
                </div>
                <button onClick={() => setGeneratedPitch('')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 max-h-[50vh] overflow-y-auto whitespace-pre-wrap font-mono text-sm text-slate-600 shadow-inner">
                {generatedPitch}
              </div>
            </div>
            <div className="p-8 pt-4 bg-white border-t border-slate-100 flex gap-4">
              <button onClick={() => { navigator.clipboard.writeText(generatedPitch); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex-1 py-4 bg-indigo-50 text-indigo-700 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar Texto'}
              </button>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generatedPitch)}`, '_blank')} className="flex-1 py-4 bg-[#25D366] text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
                <MessageSquare size={16} /> Enviar WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}


      {showIndicators && (
        <IndicatorPanel
          items={cart.map(item => ({ ...item, productName: products.find(p => p.id === item.productId)?.name || 'Produto' }))}
          total={total}
          designFee={designFee}
          installFee={installFee}
          config={finConfig}
          onClose={() => setShowIndicators(false)}
          onSave={handleFinalize}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

export default QuoteBuilder;
