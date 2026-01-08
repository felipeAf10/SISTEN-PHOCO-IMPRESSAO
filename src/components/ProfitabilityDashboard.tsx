import React, { useMemo } from 'react';
import { Quote, FinancialConfig, Product, Customer } from '../types';
import { DollarSign, TrendingUp, TrendingDown, PieChart, Info } from 'lucide-react';
import CategorySalesChart from './charts/CategorySalesChart';
import TopClientsChart from './charts/TopClientsChart';

interface ProfitabilityDashboardProps {
    quotes: Quote[];
    finConfig: FinancialConfig;
    products: Product[];
    customers: Customer[];
}

const ProfitabilityDashboard: React.FC<ProfitabilityDashboardProps> = ({ quotes, finConfig, products, customers }) => {
    // Only analyze confirmed/finished quotes
    const validQuotes = useMemo(() => {
        return quotes.filter(q => q.status === 'confirmed' || q.status === 'finished' || q.status === 'delivered');
    }, [quotes]);

    const productsMap = useMemo(() => {
        const map: Record<string, { category: string }> = {};
        products.forEach(p => {
            map[p.id] = { category: p.category };
        });
        return map;
    }, [products]);

    const customersMap = useMemo(() => {
        const map: Record<string, { name: string }> = {};
        customers.forEach(c => {
            map[c.id] = { name: c.name };
        });
        return map;
    }, [customers]);

    const stats = useMemo(() => {
        let totalRevenue = 0;
        let totalMaterialCost = 0;
        let totalLaborCost = 0;
        let totalTaxes = 0;
        let totalCommissions = 0;

        validQuotes.forEach(q => {
            totalRevenue += q.totalAmount;

            // Calculate Costs
            let quoteMaterials = 0;
            let quoteLabor = 0;

            q.items.forEach(item => {
                // Material Cost: Use snapshot unitCost or fallback to 30% of price (rough estimate if data missing)
                const cost = item.unitCost ? item.unitCost : (item.unitPrice * 0.3);
                quoteMaterials += cost * item.quantity;

                // Labor Cost (Fixed Cost Allocation)
                if (item.productionTime && finConfig.hourlyRate) {
                    quoteLabor += (item.productionTime / 60) * finConfig.hourlyRate;
                } else {
                    // Fallback if no time data: 20% of subtotal (Simulated)
                    quoteLabor += item.subtotal * 0.2;
                }
            });

            totalMaterialCost += quoteMaterials;
            totalLaborCost += quoteLabor;
            totalTaxes += q.totalAmount * (finConfig.taxPercent / 100);
            totalCommissions += q.totalAmount * (finConfig.commissionPercent / 100);
        });

        const totalCosts = totalMaterialCost + totalLaborCost + totalTaxes + totalCommissions;
        const realProfit = totalRevenue - totalCosts;
        const margin = totalRevenue > 0 ? (realProfit / totalRevenue) * 100 : 0;

        return { totalRevenue, totalMaterialCost, totalLaborCost, totalTaxes, totalCommissions, totalCosts, realProfit, margin };
    }, [validQuotes, finConfig]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                    <TrendingUp className="text-emerald-400" size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Lucro Real</h2>
                    <p className="text-secondary">Análise financeira detalhada dos pedidos fechados</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-surface rounded-3xl p-6 border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={64} className="text-emerald-500" />
                    </div>
                    <p className="text-secondary font-bold text-xs uppercase tracking-widest mb-2">Faturamento Total</p>
                    <p className="text-3xl font-black text-white">R$ {stats.totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-secondary mt-2">{validQuotes.length} pedidos confirmados</p>
                </div>

                <div className="bg-surface rounded-3xl p-6 border border-white/5 relative overflow-hidden group hover:border-red-500/30 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingDown size={64} className="text-red-500" />
                    </div>
                    <p className="text-secondary font-bold text-xs uppercase tracking-widest mb-2">Custos Totais</p>
                    <p className="text-3xl font-black text-red-400">R$ {stats.totalCosts.toFixed(2)}</p>
                    <p className="text-xs text-red-400/70 mt-2">Materiais, Impostos, Comissões</p>
                </div>

                <div className="bg-surface rounded-3xl p-6 border border-white/5 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={64} className="text-emerald-400" />
                    </div>
                    <p className="text-secondary font-bold text-xs uppercase tracking-widest mb-2">Lucro Líquido</p>
                    <p className="text-3xl font-black text-emerald-400">R$ {stats.realProfit.toFixed(2)}</p>
                    <p className="text-xs text-emerald-400/50 mt-2">O que realmente sobrou</p>
                </div>

                <div className="bg-surface rounded-3xl p-6 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <PieChart size={64} className="text-blue-500" />
                    </div>
                    <p className="text-secondary font-bold text-xs uppercase tracking-widest mb-2">Margem Líquida</p>
                    <p className={`text-4xl font-black ${stats.margin > 20 ? 'text-blue-400' : stats.margin > 10 ? 'text-amber-400' : 'text-red-400'}`}>
                        {stats.margin.toFixed(1)}%
                    </p>
                    <p className="text-xs text-secondary mt-2">Meta: {finConfig.targetProfitMargin}%</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CategorySalesChart quotes={validQuotes} productsMap={productsMap} />
                <TopClientsChart quotes={validQuotes} customersMap={customersMap} />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface rounded-3xl p-8 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <PieChart size={20} className="text-indigo-400" />
                        Detalhamento de Custos
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                            <span className="text-zinc-400 text-sm">Matéria Prima</span>
                            <div className="text-right">
                                <span className="block font-bold text-white">R$ {stats.totalMaterialCost.toFixed(2)}</span>
                                <span className="text-xs text-zinc-500">{stats.totalRevenue > 0 ? ((stats.totalMaterialCost / stats.totalRevenue) * 100).toFixed(1) : '0.0'}%</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                            <span className="text-zinc-400 text-sm">Mão de Obra / Fixo</span>
                            <div className="text-right">
                                <span className="block font-bold text-white">R$ {stats.totalLaborCost.toFixed(2)}</span>
                                <span className="text-xs text-zinc-500">{stats.totalRevenue > 0 ? ((stats.totalLaborCost / stats.totalRevenue) * 100).toFixed(1) : '0.0'}%</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                            <span className="text-zinc-400 text-sm">Impostos ({finConfig.taxPercent}%)</span>
                            <div className="text-right">
                                <span className="block font-bold text-white">R$ {stats.totalTaxes.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                            <span className="text-zinc-400 text-sm">Comissões ({finConfig.commissionPercent}%)</span>
                            <div className="text-right">
                                <span className="block font-bold text-white">R$ {stats.totalCommissions.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-surface rounded-3xl p-8 border border-white/5 flex flex-col justify-center items-center text-center">
                    <Info size={48} className="text-indigo-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Como melhorar sua margem?</h3>
                    <p className="text-secondary text-sm max-w-sm">
                        Sua margem atual é de <strong className="text-white">{stats.margin.toFixed(1)}%</strong>.
                        Para atingir a meta de {finConfig.targetProfitMargin}%, considere rever o Markup dos produtos ou reduzir os custos fixos operacionais.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfitabilityDashboard;
