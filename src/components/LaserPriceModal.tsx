import React, { useState, useEffect } from 'react';
import { X, Zap, Ruler, Clock, Layers, DollarSign, ArrowRight, Info } from 'lucide-react';

interface LaserPriceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (item: any) => void;
    activeProduct: any;
}

const LaserPriceModal: React.FC<LaserPriceModalProps> = ({ isOpen, onClose, onConfirm, activeProduct }) => {
    const [mode, setMode] = useState<'cut' | 'engrave' | 'promotional'>('cut');

    // Laser/CNC Params
    const [material, setMaterial] = useState('');
    const [thickness, setThickness] = useState('');
    const [manualPricePerM2, setManualPricePerM2] = useState(0);
    const [machineTime, setMachineTime] = useState(0); // minutes
    const [setupFee, setSetupFee] = useState(0);
    const [materialArea, setMaterialArea] = useState({ w: 0, h: 0 }); // meters

    // Promotional Params
    const [selectedPromoId, setSelectedPromoId] = useState('caneta-metal');
    const [promoQty, setPromoQty] = useState(100);
    const [supplyProduct, setSupplyProduct] = useState(true);

    const PROMO_PRODUCTS = [
        { id: 'caneta-metal', name: 'Caneta Metálica', cost: 4.50, suggestedMarkup: 2.0 },
        { id: 'chaveiro-acrilico', name: 'Chaveiro Acrílico', cost: 1.80, suggestedMarkup: 2.5 },
        { id: 'garrafa-termica', name: 'Garrafa Térmica', cost: 35.00, suggestedMarkup: 1.8 },
        { id: 'agenda-couro', name: 'Agenda Couro', cost: 22.00, suggestedMarkup: 1.9 },
    ];

    const COSTS = {
        machineHour: 120.00, // R$ 120/h
    };

    useEffect(() => {
        if (activeProduct) {
            setMaterial(activeProduct.name || '');
            setManualPricePerM2(activeProduct.salePrice || 0); // Auto-fill price
        }
    }, [activeProduct]);

    const calculateTotal = () => {
        let total = 0;

        if (mode === 'promotional') {
            const product = PROMO_PRODUCTS.find(p => p.id === selectedPromoId);
            const productCost = supplyProduct ? (product?.cost || 0) * (product?.suggestedMarkup || 1) : 0;
            const engravingCost = (machineTime * (COSTS.machineHour / 60)); // Cost per unit

            total = (productCost + engravingCost) * promoQty + setupFee;
        } else {
            // Cut/Engrave
            const timeCost = machineTime * (COSTS.machineHour / 60);
            const materialCost = (materialArea.w * materialArea.h) * manualPricePerM2;

            total = timeCost + materialCost + setupFee;
        }

        return total;
    };

    const total = calculateTotal();

    const handleConfirm = () => {
        onConfirm({
            type: 'laser',
            description: `${mode === 'promotional' ? 'Brindes' : mode === 'cut' ? 'Corte Laser' : 'Gravação'} - ${material}`,
            details: { mode, material, thickness, machineTime, setupFee, quantity: mode === 'promotional' ? promoQty : 1 },
            total: total
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">

            <div className="glass-card w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-surface border border-white/10 text-primary">
                {/* Header */}
                <div className="p-4 lg:p-8 bg-surface-active text-white flex justify-between items-center shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
                            <Zap size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight uppercase">Laser & CNC</h2>
                            <p className="text-secondary text-xs font-bold uppercase mt-1">Corte, Gravação e Personalização</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-secondary hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-surface/50">
                    {/* Controls */}
                    <div className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar space-y-8">

                        {/* Mode Switch */}
                        <div className="flex bg-surface-hover/50 p-1.5 rounded-2xl border border-white/5">
                            <button
                                onClick={() => setMode('cut')}
                                className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'cut' ? 'bg-amber-500 shadow-lg shadow-amber-500/20 text-black' : 'text-secondary hover:text-primary hover:bg-surface'}`}
                            >
                                Corte
                            </button>
                            <button
                                onClick={() => setMode('engrave')}
                                className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'engrave' ? 'bg-amber-500 shadow-lg shadow-amber-500/20 text-black' : 'text-secondary hover:text-primary hover:bg-surface'}`}
                            >
                                Gravação
                            </button>
                            <button
                                onClick={() => setMode('promotional')}
                                className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'promotional' ? 'bg-amber-500 shadow-lg shadow-amber-500/20 text-black' : 'text-secondary hover:text-primary hover:bg-surface'}`}
                            >
                                Brindes
                            </button>
                        </div>

                        {mode === 'promotional' ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Produto Base</label>
                                    <select value={selectedPromoId} onChange={e => setSelectedPromoId(e.target.value)} className="w-full px-5 py-4 bg-input border border-white/10 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500 text-white">
                                        {PROMO_PRODUCTS.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} - Unit. R$ {p.cost.toFixed(2)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Quantidade</label>
                                    <input type="number" value={promoQty} onChange={e => setPromoQty(parseInt(e.target.value) || 0)} className="w-full px-5 py-4 bg-input border border-white/10 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-amber-500 text-white" />
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-surface/50 border border-white/10 rounded-2xl">
                                    <input type="checkbox" checked={supplyProduct} onChange={e => setSupplyProduct(e.target.checked)} className="w-5 h-5 rounded-md border-slate-600 bg-input text-amber-500 focus:ring-amber-500" />
                                    <label className="text-xs font-bold text-secondary">Incluir Custo do Produto</label>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Material</label>
                                    <input type="text" value={material} onChange={e => setMaterial(e.target.value)} className="w-full px-5 py-4 bg-input border border-white/10 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500 text-white" placeholder="Ex: Acrílico, MDF..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Espessura</label>
                                        <input type="text" value={thickness} onChange={e => setThickness(e.target.value)} className="w-full px-5 py-4 bg-input border border-white/10 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500 text-white" placeholder="Ex: 3mm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Preço Manual (m²)</label>
                                        <input type="number" value={manualPricePerM2} onChange={e => setManualPricePerM2(parseFloat(e.target.value) || 0)} className="w-full px-5 py-4 bg-input border border-white/10 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500 text-white" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Dimensões Material (m)</label>
                                    <div className="flex gap-4">
                                        <input type="number" step="0.01" value={materialArea.w} onChange={e => setMaterialArea({ ...materialArea, w: parseFloat(e.target.value) || 0 })} placeholder="Largura" className="flex-1 px-5 py-4 bg-input border border-white/10 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500 text-white" />
                                        <span className="self-center font-black text-secondary">x</span>
                                        <input type="number" step="0.01" value={materialArea.h} onChange={e => setMaterialArea({ ...materialArea, h: parseFloat(e.target.value) || 0 })} placeholder="Altura" className="flex-1 px-5 py-4 bg-input border border-white/10 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500 text-white" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Machine Time */}
                        <div className="bg-surface/30 border border-white/5 p-6 rounded-[2rem] space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <Clock className="text-amber-500" size={20} />
                                <h4 className="font-black text-amber-500 uppercase text-xs tracking-widest">Tempo de Máquina</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-secondary uppercase">Minutos</label>
                                    <input type="number" value={machineTime} onChange={e => setMachineTime(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 bg-input border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-secondary uppercase">Setup (Taxa Fixa)</label>
                                    <input type="number" value={setupFee} onChange={e => setSetupFee(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 bg-input border border-white/10 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500" />
                                </div>
                            </div>
                            <p className="text-[10px] text-secondary font-medium">Custo Hora Máquina: <span className="text-white">R$ {COSTS.machineHour.toFixed(2)}</span></p>
                        </div>

                    </div>

                    {/* Footer/Preview - Right Side */}
                    <div className="w-full lg:w-[350px] bg-amber-500 p-8 flex flex-col justify-between text-black shadow-inner">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-black uppercase text-3xl tracking-tighter">Resumo</h3>
                                <p className="text-xs font-bold opacity-70 uppercase tracking-widest mt-1">Cálculo Estimado</p>
                            </div>

                            <div className="space-y-3 font-bold text-sm">
                                <div className="flex justify-between border-b border-black/10 pb-2">
                                    <span className="opacity-70">Material</span>
                                    <span>R$ {((materialArea.w * materialArea.h * manualPricePerM2) || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b border-black/10 pb-2">
                                    <span className="opacity-70">Máquina ({machineTime}m)</span>
                                    <span>R$ {(machineTime * (COSTS.machineHour / 60)).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b border-black/10 pb-2">
                                    <span className="opacity-70">Setup/Taxa</span>
                                    <span>R$ {setupFee.toFixed(2)}</span>
                                </div>
                                {mode === 'promotional' && (
                                    <div className="flex justify-between border-b border-black/10 pb-2">
                                        <span className="opacity-70">Produtos ({promoQty})</span>
                                        <span>R$ {((supplyProduct ? (PROMO_PRODUCTS.find(p => p.id === selectedPromoId)?.cost || 0) * (PROMO_PRODUCTS.find(p => p.id === selectedPromoId)?.suggestedMarkup || 1) : 0) * promoQty).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="text-right">
                                <p className="text-xs font-black uppercase tracking-widest opacity-60">Total Final</p>
                                <p className="text-4xl font-black tracking-tighter">R$ {total.toFixed(2)}</p>
                            </div>
                            <button onClick={handleConfirm} className="w-full bg-surface text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-surface-hover transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 active:scale-95">
                                Adicionar ao Orçamento <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LaserPriceModal;
