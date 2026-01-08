import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { InventoryTransaction } from '../types';
import { X, ArrowUp, ArrowDown, History, Calendar, User, FileText } from 'lucide-react';

interface InventoryHistoryProps {
    productId: string;
    productName: string;
    onClose: () => void;
}

const InventoryHistory: React.FC<InventoryHistoryProps> = ({ productId, productName, onClose }) => {
    const { data: history = [], isLoading } = useQuery({
        queryKey: ['inventoryHistory', productId],
        queryFn: () => api.inventory.getHistory(productId),
    });

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-md bg-surface border-l border-white/10 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-active">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <History className="text-brand-magenta" size={24} />
                            Histórico de Estoque
                        </h2>
                        <p className="text-sm text-secondary mt-1 max-w-[250px] truncate" title={productName}>
                            {productName}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-secondary hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                    {isLoading && (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-magenta"></div>
                        </div>
                    )}

                    {!isLoading && history.length === 0 && (
                        <div className="text-center text-secondary py-10 opacity-70">
                            <History size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Nenhum registro encontrado.</p>
                        </div>
                    )}

                    {history.map((item: InventoryTransaction) => (
                        <div key={item.id} className="bg-surface-active/50 rounded-xl p-4 border border-white/5 relative group hover:border-white/10 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${item.quantityChange > 0
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                    }`}>
                                    {item.quantityChange > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                    {item.type === 'manual_adjustment' && 'Ajuste Manual'}
                                    {item.type === 'sale' && 'Venda'}
                                    {item.type === 'purchase' && 'Compra'}
                                    {item.type === 'production_deduction' && 'Produção'}
                                    {item.type === 'return' && 'Devolução'}
                                </div>
                                <span className={`text-lg font-black ${item.quantityChange > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {item.quantityChange > 0 ? '+' : ''}{item.quantityChange}
                                </span>
                            </div>

                            <p className="text-sm text-zinc-300 mb-3">{item.notes || 'Sem observações'}</p>

                            <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-medium">
                                <span className="flex items-center gap-1">
                                    <Calendar size={10} />
                                    {new Date(item.createdAt).toLocaleString()}
                                </span>
                                {item.referenceId && (
                                    <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-zinc-400">
                                        <FileText size={10} />
                                        Ref: {item.referenceId.slice(0, 8)}...
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InventoryHistory;
