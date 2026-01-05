import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Check, DollarSign, Search, User as UserIcon, Calendar, ArrowRight } from 'lucide-react';

interface BalanceItem {
    userId: string;
    name: string;
    amount: number;
    count: number;
}

const AdminCommissionPanel: React.FC = () => {
    const [balances, setBalances] = useState<BalanceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadBalances();
    }, []);

    const loadBalances = async () => {
        setLoading(true);
        try {
            const data = await api.commissions.listBalances();
            setBalances(data);
        } catch (error) {
            console.error("Error loading balances:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async (userId: string) => {
        if (!confirm("Confirmar pagamento das comissões deste usuário? Isso zerará o saldo pendente.")) return;

        setProcessingId(userId);
        try {
            await api.commissions.pay(userId);
            // Refresh
            await loadBalances();
        } catch (error) {
            alert("Erro ao processar pagamento");
            console.error(error);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return (
        <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <DollarSign className="text-emerald-400" />
                    Gestão de Comissões
                </h2>
                <div className="text-sm text-secondary">
                    Total Pendente: <span className="text-white font-bold">R$ {balances.reduce((acc, b) => acc + b.amount, 0).toFixed(2)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {balances.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-secondary bg-surface/30 rounded-2xl border border-white/5 border-dashed">
                        Nenhuma comissão pendente para pagamento no momento.
                    </div>
                ) : (
                    balances.map(balance => (
                        <div key={balance.userId} className="glass-card bg-surface border border-white/5 rounded-xl p-5 hover:border-emerald-500/30 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-secondary border border-white/5">
                                        <UserIcon size={16} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">{balance.name}</h3>
                                        <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">{balance.count} Pedidos</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-secondary font-medium block">A Pagar</span>
                                    <span className="text-xl font-black text-emerald-400">R$ {balance.amount.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => handlePay(balance.userId)}
                                disabled={!!processingId}
                                className="w-full py-3 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                {processingId === balance.userId ? (
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Check size={14} /> Registrar Pagamento
                                    </>
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminCommissionPanel;
