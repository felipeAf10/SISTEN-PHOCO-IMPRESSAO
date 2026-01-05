import React from 'react';
import { X, Calculator, Info, Check, RefreshCcw, ClipboardCheck, ArrowRight, Save, Loader2, Gauge, TrendingUp, PieChart as PieIcon, Coins } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { QuoteItem, Product, FinancialConfig } from '../types';

interface IndicatorPanelProps {
   items: (QuoteItem & { productName: string })[];
   total: number;
   designFee: number;
   installFee: number;
   config: FinancialConfig;
   onClose: () => void;
   onSave: () => void;
   isSaving?: boolean;
}

const IndicatorPanel: React.FC<IndicatorPanelProps> = ({ items, total, designFee, installFee, config, onClose, onSave, isSaving = false }) => {
   const [activeTab, setActiveTab] = React.useState<'costs' | 'measures' | 'indicators'>('indicators');
   const [showChecklist, setShowChecklist] = React.useState(false);
   const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});

   const checklistItems = [
      { id: 'measurements', label: 'Conferir Medidas Finais' },
      { id: 'material', label: 'Confirmar Tipo de Material' },
      { id: 'files', label: 'Validar Arquivos de Impressão' },
      { id: 'finishing', label: 'Acabamentos e Laminação' },
      { id: 'install', label: 'Agendamento de Instalação' },
      { id: 'payment', label: 'Condições de Pagamento' },
   ];

   const toggleCheck = (id: string) => {
      setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
   };

   // Cálculos de Indicadores
   const materialCost = items.reduce((acc, item) => {
      // Simulação de custo de material se não disponível
      return acc + (item.subtotal * 0.4);
   }, 0);

   const laborCost = items.reduce((acc, item) => {
      // Real Calculation: (Time (min) / 60) * Hourly Rate
      // If product has defined time, use it. Else fall back to 20% simulation.
      const timeInHours = (item.productionTime || 15) / 60; // Default 15 min if unknown
      const costReal = timeInHours * (config.hourlyRate || 0);

      // If costReal is 0 (no rate set), fallback to old 20% rule
      return acc + (costReal > 0 ? costReal : (item.subtotal * 0.2));
   }, 0);

   const taxesAmount = total * (config.taxPercent / 100);
   const commissionAmount = total * (config.commissionPercent / 100);
   const totalSalesCosts = taxesAmount + commissionAmount;

   const profitAmount = total * (config.targetProfitMargin / 100);
   const vmc = total - totalSalesCosts; // Valor de Margem de Contribuição

   // Dados para Gráficos
   const prodCostTotal = materialCost + laborCost;

   const handleChecklist = () => {
      setShowChecklist(true);
   };

   return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
         <div className="glass-card w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] relative bg-surface border border-white/10 text-primary">

            {/* Checklist Overlay */}
            {showChecklist && (
               <div className="absolute inset-0 z-50 bg-surface backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500">
                  <div className="p-8 border-b border-white/10 flex justify-between items-center">
                     <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 text-white">
                           <ClipboardCheck className="text-emerald-400" size={24} />
                           Checklist de Validação
                        </h2>
                        <p className="text-xs font-bold text-secondary uppercase tracking-widest mt-1">Confirme os itens antes de salvar</p>
                     </div>
                     <button onClick={() => setShowChecklist(false)} className="text-secondary hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                        <X size={24} />
                     </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-12">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {checklistItems.map((item) => (
                           <button
                              key={item.id}
                              onClick={() => toggleCheck(item.id)}
                              className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 group flex items-start gap-4 ${checkedItems[item.id] ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/5 hover:border-emerald-500/30 hover:bg-white/5'}`}
                           >
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${checkedItems[item.id] ? 'bg-emerald-500 border-emerald-500 text-surface' : 'border-secondary text-transparent group-hover:border-emerald-500/50'}`}>
                                 {checkedItems[item.id] && <Check size={14} strokeWidth={4} />}
                              </div>
                              <div>
                                 <h4 className={`font-bold text-sm uppercase mb-1 transition-colors ${checkedItems[item.id] ? 'text-emerald-400' : 'text-primary'}`}>{item.label}</h4>
                                 <p className="text-[10px] font-medium text-secondary">Clique para marcar como verificado</p>
                              </div>
                           </button>
                        ))}
                     </div>
                  </div>
                  <div className="p-8 border-t border-white/10 bg-surface-active flex justify-end">
                     <button onClick={() => setShowChecklist(false)} className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                        Concluir Revisão
                     </button>
                  </div>
               </div>
            )}

            {/* Header */}
            <div className="p-8 border-b border-white/10 flex justify-between items-center bg-surface-active">
               <div className="flex items-center gap-3">
                  <Calculator className="text-indigo-400" size={28} />
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight">Custos & Indicadores <span className="text-indigo-500 font-normal">✨</span></h2>
               </div>
               <button onClick={onClose} className="text-secondary hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                  <X size={32} />
               </button>
            </div>

            {/* Tabs */}
            <div className="px-8 pt-4 border-b border-white/5 flex gap-10 bg-surface-hover/30">
               <button
                  onClick={() => setActiveTab('costs')}
                  className={`pb-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'costs' ? 'border-b-4 border-indigo-500 text-indigo-400' : 'text-secondary hover:text-primary'}`}
               >
                  Custos
               </button>
               <button
                  onClick={() => setActiveTab('measures')}
                  className={`pb-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'measures' ? 'border-b-4 border-indigo-500 text-indigo-400' : 'text-secondary hover:text-primary'}`}
               >
                  Medidas
               </button>
               <button
                  onClick={() => setActiveTab('indicators')}
                  className={`pb-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'indicators' ? 'border-b-4 border-indigo-500 text-indigo-400' : 'text-secondary hover:text-primary'}`}
               >
                  Indicadores
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-surface/50">

               {/* CONTENT: INDICADORES */}
               {activeTab === 'indicators' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     {/* KPI Cards */}
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="glass-card bg-surface-hover/40 p-5 rounded-2xl shadow-sm border border-white/5 text-center">
                           <p className="text-xl font-black text-white">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           <p className="text-[10px] font-bold text-secondary uppercase mt-1">Valor de Venda</p>
                        </div>
                        <div className="glass-card bg-surface-hover/40 p-5 rounded-2xl shadow-sm border border-white/5 text-center">
                           <p className="text-xl font-black text-emerald-400">{config.targetProfitMargin.toFixed(2)}%</p>
                           <p className="text-[10px] font-bold text-secondary uppercase mt-1">Lucro %</p>
                        </div>
                        <div className="glass-card bg-surface-hover/40 p-5 rounded-2xl shadow-sm border border-white/5 text-center">
                           <p className="text-xl font-black text-emerald-500">R$ {profitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           <p className="text-[10px] font-bold text-secondary uppercase mt-1">Lucro Líquido</p>
                        </div>
                        <div className="glass-card bg-surface-hover/40 p-5 rounded-2xl shadow-sm border border-white/5 text-center">
                           <p className="text-xl font-black text-indigo-400">{(config.taxPercent + config.commissionPercent).toFixed(2)}%</p>
                           <p className="text-[10px] font-bold text-secondary uppercase mt-1">Impostos + Comis.</p>
                        </div>
                        <div className="glass-card bg-surface-hover/40 p-5 rounded-2xl shadow-sm border border-white/5 text-center">
                           <p className="text-xl font-black text-primary">R$ {vmc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           <p className="text-[10px] font-bold text-secondary uppercase mt-1">VMC</p>
                        </div>
                        <div className="glass-card bg-surface-hover/40 p-5 rounded-2xl shadow-sm border border-white/5 text-center">
                           <p className="text-xl font-black text-secondary">0,00%</p>
                           <p className="text-[10px] font-bold text-secondary uppercase mt-1">IRG</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Gráfico de Margem Alvo */}
                        <div className="glass-card bg-surface-hover/20 border border-white/5 p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-center">
                           <div className="relative w-48 h-48">
                              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-surface-hover" strokeWidth="3"></circle>
                                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-emerald-500" strokeWidth="3" strokeDasharray={`${config.targetProfitMargin} 100`} strokeLinecap="round"></circle>
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center flex-col">
                                 <span className="text-2xl font-black text-white">{config.targetProfitMargin.toFixed(0)}%</span>
                                 <span className="text-[9px] font-bold text-secondary uppercase">Margem Alvo</span>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <h3 className="font-black text-secondary text-sm uppercase flex items-center gap-2"><PieIcon size={16} /> Resumo Financeiro</h3>
                           <div className="space-y-3">
                              <div className="flex justify-between items-center bg-surface-hover/50 p-4 rounded-xl border border-white/5">
                                 <span className="text-xs font-bold text-secondary uppercase">Custo Total</span>
                                 <span className="text-sm font-black text-primary">R$ {(total - profitAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                                 <span className="text-xs font-bold text-emerald-400 uppercase">Lucro Previsto</span>
                                 <span className="text-sm font-black text-emerald-300">R$ {profitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* CONTENT: CUSTOS */}
               {activeTab === 'costs' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Esquerda: Preço Padrão e Impostos */}
                        <div className="space-y-8">
                           <div className="glass-card bg-surface-hover/20 border border-white/5 p-8 rounded-[2rem] relative overflow-hidden">
                              <div className="flex justify-between items-center mb-6">
                                 <h3 className="font-black text-secondary text-sm uppercase flex items-center gap-2"><TrendingUp size={16} /> Preço Padrão de Venda</h3>
                                 <button className="text-[9px] font-black text-indigo-400 uppercase flex items-center gap-1 hover:text-indigo-300 transition-colors"><Info size={12} /> Ver detalhes</button>
                              </div>
                              <div className="space-y-4">
                                 <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Tipo de Cálculo</p>
                                 <div className="w-full px-5 py-3.5 bg-surface-active/50 border border-white/10 rounded-2xl font-bold flex justify-between items-center text-secondary">
                                    Por Margem
                                    <ArrowRight size={16} className="text-secondary" />
                                 </div>
                              </div>
                           </div>

                           <div className="glass-card bg-surface-hover/20 border border-white/5 p-8 rounded-[2rem]">
                              <div className="flex justify-between items-center mb-6">
                                 <h3 className="font-black text-secondary text-sm uppercase flex items-center gap-2"><Coins size={16} /> Impostos</h3>
                                 <button className="text-[9px] font-black text-secondary uppercase flex items-center gap-1 hover:text-primary transition-colors"><Info size={12} /> Gerenciar Impostos</button>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Imposto Aplicado</p>
                                    <div className="w-full px-5 py-3 bg-surface-active/50 border border-white/10 rounded-2xl font-bold text-xs transition-all text-secondary">Venda de Produto</div>
                                 </div>
                                 <div className="space-y-2">
                                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Total Impostos (%)</p>
                                    <div className="w-full px-5 py-3 bg-surface-active/50 border border-white/10 rounded-2xl font-black text-xs text-indigo-400">{config.taxPercent}%</div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Direita: Gráficos de Custos (Placeholder) */}
                        <div className="glass-card bg-surface-hover/20 border border-white/5 p-8 rounded-[2rem] flex flex-col items-center h-full">
                           <h3 className="font-black text-secondary text-sm uppercase flex items-center gap-2 mb-4 w-full"><PieIcon size={16} /> Detalhamento de Custos</h3>
                           <div className="w-full h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                 <PieChart>
                                    <Pie
                                       data={[
                                          { name: 'Material', value: materialCost, fill: '#10b981' }, // Emerald-500
                                          { name: 'Mão de Obra', value: laborCost, fill: '#3b82f6' }, // Blue-500
                                          { name: 'Impostos', value: taxesAmount, fill: '#f59e0b' }, // Amber-500
                                          { name: 'Comissão', value: commissionAmount, fill: '#8b5cf6' }, // Violet-500
                                          { name: 'Lucro Líquido', value: profitAmount, fill: '#06b6d4' } // Cyan-500
                                       ]}
                                       cx="50%"
                                       cy="50%"
                                       innerRadius={60}
                                       outerRadius={80}
                                       paddingAngle={5}
                                       dataKey="value"
                                    >
                                       <Cell key="cell-0" fill="#10b981" />
                                       <Cell key="cell-1" fill="#3b82f6" />
                                       <Cell key="cell-2" fill="#f59e0b" />
                                       <Cell key="cell-3" fill="#8b5cf6" />
                                       <Cell key="cell-4" fill="#06b6d4" />
                                    </Pie>
                                    <Tooltip
                                       contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                       itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: 'bold' }}
                                       formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                    />
                                    <Legend
                                       verticalAlign="bottom"
                                       height={36}
                                       iconType="circle"
                                       formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{value}</span>}
                                    />
                                 </PieChart>
                              </ResponsiveContainer>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* CONTENT: MEDIDAS */}
               {activeTab === 'measures' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
                     <div className="bg-surface-hover/30 rounded-2xl p-6 border border-white/5">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr>
                                 <th className="p-3 text-[10px] font-black text-secondary uppercase tracking-widest border-b border-white/5">Item / Produto</th>
                                 <th className="p-3 text-[10px] font-black text-secondary uppercase tracking-widest border-b border-white/5 text-right">Larg. (m)</th>
                                 <th className="p-3 text-[10px] font-black text-secondary uppercase tracking-widest border-b border-white/5 text-right">Alt. (m)</th>
                                 <th className="p-3 text-[10px] font-black text-secondary uppercase tracking-widest border-b border-white/5 text-right">Área (m²)</th>
                                 <th className="p-3 text-[10px] font-black text-secondary uppercase tracking-widest border-b border-white/5 text-right">Qtd</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                              {items.map((item, idx) => (
                                 <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 text-xs font-bold text-white">{item.productName}</td>
                                    <td className="p-3 text-xs font-mono text-secondary text-right">{(item.width || 0).toFixed(2)}</td>
                                    <td className="p-3 text-xs font-mono text-secondary text-right">{(item.height || 0).toFixed(2)}</td>
                                    <td className="p-3 text-xs font-mono text-secondary text-right">{((item.width || 0) * (item.height || 0)).toFixed(2)}</td>
                                    <td className="p-3 text-xs font-mono text-secondary text-right">{item.quantity}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

            </div>

            {/* Footer / Actions */}
            <div className="p-8 border-t border-white/10 bg-surface-active flex justify-between items-center shrink-0">
               <div className="flex gap-4">
                  <button onClick={handleChecklist} className="px-6 py-4 bg-surface-hover text-secondary border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-surface-hover hover:text-white transition-all shadow-lg flex items-center gap-3">
                     <ClipboardCheck size={16} /> Checklist
                  </button>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => alert('Recalculando...')} className="px-6 py-4 text-indigo-400 font-black uppercase text-[10px] tracking-widest hover:text-indigo-300 transition-colors flex items-center gap-2">
                     <RefreshCcw size={16} /> Recalcular
                  </button>
                  <button onClick={onSave} disabled={isSaving} className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                     {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                     {isSaving ? 'Salvando...' : 'Salvar Orçamento'}
                  </button>
               </div>
            </div>

         </div>
      </div>
   );
};

export default IndicatorPanel;
