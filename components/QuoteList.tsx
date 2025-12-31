
import React, { useState, useMemo } from 'react';
import { Quote, Customer, Product, QuoteStatus, User } from '../types';
import {
  Search, Filter, Calendar, DollarSign, MessageSquare, Copy, Trash2,
  Check, Loader2, Plus, FileText, ChevronDown, List, LayoutGrid
} from 'lucide-react';
import { generateSalesPitch } from '../services/geminiService';
import { api } from '../src/services/api';

interface QuoteListProps {
  quotes: Quote[];
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  customers: Customer[];
  products: Product[];
  onNewQuote: () => void;
  initialSearch?: string;
  currentUser: User;
}

const QuoteList: React.FC<QuoteListProps> = ({ quotes, setQuotes, customers, products, onNewQuote, initialSearch = '', currentUser }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lógica de filtragem
  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      const customer = customers.find(c => c.id === q.customerId);
      const matchesSearch = customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) || q.id.includes(searchTerm);
      return matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [quotes, customers, searchTerm]);

  // Cálculos para o Painel de Negociação
  const negotiationStats = useMemo(() => {
    const stats = {
      draft: { total: 0, count: 0, label: 'Rascunhos' },
      sent: { total: 0, count: 0, label: 'Enviados' },
      negotiating: { total: 0, count: 0, label: 'Em Negociação' },
      confirmed: { total: 0, count: 0, label: 'Aceite Verbal' },
      // Added label to totalBoard to ensure consistent property access in the UI loop below
      totalBoard: { total: 0, count: 0, label: 'Total' }
    };

    quotes.forEach(q => {
      if (['draft', 'sent', 'negotiating', 'confirmed'].includes(q.status)) {
        const s = q.status as keyof typeof stats;
        if (stats[s]) {
          stats[s].total += q.totalAmount;
          stats[s].count += 1;
        }
        stats.totalBoard.total += q.totalAmount;
        stats.totalBoard.count += 1;
      }
    });

    return stats;
  }, [quotes]);

  const handleStatusChange = async (id: string, newStatus: QuoteStatus) => {
    try {
      const quote = quotes.find(q => q.id === id);
      if (quote) {
        // Se mudou para confirmado, dar baixa no estoque
        if (newStatus === 'confirmed' && quote.status !== 'confirmed') {
          const confirmData = confirm("Deseja dar baixa automática no estoque dos materiais deste orçamento?");
          if (confirmData) {
            for (const item of quote.items) {
              const qtyToDeduct = item.quantity * (item.width && item.height ? (item.width * item.height) : 1);
              // Deduct the calculated quantity (Area or Count)
              // If unitType is 'm2' or 'ml', this subtracts area/length. If 'un', subtracts count.
              await api.products.updateStock(item.productId, qtyToDeduct);
            }
            alert("Estoque atualizado com sucesso!");
          }
        }

        await api.quotes.update({ ...quote, status: newStatus });
        setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
      }
    } catch (error) {
      console.error("Error updating quote status:", error);
      alert("Erro ao atualizar status.");
    }
  };

  const handleCopyPitch = async (quote: Quote) => {
    const customer = customers.find(c => c.id === quote.customerId);
    if (!customer) return;
    setLoadingId(quote.id);
    const itemsForPitch = quote.items.map(item => ({
      ...item,
      productName: products.find(p => p.id === item.productId)?.name || 'Produto'
    }));
    // Fixed: added currentUser.name as the 7th argument
    const pitch = await generateSalesPitch(customer, itemsForPitch, quote.totalAmount, quote.designFee, quote.installFee, quote.deadlineDays, currentUser.name);
    await navigator.clipboard.writeText(pitch);
    setLoadingId(null);
    setCopiedId(quote.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendWhatsApp = async (quote: Quote) => {
    const customer = customers.find(c => c.id === quote.customerId);
    if (!customer) return;
    setLoadingId(quote.id);
    const itemsForPitch = quote.items.map(item => ({
      ...item,
      productName: products.find(p => p.id === item.productId)?.name || 'Produto'
    }));
    // Fixed: added currentUser.name as the 7th argument
    const pitch = await generateSalesPitch(customer, itemsForPitch, quote.totalAmount, quote.designFee, quote.installFee, quote.deadlineDays, currentUser.name);
    const phone = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(pitch)}`, '_blank');
    if (quote.status === 'draft') handleStatusChange(quote.id, 'sent');
    setLoadingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header do Painel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-50 flex items-center gap-2 neon-text">
            Painel de Negociação <span className="text-slate-600 font-normal">|</span>
            <span className="text-cyan-400 font-bold text-sm">R$ {negotiationStats.totalBoard.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em {negotiationStats.totalBoard.count} Negócios</span>
          </h2>
          <p className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest mt-1 neon-text">CRM / Painel de Negociação</p>
        </div>
      </div>

      {/* Toolbar de Ações */}
      <div className="glass-card p-4 rounded-2xl shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por cliente ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-cyan-500/50 outline-none text-sm font-medium text-slate-100 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 border-l border-slate-700 pl-4 h-10">
          <button className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-cyan-400 hover:shadow-md transition-all">
            <LayoutGrid size={18} />
          </button>
          <button className="p-2 bg-transparent text-slate-600 rounded-lg hover:bg-slate-800 transition-colors">
            <List size={18} />
          </button>
        </div>

        <select className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm font-bold text-slate-300 outline-none transition-all focus:ring-2 focus:ring-cyan-500/50 shadow-sm hover:text-white">
          <option>Orçamentos</option>
          <option>Pedidos</option>
        </select>

        <button onClick={onNewQuote} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all active:scale-95 ml-auto border border-fuchsia-500/20">
          <Plus size={18} /> Novo Orçamento
        </button>
      </div>

      {/* Cards de Negociação (Summary) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['draft', 'sent', 'negotiating', 'confirmed'] as QuoteStatus[]).map((status) => {
          const s = status as keyof typeof negotiationStats;
          const stat = negotiationStats[s] || { total: 0, count: 0, label: status };

          return (
            <div key={status} className="glass-card p-4 rounded-2xl shadow-sm hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all cursor-default group">
              <p className="text-[11px] font-black text-slate-400 group-hover:text-slate-200 uppercase tracking-tight mb-1 transition-colors">{stat.label}</p>
              <p className="text-sm font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors neon-text">R$ {stat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-slate-500 group-hover:text-slate-400 font-bold uppercase transition-colors">{stat.count} Negócios</p>
            </div>
          );
        })}
        <div className="glass-card p-4 rounded-2xl shadow-sm flex flex-col justify-center opacity-50">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-tight mb-1">Emitidos</p>
          <p className="text-sm font-bold text-slate-600">R$ 0,00</p>
          <p className="text-[10px] text-slate-600 font-bold uppercase">0 Negócios</p>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="glass-card rounded-[2rem] overflow-hidden shadow-lg border border-white/5">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 border-b border-white/5">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedido</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estágio</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Total</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredQuotes.map(quote => {
              const customer = customers.find(c => c.id === quote.customerId);

              return (
                <tr key={quote.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="font-black text-cyan-400 text-sm">#{quote.id}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800/50 border border-white/5 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs uppercase shadow-inner">
                        {customer?.name.charAt(0)}
                      </div>
                      <p className="font-bold text-slate-200 text-xs uppercase group-hover:text-white transition-colors">{customer?.name}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                      <Calendar size={12} />
                      {new Date(quote.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <select
                      value={quote.status}
                      onChange={(e) => handleStatusChange(quote.id, e.target.value as QuoteStatus)}
                      className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-300 outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer transition-all shadow-sm hover:border-cyan-500/50"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="sent">Enviado</option>
                      <option value="negotiating">Em Negociação</option>
                      <option value="confirmed">Aceite Verbal</option>
                      <option value="production">Em Produção</option>
                      <option value="delivered">Entregue</option>
                    </select>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="font-black text-slate-100 text-sm">R$ {quote.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleSendWhatsApp(quote)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="WhatsApp"
                      >
                        {loadingId === quote.id ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                      </button>
                      <button
                        onClick={() => handleCopyPitch(quote)}
                        className="p-2 text-slate-400 hover:text-brand-cyan hover:bg-cyan-50 rounded-lg transition-all"
                        title="Copiar Texto"
                      >
                        {copiedId === quote.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Excluir este orçamento?')) {
                            try {
                              await api.quotes.delete(quote.id);
                              setQuotes(prev => prev.filter(q => q.id !== quote.id));
                            } catch (e) {
                              console.error(e);
                              alert('Erro ao excluir.');
                            }
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-brand-magenta hover:bg-pink-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredQuotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <FileText size={48} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-700 uppercase mb-2">Nenhum orçamento encontrado</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-[200px] leading-relaxed mb-6">
              Comece criando um novo projeto para seus clientes.
            </p>
            <button onClick={onNewQuote} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:border-brand-magenta hover:text-brand-magenta transition-all shadow-sm">
              Criar Primeiro Orçamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteList;
