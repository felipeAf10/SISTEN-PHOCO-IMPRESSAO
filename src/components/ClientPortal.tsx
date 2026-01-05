import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Quote, QuoteItem, Product } from '../types';
import { api } from '../services/api'; // Fixed path
import { Check, ClipboardList, Phone, Download, MapPin, Calendar, Receipt, Loader2, Share2, AlertTriangle, ShieldCheck, Star, Truck, Printer, Scissors, Banknote, CreditCard } from 'lucide-react';
// import { generateQuotePDF } from '../services/pdfService'; // Unused

const ClientPortal: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [quote, setQuote] = useState<Quote | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [customer, setCustomer] = useState<any>(null); // Fetch customer details if not embedded
    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<'pix' | 'card' | 'cash' | 'debit'>('pix');

    useEffect(() => {
        if (id) loadQuote(id);
    }, [id]);

    const loadQuote = async (quoteId: string) => {
        try {
            // In a real scenario, this endpoint might need to be public or use a magic link token.
            // For this MVP, we assume the user might be logged in OR the API allows public read by ID (unlikely without auth).
            // If auth is strictly required, this feature is for logged-in users or needs a proxy.
            // *Assuming for this task we use standard list/get and user is opening on same device or API is open.*
            // If API requires auth, this will fail for external clients.
            // Strategy: We will try to fetch.

            const allQuotes = await api.quotes.list();
            const found = allQuotes.find(q => q.id === quoteId);

            if (found) {
                setQuote(found);

                // Fetch products for name lookup
                try {
                    const allProducts = await api.products.list();
                    setProducts(allProducts);
                } catch (err) {
                    console.error("Failed to load products for portal lookup", err);
                }

                // Also fetch customer name
                const customers = await api.customers.list();
                const cust = customers.find(c => c.id === found.customerId);
                setCustomer(cust);
            }
        } catch (error) {
            console.error("Error loading quote for portal", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!quote) return;
        setIsApproving(true);
        try {
            // Updated to save payment preference if API supported it, currently just confirming status
            await api.quotes.updateStatus(quote.id, 'confirmed');

            let methodLabel = 'Pix';
            if (selectedPayment === 'card') methodLabel = 'Cartão de Crédito';
            if (selectedPayment === 'debit') methodLabel = 'Débito';
            if (selectedPayment === 'cash') methodLabel = 'Dinheiro';

            setQuote({ ...quote, status: 'confirmed', paymentMethod: methodLabel }); // Optimistic update

            // In real app, we would redirect to payment gateway or show pix code here
            if (selectedPayment === 'pix') {
                // Show PIX Modal or Alert (Simplified for MVP)
                alert("Orçamento aprovado! A chave PIX será enviada para seu WhatsApp.");
            } else if (selectedPayment === 'card') {
                alert("Orçamento aprovado! Enviaremos o link de pagamento do cartão em breve.");
            } else if (selectedPayment === 'debit') {
                alert("Orçamento aprovado! Entraremos em contato para o sinal de 50% e início da produção.");
            } else {
                alert("Orçamento aprovado! Entraremos em contato para o sinal de 50% e início da produção.");
            }

        } catch (e) {
            alert("Erro ao aprovar. Tente novamente ou chame no WhatsApp.");
        } finally {
            setIsApproving(false);
        }
    };

    const handleWhatsApp = () => {
        if (!quote) return;
        const msg = `Olá! Estou vendo o orçamento #${quote.id.slice(-4)} e gostaria de tirar uma dúvida.`;
        window.open(`https://wa.me/5575992688031?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (isLoading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
    if (!quote) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Orçamento não encontrado ou expirado.</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans pb-32 md:pb-0 selection:bg-cyan-500/30 overflow-x-hidden">
            {/* Ambient Background Effects */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header / Brand */}
            <div className="bg-black/20 backdrop-blur-xl border-b border-white/5 p-6 sticky top-0 z-20">
                <div className="max-w-2xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                            <Share2 className="text-black" size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="font-black text-xl tracking-tighter leading-none text-white">PHOCO</h1>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">Portal do Cliente</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-6 space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Quote Header Card */}
                <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-cyan-500/10 transition-all duration-700" />

                    <div className="flex justify-between items-start mb-8 relative">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-5xl font-black text-white tracking-tighter">#{quote.id.slice(-4)}</h2>
                                <span className="text-zinc-600 font-medium text-lg mt-2">C</span>
                            </div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${quote.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${quote.status === 'confirmed' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                                {quote.status === 'confirmed' ? 'Aprovado' : 'Aguardando Aprovação'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 relative">
                        <div className="flex items-center gap-4 text-zinc-300 group/item">
                            <div className="w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5 group-hover/item:border-cyan-500/30 transition-colors">
                                <span className="text-xs font-bold text-zinc-400">{customer?.name?.charAt(0)}</span>
                            </div>
                            <span className="font-medium text-sm">{customer?.name || 'Cliente'}</span>
                        </div>

                        <div className="flex items-center gap-4 text-zinc-300 group/item">
                            <div className="w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5 group-hover/item:border-cyan-500/30 transition-colors">
                                <Calendar size={14} className="text-zinc-400" />
                            </div>
                            <span className="font-medium text-sm">{new Date(quote.date).toLocaleDateString()}</span>
                        </div>

                        {quote.deadlineDays && (
                            <div className="flex items-center gap-4 text-zinc-300 group/item">
                                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover/item:border-amber-500/50 transition-colors">
                                    <Receipt size={14} className="text-amber-500" />
                                </div>
                                <span className="font-medium text-sm">Entrega em {quote.deadlineDays} dias úteis</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Production Timeline */}
                {quote.status !== 'draft' && quote.status !== 'sent' && quote.status !== 'negotiating' && quote.status !== 'rejected' && (
                    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-[2rem] p-6 md:p-8 overflow-x-auto">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 pl-1">Status do Pedido</h3>

                        <div className="flex items-center justify-between min-w-[300px] relative">
                            {/* Progress Line Background */}
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-800 -translate-y-1/2 rounded-full z-0"></div>

                            {/* Progress Line Active */}
                            <div
                                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-emerald-500 -translate-y-1/2 rounded-full z-0 transition-all duration-1000"
                                style={{
                                    width: `${Math.min(100, (
                                        ['confirmed', 'production', 'pre_print'].includes(quote.status) ? 25 :
                                            ['printing_cut_electronic', 'printing_cut_manual', 'printing_lamination', 'printing_finishing'].includes(quote.status) ? 50 :
                                                quote.status === 'finished' ? 75 :
                                                    quote.status === 'delivered' ? 100 : 0
                                    ))}%`
                                }}
                            ></div>

                            {/* Steps */}
                            {[
                                { id: 1, label: 'Confirmado', icon: Check, activeState: 'confirmed' },
                                { id: 2, label: 'Produção', icon: Printer, activeState: ['production', 'pre_print'] },
                                { id: 3, label: 'Acabamento', icon: Scissors, activeState: ['printing_cut_electronic', 'printing_cut_manual', 'printing_lamination', 'printing_finishing'] },
                                { id: 4, label: 'Pronto', icon: Star, activeState: 'finished' },
                                { id: 5, label: 'Entregue', icon: Truck, activeState: 'delivered' }
                            ].map((step, idx) => {
                                // Logic to determine if step is active or completed
                                const currentStatusIdx = [
                                    'confirmed',
                                    'production', 'pre_print',
                                    'printing_cut_electronic', 'printing_cut_manual', 'printing_lamination', 'printing_finishing',
                                    'finished',
                                    'delivered'
                                ].findIndex(s => s === quote.status);

                                // Simplify mapping for comparison
                                // Group 1: confirmed, Group 2: production..., Group 3: finishing..., Group 4: finished, Group 5: delivered
                                const groups = [
                                    ['confirmed'],
                                    ['production', 'pre_print'],
                                    ['printing_cut_electronic', 'printing_cut_manual', 'printing_lamination', 'printing_finishing'],
                                    ['finished'],
                                    ['delivered']
                                ];

                                const activeGroupIndex = groups.findIndex(g => g.includes(quote.status));
                                const isCompleted = activeGroupIndex > idx;
                                const isCurrent = activeGroupIndex === idx;
                                const isActive = isCompleted || isCurrent;

                                return (
                                    <div key={idx} className="relative z-10 flex flex-col items-center gap-3 group">
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive ? 'bg-zinc-900 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-110' : 'bg-zinc-900 border-zinc-700 text-zinc-600'}`}>
                                            <step.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                        </div>
                                        <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Items Section */}
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 pl-4">Itens do Pedido</h3>
                    <div className="space-y-3">
                        {quote.items.map((item, idx) => {
                            // Lookup product name if "Unknown" or missing
                            const product = products.find(p => p.id === item.productId);

                            let displayProductName = (item.productName && item.productName !== 'Unknown')
                                ? item.productName
                                : null;

                            if (!displayProductName) {
                                if (item.productId && item.productId.startsWith('laser-')) {
                                    displayProductName = 'Corte Laser Personalizado';
                                } else {
                                    displayProductName = product?.name || 'Produto sem nome';
                                }
                            }

                            return (
                                <div key={idx} className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex gap-5 items-center hover:bg-zinc-800/40 transition-colors group">
                                    <div className="w-14 h-14 bg-zinc-950 rounded-xl flex items-center justify-center shrink-0 border border-white/5 group-hover:border-cyan-500/30 transition-colors shadow-inner">
                                        <ClipboardList className="text-cyan-500" size={24} strokeWidth={1.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-white text-sm truncate pr-4">{displayProductName}</h4>
                                        <p className="text-xs text-zinc-500 font-medium mt-1">
                                            {item.labelData ? (
                                                <>
                                                    <span className="block text-white font-bold">{item.labelData.totalLabels} unidades (Total)</span>
                                                    <span className="text-zinc-500">
                                                        {(item.labelData.areaM2 * item.quantity).toFixed(2)} m² • {item.labelData.singleWidth}x{item.labelData.singleHeight}cm
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    {item.quantity} {item.unitPrice ? 'unidades' : 'un'}
                                                    {item.width && item.height && (
                                                        <span className="text-zinc-600"> • {item.width.toFixed(2)}m x {item.height.toFixed(2)}m ({(item.width * item.height * item.quantity).toFixed(2)}m²)</span>
                                                    )}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-white text-base tracking-tight">R$ {item.subtotal.toFixed(2)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Trust Badges / Psychology */}
                <div className="grid grid-cols-3 gap-2 text-center mb-6">
                    <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 flex flex-col items-center justify-center gap-2">
                        <div className="bg-emerald-500/20 p-2 rounded-full"><ShieldCheck size={16} className="text-emerald-400" /></div>
                        <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Compra Segura</span>
                    </div>
                    <div className="bg-cyan-500/10 rounded-xl p-3 border border-cyan-500/20 flex flex-col items-center justify-center gap-2">
                        <div className="bg-cyan-500/20 p-2 rounded-full"><Star size={16} className="text-cyan-400" /></div>
                        <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider">Qualidade Premium</span>
                    </div>
                    <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20 flex flex-col items-center justify-center gap-2">
                        <div className="bg-purple-500/20 p-2 rounded-full"><Truck size={16} className="text-purple-400" /></div>
                        <span className="text-[9px] font-black uppercase text-purple-400 tracking-wider">Entrega Rápida</span>
                    </div>
                </div>

                {/* Payment Selection */}
                {quote.status !== 'confirmed' && (
                    <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-4 mb-2">Forma de Pagamento Preferida</h3>

                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
                            <AlertTriangle className="text-blue-400 shrink-0 mt-0.5" size={16} />
                            <div>
                                <p className="text-xs font-bold text-blue-200 uppercase tracking-wide mb-1">Início da Produção</p>
                                <p className="text-xs text-blue-300 leading-relaxed">
                                    Trabalhamos com <strong>sinal de 50%</strong> para dar início à criação ou produção.
                                    O restante deve ser pago no ato da entrega.
                                    <br /><span className="opacity-70 text-[10px]">(Caso prefira, você também pode pagar o valor total agora)</span>.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {/* PIX Option */}
                            <div
                                onClick={() => setSelectedPayment('pix')}
                                className={`relative cursor-pointer p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${selectedPayment === 'pix' ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60'}`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPayment === 'pix' ? 'border-emerald-500' : 'border-zinc-600'}`}>
                                    {selectedPayment === 'pix' && <div className="w-3 h-3 bg-emerald-500 rounded-full" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <span className={`font-bold uppercase text-sm ${selectedPayment === 'pix' ? 'text-white' : 'text-zinc-400'}`}>Pix à Vista</span>
                                        {/* Assuming 5% discount for PIX logic if needed, or just standard price */}
                                        <span className="bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Aprovação Imediata</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1">Pague rapidinho com QR Code.</p>
                                </div>
                            </div>

                            {/* Credit Card Option */}
                            <div
                                onClick={() => setSelectedPayment('card')}
                                className={`relative cursor-pointer p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${selectedPayment === 'card' ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60'}`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPayment === 'card' ? 'border-indigo-500' : 'border-zinc-600'}`}>
                                    {selectedPayment === 'card' && <div className="w-3 h-3 bg-indigo-500 rounded-full" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <span className={`font-bold uppercase text-sm ${selectedPayment === 'card' ? 'text-white' : 'text-zinc-400'}`}>Cartão de Crédito</span>
                                        <span className="text-[10px] text-zinc-500 font-bold">Até 12x</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1">Parcelamento facilitado.</p>
                                </div>
                            </div>

                            {/* Debit Card Option */}
                            <div
                                onClick={() => setSelectedPayment('debit')}
                                className={`relative cursor-pointer p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${selectedPayment === 'debit' ? 'bg-cyan-500/10 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60'}`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPayment === 'debit' ? 'border-cyan-500' : 'border-zinc-600'}`}>
                                    {selectedPayment === 'debit' && <div className="w-3 h-3 bg-cyan-500 rounded-full" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <CreditCard size={14} className={selectedPayment === 'debit' ? 'text-cyan-500' : 'text-zinc-600'} />
                                            <span className={`font-bold uppercase text-sm ${selectedPayment === 'debit' ? 'text-white' : 'text-zinc-400'}`}>Débito</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1">Sinal de 50% para início + Restante na entrega.</p>
                                </div>
                            </div>

                            {/* Cash Option */}
                            <div
                                onClick={() => setSelectedPayment('cash')}
                                className={`relative cursor-pointer p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${selectedPayment === 'cash' ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60'}`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPayment === 'cash' ? 'border-amber-500' : 'border-zinc-600'}`}>
                                    {selectedPayment === 'cash' && <div className="w-3 h-3 bg-amber-500 rounded-full" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Banknote size={14} className={selectedPayment === 'cash' ? 'text-amber-500' : 'text-zinc-600'} />
                                            <span className={`font-bold uppercase text-sm ${selectedPayment === 'cash' ? 'text-white' : 'text-zinc-400'}`}>Dinheiro</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1">Sinal de 50% para início + Restante na entrega.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Order Summary with Dynamic Totals */}
                <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    {/* Shine Effect */}
                    <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50" />

                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Investimento Total</span>
                        <div className="text-right">
                            <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                                R$ {quote.totalAmount.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Simulated Installments Display */}
                    {selectedPayment === 'card' && (
                        <div className="text-right mb-4 animate-in fade-in slide-in-from-right-4 duration-500">
                            <p className="text-indigo-400 font-bold text-sm">
                                ou 12x de R$ {(quote.totalAmount / 12 * 1.15).toFixed(2)}*
                            </p>
                            <p className="text-[9px] text-zinc-600">*Simulação com juros padrão do cartão</p>
                        </div>
                    )}

                    {selectedPayment === 'pix' && (
                        <div className="text-right mb-4 animate-in fade-in slide-in-from-right-4 duration-500">
                            <p className="text-emerald-400 font-bold text-sm">
                                Melhor opção para agilizar a produção! 🚀
                            </p>
                        </div>
                    )}

                    {quote.paymentMethod && quote.status === 'confirmed' && (
                        <div className="flex justify-end items-center gap-2 text-xs font-medium text-zinc-600 border-t border-white/5 pt-4 mt-4">
                            <span>Método Escolhido:</span>
                            <span className="text-zinc-300 uppercase font-bold bg-white/5 px-2 py-1 rounded">{quote.paymentMethod}</span>
                        </div>
                    )}
                </div>

                <div className="h-32"></div> {/* Spacer for bottom bar */}
            </div>

            {/* Floating Actions Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-50 bg-gradient-to-t from-black via-black/90 to-transparent">
                <div className="max-w-2xl mx-auto flex gap-3">
                    {['draft', 'sent', 'negotiating'].includes(quote.status) ? (
                        <>
                            <button
                                onClick={handleWhatsApp}
                                className="flex-1 py-4 px-4 rounded-2xl bg-zinc-900/90 backdrop-blur-xl text-white font-bold uppercase text-[10px] md:text-xs tracking-widest border border-white/10 hover:bg-zinc-800 transition-all shadow-lg"
                            >
                                Dúvidas
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isApproving}
                                className={`flex-[2] py-4 px-4 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_40px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2 relative overflow-hidden group ${selectedPayment === 'pix' ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-cyan-500/20'}`}
                            >
                                {/* Button Shine Effect */}
                                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 group-hover:animate-shine" />

                                {isApproving ? <Loader2 className="animate-spin" /> : <Check size={16} strokeWidth={4} />}
                                <span>
                                    {selectedPayment === 'pix' ? 'Pagar com Pix' :
                                        selectedPayment === 'card' ? 'Pagar com Cartão' :
                                            selectedPayment === 'debit' ? 'Confirmar Débito' :
                                                'Confirmar Pedido'}
                                </span>
                            </button>
                        </>
                    ) : (
                        <div className="w-full bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 text-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                            <p className="text-emerald-400 font-black uppercase text-sm flex items-center justify-center gap-3">
                                <div className="bg-emerald-500/20 p-1 rounded-full"><Check size={14} strokeWidth={4} /></div>
                                Aprovado com Sucesso
                            </p>
                            <p className="text-emerald-500/60 text-[10px] font-bold uppercase tracking-wider mt-2">Aguarde nosso contato para produção</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientPortal;

const UserIcon = ({ customerName }: { customerName: string }) => (
    <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300">
        {customerName.charAt(0)}
    </div>
);

const ClockIcon = () => (
    <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
        <Receipt size={10} />
    </div>
);


