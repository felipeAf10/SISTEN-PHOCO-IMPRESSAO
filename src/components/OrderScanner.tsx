import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Quote, Customer } from '../types';
import { QrCode, X, Search, DollarSign, ShieldCheck, AlertCircle, FileText, CheckCircle2, Camera, User } from 'lucide-react';

interface OrderScannerProps {
    quotes: Quote[];
    customers: Customer[];
    onClose?: () => void;
}

const OrderScanner: React.FC<OrderScannerProps> = ({ quotes, customers, onClose }) => {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [foundQuote, setFoundQuote] = useState<Quote | null>(null);
    const [manualId, setManualId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    // Ref to hold the scanner instance
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (html5QrCodeRef.current && isScanning) {
                html5QrCodeRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const startScanning = async () => {
        setError(null);
        try {
            const scannerId = "reader";
            if (!document.getElementById(scannerId)) return;

            // Initialize if not already done
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode(scannerId);
            }

            const qrCode = html5QrCodeRef.current;

            await qrCode.start(
                { facingMode: "environment" }, // Prefer back camera
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    handleScan(decodedText);
                    stopScanning(); // Stop after first successful scan
                },
                (errorMessage) => {
                    // Ignore frame errors
                }
            );

            setIsScanning(true);

        } catch (err: any) {
            console.error("Error starting scanner:", err);
            setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
            setIsScanning(false);
        }
    };

    const stopScanning = async () => {
        if (html5QrCodeRef.current && isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                setIsScanning(false);
                // We keep the instance for restart
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
    };

    const handleScan = (text: string) => {
        try {
            setScanResult(text);
            setError(null);

            // Expected format: URL params ?id=PH-123 or just PH-123
            let idToSearch = text;

            if (text.includes('id=')) {
                const urlObj = new URL(text);
                idToSearch = urlObj.searchParams.get('id') || '';
            }

            // Cleanup ID if needed (logic from existing codebase likely uses PH- prefix or UUID)
            const quote = quotes.find(q => q.id === idToSearch || q.id === idToSearch.replace('PH-', ''));

            if (quote) {
                setFoundQuote(quote);
            } else {
                setError(`Pedido não encontrado para o código: ${idToSearch}`);
            }
        } catch (e) {
            console.error(e);
            setError("Formato de QR Code inválido.");
        }
    };

    const handleManualSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const quote = quotes.find(q => q.id.toLowerCase().includes(manualId.toLowerCase()));
        if (quote) {
            setFoundQuote(quote);
            setError(null);
        } else {
            setError("Pedido não encontrado.");
            setFoundQuote(null);
        }
    };

    const reset = () => {
        setFoundQuote(null);
        setScanResult(null);
        setError(null);
        setManualId('');
        // Don't auto-start scanning to avoid permission fatigue
    };

    // --- RENDER FINANCIAL REPORT ---
    if (foundQuote) {
        const customer = customers.find(c => c.id === foundQuote.customerId);
        const total = foundQuote.totalAmount || 0;
        const downPayment = foundQuote.downPayment || 0;
        const remaining = total - downPayment;
        const isFullyPaid = remaining <= 0.01; // tolerance
        const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;

        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
                <button onClick={reset} className="mb-4 text-xs font-bold text-secondary hover:text-white uppercase tracking-widest flex items-center gap-2">
                    <X size={16} /> Nova Leitura
                </button>

                <div className="glass-card p-0 overflow-hidden rounded-[2rem] shadow-2xl shadow-black/50 border border-white/10">
                    {/* Header Status */}
                    <div className={`p-8 ${isFullyPaid ? 'bg-emerald-500/20' : 'bg-amber-500/20'} border-b border-white/5`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Status Financeiro</p>
                                <h2 className={`text-2xl font-black uppercase ${isFullyPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {isFullyPaid ? 'Pedido Quitado' : 'Pagamento Pendente'}
                                </h2>
                            </div>
                            {isFullyPaid ? <CheckCircle2 size={32} className="text-emerald-400" /> : <AlertCircle size={32} className="text-amber-400" />}
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-6">
                            <div className="flex justify-between text-xs font-bold mb-2 text-secondary">
                                <span>Pago: {progress.toFixed(0)}%</span>
                                <span>Total: R$ {total.toFixed(2)}</span>
                            </div>
                            <div className="h-2 bg-surface-active rounded-full overflow-hidden">
                                <div style={{ width: `${progress}%` }} className={`h-full ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-500'} transition-all`} />
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Cliente</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-surface-active flex items-center justify-center text-xs font-bold text-secondary">
                                        {customer?.name.charAt(0)}
                                    </div>
                                    <p className="font-bold text-white text-lg">{customer?.name}</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Pedido</p>
                                <div className="flex items-center gap-2">
                                    <FileText size={18} className="text-cyan-400" />
                                    <p className="font-bold text-white text-lg">#{foundQuote.id}</p>
                                </div>
                            </div>
                        </div>

                        {/* Financial Breakdown Box */}
                        <div className="bg-surface/50 rounded-2xl p-6 border border-white/5 space-y-4">
                            <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                        <DollarSign size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-secondary font-bold">Valor Total</p>
                                        <p className="font-bold text-white">R$ {total.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-secondary font-bold">Sinal / Pago</p>
                                        <p className="font-bold text-white">R$ {downPayment.toFixed(2)}</p>
                                        <p className="text-[10px] text-secondary">{foundQuote.downPaymentMethod || foundQuote.paymentMethod || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                                        <AlertCircle size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-secondary font-bold">Restante a Pagar</p>
                                        <p className={`font-black text-xl ${remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            R$ {remaining.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>


                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <h3 className="text-xs font-black text-secondary uppercase tracking-widest pl-1">Itens do Pedido ({foundQuote.items.length})</h3>
                            <div className="grid gap-3">
                                {foundQuote.items.map((item, idx) => (
                                    <div key={idx} className="bg-surface/50 border border-white/5 p-4 rounded-xl flex justify-between items-center gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs ring-1 ring-cyan-500/20">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-white text-sm leading-tight mb-1">{item.productName}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {item.labelData ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded border border-white/5">
                                                                {item.labelData.totalLabels} un (Total)
                                                            </span>
                                                            <span className="text-[10px] text-secondary">
                                                                {(item.labelData.areaM2 * item.quantity).toFixed(2)} m² • {item.labelData.singleWidth}x{item.labelData.singleHeight}cm
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-secondary font-medium uppercase tracking-wide border border-white/5">
                                                            {item.width && item.height
                                                                ? `${item.width}m x ${item.height}m`
                                                                : `${item.quantity} un`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="block text-xs font-black text-white">{item.quantity}x</span>
                                            <span className="text-[9px] text-secondary uppercase">Qtd</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {foundQuote.notes && (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <h3 className="text-xs font-black text-secondary uppercase tracking-widest pl-1">Observações</h3>
                                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                                    <p className="text-sm font-medium text-amber-200/90 whitespace-pre-wrap leading-relaxed">
                                        {foundQuote.notes}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="text-center pt-4">
                            <p className="text-[10px] text-secondary/50 font-medium uppercase tracking-widest">
                                Verificado em {new Date().toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in zoom-in duration-300 max-w-md mx-auto relative">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-primary uppercase tracking-tight flex items-center justify-center gap-2">
                    <QrCode className="text-cyan-400" /> Leitor de Pedido
                </h2>
                <p className="text-xs text-secondary mt-2 font-bold uppercase tracking-widest">
                    {isScanning ? 'Aponte para o QR Code' : 'Inicie a câmera para scanear'}
                </p>
            </div>

            <div className={`glass-card p-1 rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative bg-black ${!isScanning ? 'min-h-[300px] flex items-center justify-center' : ''}`}>
                <div id="reader" className="w-full h-full overflow-hidden rounded-2xl md:rounded-[1.5rem]" />

                {!isScanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface/50 backdrop-blur-sm z-10">
                        <button
                            onClick={startScanning}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center gap-3"
                        >
                            <Camera size={24} />
                            Iniciar Câmera
                        </button>
                        <p className="text-[10px] text-center text-secondary max-w-[200px]">
                            O navegador solicitará permissão para usar a câmera.
                        </p>
                    </div>
                )}

                {isScanning && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                        <button
                            onClick={stopScanning}
                            className="bg-rose-500/80 hover:bg-rose-500 text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md transition-all"
                        >
                            Parar Câmera
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-xs font-bold animate-shake">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="mt-8 flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest">OU DIGITE O CÓDIGO</span>
                <div className="h-px bg-white/10 flex-1" />
            </div>

            <form onSubmit={handleManualSearch} className="mt-6 flex gap-2">
                <input
                    type="text"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    placeholder="Ex: 1234"
                    className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-secondary/50 outline-none focus:ring-2 focus:ring-cyan-500/50 font-bold text-center uppercase"
                />
                <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20">
                    <Search size={20} />
                </button>
            </form>
        </div>
    );
};

export default OrderScanner;
