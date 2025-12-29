
import React from 'react';
import { Quote, QuoteStatus, Customer } from '../types';
import { Clock, Scissors, CheckCircle, Truck, AlertCircle } from 'lucide-react';
import { api } from '../src/services/api';

interface ProductionBoardProps {
  quotes: Quote[];
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  customers: Customer[];
}

const ProductionBoard: React.FC<ProductionBoardProps> = ({ quotes, setQuotes, customers }) => {
  // O Board de produção agora só mostra o que passou do estágio comercial
  const columns: { id: QuoteStatus; label: string; icon: any; color: string }[] = [
    { id: 'production', label: 'Em Produção', icon: Scissors, color: 'text-indigo-500' },
    { id: 'finished', label: 'Acabamento/Finalizado', icon: CheckCircle, color: 'text-emerald-500' },
    { id: 'delivered', label: 'Entregue/Despachado', icon: Truck, color: 'text-slate-500' },
  ];

  const updateStatus = async (quoteId: string, newStatus: QuoteStatus) => {
    try {
      const quote = quotes.find(q => q.id === quoteId);
      if (quote) {
        await api.quotes.update({ ...quote, status: newStatus });
        setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
      }
    } catch (error) {
      console.error("Error updating quote status:", error);
      alert("Erro ao atualizar status.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Fluxo de Produção</h2>
          <p className="text-xs text-brand-magenta font-bold uppercase tracking-widest mt-1">Gestão de Pedidos Confirmados</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 glass-card bg-white/50 px-4 py-2 rounded-xl border border-white/50">
          <AlertCircle size={16} className="text-brand-magenta" />
          {quotes.filter(q => q.status === 'production').length} em execução
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => (
          <div key={col.id} className="glass-card bg-slate-50/50 rounded-[2rem] p-4 flex flex-col min-h-[600px] border border-white/50">
            <div className="flex items-center gap-2 mb-4 px-3 py-2">
              <col.icon size={18} className={col.color.replace('indigo-500', 'text-brand-cyan')} />
              <h3 className="font-black text-slate-700 text-[11px] uppercase tracking-wider">{col.label}</h3>
              <span className="ml-auto bg-white/50 px-3 py-1 rounded-lg text-[10px] font-black text-slate-400 border border-white/50 shadow-sm">
                {quotes.filter(q => q.status === col.id).length}
              </span>
            </div>

            <div className="space-y-4">
              {quotes.filter(q => q.status === col.id).map(quote => {
                const customer = customers.find(c => c.id === quote.customerId);
                return (
                  <div key={quote.id} className="bg-white/80 p-5 rounded-2xl shadow-sm border border-white/60 hover:shadow-lg hover:border-brand-cyan/20 transition-all group cursor-move">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[9px] font-black text-brand-cyan bg-cyan-50 px-2 py-1 rounded-lg uppercase">#{quote.id.slice(-4)}</span>
                      <p className="text-[9px] text-slate-400 font-bold">{new Date(quote.date).toLocaleDateString()}</p>
                    </div>
                    <p className="font-black text-slate-800 text-xs uppercase mb-1">{customer?.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium mb-4 line-clamp-1">
                      {quote.items.length} item(s) • R$ {quote.totalAmount.toLocaleString('pt-BR')}
                    </p>

                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      <select
                        value={quote.status}
                        onChange={(e) => updateStatus(quote.id, e.target.value as QuoteStatus)}
                        className="text-[9px] font-black uppercase tracking-widest border border-slate-100 bg-slate-50/50 rounded-xl py-2 px-3 focus:ring-1 focus:ring-brand-cyan outline-none w-full cursor-pointer hover:bg-white transition-colors"
                      >
                        <option value="negotiating">Voltar Negociação</option>
                        <option value="production">Em Produção</option>
                        <option value="finished">Finalizar</option>
                        <option value="delivered">Entregar</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductionBoard;
