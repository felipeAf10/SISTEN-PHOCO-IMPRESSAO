
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, AlertTriangle, Package, ArrowUp, ArrowDown, History, RefreshCw, Archive } from 'lucide-react';
import { Product, InventoryTransaction } from '../types';
import { StockAdjustmentModal } from './StockAdjustmentModal';
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
        initialData: initialProducts
    });

    const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        // Load local transactions
        const loadTransactions = () => {
            const stored = localStorage.getItem('inventory_transactions');
            if (stored) {
                setTransactions(JSON.parse(stored));
            }
        };
        loadTransactions();

        // Listen to local storage changes to update history
        window.addEventListener('storage', loadTransactions);
        // Custom event for same-tab updates
        window.addEventListener('inventory_update', loadTransactions);

        return () => {
            window.removeEventListener('storage', loadTransactions);
            window.removeEventListener('inventory_update', loadTransactions);
        };
    }, []);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.category.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (filter === 'low') return p.stock > 0 && p.stock <= 10; // Example threshold
            if (filter === 'out') return p.stock <= 0;

            return true;
        });
    }, [products, searchTerm, filter]);

    const stats = useMemo(() => {
        const totalItems = products.length;
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
        const outStock = products.filter(p => p.stock <= 0).length;
        const totalValue = products.reduce((acc, p) => acc + (p.stock * p.costPrice), 0);

        return { totalItems, lowStock, outStock, totalValue };
    }, [products]);

    const handleProductUpdate = () => {
        // Invalidate queries to refresh data in both modules
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast.success("Estoque atualizado!");
    };

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
                        onClick={() => setShowHistory(!showHistory)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2 ${showHistory ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-surface border-white/5 text-secondary hover:text-white'}`}
                    >
                        <History size={16} /> Histórico {!showHistory && 'de Movimentações'}
                    </button>
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
                <div className={`lg:col-span-${showHistory ? '2' : '3'} glass-card rounded-[2.5rem] overflow-hidden border border-white/5 transition-all duration-500`}>

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
                                                <div className={`w-2 h-2 rounded-full ${p.stock <= 0 ? 'bg-rose-500' : p.stock <= 10 ? 'bg-yellow-500' : 'bg-emerald-500'}`}></div>
                                                <span className={`font-bold text-sm ${p.stock <= 0 ? 'text-rose-200' : 'text-primary'}`}>{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-secondary uppercase">{p.category}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-black ${p.stock <= 0 ? 'text-rose-500' : p.stock <= 10 ? 'text-yellow-500' : 'text-emerald-400'}`}>
                                                {p.stock} <span className="text-[10px] text-tertiary ml-1 uppercase">{p.unitType}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedProduct(p)}
                                                className="bg-surface hover:bg-surface-hover text-secondary hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border border-white/5"
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

                {/* History Sidebar */}
                {showHistory && (
                    <div className="col-span-1 glass-card rounded-[2.5rem] overflow-hidden border border-white/5 flex flex-col h-[600px] lg:h-auto">
                        <div className="p-6 border-b border-white/5 bg-surface/30">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <History size={16} className="text-indigo-400" /> Histórico Recente
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {transactions.length === 0 ? (
                                <div className="text-center py-10 opacity-30">
                                    <Archive size={40} className="mx-auto mb-2" />
                                    <p className="text-xs uppercase font-bold">Nenhuma movimentação</p>
                                </div>
                            ) : (
                                transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                                    <div key={t.id} className="bg-surface/50 p-3 rounded-xl border border-white/5">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-xs font-bold text-white truncate w-32">{t.productName}</p>
                                            <span className="text-[9px] text-tertiary">{new Date(t.date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                {t.type === 'in' && <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded"><ArrowUp size={12} /></div>}
                                                {t.type === 'out' && <div className="p-1 bg-rose-500/10 text-rose-400 rounded"><ArrowDown size={12} /></div>}
                                                {t.type === 'adjustment' && <div className="p-1 bg-blue-500/10 text-blue-400 rounded"><RefreshCw size={12} /></div>}
                                                <span className="text-[10px] font-bold text-secondary">{t.reason}</span>
                                            </div>
                                            <span className={`text-sm font-black ${t.type === 'in' ? 'text-emerald-400' : t.type === 'out' ? 'text-rose-400' : 'text-blue-400'}`}>
                                                {t.type === 'out' ? '-' : '+'}{t.quantity}
                                            </span>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-tertiary uppercase font-bold text-right">
                                            Por: {t.userName || 'Sistema'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>


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
