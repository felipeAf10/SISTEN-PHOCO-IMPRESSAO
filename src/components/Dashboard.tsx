
import React from 'react';
import {
  DollarSign, Users, Printer, Wallet, Percent, Calendar, AlertCircle, TrendingUp, Loader2
} from 'lucide-react';
import RevenueChart from './charts/RevenueChart';
import TopProductsChart from './charts/TopProductsChart';
import CommissionWidget from './CommissionWidget';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { User, Quote, Customer, Product, FixedCost, FixedAsset, FinancialConfig } from '../types';
import { Skeleton } from './ui/skeleton';

interface DashboardProps {
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  // --- QUERIES ---
  const { data: quotes = [], isLoading: isLoadingQuotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: api.quotes.list,
    staleTime: 1000 * 60 * 5,
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: api.customers.list,
    staleTime: 1000 * 60 * 5,
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.list,
    staleTime: 1000 * 60 * 5,
  });

  const { data: fixedCosts = [], isLoading: isLoadingCosts } = useQuery({
    queryKey: ['fixedCosts'],
    queryFn: api.financial.listCosts,
    staleTime: 1000 * 60 * 10,
  });

  const { data: fixedAssets = [], isLoading: isLoadingAssets } = useQuery({
    queryKey: ['fixedAssets'],
    queryFn: api.financial.listAssets,
    staleTime: 1000 * 60 * 10,
  });

  const { data: finConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['financialConfig'],
    queryFn: api.financial.getConfig,
    staleTime: 1000 * 60 * 10,
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['scheduling'],
    queryFn: api.scheduling.list,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = isLoadingQuotes || isLoadingCustomers || isLoadingProducts || isLoadingCosts || isLoadingAssets || isLoadingConfig || isLoadingEvents;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-20 w-1/3 bg-white/5 rounded-xl mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <Skeleton className="h-64 rounded-3xl w-full" />
      </div>
    );
  }

  // --- CALCULATIONS ---
  // Ensure config defaults
  const config: FinancialConfig = finConfig || { productiveHoursPerMonth: 160, taxPercent: 0, commissionPercent: 0, targetProfitMargin: 20 };

  const totalGrossRevenue = quotes.filter(q => q.status !== 'draft').reduce((acc, q) => acc + q.totalAmount, 0);
  const taxesAmount = totalGrossRevenue * (config.taxPercent / 100);
  const commissionsAmount = totalGrossRevenue * (config.commissionPercent / 100);
  const totalFixedCosts = fixedCosts.reduce((acc, c) => acc + c.value, 0) + fixedAssets.reduce((acc, a) => acc + a.monthlyDepreciation, 0);

  // Net Profit "Proportion" (Rough estimation of free cash flow after all deductions)
  const netProfitProportion = totalGrossRevenue - taxesAmount - commissionsAmount - totalFixedCosts;

  const progressToBreakEven = totalFixedCosts > 0 ? Math.min(100, (totalGrossRevenue / totalFixedCosts) * 100) : 100;
  const isProfitable = totalGrossRevenue > (totalFixedCosts + taxesAmount + commissionsAmount);

  // --- INSIGHTS ---
  const pendingQuotes = quotes.filter(q => q.status === 'sent');
  const todayDate = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date.startsWith(todayDate));
  const lowStockProducts = products.filter(p => !p.isComposite && p.stock <= 10); // Low stock definition: < 10 units/meters

  const stats = [
    { label: 'Faturamento Bruto', value: `R$ ${totalGrossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]' },
    { label: 'Lucro Líquido Est.', value: `R$ ${Math.max(0, netProfitProportion).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Wallet, color: 'bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]' },
    { label: 'Custos + Impostos', value: `R$ ${(taxesAmount + commissionsAmount + totalFixedCosts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Percent, color: 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' },
    { label: 'Base de Clientes', value: customers.length, icon: Users, color: 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] text-inverse' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-primary tracking-tight uppercase neon-text">Dashboard <span className="text-cyan-400">Geral</span></h2>
          <p className="text-secondary font-medium mt-1">Visão geral do sistema <span className="text-cyan-400 font-bold neon-text">PHOCO</span>.</p>
        </div>
        <div className="w-full md:w-auto">
          <CommissionWidget currentUser={currentUser} />
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card p-4 lg:p-6 rounded-[2rem] shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 transform hover:-translate-y-1 group border border-white/5">
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white mb-4 transition-transform group-hover:scale-110`}>
              <stat.icon size={24} />
            </div>
            <p className="text-secondary text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-xl lg:text-2xl font-black text-primary mt-1 md:truncate">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Actionable Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Quotes Alert */}
        <div className="glass-card p-6 rounded-[2rem] border border-white/5 bg-gradient-to-br from-surface to-surface-hover hover:border-amber-500/30 transition-colors cursor-default relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><AlertCircle size={80} /></div>
          <h4 className="text-xs font-black uppercase text-amber-500 tracking-widest mb-2 flex items-center gap-2"><AlertCircle size={14} /> Atenção Necessária</h4>
          <p className="text-2xl font-black text-white">{pendingQuotes.length}</p>
          <p className="text-sm text-secondary font-medium">Orçamentos Pendentes</p>
          <div className="mt-4 flex -space-x-2 overflow-hidden">
            {pendingQuotes.slice(0, 3).map((q, i) => (
              <div key={q.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-surface bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                {customers.find(c => c.id === q.customerId)?.name.charAt(0)}
              </div>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="glass-card p-6 rounded-[2rem] border border-white/5 bg-gradient-to-br from-surface to-surface-hover hover:border-cyan-500/30 transition-colors cursor-default relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Calendar size={80} /></div>
          <h4 className="text-xs font-black uppercase text-cyan-400 tracking-widest mb-2 flex items-center gap-2"><Calendar size={14} /> Agenda Hoje</h4>
          <p className="text-2xl font-black text-white">{todayEvents.length}</p>
          <p className="text-sm text-secondary font-medium">Compromissos Agendados</p>
          <ul className="mt-4 space-y-1">
            {todayEvents.slice(0, 2).map(e => (
              <li key={e.id} className="text-xs text-zinc-400 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> {e.date.split('T')[1].substring(0, 5)} - {e.title}
              </li>
            ))}
            {todayEvents.length === 0 && <li className="text-xs text-zinc-600 italic">Nenhum compromisso hoje.</li>}
          </ul>
        </div>

        {/* Break Even Mini Status */}
        <div className="glass-card p-6 rounded-[2rem] border border-white/5 bg-gradient-to-br from-surface to-surface-hover relative overflow-hidden">
          <h4 className="text-xs font-black uppercase text-indigo-400 tracking-widest mb-2 flex items-center gap-2"><TrendingUp size={14} /> Meta Mensal</h4>
          <div className="flex items-end gap-2">
            <p className={`text-2xl font-black ${isProfitable ? 'text-emerald-400' : 'text-zinc-300'}`}>{progressToBreakEven.toFixed(0)}%</p>
            <span className="text-xs text-secondary mb-1">do Ponto de Equilíbrio</span>
          </div>
          <div className="w-full bg-black/20 h-2 rounded-full mt-3 overflow-hidden">
            <div className={`h-full ${isProfitable ? 'bg-emerald-500' : 'bg-indigo-500'} transition-all duration-1000`} style={{ width: `${progressToBreakEven}%` }}></div>
          </div>
          <p className="text-[10px] text-zinc-500 mt-3 text-right">
            Meta: {totalFixedCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
          </p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="glass-card p-6 rounded-[2rem] border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors animate-in slide-in-from-bottom-4">
          <h4 className="text-xs font-black uppercase text-rose-500 tracking-widest mb-4 flex items-center gap-2"><AlertCircle size={14} /> Alerta de Estoque Baixo</h4>
          <div className="space-y-3">
            {lowStockProducts.slice(0, 3).map(p => (
              <div key={p.id} className="flex justify-between items-center bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/10">
                <div>
                  <p className="font-bold text-white text-sm">{p.name}</p>
                  <p className="text-[10px] text-rose-300 font-bold uppercase">{p.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-rose-400 text-lg">{p.stock} <span className="text-[10px]">{p.unitType}</span></p>
                  <p className="text-[9px] text-rose-300/70 uppercase font-bold">Crítico</p>
                </div>
              </div>
            ))}
            {lowStockProducts.length > 3 && (
              <p className="text-center text-[10px] text-rose-400 font-bold uppercase tracking-widest pt-2">
                + {lowStockProducts.length - 3} itens em falta
              </p>
            )}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="animate-slide-up">
        <RevenueChart quotes={quotes} />
      </div>

      {/* Recent Activity & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-lg border border-white/5">
          <div className="p-6 lg:p-8 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-black text-primary text-lg uppercase tracking-widest flex items-center gap-2">
              <Printer size={20} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
              Últimos Orçamentos
            </h3>
          </div>
          <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
            {quotes.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((quote) => {
              const customer = customers.find(c => c.id === quote.customerId);
              return (
                <div key={quote.id} className="p-4 lg:p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1 mr-4">
                    <div className="w-10 h-10 bg-surface/50 rounded-xl flex items-center justify-center font-black text-cyan-400 uppercase shadow-inner shrink-0 border border-white/5">
                      {customer?.name.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-primary truncate group-hover:text-white transition-colors">{customer?.name || 'Cliente Removido'}</p>
                      <p className="text-[10px] text-secondary font-bold uppercase">{new Date(quote.date).toLocaleDateString()} • {quote.status}</p>
                    </div>
                  </div>
                  <span className="font-black text-inverse bg-cyan-400 px-3 py-1 rounded-full text-xs shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                    R$ {quote.totalAmount.toFixed(2)}
                  </span>
                </div>
              );
            })}
            {quotes.length === 0 && <div className="p-8 text-center text-sm text-secondary">Nenhum orçamento encontrado.</div>}
          </div>
        </div>

        <TopProductsChart quotes={quotes} products={products} />
      </div>
    </div>
  );
};

export default Dashboard;
