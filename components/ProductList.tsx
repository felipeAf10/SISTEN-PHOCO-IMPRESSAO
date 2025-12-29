
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
    console.log("handleSave called", formData); // Debug

    const salePrice = calculateSalePrice(formData.costPrice, formData.productionTimeMinutes, formData.wastePercent);

    if (isNaN(salePrice)) {
      alert("Erro no cálculo do preço. Verifique se os valores estão corretos (use ponto em vez de vírgula).");
      return;
    }

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
    } catch (error: any) {
      console.error("Error saving product:", error);
      alert(`Erro ao salvar produto: ${error.message || JSON.stringify(error)}`);
    }
  };

  // ... (handleDelete unchanged)

  return (
    // ... (Outer JSX unchanged)
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
          <input
            type="number"
            step="0.01"
            value={formData.costPrice}
            onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
            onWheel={(e) => e.currentTarget.blur()}
            className="w-full mt-1 bg-transparent border-b-2 border-slate-200 font-black text-lg outline-none"
          />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Produção (Min)</label>
          <input type="number" value={formData.productionTimeMinutes} onChange={e => setFormData({ ...formData, productionTimeMinutes: parseInt(e.target.value) })} className="w-full mt-1 bg-transparent border-b-2 border-slate-200 font-black text-lg outline-none" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Perda Técnica (%)</label>
          <input type="number" value={formData.wastePercent} onChange={e => setFormData({ ...formData, wastePercent: parseFloat(e.target.value) })} className="w-full mt-1 bg-transparent border-b-2 border-slate-200 font-black text-lg outline-none" />
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
          </div >
        </div >
      )}
    </div >
  );
};

export default ProductList;
