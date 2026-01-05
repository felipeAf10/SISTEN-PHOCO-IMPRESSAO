import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, Search, UserPlus, MessageSquare, Sparkles, Loader2, Trash2, ShoppingCart,
  Layers, Paintbrush, Hammer, Copy, Check, Calculator, Info, X,
  Clock, Zap, Star, LayoutGrid, List, ChevronRight, Image as ImageIcon,
  Sticker, Flag, Gift, HardHat, Tv, Type, Files, Printer, Wrench, Shirt, Package,
  Maximize2, ArrowRight, ClipboardCheck, Ruler, Truck, Scissors, Sparkle, Car, ShieldAlert, FileText, Settings, Share2, MapPin, DollarSign
} from 'lucide-react';
import { Product, Customer, Quote, QuoteItem, QuoteStatus, FinancialConfig, User } from '../types';
import { generateQuotePDF } from '../services/pdfService';

import { generateSalesPitch, getVehicleMeasurements } from '../services/geminiService';
import IndicatorPanel from './IndicatorPanel';
import { api } from '../services/api';
import { mapService } from '../services/mapService';
import LaserPriceModal from './LaserPriceModal';
import StickerModal from './StickerModal';
import AutomotiveModal from './AutomotiveModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';
const LaserCalculator = React.lazy(() => import('./LaserCalculator'));

interface QuoteBuilderProps {
  // Products/Customers/Quotes fetched internally now
  products?: Product[];
  customers?: Customer[];
  quotes?: Quote[];
  setQuotes?: React.Dispatch<React.SetStateAction<Quote[]>>;
  finConfig: FinancialConfig;
  currentUser: User;
  onFinish: () => void;
  initialQuote?: Quote | null;
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

const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ finConfig, currentUser, onFinish, initialQuote }) => {
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<(QuoteItem & { labelData?: any })[]>([]);
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState<string>('');
  const [generatedQuoteId, setGeneratedQuoteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'items' | 'checkout'>('items');

  const [designFee, setDesignFee] = useState(0);
  const [installFee, setInstallFee] = useState(0);

  const [deadlineDays, setDeadlineDays] = useState(5);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [downPaymentMethod, setDownPaymentMethod] = useState('Pix');
  const [notes, setNotes] = useState('');

  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [productSearch, setProductSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Fewer items for the grid card view

  // Estados dos Modais
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [showLaserModal, setShowLaserModal] = useState(false);
  const [showLaserCalc, setShowLaserCalc] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  // Modo de Calculadora (Service Mode)
  const [calculationMode, setCalculationMode] = useState<'auto' | 'standard' | 'sticker' | 'laser' | 'auto_wrap'>('auto');

  // Dados do Configurador de Item
  const [dims, setDims] = useState({ width: 1, height: 1, qty: 1 });
  const [selectedRollWidth, setSelectedRollWidth] = useState<number>(0);
  const [itemChecklist, setItemChecklist] = useState<Record<string, string | boolean | number>>({});

  // --- REACT QUERY ---
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.list,
    staleTime: 1000 * 60 * 5
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: api.customers.list,
    staleTime: 1000 * 60 * 5
  });

  const createQuoteMutation = useMutation({
    mutationFn: api.quotes.create,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Orçamento salvo com sucesso!');
      setGeneratedQuoteId(variables.id);
      setIsGeneratingPitch(false); // Reset just in case
      onFinish();
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar: ${error.message} `);
    }
  });
  // -------------------

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

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, productSearch]);

  const [installAddress, setInstallAddress] = useState('');
  const [shippingDist, setShippingDist] = useState<number | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  // Auto-fill address from customer
  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust) setInstallAddress(cust.address);
    }
  }, [selectedCustomerId, customers]);

  const handleCalculateShipping = async () => {
    if (!installAddress) {
      toast.error('Digite um endereço para calcular');
      return;
    }

    setIsCalculatingShipping(true);

    try {
      // 1. Geocode Destination
      const results = await mapService.searchAddress(installAddress);

      if (!results || results.length === 0) {
        toast.error('Endereço não encontrado');
        return;
      }

      const dest = results[0];

      // 2. Calculate Distance
      const distKm = await mapService.getDistance(dest.lat, dest.lon);

      if (distKm !== null) {
        setShippingDist(distKm);
        const pricePerKm = finConfig.pricePerKm || 2;
        const fixedFee = finConfig.fixedLogisticsFee || 0;
        const shippingCost = (distKm * pricePerKm) + fixedFee;

        setInstallFee(prev => {
          const newFee = Math.ceil(shippingCost);
          toast.success(`Distância: ${distKm.toFixed(1)} km. Frete: R$ ${newFee}`);
          return newFee;
        });
      } else {
        toast.error('Erro ao calcular rota (Endereço muito distante ou inválido)');
      }
    } catch (error) {
      console.error("Shipping Calculation Error:", error);
      toast.error('Erro ao conectar com Google Maps');
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  // Hydrate from initialQuote if provided (Edit Mode)
  useEffect(() => {
    if (initialQuote) {
      setSelectedCustomerId(initialQuote.customerId);
      setCart(initialQuote.items);
      setDesignFee(initialQuote.designFee || 0);
      setInstallFee(initialQuote.installFee || 0);
      setDeadlineDays(initialQuote.deadlineDays || 5);
      setDiscountPercent(initialQuote.discount || 0);
      setPaymentMethod(initialQuote.paymentMethod || 'Pix');
      setDownPaymentMethod(initialQuote.downPaymentMethod || 'Pix');
      setNotes(initialQuote.notes || '');
      toast.info(`Editando orçamento #${initialQuote.id} `);
    } else if (customers.length > 0 && !selectedCustomerId) {
      // Only default select if NOT editing
      // setSelectedCustomerId(customers[0].id);
    }
  }, [initialQuote, customers]);

  const { itemsTotal, subTotal, discountAmount, total } = useMemo(() => {
    const iTotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
    const sub = iTotal + designFee + installFee;
    const discAmount = sub * (discountPercent / 100);
    const tot = sub - discAmount;
    return { itemsTotal: iTotal, subTotal: sub, discountAmount: discAmount, total: tot };
  }, [cart, designFee, installFee, discountPercent]);

  // Local state for Final Price input to prevent jumping while typing
  const [localFinalPrice, setLocalFinalPrice] = useState(total.toFixed(2));

  // Sync local state when total changes externally
  useEffect(() => {
    if (Math.abs(parseFloat(localFinalPrice) - total) > 0.1) {
      setLocalFinalPrice(total.toFixed(2));
    }
  }, [total]);

  const currentItemSubtotal = useMemo(() => {
    if (!activeProduct) return 0;
    if (activeProduct.category === 'Envelopamento' || calculationMode === 'auto_wrap') return 0; // Calculated in Modal

    // Fix: Robust check for Area-based products (some might be mislabeled as 'un' but are in area categories)
    const uType = activeProduct.unitType as string;
    const isAreaBased =
      uType === 'm2' ||
      uType === 'm²' ||
      (['Adesivos', 'Lonas', 'Banners'].some(c => activeProduct.category.includes(c)) && uType !== 'un');

    const unitArea = isAreaBased ? (dims.width * dims.height) : 1;
    return unitArea * activeProduct.salePrice * dims.qty;
  }, [activeProduct, dims, calculationMode]);

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
  }, []);

  const startAddToCart = useCallback((product: Product) => {
    setActiveProduct(product);
    setItemChecklist({});
    setDims({ width: 1, height: 1, qty: 1 });

    const isStickerCat = product.category.toLowerCase().includes('adesivo') ||
      product.category.toLowerCase().includes('rótulo') ||
      product.category.toLowerCase().includes('flex');

    const isLaserCat = product.category.toLowerCase().includes('laser') ||
      product.category.toLowerCase().includes('rígid') ||
      product.category === 'Corte Laser';

    // 1. Vehicles
    if (product.category === 'Envelopamento') {
      setShowAutoModal(true);
      return;
    }

    // 2. Laser / Rigid / CNC
    if (isLaserCat) {
      setShowLaserModal(true);
      return;
    }

    // 3. Stickers / Labels
    if (isStickerCat) {
      if (product.unitType === 'un') {
        setShowStickerModal(true);
      } else {
        setSelectedRollWidth(product.availableRollWidths?.[0] || 0);
        setShowConfigModal(true);
      }
      return;
    }

    // 4. Default / Standard
    setSelectedRollWidth(product.availableRollWidths?.[0] || 0);
    setShowConfigModal(true);
  }, []);

  const addProductToCart = useCallback((product: Product, qty: number, w: number, h: number, labelData?: any, overrideUnitPrice?: number) => {
    // Recalculate subtotal inside to ensure fresh values if needed, or pass it in.
    // However, currentItemSubtotal depends on activeProduct state, which might be stale if not passed or if we don't depend on it.
    // Better to rely on the passed calc or simple math here.
    // The original logic used `currentItemSubtotal` which was from state. 
    // If we use useCallback, we must include `currentItemSubtotal` in dependency which technically defeats the purpose if it changes often.
    // BUT! addProductToCart is called from Modals. Modals likely pass the final values.
    // Let's assume the modals do their job. 
    // IF we re-implement logic here:

    // Logic from original: 
    // const subtotal = labelData ? (overrideUnitPrice! * (labelData.finalArea || labelData.areaM2 || 1) * qty) : currentItemSubtotal;

    // We can't easily useCallback if we depend on `currentItemSubtotal`.
    // Let's rely on set state functional update OR remove dependency on likely-stale state.

    setCart(prevCart => {
      const subtotal = labelData ? (overrideUnitPrice! * (labelData.finalArea || labelData.areaM2 || 1) * qty) : (product.salePrice * (w * h || 1) * qty); // Simplified fallback calculation to avoid dependency

      return [...prevCart, {
        productId: product.id, productName: product.name, quantity: qty, width: w, height: h,
        unitPrice: overrideUnitPrice || product.salePrice, subtotal,
        labelData, requirements: itemChecklist as Record<string, boolean>,
        productionTime: product.productionTimeMinutes,
        unitCost: product.costPrice
      }];
    });

    setShowConfigModal(false); setShowStickerModal(false); setShowAutoModal(false); setShowLaserModal(false);
    setGeneratedPitch('');
    toast.success('Item adicionado ao carrinho!');
  }, [itemChecklist]); // itemChecklist is the only external state used deeply.

  const handleGeneratePDF = async () => {
    if (!selectedCustomerId || cart.length === 0) {
      toast.error("Selecione um cliente e adicione itens ao carrinho.");
      return;
    }
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;

    const tempQuote: Quote = {
      id: `DRAFT - ${Date.now().toString().slice(-4)} `,
      date: new Date().toISOString(),
      customerId: selectedCustomerId,
      items: cart,
      totalAmount: total,
      downPayment: 0,
      designFee,
      installFee,
      status: 'draft',
      deadlineDays,
      discount: discountPercent,
      paymentMethod,
      downPaymentMethod,
      userId: currentUser.id,
      commissionPaid: false
    };

    await generateQuotePDF(tempQuote, customer, currentUser, products);
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

      const quoteUrl = `${window.location.origin} /my-quote/${generatedQuoteId || 'PREVIEW'} `;

      const pitch = await generateSalesPitch(customer, itemsForPitch, total, designFee, installFee, deadlineDays, currentUser.name, quoteUrl);

      let finalPitch = pitch;
      if (discountPercent > 0) {
        finalPitch = `🚨 * ORÇAMENTO PROMOCIONAL * 🚨\n\n${pitch} `;
      }

      setGeneratedPitch(finalPitch);
    } catch (e) {
      toast.error("Erro ao gerar Pitch IA.");
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedCustomerId) {
      toast.error("Erro: Cliente não selecionado.");
      return;
    }

    // No need for strict try-catch block around mutation trigger, mutation handles errors
    try {
      const sanitizedItems = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        width: item.width,
        height: item.height,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        labelData: item.labelData ? JSON.parse(JSON.stringify(item.labelData)) : undefined,
        requirements: item.requirements ? JSON.parse(JSON.stringify(item.requirements)) : undefined,
        productName: products.find(p => p.id === item.productId)?.name || item.productName || 'Unknown'
      }));

      const newQuote: Quote = {
        id: `PH - ${Date.now().toString().slice(-6)} `,
        date: new Date().toISOString(),
        customerId: selectedCustomerId,
        items: sanitizedItems as any,
        totalAmount: total,
        downPayment: total / 2,
        designFee,
        installFee,
        status: 'draft',
        deadlineDays,
        discount: discountPercent,
        paymentMethod,
        downPaymentMethod,
        userId: currentUser.id,
        commissionPaid: false,
        notes: notes.trim() // Add notes to payload
      };

      createQuoteMutation.mutate(newQuote);

    } catch (error: any) {
      console.error("Error preparing quote:", error);
      toast.error(`Erro ao preparar: ${error.message} `);
    }
  };

  if (isLoadingProducts || isLoadingCustomers) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 animate-in fade-in">
        <div className="lg:col-span-9 space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-3">
          <Skeleton className="h-[80vh] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 animate-in fade-in duration-500">
      {/* Main Content Area (Products) */}
      <div className="lg:col-span-9 space-y-4">

        {/* Unified Controls Header */}
        <div className="sticky top-0 z-10 glass-nav p-3 rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col xl:flex-row gap-3 items-center">

            {/* Search Bar */}
            <div className="relative w-full xl:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-cyan-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar produtos (ex: Adesivo, Lona...)"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-active border border-white/5 rounded-xl font-medium focus:ring-2 focus:ring-cyan-500 transition-all text-sm text-primary placeholder-secondary/70 shadow-inner"
              />
            </div>

            <div className="h-8 w-px bg-white/10 hidden xl:block mx-1"></div>

            {/* Quick Categories */}
            <div className="flex gap-2 overflow-x-auto pb-1 w-full xl:w-auto custom-scrollbar items-center">
              <span className="text-[10px] font-black uppercase text-secondary/50 tracking-widest mr-1 shrink-0">Filtros:</span>
              {categories.map(cat => {
                const Icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS['Default'];
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`flex items - center gap - 2 px - 3 py - 2 rounded - lg whitespace - nowrap text - [11px] font - bold uppercase tracking - tight transition - all border ${isActive ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-surface hover:bg-surface-hover text-secondary border-white/5 hover:text-primary'} `}
                  >
                    <Icon size={12} />
                    {cat}
                  </button>
                );
              })}

              <div className="h-6 w-px bg-white/10 mx-1"></div>

              <button
                onClick={() => setShowLaserCalc(true)}
                className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20 active:scale-95"
              >
                <Zap size={14} />
                Laser DXF
              </button>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {paginatedProducts.map(product => {
              const CategoryIcon = CATEGORY_ICONS[product.category] || CATEGORY_ICONS['Default'];
              const isSticker = product.category.toLowerCase().includes('adesivo') && product.unitType === 'un';

              return (
                <div key={product.id} className="group glass-card rounded-xl border border-white/5 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 relative overflow-hidden flex flex-col bg-surface/40 hover:-translate-y-1">
                  <div className="p-4 flex-1 flex flex-col items-start gap-3">
                    <div className="flex justify-between w-full items-start">
                      <div className="w-10 h-10 bg-surface-hover rounded-lg flex items-center justify-center text-secondary group-hover:text-cyan-400 transition-colors border border-white/5">
                        <Package size={20} strokeWidth={1.5} />
                      </div>
                      <div className="px-2 py-1 rounded bg-surface-active text-[9px] font-black uppercase tracking-widest text-secondary border border-white/5">
                        {product.category}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-primary text-sm leading-tight group-hover:text-white transition-colors">{product.name}</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-[10px] text-secondary font-medium">R$</span>
                        <span className="text-xl font-black text-cyan-400 tracking-tight">{product.salePrice.toFixed(2)}</span>
                        <span className="text-[9px] text-secondary font-bold uppercase">/{product.unitType}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => startAddToCart(product)}
                    className="w-full py-3 bg-white/5 hover:bg-cyan-600/20 hover:text-cyan-400 border-t border-white/5 text-secondary font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 group-hover:bg-cyan-600 group-hover:text-white"
                  >
                    <Plus size={14} />
                    {isSticker ? 'Configurar Etiquetas' : 'Adicionar ao Orçamento'}
                  </button>
                </div>
              );
            })}
          </div>
          {/* Pagination Controls */}
          {filteredProducts.length > itemsPerPage && (
            <div className="flex justify-center mt-6 gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-surface hover:bg-surface-hover disabled:opacity-50 rounded-lg text-xs font-bold text-secondary uppercase tracking-widest transition-all"
              >
                Anterior
              </button>
              <div className="flex items-center px-4 font-black text-secondary text-xs">
                {currentPage} / {Math.ceil(filteredProducts.length / itemsPerPage)}
              </div>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={(currentPage * itemsPerPage) >= filteredProducts.length}
                className="px-4 py-2 bg-surface hover:bg-surface-hover disabled:opacity-50 rounded-lg text-xs font-bold text-secondary uppercase tracking-widest transition-all"
              >
                Próximo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabbed Cart Sidebar */}
      <div className="lg:col-span-3">
        <div className="glass-nav rounded-2xl border border-white/5 shadow-xl sticky top-6 flex flex-col max-h-[calc(100vh-3rem)] overflow-hidden bg-surface">

          {/* Tab Switcher */}
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setSidebarTab('items')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'items' ? 'bg-surface-active text-cyan-400 border-b-2 border-cyan-400' : 'bg-transparent text-secondary hover:text-white hover:bg-white/5'}`}
            >
              <span className="flex items-center justify-center gap-2"><ShoppingCart size={14} /> Itens ({cart.length})</span>
            </button>
            <button
              onClick={() => setSidebarTab('checkout')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'checkout' ? 'bg-surface-active text-emerald-400 border-b-2 border-emerald-400' : 'bg-transparent text-secondary hover:text-white hover:bg-white/5'}`}
            >
              <span className="flex items-center justify-center gap-2"><Check size={14} /> Fechamento</span>
            </button>
          </div>

          {/* TAB: ITEMS */}
          {sidebarTab === 'items' && (
            <div className="flex flex-col flex-1 overflow-hidden animate-in slide-in-from-left-4 duration-300">
              {/* Customer Select */}
              <div className="p-4 border-b border-white/5 bg-surface/30">
                <label className="block text-[10px] font-black uppercase text-secondary tracking-widest mb-2">Cliente</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2.5 bg-input border border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-cyan-500 outline-none text-primary"
                >
                  <option value="">Selecione um cliente...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-10 opacity-50 flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <ShoppingCart size={24} className="text-secondary" />
                    </div>
                    <p className="text-xs font-bold text-secondary uppercase tracking-wider">Seu carrinho está vazio</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Adicione produtos para começar</p>
                  </div>
                ) : (
                  cart.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId);
                    return (
                      <div key={idx} className="bg-surface-hover/50 border border-white/5 rounded-xl p-3 shadow-sm relative group hover:bg-surface-hover transition-colors">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                          <button
                            onClick={() => {
                              const newPrice = prompt("Novo preço para este item (R$):", item.subtotal.toFixed(2));
                              if (newPrice !== null) {
                                const val = parseFloat(newPrice.replace(',', '.'));
                                if (!isNaN(val)) {
                                  const newCart = [...cart];
                                  newCart[idx] = { ...newCart[idx], manualPrice: val, subtotal: val };
                                  setCart(newCart);
                                }
                              }
                            }}
                            className="p-1.5 bg-black/50 hover:bg-cyan-500 text-white rounded-md transition-colors"
                            title="Editar Preço"
                          >
                            <Settings size={12} />
                          </button>
                          <button
                            onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                            className="p-1.5 bg-black/50 hover:bg-rose-500 text-white rounded-md transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>

                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-xs text-primary leading-tight mb-1 line-clamp-2">{product?.name || 'Item Removido'}</h4>
                            <div className="flex flex-col gap-0.5 text-[10px] text-zinc-400">
                              {item.labelData ? (
                                <>
                                  <span className="flex items-center gap-1"><Layers size={10} /> {item.quantity} arquivos</span>
                                  <span className="text-cyan-400">{item.labelData.totalLabels} un. totais</span>
                                </>
                              ) : (
                                <span className="flex items-center gap-1"><Ruler size={10} /> {item.quantity}x {(item.width || 0).toFixed(2)}m x {(item.height || 0).toFixed(2)}m</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {item.manualPrice ? (
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] line-through text-zinc-600">R$ {product?.salePrice ? (product.salePrice * item.quantity * (item.labelData?.areaM2 || 1)).toFixed(2) : '0.00'}</span>
                                <span className="text-xs font-black text-amber-400">R$ {item.subtotal.toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="text-xs font-black text-cyan-400">R$ {item.subtotal.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Items Tab Footer */}
              <div className="p-4 border-t border-white/5 bg-surface/50 space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase text-secondary font-bold tracking-widest">Subtotal ({cart.length} itens)</span>
                  <span className="text-lg font-black text-white">R$ {itemsTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setSidebarTab('checkout')}
                  disabled={cart.length === 0}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
                >
                  Ir para Fechamento <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB: CHECKOUT */}
          {sidebarTab === 'checkout' && (
            <div className="flex flex-col flex-1 overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">

                {/* 1. Delivery & Address */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <Truck size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Entrega e Logística</span>
                  </div>

                  {/* Address Input */}
                  <div className="flex items-center gap-2 text-xs text-zinc-300 bg-black/20 p-2 rounded-lg border border-white/10 group focus-within:border-indigo-500/50 transition-colors">
                    <MapPin size={14} className="text-zinc-500 shrink-0" />
                    <input
                      type="text"
                      value={installAddress}
                      onChange={(e) => setInstallAddress(e.target.value)}
                      className="bg-transparent border-none outline-none flex-1 w-full placeholder-zinc-600 truncate"
                      placeholder="Endereço de entrega..."
                    />
                    {shippingDist !== null && <span className="font-bold text-indigo-400 whitespace-nowrap shrink-0 text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded">{shippingDist.toFixed(1)} km</span>}
                  </div>

                  {/* Address Fees Row */}
                  <div className="flex flex-col gap-2">
                    {/* Design Fee */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-pink-500/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-pink-500/20 rounded text-pink-400"><Paintbrush size={12} /></div>
                        <span className="text-[10px] font-bold text-zinc-300 uppercase">Arte</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500">R$</span>
                        <input type="number" value={designFee} onChange={(e) => setDesignFee(parseFloat(e.target.value) || 0)} className="w-16 bg-transparent text-right font-bold text-white outline-none text-xs border-b border-white/10 focus:border-pink-500" placeholder="0.00" />
                      </div>
                    </div>

                    {/* Freight Fee */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-indigo-500/20 rounded text-indigo-400"><Truck size={12} /></div>
                        <span className="text-[10px] font-bold text-zinc-300 uppercase">Frete</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-500">R$</span>
                          <input type="number" value={installFee} onChange={(e) => setInstallFee(parseFloat(e.target.value) || 0)} className="w-16 bg-transparent text-right font-bold text-white outline-none text-xs border-b border-white/10 focus:border-indigo-500" placeholder="0.00" />
                        </div>
                        <button onClick={handleCalculateShipping} disabled={isCalculatingShipping || !installAddress} className="p-1 hover:bg-indigo-500 hover:text-white rounded text-indigo-500 transition-colors" title="Calcular Frete">
                          {isCalculatingShipping ? <Loader2 size={12} className="animate-spin" /> : <Calculator size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Financials */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <DollarSign size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pagamento</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-secondary uppercase block mb-1">Desconto</label>
                      <div className="relative">
                        <input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} className="w-full bg-input border border-white/10 rounded-lg pl-2 pr-6 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-secondary uppercase block mb-1">Prazo</label>
                      <div className="relative">
                        <input type="number" value={deadlineDays} onChange={(e) => setDeadlineDays(parseFloat(e.target.value) || 0)} className="w-full bg-input border border-white/10 rounded-lg pl-2 pr-8 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">dias</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-secondary uppercase block mb-1">Sinal</label>
                      <select value={downPaymentMethod} onChange={e => setDownPaymentMethod(e.target.value)} className="w-full bg-input border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white outline-none">
                        <option value="Pix">Pix</option>
                        <option value="Cartão Crédito">Crédito</option>
                        <option value="Dinheiro">Dinheiro</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-secondary uppercase block mb-1">Restante</label>
                      <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-input border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white outline-none">
                        <option value="Pix">Pix</option>
                        <option value="Cartão Crédito">Crédito</option>
                        <option value="Boleto">Boleto</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Notes */}
                <div className="pt-2 border-t border-white/5">
                  <label className="text-[9px] font-black text-secondary uppercase tracking-widest block mb-1">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instruções especiais..."
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none h-20 resize-none custom-scrollbar"
                  />
                </div>

                {/* Divider to ensure scrolling */}
                <div className="h-4"></div>
              </div>

              {/* Checkout Footer (Totals & Actions) */}
              <div className="p-4 bg-surface/80 backdrop-blur-md border-t border-white/10 space-y-4">
                {/* Total Display */}
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Total Final</span>
                    {discountAmount > 0 && <span className="text-[10px] text-emerald-400">Economia: R$ {discountAmount.toFixed(2)}</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-white tracking-tighter block leading-none">R$ {total.toFixed(2)}</span>
                    <span className="text-[10px] text-zinc-500">em até 12x no cartão</span>
                  </div>
                </div>

                {/* Big Actions Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setShowIndicators(true)} className="col-span-1 h-12 rounded-xl bg-surface-hover border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 flex flex-col items-center justify-center gap-1 transition-all" title="Ver Custos">
                    <Calculator size={16} /> <span className="text-[8px] font-black uppercase">Custos</span>
                  </button>

                  <button onClick={handleGeneratePDF} className="col-span-1 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white flex flex-col items-center justify-center gap-1 transition-all" title="PDF">
                    <FileText size={16} /> <span className="text-[8px] font-black uppercase">PDF</span>
                  </button>

                  <button onClick={handleGenerateBudget} disabled={isGeneratingPitch} className="col-span-1 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 hover:bg-indigo-500 hover:text-white flex flex-col items-center justify-center gap-1 transition-all" title="Pitch IA">
                    {isGeneratingPitch ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} <span className="text-[8px] font-black uppercase">Pitch</span>
                  </button>

                  <button onClick={handleFinalize} disabled={createQuoteMutation.isPending} className="col-span-1 h-12 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 flex flex-col items-center justify-center gap-1 transition-all" title="Salvar">
                    {createQuoteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} <span className="text-[8px] font-black uppercase">Salvar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>


      {/* Modals */}
      {
        showConfigModal && activeProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            {/* Standard Config Modal Layout - Dark Theme */}
            <div className="glass-card bg-surface border border-white/10 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-active">
                <div>
                  <h3 className="font-black text-lg text-white">{activeProduct.name}</h3>
                  <p className="text-xs text-secondary font-bold uppercase tracking-wider">Configuração Padrão</p>
                </div>
                <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-secondary hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Largura (m)</label>
                    <div className="relative">
                      <Ruler size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                      <input type="number" step="0.01" value={dims.width} onChange={(e) => setDims({ ...dims, width: Number(e.target.value) })} className="w-full pl-10 pr-4 py-3 bg-input border border-white/10 rounded-xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Altura (m)</label>
                    <div className="relative">
                      <Maximize2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                      <input type="number" step="0.01" value={dims.height} onChange={(e) => setDims({ ...dims, height: Number(e.target.value) })} className="w-full pl-10 pr-4 py-3 bg-input border border-white/10 rounded-xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Quantidade</label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setDims(d => ({ ...d, qty: Math.max(1, d.qty - 1) }))} className="w-12 h-12 rounded-xl bg-input hover:bg-surface-hover border border-white/10 flex items-center justify-center font-black text-secondary transition-colors">-</button>
                    <input type="number" value={dims.qty} onChange={(e) => setDims({ ...dims, qty: Number(e.target.value) })} className="flex-1 text-center py-3 bg-input border border-white/10 rounded-xl font-black text-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <button onClick={() => setDims(d => ({ ...d, qty: d.qty + 1 }))} className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center font-black text-white transition-colors shadow-lg shadow-indigo-500/20">+</button>
                  </div>
                </div>
                <div className="pt-6 border-t border-white/5">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Subtotal Estimado</span>
                    <span className="text-3xl font-black text-indigo-400 tracking-tighter">R$ {currentItemSubtotal.toFixed(2)}</span>
                  </div>
                  <button onClick={() => addProductToCart(activeProduct, dims.qty, dims.width, dims.height)} className="w-full py-4 bg-white text-indigo-700 rounded-xl font-black uppercase tracking-widest hover:brightness-95 transition-all shadow-xl active:scale-[0.98]">
                    Adicionar ao Orçamento
                  </button>
                  {(activeProduct.category.toLowerCase().includes('adesivo') || activeProduct.category.toLowerCase().includes('rótulo') || activeProduct.name.toLowerCase().includes('adesivo') || activeProduct.name.toLowerCase().includes('rótulo')) && (
                    <button
                      onClick={() => {
                        setShowConfigModal(false);
                        setShowStickerModal(true);
                      }}
                      className="w-full mt-3 py-3 bg-surface-hover border border-white/10 text-secondary hover:text-white rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Scissors size={14} /> Usar Calculadora de Rótulos
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Other Modals */}
      {
        showStickerModal && activeProduct && (
          <StickerModal
            key={activeProduct.id}
            isOpen={showStickerModal}
            onClose={() => setShowStickerModal(false)}
            activeProduct={activeProduct}
            onConfirm={(item: any) => addProductToCart(activeProduct, item.quantity, item.width, item.height, item.labelData, item.overrideUnitPrice)}
          />
        )
      }

      {
        showAutoModal && activeProduct && (
          <AutomotiveModal
            key={activeProduct.id}
            isOpen={showAutoModal}
            onClose={() => setShowAutoModal(false)}
            activeProduct={activeProduct}
            onConfirm={(items: any[]) => {
              items.forEach((i: any) => {
                addProductToCart(activeProduct, 1, i.w, i.h, undefined, activeProduct.salePrice);
              });
              setShowAutoModal(false);
            }}
          />
        )
      }

      {
        showLaserModal && activeProduct && (
          <LaserPriceModal
            key={activeProduct.id}
            isOpen={showLaserModal}
            onClose={() => setShowLaserModal(false)}
            activeProduct={activeProduct}
            onConfirm={(data: any) => {
              // Special handling for Laser (fixed price usually)
              addProductToCart(activeProduct, 1, 1, 1, { ...data.details, finalArea: 1 }, data.total);
            }}
          />
        )
      }

      {/* Pitch Modal */}
      {
        generatedPitch && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="glass-card bg-surface border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
              <div className="p-8 pb-4">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-white mb-1">Pitch de Vendas IA</h2>
                    <p className="text-sm text-secondary font-medium">Gerado com base no perfil do cliente</p>
                  </div>
                  <button onClick={() => setGeneratedPitch('')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-secondary hover:text-white"><X size={24} /></button>
                </div>
                <div className="bg-surface-active p-6 rounded-2xl border border-white/5 max-h-[50vh] overflow-y-auto whitespace-pre-wrap font-mono text-sm text-secondary shadow-inner">
                  {generatedPitch}
                </div>
              </div>
              <div className="p-8 pt-4 bg-surface/50 border-t border-white/5 flex gap-4">
                <button onClick={() => { navigator.clipboard.writeText(generatedPitch); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copiado!' : 'Copiar Texto'}
                </button>

                <button onClick={() => {
                  const url = `${window.location.origin} /my-quote/${generatedQuoteId || ''} `;
                  navigator.clipboard.writeText(url);
                  alert(`Link do Portal copiado: ${url} `);
                }} className="flex-1 py-4 bg-cyan-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20">
                  <Share2 size={16} /> Link do Portal
                </button>

                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generatedPitch)}`, '_blank')} className="flex-1 py-4 bg-[#25D366] text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
                  <MessageSquare size={16} /> Enviar WhatsApp
                </button >
              </div >
            </div >
          </div >
        )
      }

      {/* Laser Calc Modal */}
      {
        showLaserCalc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface border border-white/10 rounded-2xl shadow-2xl custom-scrollbar">
              <button
                onClick={() => setShowLaserCalc(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/20 text-white/50 hover:text-red-500 rounded-full transition-colors z-10"
              >
                <X size={20} />
              </button>
              <div className="p-1">
                <React.Suspense fallback={<div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-brand-magenta" /></div>}>
                  <LaserCalculator
                    products={products}
                    onAddToQuote={(item: any) => {
                      // Direct add to cart
                      const newItem: QuoteItem = {
                        productId: `laser-${Date.now()}`,
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        subtotal: item.subtotal,
                        width: item.width || 0,
                        height: item.height || 0,
                        manualPrice: item.subtotal // Lock price
                      };
                      setCart([...cart, newItem]);
                      setShowLaserCalc(false);
                      toast.success('Corte Laser adicionado!', {
                        style: { background: '#10B981', color: 'white', border: 'none' }
                      });
                    }}
                  />
                </React.Suspense>
              </div>
            </div>
          </div>
        )
      }

      {
        showIndicators && (
          <IndicatorPanel
            items={cart.map(item => ({ ...item, productName: products.find(p => p.id === item.productId)?.name || 'Produto' }))}
            total={total}
            designFee={designFee}
            installFee={installFee}
            config={finConfig}
            onClose={() => setShowIndicators(false)}
            onSave={handleFinalize}
            isSaving={createQuoteMutation.isPending}
          />
        )
      }
    </div >
  );
};

export default QuoteBuilder;

