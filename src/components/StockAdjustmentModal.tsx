
import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { Product } from '../types';
import { api } from '../services/api';

interface StockAdjustmentModalProps {
    product: Product;
    onClose: () => void;
    onSuccess: (updatedProduct: Product) => void;
    currentUser: { id: string; name: string };
}

type AdjustmentType = 'in' | 'out' | 'set';

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ product, onClose, onSuccess, currentUser }) => {
    const [type, setType] = useState<AdjustmentType>('in');
    const [quantity, setQuantity] = useState<number>(0);
    const [reason, setReason] = useState<string>('Reposição de Estoque');

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quantity <= 0 && type !== 'set') {
            alert("A quantidade deve ser maior que zero.");
            return;
        }

        setIsLoading(true);
        try {
            let finalQuantity = quantity;

            // If we are setting stock, calculate the difference for the "transaction" quantity
            let transactionQty = quantity;

            if (type === 'out') {
                finalQuantity = -quantity; // Logic in API will likely be add(negative) or specific methods
                transactionQty = quantity;
            }

            await api.inventory.registerTransaction({
                productId: product.id,
                productName: product.name,
                type: type === 'set' ? 'adjustment' : type,
                quantity: transactionQty,
                reason,
                date: new Date().toISOString(),
                userId: currentUser.id,
                userName: currentUser.name
            }, type === 'set' ? quantity : undefined); // If set, pass the absolute value

            // Fetch updated product? Or calculate locally?
            // For simplicity, let's assume we fetch or calculate.
            // Ideally API returns the new state, but our simplified API might not.
            // Let's refetch product to be safe or calculate locally.

            let newStock = product.stock;
            if (type === 'in') newStock += quantity;
            else if (type === 'out') newStock -= quantity;
            else if (type === 'set') newStock = quantity;

            onSuccess({ ...product, stock: newStock });
            onClose();
        } catch (error) {
            console.error("Failed to adjust stock:", error);
            alert("Erro ao ajustar estoque. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="glass-card bg-surface w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10">
                <div className="p-6 bg-surface/50 text-white flex justify-between items-center border-b border-white/10">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Ajuste de Estoque</h3>
                        <p className="text-secondary text-xs mt-1">{product.name}</p>
                    </div>
                    <button onClick={onClose} className="text-secondary hover:text-white"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-surface">

                    <div className="flex gap-2 p-1 bg-surface-hover/50 rounded-xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setType('in')}
                            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${type === 'in' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-secondary hover:text-white hover:bg-white/5'}`}
                        >
                            <ArrowUp size={14} /> Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('out')}
                            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${type === 'out' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-secondary hover:text-white hover:bg-white/5'}`}
                        >
                            <ArrowDown size={14} /> Saída
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('set')}
                            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${type === 'set' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-secondary hover:text-white hover:bg-white/5'}`}
                        >
                            <RefreshCw size={14} /> Ajuste
                        </button>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-secondary uppercase tracking-widest">
                            {type === 'set' ? 'Nova Quantidade em Estoque' : 'Quantidade para Movimentação'}
                        </label>
                        <div className="relative mt-2">
                            <input
                                autoFocus
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={quantity}
                                onChange={e => setQuantity(parseFloat(e.target.value))}
                                className="w-full text-4xl font-black text-white bg-transparent border-b-2 border-white/10 focus:border-cyan-500 outline-none py-2 transition-colors"
                            />
                            <span className="absolute right-0 bottom-4 text-xs font-bold text-secondary uppercase">{product.unitType}</span>
                        </div>
                        <p className="text-right text-xs text-secondary mt-2 font-bold">
                            Atual: <span className="text-white">{product.stock} {product.unitType}</span>
                            {type !== 'set' && quantity > 0 && (
                                <span className="ml-2 text-cyan-400">
                                    ➝ {type === 'in' ? (product.stock + quantity) : (product.stock - quantity)} {product.unitType}
                                </span>
                            )}
                        </p>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Motivo</label>
                        <select
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full mt-2 px-4 py-3 bg-surface-active border border-white/10 rounded-xl font-bold text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/20"
                        >
                            {type === 'in' && (
                                <>
                                    <option value="Reposição de Estoque">Reposição de Estoque</option>
                                    <option value="Devolução de Cliente">Devolução de Cliente</option>
                                    <option value="Sobra de Produção">Sobra de Produção</option>
                                    <option value="Outra Entrada">Outra Entrada</option>
                                </>
                            )}
                            {type === 'out' && (
                                <>
                                    <option value="Uso em Produção">Uso em Produção</option>
                                    <option value="Perda / Dano">Perda / Dano</option>
                                    <option value="Venda Direta">Venda Direta</option>
                                    <option value="Ajuste Negativo">Ajuste Negativo</option>
                                </>
                            )}
                            {type === 'set' && (
                                <>
                                    <option value="Inventário Periódico">Inventário Periódico</option>
                                    <option value="Correção de Erro">Correção de Erro</option>
                                    <option value="Saldo Inicial">Saldo Inicial</option>
                                </>
                            )}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-gradient-to-br from-surface-hover to-surface-active text-white rounded-xl font-black uppercase tracking-widest text-xs hover:from-surface hover:to-surface-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2 border border-white/10 shadow-lg"
                    >
                        {isLoading ? 'Processando...' : 'Confirmar Movimentação'}
                    </button>

                </form>
            </div>
        </div>
    );
};
