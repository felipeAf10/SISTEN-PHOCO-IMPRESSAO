
import React from 'react';
import { X, Calculator, Info, Check, RefreshCcw, ClipboardCheck, ArrowRight } from 'lucide-react';
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

   // Cálculos de Indicadores baseados na referência
   const materialCost = items.reduce((acc, item) => {
      // Simulando custo de material (aprox 40% do preço de venda para fins de exemplo visual se o custo não estiver no item)
      return acc + (item.subtotal * 0.4);
   }, 0);

   const laborCost = items.reduce((acc, item) => {
      // Simulando custo de mão de obra (aprox 20% do preço de venda)
      return acc + (item.subtotal * 0.2);
   }, 0);

   const taxesAmount = total * (config.taxPercent / 100);
   const commissionAmount = total * (config.commissionPercent / 100);
   const totalSalesCosts = taxesAmount + commissionAmount;

   const profitAmount = total * (config.targetProfitMargin / 100);
   const vmc = total - totalSalesCosts; // Valor de Margem de Contribuição

   // Dados para Gráficos de Pizza (SVG)
   const prodCostTotal = materialCost + laborCost;
   const matPercent = prodCostTotal > 0 ? (materialCost / prodCostTotal) * 100 : 0;
   const labPercent = prodCostTotal > 0 ? (laborCost / prodCostTotal) * 100 : 0;

   const handleRecalculate = () => {
      // Logic to visually simulate recalculation or call a parent function if provided
      alert("Recálculo realizado com sucesso! (Simulado)");
   };

   const handleChecklist = () => {
      setShowChecklist(true);
   };

   return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
         <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] relative">

            {/* Checklist Overlay */}
            {showChecklist && (
               <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                     <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                           <ClipboardCheck className="text-indigo-600" size={24} />
                           Checklist de Validação
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Confirme os itens antes de salvar</p>
                     </div>
                     <button onClick={() => setShowChecklist(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 p-2 rounded-full">
                        <X size={24} />
                     </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-12">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {checklistItems.map((item) => (
                           <button
                              key={item.id}
                              onClick={() => toggleCheck(item.id)}
                              className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 group flex items-start gap-4 ${checkedItems[item.id] ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}
                           >
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${checkedItems[item.id] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                                 {checkedItems[item.id] && <Check size={14} strokeWidth={4} />}
                              </div>
                              <div>
                                 <h4 className={`font-bold text-sm uppercase mb-1 transition-colors ${checkedItems[item.id] ? 'text-emerald-900' : 'text-slate-700'}`}>{item.label}</h4>
                                 <p className="text-[10px] font-medium text-slate-400">Clique para marcar como verificado</p>
                              </div>
                           </button>
                        ))}
                     </div>
                  </div>
                  <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end">
                     <button onClick={() => setShowChecklist(false)} className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                        Concluir Revisão
                     </button>
                  </div>
               </div>
            )}

            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-3">
                  <Calculator className="text-indigo-600" size={28} />
                  <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Custos & Indicadores <span className="text-indigo-500 font-normal">✨</span></h2>
               </div>
               <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={32} />
               </button>
            </div>

            {/* Tabs */}
            <div className="px-8 pt-4 border-b border-slate-100 flex gap-10">
               <button
                  onClick={() => setActiveTab('costs')}
                  className={`pb-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'costs' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
               >
                  Custos
               </button>
               <button
                  onClick={() => setActiveTab('measures')}
                  className={`pb-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'measures' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
               >
                  Medidas
               </button>
               <button
                  onClick={() => setActiveTab('indicators')}
                  className={`pb-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'indicators' ? 'border-b-4 border-indigo-600 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
               >
                  Indicadores
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

               {/* CONTENT: INDICADORES */}
               {activeTab === 'indicators' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     {/* KPI Cards */}
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm text-center">
                           <p className="text-xl font-black text-slate-800">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Valor de Venda</p>
                        </div>
                        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm text-center">
                           <p className="text-xl font-black text-emerald-500">{config.targetProfitMargin.toFixed(2)}%</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Lucro %</p>
                        </div>
                        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm text-center">
                           <p className="text-xl font-black text-emerald-600">R$ {profitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Lucro Líquido</p>
                        </div>
                        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm text-center">
                           <p className="text-xl font-black text-indigo-500">{(config.taxPercent + config.commissionPercent).toFixed(2)}%</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Impostos + Comis.</p>
                        </div>
                        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm text-center">
                           <p className="text-xl font-black text-slate-700">R$ {vmc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">VMC</p>
                        </div>
                        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm text-center">
                           <p className="text-xl font-black text-slate-400">0,00%</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">IRG</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Gráficos em Indicadores também para resumo visual */}
                        <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-center">
                           <div className="relative w-48 h-48">
                              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-indigo-100" strokeWidth="3"></circle>
                                 <circle cx="18" cy="18" r="16" fill="none" className="stroke-emerald-500" strokeWidth="3" strokeDasharray={`${config.targetProfitMargin} 100`} strokeLinecap="round"></circle>
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center flex-col">
                                 <span className="text-2xl font-black text-slate-800">{config.targetProfitMargin.toFixed(0)}%</span>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase">Margem Alvo</span>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <h3 className="font-black text-slate-800 text-sm uppercase">Resumo Financeiro</h3>
                           <div className="space-y-3">
                              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                 <span className="text-xs font-bold text-slate-500 uppercase">Custo Total</span>
                                 <span className="text-sm font-black text-slate-800">R$ {(total - profitAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                 <span className="text-xs font-bold text-emerald-600 uppercase">Lucro Previsto</span>
                                 <span className="text-sm font-black text-emerald-700">R$ {profitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                           <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm relative overflow-hidden">
                              <div className="flex justify-between items-center mb-6">
                                 <h3 className="font-black text-slate-800 text-sm uppercase">Preço Padrão de Venda</h3>
                                 <button className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1 hover:text-indigo-700 transition-colors"><Info size={12} /> Ver detalhes</button>
                              </div>
                              <div className="space-y-4">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Cálculo</p>
                                 <div className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold flex justify-between items-center text-slate-700">
                                    Por Margem
                                    <ArrowRight size={16} className="text-slate-300" />
                                 </div>
                              </div>
                           </div>

                           <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm">
                              <div className="flex justify-between items-center mb-6">
                                 <h3 className="font-black text-slate-800 text-sm uppercase">Impostos</h3>
                                 <button className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 hover:text-slate-600 transition-colors"><Info size={12} /> Gerenciar Impostos</button>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Imposto Aplicado</p>
                                    <div className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs transition-all">Venda de Produto</div>
                                 </div>
                                 <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Impostos (%)</p>
                                    <div className="w-full px-5 py-3 bg-slate-100 border border-slate-200 rounded-2xl font-black text-xs text-indigo-600">{config.taxPercent}%</div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Direita: Gráficos de Custos */}
                        <div className="space-y-8">
                           <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row gap-8 items-center">
                              <div className="relative w-40 h-40">
                                 <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-indigo-100" strokeWidth="4"></circle>
                                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-indigo-600" strokeWidth="4" strokeDasharray={`${matPercent} 100`} strokeLinecap="round"></circle>
                                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-amber-400" strokeWidth="4" strokeDasharray={`${labPercent} 100`} strokeDashoffset={`-${matPercent}`} strokeLinecap="round"></circle>
                                 </svg>
                                 <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className="text-sm font-black text-slate-800">100%</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Produtivos</span>
                                 </div>
                              </div>
                              <div className="flex-1 space-y-4">
                                 <h3 className="font-black text-slate-800 text-sm uppercase">Custos Produtivos</h3>
                                 <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                       <div className="w-3 h-3 bg-indigo-600 rounded-full" />
                                       <div className="flex-1">
                                          <p className="text-[9px] font-black text-slate-400 uppercase">Matéria Prima</p>
                                          <p className="text-xs font-bold text-slate-800">R$ {materialCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                       </div>
                                       <span className="text-[10px] font-black text-indigo-600">{matPercent.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <div className="w-3 h-3 bg-amber-400 rounded-full" />
                                       <div className="flex-1">
                                          <p className="text-[9px] font-black text-slate-400 uppercase">Mão de Obra</p>
                                          <p className="text-xs font-bold text-slate-800">R$ {laborCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                       </div>
                                       <span className="text-[10px] font-black text-amber-500">{labPercent.toFixed(1)}%</span>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row gap-8 items-center">
                              <div className="relative w-40 h-40">
                                 <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-blue-100" strokeWidth="4"></circle>
                                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-blue-600" strokeWidth="4" strokeDasharray="100 100" strokeLinecap="round"></circle>
                                 </svg>
                                 <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className="text-sm font-black text-slate-800">100%</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Venda</span>
                                 </div>
                              </div>
                              <div className="flex-1 space-y-4">
                                 <h3 className="font-black text-slate-800 text-sm uppercase">Custos de Venda</h3>
                                 <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                       <div className="w-3 h-3 bg-blue-600 rounded-full" />
                                       <div className="flex-1">
                                          <p className="text-[9px] font-black text-slate-400 uppercase">Impostos</p>
                                          <p className="text-xs font-bold text-slate-800">R$ {taxesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <div className="w-3 h-3 bg-slate-200 rounded-full" />
                                       <div className="flex-1">
                                          <p className="text-[9px] font-black text-slate-400 uppercase">Comissões</p>
                                          <p className="text-xs font-bold text-slate-800">R$ {commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* CONTENT: MEDIDAS */}
               {activeTab === 'measures' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                     <div className="glass-card bg-white/50 border border-slate-100 rounded-3xl overflow-hidden p-6">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="border-b border-slate-100">
                                 <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto / Item</th>
                                 <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dimensões</th>
                                 <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qtd</th>
                                 <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Subtotal</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {items.map((item, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 text-xs font-bold text-slate-800">{item.productName}</td>
                                    <td className="py-4 text-xs text-slate-500 font-medium">
                                       {item.width ? `${item.width}m` : '-'} {item.height ? `x ${item.height}m` : ''}
                                       {!item.width && !item.height && 'N/A'}
                                    </td>
                                    <td className="py-4 text-xs font-bold text-slate-800">{item.quantity}</td>
                                    <td className="py-4 text-xs font-bold text-brand-cyan text-right">R$ {item.subtotal.toFixed(2)}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                        {items.length === 0 && <p className="text-center py-10 text-slate-400 text-xs font-medium">Nenhum item adicionado.</p>}
                     </div>
                  </div>
               )}

            </div>

            {/* Footer Actions */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/80 flex flex-wrap gap-4 justify-end shrink-0">
               <button onClick={onClose} className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all active:scale-95">Sair</button>
               <button onClick={handleChecklist} className="px-8 py-4 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50 flex items-center gap-2 transition-all active:scale-95">
                  <ClipboardCheck size={16} /> Checklist
               </button>
               <button onClick={handleRecalculate} className="px-8 py-4 bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95">
                  <RefreshCcw size={16} /> Recalcular
               </button>
               <button
                  onClick={onSave}
                  disabled={isSaving}
                  className={`px-12 py-4 bg-gradient-to-br from-[#00899B] to-[#007685] hover:from-[#00a2b5] hover:to-[#00899B] text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl shadow-cyan-500/25 transition-all active:scale-[0.98] ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
               >
                  {isSaving ? <RefreshCcw size={18} className="animate-spin" /> : <Check size={18} />}
                  {isSaving ? 'Salvando...' : 'Salvar Orçamento'}
               </button>
            </div>
         </div>
      </div>
   );
};

export default IndicatorPanel;
