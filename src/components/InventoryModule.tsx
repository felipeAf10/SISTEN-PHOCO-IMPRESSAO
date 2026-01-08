import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, AlertTriangle, Package, ArrowUp, ArrowDown, History, RefreshCw, Archive, ShoppingCart, Share2 } from 'lucide-react';
import { Product, InventoryTransaction } from '../types';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import InventoryHistory from './InventoryHistory';
import { api } from '../services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface InventoryModuleProps {
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    currentUser: { id: string; name: string };
}

const InventoryModule: React.FC<InventoryModuleProps> = ({ products: initialProducts, currentUser }) => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');

    // Use React Query to keep in sync with ProductList
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.list,
        initialData: initialProducts,
        staleTime: 1000 * 60 * 5
    });

    const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);

    // Purchase List State
    const [showPurchaseList, setShowPurchaseList] = useState(false);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.category.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (filter === 'low') return p.stock > 0 && p.stock <= (p.minStock || 10);
            if (filter === 'out') return p.stock <= 0;

            return true;
        });
    }, [products, searchTerm, filter]);

    const stats = useMemo(() => {
        const totalItems = products.length;
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 10)).length;
        const outStock = products.filter(p => p.stock <= 0).length;
        const totalValue = products.reduce((acc, p) => acc + (p.stock * p.costPrice), 0);

        return { totalItems, lowStock, outStock, totalValue };
    }, [products]);

    const purchaseList = useMemo(() => {
        const toBuy = products.filter(p => p.stock <= (p.minStock || 5)); // Using minStock or default 5

        // Group by Supplier
        const bySupplier: Record<string, Product[]> = {};
        const noSupplier: Product[] = [];

        toBuy.forEach(p => {
            if (p.supplierName) { // Assuming api.list joins this or we have supplierId
                const key = p.supplierName;
                if (!bySupplier[key]) bySupplier[key] = [];
                bySupplier[key].push(p);
            } else {
                noSupplier.push(p);
            }
        });

        return { bySupplier, noSupplier, totalItems: toBuy.length };
    }, [products]);

    const handleProductUpdate = () => {
        // Invalidate queries to refresh data in both modules
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast.success("Estoque atualizado!");
    };

    const generateWhatsAppLink = (supplierName: string, items: Product[]) => {
        const text = `Olá, gostaria de fazer um pedido:\n\n${items.map(p => `- ${p.name} (Estoque: ${p.stock})`).join('\n')}`;
        return `https://wa.me/?text=${encodeURIComponent(text)}`;
    };

    if (showPurchaseList) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-black text-primary tracking-tight uppercase neon-text">Lista de <span className="text-amber-400">Compras</span></h2>
                        <p className="text-secondary text-sm mt-1">Itens abaixo do estoque mínimo.</p>
                    </div>
                    <button
                        onClick={() => setShowPurchaseList(false)}
                        className="bg-surface hover:bg-surface-hover text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-white/10"
                    >
                        Voltar para Estoque
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Items without Supplier */}
                    {purchaseList.noSupplier.length > 0 && (
                        <div className="glass-card bg-surface/50 p-6 rounded-3xl border border-white/5">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle className="text-amber-400" size={20} /> Fornecedor Não Definido</h3>
                            <div className="space-y-3">
                                {purchaseList.noSupplier.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-2 bg-surface rounded-xl">
                                        <div>
                                            <p className="font-bold text-sm text-primary">{p.name}</p>
                                            <p className="text-[10px] text-secondary">Estoque: {p.stock} {p.unitType}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* By Supplier */}
                    {Object.entries(purchaseList.bySupplier).map(([supplier, items]) => (
                        <div key={supplier} className="glass-card bg-surface/50 p-6 rounded-3xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Package className="text-indigo-400" size={20} /> {supplier}</h3>
                                <a
                                    href={generateWhatsAppLink(supplier, items)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                                    title="Enviar Pedido no WhatsApp"
                                >
                                    <Share2 size={18} />
                                </a>
                            </div>
                            <div className="space-y-3">
                                {items.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-2 bg-surface rounded-xl border border-white/5">
                                        <div>
                                            <p className="font-bold text-sm text-primary">{p.name}</p>
                                            <p className="text-[10px] text-secondary">Atual: <span className="text-rose-400 font-bold">{p.stock}</span> (Mín: {p.minStock || 5})</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {purchaseList.totalItems === 0 && (
                        <div className="col-span-full py-20 text-center opacity-50">
                            <Package size={48} className="mx-auto mb-4 text-emerald-500" />
                            <p className="text-xl font-bold text-emerald-400">Tudo Certo!</p>
                            <p className="text-sm">Nenhum item precisa de reposição no momento.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-primary tracking-tight uppercase neon-text">Controle de <span className="text-emerald-400">Estoque</span></h2>
                    <p className="text-secondary text-sm mt-1">Gerencie níveis, movimentações e reposições.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPurchaseList(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black transition-all flex items-center gap-2"
                    >
                        <ShoppingCart size={16} /> Lista de Compras {purchaseList.totalItems > 0 && <span className="bg-amber-500 text-black px-1.5 py-0.5 rounded-full text-[9px]">{purchaseList.totalItems}</span>}
                    </button>
                    {/* History button removed from top, moved to row */}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface/50 p-5 rounded-[2rem] border border-white/5 flex flex-col justify-between h-32">
                    <div className="p-2 bg-black/50 w-fit rounded-lg text-secondary"><Package size={20} /></div>
                    <div>
                        <h3 className="text-2xl font-black text-white">{stats.totalItems}</h3>
                        <p className="text-[10px] text-secondary uppercase font-bold tracking-widest">Total Itens</p>
                    </div>
                </div>
                <div className="bg-surface/50 p-5 rounded-[2rem] border border-white/5 flex flex-col justify-between h-32">
                    <div className="p-2 bg-rose-900/30 w-fit rounded-lg text-rose-400"><AlertTriangle size={20} /></div>
                    <div>
                        <h3 className="text-2xl font-black text-white">{stats.outStock}</h3>
                        <p className="text-[10px] text-secondary uppercase font-bold tracking-widest">Sem Estoque</p>
                    </div>
                </div>
                <div className="bg-surface/50 p-5 rounded-[2rem] border border-white/5 flex flex-col justify-between h-32">
                    <div className="p-2 bg-yellow-900/30 w-fit rounded-lg text-yellow-400"><AlertTriangle size={20} /></div>
                    <div>
                        <h3 className="text-2xl font-black text-white">{stats.lowStock}</h3>
                        <p className="text-[10px] text-secondary uppercase font-bold tracking-widest">Baixo Estoque</p>
                    </div>
                </div>
                <div className="bg-surface/50 p-5 rounded-[2rem] border border-white/5 flex flex-col justify-between h-32">
                    <h3 className="text-2xl font-black text-emerald-400">R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    <p className="text-[10px] text-secondary uppercase font-bold tracking-widest">Valor em Estoque</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Product List */}
                <div className={`col-span-3 glass-card rounded-[2.5rem] overflow-hidden border border-white/5 transition-all duration-500`}>

                    {/* Toolbar */}
                    <div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar item..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-input/50 border border-white/5 rounded-xl text-xs text-primary focus:ring-1 focus:ring-emerald-500/50 outline-none"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-white text-black' : 'bg-surface text-secondary hover:text-white'}`}>Todos</button>
                            <button onClick={() => setFilter('low')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${filter === 'low' ? 'bg-yellow-500 text-black' : 'bg-surface text-secondary hover:text-white'}`}>Baixo Estoque</button>
                            <button onClick={() => setFilter('out')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${filter === 'out' ? 'bg-rose-500 text-white' : 'bg-surface text-secondary hover:text-white'}`}>Sem Estoque</button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-surface/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest">Produto</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest">Categoria</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest text-right">Estoque Atual</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-white/5">
                                {filteredProducts.map(p => (
                                    <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${p.stock <= 0 ? 'bg-rose-500' : p.stock <= (p.minStock || 10) ? 'bg-yellow-500' : 'bg-emerald-500'}`}></div>
                                                <span className={`font-bold text-sm ${p.stock <= 0 ? 'text-rose-200' : 'text-primary'}`}>{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-secondary uppercase">{p.category}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-black ${p.stock <= 0 ? 'text-rose-500' : p.stock <= (p.minStock || 10) ? 'text-yellow-500' : 'text-emerald-400'}`}>
                                                {p.stock} <span className="text-[10px] text-tertiary ml-1 uppercase">{p.unitType}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => setViewingHistoryId(p.id)}
                                                className="bg-surface hover:bg-surface-hover text-secondary hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border border-white/5"
                                                title="Ver Histórico"
                                            >
                                                <History size={14} />
                                            </button>
                                            <button
                                                onClick={() => setSelectedProduct(p)}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shadow-indigo-500/20"
                                            >
                                                Ajustar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

            {viewingHistoryId && (
                <InventoryHistory
                    productId={viewingHistoryId}
                    productName={products.find(p => p.id === viewingHistoryId)?.name || 'Item'}
                    onClose={() => setViewingHistoryId(null)}
                />
            )}

            {
                selectedProduct && (
                    <StockAdjustmentModal
                        product={selectedProduct}
                        onClose={() => setSelectedProduct(null)}
                        onSuccess={handleProductUpdate}
                        currentUser={currentUser}
                    />
                )
            }
        </div >
    );
};

export default InventoryModule;
