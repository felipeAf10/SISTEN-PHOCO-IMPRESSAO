import React, { useState } from 'react';
// import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'; // Commented out in original
import { Quote, QuoteStatus } from '../types';
import { api } from '../services/api';
import { Loader2, Search, MessageSquare, Clock, Zap, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateMessage, openWhatsApp } from '../utils/whatsappTemplates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const SalesPipeline: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    // const [globalSearch, setGlobalSearch] = useState(''); // If we want local search

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

    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: api.products.list,
        staleTime: 1000 * 60 * 5,
    });

    // Helper map for customers
    const customersMap = React.useMemo(() => {
        const map: Record<string, { name: string, phone: string }> = {};
        customers.forEach(c => {
            map[c.id] = { name: c.name, phone: c.phone || '' };
        });
        return map;
    }, [customers]);

    // Optional: Mutation for stock deduction if we re-enable DnD
    const updateProductMutation = useMutation({
        mutationFn: api.products.update,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (e) => toast.error("Erro ao atualizar estoque: " + e)
    });

    // Logic for stock deduction (preserved but currently unused if DnD is off)
    const handleStockDeduction = async (quote: Quote) => {
        // ... (Logic preserved for future) ...
        // Needs separate mutation calls or a bulk update API. 
        // For now, leaving as a reference or TODO if user asks to enable DnD.
        // It requires logic to iterate items and call mutation.
    };

    const columns: { id: QuoteStatus; title: string; color: string }[] = [
        { id: 'draft', title: 'Rascunho', color: 'bg-gray-500/20 border-gray-500/50' },
        { id: 'sent', title: 'Enviado', color: 'bg-blue-500/20 border-blue-500/50' },
        { id: 'negotiating', title: 'Em Negociação', color: 'bg-amber-500/20 border-amber-500/50' },
        { id: 'confirmed', title: 'Fechado / Aprovado', color: 'bg-emerald-500/20 border-emerald-500/50' },
        { id: 'rejected', title: 'Perdido', color: 'bg-red-500/20 border-red-500/50' }
    ];

    const getColumnQuotes = (status: QuoteStatus) => quotes.filter(q => q.status === status);

    const isLoading = isLoadingQuotes || isLoadingCustomers;

    const getDaysInStatus = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-white" size={48} /></div>;

    return (
        <div className="h-[85vh] flex flex-col p-6 animate-in fade-in duration-500 text-white">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Pipeline de Vendas</h1>
                    <p className="text-secondary font-medium">Arraste os cards para atualizar o status das negociações.</p>
                </div>
                <button onClick={() => window.location.reload()} className="p-3 bg-surface-hover rounded-xl text-white hover:bg-surface-active transition-colors"><Search size={20} /></button>
            </div>

            {/* DragDropContext temporarily removed for debug/React 19 compat */}
            <div className="flex gap-4 overflow-x-auto pb-4 h-full">
                {columns.map(col => (
                    <div key={col.id} className={`flex-shrink-0 w-80 flex flex-col rounded-3xl border ${col.color} backdrop-blur-sm bg-surface/30`}>
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-black text-white uppercase tracking-wider text-sm">{col.title}</h3>
                            <span className="bg-black/40 px-2 py-1 rounded-lg text-xs font-bold text-white/70">{getColumnQuotes(col.id).length}</span>
                        </div>

                        <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                            {getColumnQuotes(col.id).map((quote) => {
                                const customer = customersMap[quote.customerId] || { name: 'Cliente Desconhecido', phone: '' };
                                return (
                                    <div
                                        key={quote.id}
                                        onClick={() => navigate(`/quotes/${quote.id}`)}
                                        className={`p-4 rounded-xl border border-white/10 bg-surface shadow-lg hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition-all cursor-pointer group relative overflow-hidden`}
                                    >
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-3xl -mr-4 -mt-4" />

                                        <div className="flex justify-between items-start mb-3 relative z-10">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">#{quote.id.slice(0, 6)}</span>
                                                <span className="font-bold text-white text-sm line-clamp-1">{customer.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {quote.status === 'sent' && getDaysInStatus(quote.date) >= 3 && (
                                                    <div title="Sem resposta há 3+ dias" className="bg-red-500/20 text-red-400 p-1.5 rounded-lg border border-red-500/30 animate-pulse">
                                                        <Clock size={14} />
                                                    </div>
                                                )}
                                                {quote.status === 'sent' && getDaysInStatus(quote.date) === 2 && (
                                                    <div title="Sem resposta há 2 dias" className="bg-amber-500/20 text-amber-400 p-1.5 rounded-lg border border-amber-500/30">
                                                        <Clock size={14} />
                                                    </div>
                                                )}
                                                {quote.status === 'delivered' && getDaysInStatus(quote.date) >= 15 && (
                                                    <div title="Pós-venda sugerido" className="bg-indigo-500/20 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/30">
                                                        <CheckCircle size={14} />
                                                    </div>
                                                )}
                                                {quote.stockDeducted && (
                                                    <div title="Estoque Baixado" className="bg-emerald-500/20 p-1.5 rounded-lg border border-emerald-500/30">
                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mb-4 relative z-10">
                                            <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/5">
                                                <span className="text-xs font-black text-white">
                                                    {quote.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 font-medium">
                                                {new Date(quote.date).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 relative z-10">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const baseUrl = window.location.origin;
                                                    const days = getDaysInStatus(quote.date);

                                                    // Smart Template Logic
                                                    let template: any = 'follow_up';
                                                    if (quote.status === 'sent' && days >= 3) template = 'follow_up_stale';
                                                    if (['delivered', 'finished'].includes(quote.status) && days >= 15) template = 'post_sales';

                                                    const msg = generateMessage(template, { customerName: customer.name, quoteId: quote.id, link: `${baseUrl}/my-quote/${quote.id}` });

                                                    let phone = customer.phone.replace(/\D/g, '');
                                                    if (phone && (phone.length === 10 || phone.length === 11)) phone = "55" + phone;

                                                    openWhatsApp(phone, msg);
                                                }}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border
                                                    ${(quote.status === 'sent' && getDaysInStatus(quote.date) >= 3) || (['delivered'].includes(quote.status) && getDaysInStatus(quote.date) >= 15)
                                                        ? 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                                                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                                    }`}
                                            >
                                                {(quote.status === 'sent' && getDaysInStatus(quote.date) >= 3) || (['delivered'].includes(quote.status) && getDaysInStatus(quote.date) >= 15) ? (
                                                    <><Zap size={14} fill="currentColor" /> Ação Rápida</>
                                                ) : (
                                                    <><MessageSquare size={14} /> WhatsApp</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SalesPipeline;
