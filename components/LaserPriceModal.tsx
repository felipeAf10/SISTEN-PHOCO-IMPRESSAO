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
            <div className="glass-card w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-slate-900/90 border border-white/10">
                {/* Header */}
                <div className="p-4 lg:p-8 bg-[#0F172A] text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                            <Zap size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Laser & CNC</h2>
                            <p className="text-slate-400 text-xs font-medium">Corte, Gravação e Personalização</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                    {/* Controls */}
                    <div className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar space-y-8">

                        {/* Mode Selector */}
                        <div className="flex bg-slate-800/50 p-1.5 rounded-2xl overflow-x-auto border border-white/5">
                            <button onClick={() => setMode('cut')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${mode === 'cut' ? 'bg-amber-500 shadow-lg shadow-amber-500/20 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Corte Laser</button>
                            <button onClick={() => setMode('engrave')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${mode === 'engrave' ? 'bg-amber-500 shadow-lg shadow-amber-500/20 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Gravação UV</button>
                            <button onClick={() => setMode('promotional')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${mode === 'promotional' ? 'bg-amber-500 shadow-lg shadow-amber-500/20 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Brindes & Itens</button>
                        </div>

                        <div className="space-y-6">
                            {mode === 'promotional' ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto Base</label>
                                        <select value={selectedPromoId} onChange={e => setSelectedPromoId(e.target.value)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-sm outline-none text-slate-200">
                                            {PROMO_PRODUCTS.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} (Custo Base: R$ {p.cost.toFixed(2)})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                                        <input type="checkbox" id="supply" checked={supplyProduct} onChange={e => setSupplyProduct(e.target.checked)} className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700" />
                                        <label htmlFor="supply" className="text-sm font-bold text-slate-300 cursor-pointer select-none">Fornecer o Produto (Incluir custo do item)</label>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</label>
                                        <input type="number" value={promoQty} onChange={e => setPromoQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-full pl-6 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-black text-lg outline-none text-slate-200" />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</label>
                                        <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-sm outline-none text-slate-200" placeholder="Nome do Material" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Espessura (Ref)</label>
                                        <input type="text" value={thickness} onChange={(e) => setThickness(e.target.value)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-sm outline-none text-slate-200" placeholder="ex: 3mm" />
                                    </div>
                                </div>
                            )}

                            {mode !== 'promotional' && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                        <DollarSign size={12} /> Preço do Material (R$/m²) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={manualPricePerM2}
                                        onChange={(e) => setManualPricePerM2(parseFloat(e.target.value) || 0)}
                                        className="w-full pl-4 pr-4 py-3 bg-slate-900 border border-amber-500/30 rounded-xl font-black text-amber-500 focus:ring-2 focus:ring-amber-500 outline-none"
                                        placeholder="0.00"
                                    />
                                    {manualPricePerM2 === 0 && <p className="text-[10px] text-amber-500 font-bold animate-pulse">⚠️ Preço não detectado. Insira manuamente.</p>}
                                </div>
                            )}

                            {mode !== 'promotional' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dimensões da Peça (Metros)</label>
                                    <div className="flex gap-4 items-center">
                                        <div className="relative flex-1">
                                            <Ruler size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="number" step="0.01" value={materialArea.w} onChange={e => setMaterialArea({ ...materialArea, w: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-sm outline-none text-slate-200" placeholder="Largura" />
                                        </div>
                                        <span className="text-slate-500 font-bold">x</span>
                                        <div className="relative flex-1">
                                            <Ruler size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="number" step="0.01" value={materialArea.h} onChange={e => setMaterialArea({ ...materialArea, h: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-sm outline-none text-slate-200" placeholder="Altura" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mode === 'promotional' ? 'Tempo de Gravação (un)' : 'Tempo de Máquina'}</label>
                                    <div className="relative">
                                        <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" value={machineTime} onChange={e => setMachineTime(parseFloat(e.target.value) || 0)} className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-black text-lg outline-none text-amber-500" placeholder="Minutos" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa de Setup/Arquivo</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="number" value={setupFee} onChange={e => setSetupFee(parseFloat(e.target.value) || 0)} className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-black text-lg outline-none text-emerald-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 text-amber-500">
                            <Info size={20} className="shrink-0 mt-1" />
                            <p className="text-xs font-medium leading-relaxed">
                                {mode === 'promotional'
                                    ? "O cálculo inclui o custo do produto (se selecionado) + tempo de gravação por unidade. Taxa de setup é cobrada uma vez ou por lote."
                                    : "O cálculo considera o custo de hora/máquina (R$ 120,00/h) somado ao custo do material por m². O Preço do Material é puxado do cadastro ou inserido manualmente."
                                }
                            </p>
                        </div>
                    </div>

                    {/* Solution Preview */}
                    <div className="w-full lg:w-[350px] bg-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Resumo de Custos</p>
                                <div className="mt-4 space-y-3">
                                    {mode === 'promotional' ? (
                                        <>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-400">Produto ({promoQty}x)</span>
                                                <span className="font-bold">R$ {(supplyProduct ? (PROMO_PRODUCTS.find(p => p.id === selectedPromoId)?.cost || 0) * (PROMO_PRODUCTS.find(p => p.id === selectedPromoId)?.suggestedMarkup || 1) * promoQty : 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-400">Gravação ({machineTime}min/un)</span>
                                                <span className="font-bold">R$ {((machineTime * (COSTS.machineHour / 60)) * promoQty).toFixed(2)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-400">Máquina ({machineTime}min)</span>
                                                <span className="font-bold">R$ {(machineTime * (COSTS.machineHour / 60)).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-400">Material ({(materialArea.w * materialArea.h).toFixed(2)}m²)</span>
                                                {/* @ts-ignore */}
                                                <span className="font-bold">R$ {((materialArea.w * materialArea.h) * manualPricePerM2).toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Setup</span>
                                        <span className="font-bold">R$ {setupFee.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <p className="text-right text-3xl font-black text-amber-500">R$ {total.toFixed(2)}</p>
                                    <p className="text-right text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Total Estimado</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={mode !== 'promotional' && (materialArea.w === 0 || materialArea.h === 0)}
                            className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Adicionar ao Orçamento <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LaserPriceModal;
