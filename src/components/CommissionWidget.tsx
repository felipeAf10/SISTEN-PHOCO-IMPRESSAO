import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { DollarSign, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

interface CommissionWidgetProps {
    currentUser: User;
}

const CommissionWidget: React.FC<CommissionWidgetProps> = ({ currentUser }) => {
    const [balance, setBalance] = useState<{ totalCommission: number, pendingCount: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBalance();
    }, [currentUser.id]);

    const loadBalance = async () => {
        try {
            const data = await api.commissions.getBalance(currentUser.id);
            setBalance(data);
        } catch (error) {
            console.error("Error loading commissions:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="glass-card p-6 animate-pulse bg-surface/20 h-32 rounded-2xl"></div>;

    return (
        <div className="glass-card bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-500"></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl text-emerald-400 border border-emerald-500/10">
                    <DollarSign size={24} />
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${balance?.pendingCount ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surface-hover text-secondary border-white/5'}`}>
                    {balance?.pendingCount || 0} Vendas Pendentes
                </div>
            </div>

            <div className="relative z-10">
                <h3 className="text-secondary font-medium text-sm mb-1">Comissões a Receber</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white tracking-tight">
                        R$ {balance?.totalCommission.toFixed(2)}
                    </span>
                </div>
                <p className="text-[10px] text-secondary mt-2 flex items-center gap-1.5">
                    <AlertCircle size={10} />
                    Disponível após entrega do pedido
                </p>
            </div>

            {/* Action Button (Optional - maybe request withdrawal?) */}
            {/* <div className="mt-4 pt-4 border-t border-white/5">
            <button className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">
                Detalhes
            </button>
        </div> */}
        </div>
    );
};

export default CommissionWidget;
