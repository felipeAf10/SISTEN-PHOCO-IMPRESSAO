
import React from 'react';
import {
  DollarSign, TrendingUp, Users, Printer, ChevronRight, AlertCircle, Wallet, Percent
} from 'lucide-react';
import { Product, Customer, Quote, FixedCost, FixedAsset, FinancialConfig } from '../types';
import DashboardChart from './DashboardChart';

interface DashboardProps {
  products: Product[];
  customers: Customer[];
  quotes: Quote[];
  fixedCosts: FixedCost[];
  fixedAssets: FixedAsset[];
  finConfig: FinancialConfig;
}

const Dashboard: React.FC<DashboardProps> = ({ products, customers, quotes, fixedCosts, fixedAssets, finConfig }) => {
  const totalGrossRevenue = quotes.filter(q => q.status !== 'draft').reduce((acc, q) => acc + q.totalAmount, 0);

  // Cálculo de Lucro Líquido Real (Projetado)
  // Descontando Impostos e Comissões do faturamento bruto
  const taxesAmount = totalGrossRevenue * (finConfig.taxPercent / 100);
  const commissionsAmount = totalGrossRevenue * (finConfig.commissionPercent / 100);
  const totalFixedCosts = fixedCosts.reduce((acc, c) => acc + c.value, 0) + fixedAssets.reduce((acc, a) => acc + a.monthlyDepreciation, 0);

  // O que sobra após impostos, comissões e custos fixos
  const netProfitProportion = totalGrossRevenue - taxesAmount - commissionsAmount - totalFixedCosts;

  const progressToBreakEven = Math.min(100, (totalGrossRevenue / totalFixedCosts) * 100);
  const isProfitable = totalGrossRevenue > (totalFixedCosts + taxesAmount + commissionsAmount);

  const stats = [
    { label: 'Faturamento Bruto', value: `R$ ${totalGrossRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-brand-cyan shadow-brand-cyan/50' },
    { label: 'Lucro Líquido Real', value: `R$ ${Math.max(0, netProfitProportion).toLocaleString()}`, icon: Wallet, color: 'bg-brand-magenta shadow-brand-magenta/50' },
    { label: 'Impostos e Comiss.', value: `R$ ${(taxesAmount + commissionsAmount).toLocaleString()}`, icon: Percent, color: 'bg-brand-black shadow-black/50' },
    { label: 'Base de Clientes', value: customers.length, icon: Users, color: 'bg-brand-yellow shadow-brand-yellow/50 text-slate-900' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Dashboard <span className="text-brand-magenta">Geral</span></h2>
          <p className="text-slate-500 font-medium mt-1">Visão geral do sistema <span className="text-brand-cyan font-bold">PHOCO</span>.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card bg-white/70 p-8 rounded-[2rem] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-md`}>
              <stat.icon size={28} />
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-800 mt-2">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="animate-slide-up">
        <DashboardChart />
      </div>

      <div className="glass-nav bg-[#0F172A] p-10 rounded-[2.5rem] text-white shadow-2xl">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Status de Equilíbrio</h3>
            <p className="text-sm text-slate-400">Progresso mensal para cobrir todos os custos e impostos.</p>
          </div>
          <p className={`text-2xl font-black ${isProfitable ? 'text-emerald-400' : 'text-indigo-400'}`}>
            {progressToBreakEven.toFixed(1)}%
          </p>
        </div>
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-1000 ease-out ${isProfitable ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-indigo-600'}`} style={{ width: `${progressToBreakEven}%` }} />
        </div>
        <div className="flex justify-between mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <span>Início do Mês</span>
          <span className={isProfitable ? 'text-emerald-400' : 'text-slate-500'}>{isProfitable ? 'Zona de Lucro' : 'Ponto de Equilíbrio'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card bg-white/70 rounded-[2.5rem] overflow-hidden shadow-lg">
          <div className="p-8 border-b border-slate-100/50">
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-widest flex items-center gap-2">
              <Printer size={20} className="text-indigo-600" />
              Fluxo de Pedidos
            </h3>
          </div>
          <div className="divide-y divide-slate-100/50">
            {quotes.slice(-4).reverse().map((quote) => {
              const customer = customers.find(c => c.id === quote.customerId);
              return (
                <div key={quote.id} className="p-6 flex items-center justify-between hover:bg-white/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center font-black text-indigo-400 uppercase shadow-inner">
                      {customer?.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{customer?.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(quote.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="font-black text-slate-800 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs">
                    R$ {quote.totalAmount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card bg-white/70 rounded-[2.5rem] p-10 flex flex-col justify-center shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={120} className="text-indigo-600" />
          </div>
          <TrendingUp size={48} className="text-indigo-600 mb-6 drop-shadow-sm" />
          <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase relative z-10">Meta de Produção</h3>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed relative z-10 font-medium">Considerando seu markup de {finConfig.targetProfitMargin}%, para manter a empresa saudável você precisa de um ticket médio constante.</p>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 self-start transition-all transform hover:scale-105 active:scale-95 z-10 relative">
            Análise Detalhada
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
