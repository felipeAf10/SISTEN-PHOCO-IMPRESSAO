
import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Package, X, Layers, Clock, TrendingUp, AlertCircle, Search } from 'lucide-react';
import { Product, UnitType, FinancialConfig, ProductComponent } from '../types';
import { api } from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { suggestPrice } from '../services/geminiService';
import { Skeleton } from './ui/skeleton';
import CategoryManager from './CategoryManager';


interface ProductListProps {
  // Local state management replaced by React Query
  // Props kept optional for backward compatibility during refactor
  products?: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  costPerHour: number;
  finConfig: FinancialConfig;
  initialSearch?: string;
}

const ProductList: React.FC<ProductListProps> = ({ costPerHour, finConfig, initialSearch = '' }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<{ conservative: number; moderate: number; aggressive: number; reasoning: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unitType: 'm2' as UnitType,
    costPrice: 0,
    productionTimeMinutes: 10,
    wastePercent: 5,
    stock: 0,
    isComposite: false,
    composition: [] as ProductComponent[]
  });

  // Stock Modal State
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockFormData, setStockFormData] = useState({
    type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: 0,
    reason: ''
  });

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  // --- REACT QUERY ---
  // Queries
  const { data: products = [], isLoading: isLoadingProd } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.list,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const { data: suppliers = [], isLoading: isLoadingSupp } = useQuery({
    queryKey: ['suppliers'],
    queryFn: api.suppliers.list,
    staleTime: 1000 * 60 * 10,
  });

  const isLoading = isLoadingProd || isLoadingSupp;

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.list,
    staleTime: 1000 * 60 * 5
  });


  const createMutation = useMutation({
    mutationFn: api.products.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Material criado com sucesso!');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: Product) => api.products.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Material atualizado com sucesso!');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.products.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Material excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });

  const stockMutation = useMutation({
    mutationFn: async (data: { productId: string, type: 'in' | 'out' | 'adjustment', quantity: number, reason: string }) => {
      // If adjustment, we might need to pass the absolute value logic differently or let api handle it
      // API currently takes type 'adjustment' and newStockValue is optional 2nd arg.
      // For simplicity in this UI, 'adjustment' will be treated as setting the NEW absolute value if implemented that way,
      // OR we just use IN/OUT.
      // Let's assume the API handles 'adjustment' as a SET operation if we pass it correctly?
      // Looking at API: registerTransaction: async (transaction, newStockValue)
      // If type is adjustment, we need newStockValue.

      const transaction = {
        productId: data.productId,
        quantity: data.quantity,
        type: data.type,
        reason: data.reason,
        date: new Date().toISOString()
      };

      if (data.type === 'adjustment') {
        // data.quantity here represents the NEW TOTAL STOCK
        await api.inventory.registerTransaction(transaction, data.quantity);
      } else {
        await api.inventory.registerTransaction(transaction);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Estoque atualizado com sucesso!');
      setIsStockModalOpen(false);
      setStockFormData({ type: 'in', quantity: 0, reason: '' });
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar estoque: ${error.message}`);
    }
  });
  // -------------------

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      // Normalize Unit Type from DB (Portuguese) to Frontend (Code)
      let unit = 'm2';
      const dbUnit = product.unitType?.toLowerCase() || '';
      if (dbUnit.includes('unid')) unit = 'un';
      else if (dbUnit.includes('litro') || dbUnit === 'ml') unit = 'ml';
      else if (dbUnit === 'm2' || dbUnit === 'm²') unit = 'm2';
      else unit = 'm2'; // Default

      setFormData({
        name: product.name,
        category: product.category,
        unitType: unit as UnitType,
        costPrice: product.costPrice,
        productionTimeMinutes: product.productionTimeMinutes || 0,
        wastePercent: product.wastePercent || 5,
        stock: product.stock,
        isComposite: product.isComposite || false,
        composition: product.composition || []
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category: '', unitType: 'm2', costPrice: 0, productionTimeMinutes: 10, wastePercent: 5, stock: 0, isComposite: false, composition: [] });
    }
    setIsModalOpen(true);
  };

  const calculateSalePrice = (materialCost: number, timeMinutes: number, waste: number) => {
    const cost = Number(materialCost) || 0;
    const time = Number(timeMinutes) || 0;
    const wastePct = Number(waste) || 0;

    const costWithWaste = cost * (1 + (wastePct / 100));
    const opCost = (time / 60) * (Number(costPerHour) || 0);
    const totalProdCost = costWithWaste + opCost;

    const margin = Number(finConfig.targetProfitMargin) || 0;
    const tax = Number(finConfig.taxPercent) || 0;
    const comm = Number(finConfig.commissionPercent) || 0;

    const divisor = 1 - ((margin + tax + comm) / 100);

    // Safety check: prevent division by zero or negative divisor
    if (divisor <= 0.01) return totalProdCost * 2; // Fallback markup

    return totalProdCost / divisor;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse costPrice from string "10,50" to number 10.50
    let finalCost = formData.costPrice;
    if (typeof finalCost === 'string') {
      finalCost = parseFloat((finalCost as string).replace(',', '.'));
    }

    // If composite, recalculate cost based on current composition
    if (formData.isComposite && formData.composition && formData.composition.length > 0) {
      finalCost = formData.composition.reduce((acc, comp) => {
        const p = products.find(prod => prod.id === comp.productId);
        return acc + ((p?.costPrice || 0) * comp.quantity);
      }, 0);
    }

    const salePrice = calculateSalePrice(finalCost as number, formData.productionTimeMinutes, formData.wastePercent);

    if (isNaN(salePrice) || isNaN(Number(finalCost))) {
      toast.error("Erro no valor. Verifique se digitou um número válido.");
      return;
    }

    // Create clean object with number types
    const cleanData = {
      ...formData,
      costPrice: Number(finalCost),
      composition: formData.isComposite ? formData.composition : []
    };

    if (editingProduct) {
      updateMutation.mutate({ ...editingProduct, ...cleanData, salePrice });
    } else {
      createMutation.mutate({ ...cleanData, salePrice });
    }
  };

  const handleDelete = async (id: string) => {
    toast('Excluir este produto?', {
      action: {
        label: 'Confirmar',
        onClick: () => deleteMutation.mutate(id),
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => { },
      },
      duration: 5000,
    });
  };

  const handleAiAnalysis = async () => {
    if (formData.costPrice <= 0) {
      toast.error("Defina um custo base primeiro para a IA analisar.");
      return;
    }
    setIsSuggesting(true);
    setSuggestions(null);
    try {
      // Use clean cost number
      let cost = typeof formData.costPrice === 'string' ? parseFloat((formData.costPrice as string).replace(',', '.')) : formData.costPrice;

      const result = await suggestPrice(formData.name, formData.category, Number(cost));
      setSuggestions(result);
    } catch (e: any) {
      console.error("AI Analysis Error:", e);
      if (e.message?.includes('API Key')) {
        toast.error("Erro: Chave de API do Google Gemini não configurada.");
      } else {
        toast.error("Erro ao consultar inteligência artificial.");
      }
    } finally {
      setIsSuggesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[2.5rem]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight uppercase neon-text">Materiais <span className="text-fuchsia-400">&</span> Estoque</h2>
          <p className="text-secondary text-sm mt-1">Gerencie seus custos e margens de lucro.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
            <input
              type="text"
              placeholder="Buscar material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-input/50 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/50 shadow-sm outline-none text-primary placeholder-secondary"
            />
          </div>
          <button onClick={() => setIsCategoryManagerOpen(true)} className="bg-surface hover:bg-surface-hover text-secondary hover:text-white px-4 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 border border-white/10 transition-all">
            <Layers size={16} /> Categorias
          </button>
          <button onClick={() => handleOpenModal()} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all active:scale-95 whitespace-nowrap border border-fuchsia-500/20">
            <Plus size={20} /> Novo Material
          </button>

        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-lg border border-white/5">
        <table className="w-full text-left">
          <thead className="bg-surface/50 border-b border-white/10">
            <tr>
              <th className="px-6 py-5 text-[10px] font-black text-secondary uppercase tracking-widest">Material</th>
              <th className="px-6 py-5 text-[10px] font-black text-secondary uppercase tracking-widest">Custo Material</th>
              <th className="px-6 py-5 text-[10px] font-black text-secondary uppercase tracking-widest">Tempo/Perda</th>
              <th className="px-6 py-5 text-[10px] font-black text-secondary uppercase tracking-widest">Estoque</th>
              <th className="px-6 py-5 text-[10px] font-black text-secondary uppercase tracking-widest text-right">Preço Venda</th>
              <th className="px-6 py-5 text-[10px] font-black text-secondary uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {paginatedProducts.map(p => (
              <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-surface border border-white/10 text-cyan-400 rounded-xl flex items-center justify-center font-bold uppercase shadow-sm">{p.name.charAt(0)}</div>
                    <div>
                      <p className="font-black text-primary group-hover:text-white transition-colors">{p.name}</p>
                      <p className="text-[10px] text-secondary font-bold uppercase">{p.category} | {p.unitType}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 font-bold text-tertiary">R$ {p.costPrice.toFixed(2)}</td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-secondary flex items-center gap-1"><Clock size={12} /> {p.productionTimeMinutes}min</span>
                    <span className="text-[10px] font-bold text-rose-400 uppercase">+{p.wastePercent}% Perda</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-lg border flex flex-col items-center min-w-[60px] ${p.stock <= 10 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                      <span className="font-black text-lg">{p.stock}</span>
                      <span className="text-[8px] font-bold uppercase">{p.unitType}</span>
                    </div>
                    <button
                      onClick={() => {
                        setStockProduct(p);
                        setStockFormData({ type: 'in', quantity: 0, reason: '' });
                        setIsStockModalOpen(true);
                      }}
                      className="p-2 bg-surface hover:bg-surface-hover text-secondary hover:text-cyan-400 rounded-lg border border-white/5 transition-colors"
                      title="Gerenciar Estoque"
                    >
                      <Package size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <span className="font-black text-fuchsia-400 text-lg neon-text">R$ {p.salePrice.toFixed(2)}</span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2 group-hover:opacity-100 lg:opacity-0 transition-opacity">
                    <button onClick={() => handleOpenModal(p)} title="Editar" className="p-2 text-secondary hover:text-cyan-400 hover:bg-surface-hover rounded-lg transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} title="Excluir" className="p-2 text-secondary hover:text-rose-500 hover:bg-surface-hover rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginatedProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-secondary uppercase font-black text-xs tracking-widest">
                  Nenhum material encontrado para "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
          {filteredProducts.length > 0 && (
            <tfoot className="bg-surface/30 border-t border-white/5">
              <tr>
                <td colSpan={6} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-secondary tracking-widest">
                      Mostrando {paginatedProducts.length} de {filteredProducts.length} itens
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-surface hover:bg-surface-hover disabled:opacity-50 text-xs font-bold text-primary rounded-lg transition-colors uppercase"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => (paginatedProducts.length === itemsPerPage ? p + 1 : p))}
                        disabled={paginatedProducts.length < itemsPerPage || (currentPage * itemsPerPage) >= filteredProducts.length}
                        className="px-4 py-2 bg-surface hover:bg-surface-hover disabled:opacity-50 text-xs font-bold text-primary rounded-lg transition-colors uppercase"
                      >
                        Próximo
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card bg-surface w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
            <div className="p-8 bg-surface/50 text-primary flex justify-between items-center border-b border-white/5 shrink-0">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{editingProduct ? 'Editar Material' : 'Novo Material'}</h3>
                <p className="text-secondary text-sm mt-1">Defina custos, margens e composições.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:text-primary"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <form onSubmit={handleSave} className="space-y-6">

                {/* Basic Info */}
                <div className="space-y-4">
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-input border border-white/10 rounded-2xl font-bold text-primary placeholder-secondary focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Nome do Material" />

                  <div className="grid grid-cols-2 gap-4">
                    <select value={formData.unitType} onChange={e => setFormData({ ...formData, unitType: e.target.value as UnitType })} className="px-4 py-3 bg-input border border-white/10 rounded-2xl font-bold text-primary outline-none focus:ring-2 focus:ring-cyan-500">
                      <option value="m2" className="bg-surface">M² (Área)</option>
                      <option value="un" className="bg-surface">Unidade (Peça)</option>
                      <option value="ml" className="bg-surface">Metro Linear</option>
                    </select>
                    <div className="relative">
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-3 bg-input border border-white/10 rounded-2xl font-bold text-primary appearance-none outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="" disabled>Selecione a Categoria</option>
                        {categories.map((cat: any) => (
                          <option key={cat.id} value={cat.name} className="bg-surface">{cat.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-secondary">
                        <Layers size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Composition Toggle */}
                <div className="flex items-center gap-3 p-4 bg-surface/30 rounded-xl border border-white/5">
                  <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${formData.isComposite ? 'bg-cyan-600' : 'bg-white/10'}`} onClick={() => setFormData({ ...formData, isComposite: !formData.isComposite })}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${formData.isComposite ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                  <span className="font-bold text-sm text-secondary uppercase tracking-widest">Este é um Produto Composto (Kit)?</span>
                </div>

                {/* COST CALCULATION */}
                {formData.isComposite ? (
                  <div className="space-y-4 bg-surface/20 p-4 rounded-2xl border border-white/5">
                    <h4 className="font-black text-sm text-secondary uppercase tracking-widest flex items-center gap-2">
                      <Layers size={14} /> Composição do Kit
                    </h4>

                    {/* Component List */}
                    <div className="space-y-2">
                      {(formData.composition || []).map((comp, idx) => {
                        const compProd = products.find(p => p.id === comp.productId);
                        return (
                          <div key={idx} className="flex items-center gap-2 bg-surface p-2 rounded-xl border border-white/5">
                            <span className="flex-1 font-bold text-sm text-primary">{compProd?.name || 'Item Removido'}</span>
                            <div className="flex items-center gap-2 bg-input rounded-lg px-2 py-1">
                              <span className="text-[10px] text-secondary">Qtd:</span>
                              <input
                                type="number"
                                className="w-12 bg-transparent text-right font-bold text-cyan-400 outline-none"
                                value={comp.quantity}
                                onChange={(e) => {
                                  const newComp = [...(formData.composition || [])];
                                  newComp[idx].quantity = parseFloat(e.target.value);
                                  setFormData({ ...formData, composition: newComp });
                                }}
                              />
                              <span className="text-[10px] text-secondary">{compProd?.unitType}</span>
                            </div>
                            <button type="button" onClick={() => {
                              const newComp = formData.composition?.filter((_, i) => i !== idx);
                              setFormData({ ...formData, composition: newComp });
                            }} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-lg"><Trash2 size={14} /></button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Component */}
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={14} />
                      <select
                        className="w-full pl-9 pr-4 py-2 bg-input border border-white/10 rounded-xl text-sm font-bold text-secondary outline-none focus:ring-1 focus:ring-cyan-500 appearance-none cursor-pointer hover:bg-surface-hover transition-colors"
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const newComp = [...(formData.composition || []), { productId: e.target.value, quantity: 1 }];
                          setFormData({ ...formData, composition: newComp });
                          e.target.value = ""; // Reset
                        }}
                        value=""
                      >
                        <option value="">+ Adicionar Componente...</option>
                        {products.filter(p => p.id !== editingProduct?.id).map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.unitType}) - R$ {p.costPrice}</option>
                        ))}
                      </select>
                    </div>

                    {/* Auto-Calculated Cost Display */}
                    <div className="text-right pt-2 border-t border-white/5">
                      <span className="text-[10px] text-secondary uppercase tracking-widest mr-2">Custo Automático:</span>
                      <span className="font-black text-white">R$ {
                        (formData.composition || []).reduce((acc, comp) => {
                          const p = products.find(prod => prod.id === comp.productId);
                          return acc + ((p?.costPrice || 0) * comp.quantity);
                        }, 0).toFixed(2)
                      }</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-secondary uppercase tracking-widest">Custo Bruto (R$)</label>
                      <input
                        type="text"
                        value={formData.costPrice}
                        onChange={e => {
                          setFormData({ ...formData, costPrice: e.target.value as any })
                        }}
                        className="w-full mt-1 bg-transparent border-b-2 border-white/10 text-primary font-black text-lg outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-secondary uppercase tracking-widest">Produção (Min)</label>
                      <input type="number" value={formData.productionTimeMinutes} onChange={e => setFormData({ ...formData, productionTimeMinutes: parseInt(e.target.value) })} className="w-full mt-1 bg-transparent border-b-2 border-white/10 text-primary font-black text-lg outline-none focus:border-cyan-500 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-secondary uppercase tracking-widest">Perda Técnica (%)</label>
                      <input type="number" value={formData.wastePercent} onChange={e => setFormData({ ...formData, wastePercent: parseFloat(e.target.value) })} className="w-full mt-1 bg-transparent border-b-2 border-white/10 text-primary font-black text-lg outline-none focus:border-cyan-500 transition-colors" />
                    </div>
                  </div>
                )}

                {!formData.isComposite && (
                  <div className="flex justify-end mb-4">
                  </div>
                )}

                <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase text-indigo-200 tracking-widest">Preço de Venda PHOCO</p>
                    <p className="text-3xl font-black">R$ {
                      formData.isComposite
                        ? calculateSalePrice(
                          (formData.composition || []).reduce((acc, comp) => {
                            const p = products.find(prod => prod.id === comp.productId);
                            // Recursive Logic? For now, 1 level deep is safer.
                            return acc + ((p?.costPrice || 0) * comp.quantity);
                          }, 0),
                          formData.productionTimeMinutes,
                          formData.wastePercent
                        ).toFixed(2)
                        : calculateSalePrice(formData.costPrice, formData.productionTimeMinutes, formData.wastePercent).toFixed(2)
                    }</p>
                  </div>
                  <div className="text-right text-[10px] font-bold text-indigo-100 uppercase space-y-1">
                    <p>Lucro Alvo: {finConfig.targetProfitMargin}%</p>
                    <p>Impostos: {finConfig.taxPercent}%</p>
                  </div>
                </div>

                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full py-5 bg-gradient-to-br from-surface-hover to-surface-active hover:from-surface hover:to-surface-hover text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-surface-hover/20 transition-all active:scale-[0.98] border border-white/10 disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (editingProduct ? 'Salvar Alterações' : 'Salvar Precificação')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isStockModalOpen && stockProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card bg-surface w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col">
            <div className="p-6 bg-surface/50 text-primary flex justify-between items-center border-b border-white/5">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Gerenciar Estoque</h3>
                <p className="text-secondary text-xs">{stockProduct.name}</p>
              </div>
              <button onClick={() => setIsStockModalOpen(false)} className="text-secondary hover:text-primary"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2 p-1 bg-surface/50 rounded-xl border border-white/5">
                <button
                  onClick={() => setStockFormData({ ...stockFormData, type: 'in' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${stockFormData.type === 'in' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Entrada (+)
                </button>
                <button
                  onClick={() => setStockFormData({ ...stockFormData, type: 'out' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${stockFormData.type === 'out' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Saída (-)
                </button>
                <button
                  onClick={() => setStockFormData({ ...stockFormData, type: 'adjustment' })}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${stockFormData.type === 'adjustment' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Definir (=)
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest pl-1 mb-1 block">
                  {stockFormData.type === 'adjustment' ? 'Nova Quantidade Total' : 'Quantidade'}
                </label>
                <input
                  type="number"
                  autoFocus
                  value={stockFormData.quantity || ''}
                  onChange={e => setStockFormData({ ...stockFormData, quantity: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-input border border-white/10 rounded-xl font-black text-2xl text-primary placeholder-zinc-700 outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest pl-1 mb-1 block">Motivo / Observação</label>
                <input
                  type="text"
                  value={stockFormData.reason}
                  onChange={e => setStockFormData({ ...stockFormData, reason: e.target.value })}
                  className="w-full px-4 py-3 bg-input border border-white/10 rounded-xl font-bold text-sm text-primary placeholder-secondary outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder={stockFormData.type === 'in' ? 'Ex: Compra NF 123' : stockFormData.type === 'out' ? 'Ex: Perda / Avaria' : 'Ex: Inventário'}
                />
              </div>

              <div className="pt-2">
                <button
                  disabled={!stockFormData.quantity || stockMutation.isPending}
                  onClick={() => stockMutation.mutate({
                    productId: stockProduct.id,
                    ...stockFormData
                  })}
                  className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {stockMutation.isPending ? 'Atualizando...' : 'Confirmar Atualização'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <CategoryManager isOpen={isCategoryManagerOpen} onClose={() => setIsCategoryManagerOpen(false)} />
    </div>
  );
};


export default ProductList;
