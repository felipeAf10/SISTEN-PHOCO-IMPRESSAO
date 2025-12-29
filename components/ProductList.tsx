
import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Package, X, Layers, Clock, TrendingUp, AlertCircle, Search } from 'lucide-react';
import { Product, UnitType, FinancialConfig } from '../types';
import { api } from '../src/services/api';

interface ProductListProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  costPerHour: number;
  finConfig: FinancialConfig;
  initialSearch?: string;
}

const ProductList: React.FC<ProductListProps> = ({ products, setProducts, costPerHour, finConfig, initialSearch = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unitType: 'm2' as UnitType,
    costPrice: 0,
    productionTimeMinutes: 10,
    wastePercent: 5,
    stock: 0
  });

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        unitType: product.unitType,
        costPrice: product.costPrice,
        productionTimeMinutes: product.productionTimeMinutes || 0,
        wastePercent: product.wastePercent || 5,
        stock: product.stock
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category: '', unitType: 'm2', costPrice: 0, productionTimeMinutes: 10, wastePercent: 5, stock: 0 });
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
    const salePrice = calculateSalePrice(formData.costPrice, formData.productionTimeMinutes, formData.wastePercent);

    try {
      if (editingProduct) {
        const updatedProduct: Product = { ...editingProduct, ...formData, salePrice };
        await api.products.update(updatedProduct);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p));
      } else {
        const newProduct: Product = { id: crypto.randomUUID(), ...formData, salePrice };
        await api.products.create(newProduct);
        setProducts(prev => [...prev, newProduct]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Erro ao salvar produto. Verifique sua conexão.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await api.products.delete(id);
        setProducts(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Erro ao excluir produto.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Materiais <span className="text-brand-magenta">&</span> Estoque</h2>
          <p className="text-slate-500 text-sm mt-1">Gerencie seus custos e margens de lucro.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-cyan shadow-sm outline-none"
            />
          </div>
          <button onClick={() => handleOpenModal()} className="bg-brand-magenta hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-pink-500/25 transition-all active:scale-95 whitespace-nowrap">
            <Plus size={20} /> Novo Material
          </button>
        </div>
      </div>

      <div className="glass-card bg-white/70 rounded-[2.5rem] overflow-hidden shadow-lg border border-white/50">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Material</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo/Perda</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Preço Venda</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {filteredProducts.map(p => (
              <tr key={p.id} className="hover:bg-white/60 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-50 text-brand-cyan rounded-xl flex items-center justify-center font-bold uppercase shadow-sm">{p.name.charAt(0)}</div>
                    <div>
                      <p className="font-black text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{p.category} | {p.unitType}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 font-bold text-slate-600">R$ {p.costPrice.toFixed(2)}</td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Clock size={12} /> {p.productionTimeMinutes}min</span>
                    <span className="text-[10px] font-bold text-rose-400 uppercase">+{p.wastePercent}% Perda</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <span className="font-black text-brand-magenta text-lg">R$ {p.salePrice.toFixed(2)}</span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2 group-hover:opacity-100 lg:opacity-0 transition-opacity">
                    <button onClick={() => handleOpenModal(p)} title="Editar" className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-100 lg:bg-transparent rounded-lg">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setProducts(products.filter(item => item.id !== p.id))} title="Excluir" className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 lg:bg-transparent rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-slate-400 uppercase font-black text-xs tracking-widest">
                  Nenhum material encontrado para "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 bg-black text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{editingProduct ? 'Editar Material' : 'Precificação Automática'}</h3>
                <p className="text-slate-400 text-sm mt-1">Cálculo baseado em custos e margens de segurança.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Nome do Material" />

              <div className="grid grid-cols-2 gap-4">
                <select value={formData.unitType} onChange={e => setFormData({ ...formData, unitType: e.target.value as UnitType })} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                  <option value="m2">M² (Área)</option>
                  <option value="un">Unidade (Peça)</option>
                  <option value="ml">Metro Linear</option>
                </select>
                <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Categoria" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Custo Bruto (R$)</label>
                  <input required type="number" step="0.01" value={formData.costPrice} onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })} className="w-full mt-1 bg-transparent border-b-2 border-slate-200 font-black text-lg outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Produção (Min)</label>
                  <input required type="number" value={formData.productionTimeMinutes} onChange={e => setFormData({ ...formData, productionTimeMinutes: parseInt(e.target.value) })} className="w-full mt-1 bg-transparent border-b-2 border-slate-200 font-black text-lg outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Perda Técnica (%)</label>
                  <input required type="number" value={formData.wastePercent} onChange={e => setFormData({ ...formData, wastePercent: parseFloat(e.target.value) })} className="w-full mt-1 bg-transparent border-b-2 border-slate-200 font-black text-lg outline-none" />
                </div>
              </div>

              <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-indigo-200 tracking-widest">Preço de Venda PHOCO</p>
                  <p className="text-3xl font-black">R$ {calculateSalePrice(formData.costPrice, formData.productionTimeMinutes, formData.wastePercent).toFixed(2)}</p>
                </div>
                <div className="text-right text-[10px] font-bold text-indigo-100 uppercase space-y-1">
                  <p>Lucro Alvo: {finConfig.targetProfitMargin}%</p>
                  <p>Impostos: {finConfig.taxPercent}%</p>
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98]">
                {editingProduct ? 'Salvar Alterações' : 'Salvar Precificação'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
