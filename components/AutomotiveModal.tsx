import React, { useState, useMemo } from 'react';
import { X, Car, Sparkles, Loader2, Scissors, Check, ClipboardCheck, ArrowRight, Gauge, Layers } from 'lucide-react';
import { Product } from '../types';
import { getVehicleMeasurements } from '../services/geminiService';

interface AutomotiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (item: any) => void;
    activeProduct: Product | null;
}

const COMPLEXITY_MULTIPLIERS = {
    'Baixa': 1.0,    // Flat surfaces, simple curves (Baús, furgões planos)
    'Média': 1.25,   // Standard cars, bumpers (Parachoques normais)
    'Alta': 1.6,     // complex bodies, deep recesses (Carros esportivos, para-choques complexos)
};

const MATERIAL_LEVELS = {
    'Standard (Promocional)': 1.0,
    'Performance (Polimérico)': 1.4,
    'Premium (Cast/Envelopamento)': 2.2,
};

const AutomotiveModal: React.FC<AutomotiveModalProps> = ({ isOpen, onClose, onConfirm, activeProduct }) => {
    const [autoForm, setAutoForm] = useState({ make: '', model: '', year: '' });
    const [isSearchingAuto, setIsSearchingAuto] = useState(false);
    const [autoBreakdown, setAutoBreakdown] = useState<Record<string, { w: number, h: number }> | null>(null);
    const [selectedAutoParts, setSelectedAutoParts] = useState<Set<string>>(new Set());

    // Professional Wrapping Fields
    const [complexity, setComplexity] = useState<keyof typeof COMPLEXITY_MULTIPLIERS>('Média');
    const [materialLevel, setMaterialLevel] = useState<keyof typeof MATERIAL_LEVELS>('Performance (Polimérico)');
    const [vinylBrand, setVinylBrand] = useState('Alltak');

    const currentAutoArea = useMemo(() => {
        if (!autoBreakdown) return 0;
        return Object.entries(autoBreakdown).reduce((acc, [key, dim]) => {
            const d = dim as { w: number, h: number };
            if (selectedAutoParts.has(key)) {
                return acc + (d.w * d.h);
            }
            return acc;
        }, 0);
    }, [autoBreakdown, selectedAutoParts]);

    const priceMultiplier = useMemo(() => {
        return COMPLEXITY_MULTIPLIERS[complexity] * MATERIAL_LEVELS[materialLevel];
    }, [complexity, materialLevel]);

    const currentTotal = useMemo(() => {
        if (!activeProduct) return 0;
        const basePrice = activeProduct.salePrice * currentAutoArea;
        return basePrice * priceMultiplier;
    }, [currentAutoArea, activeProduct, priceMultiplier]);

    const handleSearchVehicle = async () => {
        if (!autoForm.make || !autoForm.model) return;
        setIsSearchingAuto(true);
        try {
            // @ts-ignore
            const breakdown = await getVehicleMeasurements(autoForm.make, autoForm.model, autoForm.year);
            if (breakdown) {
                // @ts-ignore
                setAutoBreakdown(breakdown);
                const initialParts = new Set<string>();
                // @ts-ignore
                Object.entries(breakdown).forEach(([key, val]: [string, any]) => {
                    if (val.w > 0 && val.h > 0) initialParts.add(key);
                });
                setSelectedAutoParts(initialParts);
            } else {
                alert("Não foi possível obter medidas para este veículo. Tente ser mais específico na marca/modelo.");
            }
        } catch (err) {
            alert("Erro na conexão com a IA. Verifique sua chave de API ou conexão.");
        } finally {
            setIsSearchingAuto(false);
        }
    };

    const toggleAutoPart = (key: string) => {
        const newParts = new Set(selectedAutoParts);
        if (newParts.has(key)) newParts.delete(key);
        else newParts.add(key);
        setSelectedAutoParts(newParts);
    };

    const handleConfirm = () => {
        if (!activeProduct) return;

        onConfirm({
            quantity: 1,
            width: currentAutoArea,
            height: 1,
            unitPrice: currentTotal / 1, // Store total price as unit price effectively
            labelData: {
                type: 'automotive',
                vehicle: `${autoForm.make} ${autoForm.model} ${autoForm.year}`,
                parts: Array.from(selectedAutoParts),
                complexity,
                materialLevel
            }
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            {/* Added bg-slate-900 explicitly */}
            <div className="glass-card w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] bg-slate-900/95 border border-white/10 text-slate-200">
                {/* Header */}
                <div className="p-4 lg:p-8 bg-[#0F172A] text-white flex justify-between items-center shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
                            <Car size={32} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight uppercase">Envelopamento & Veículos</h2>
                            <p className="text-slate-400 text-xs font-bold uppercase mt-1">Cálculo por Peças e Complexidade</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-slate-900/50">
                    {/* Controls */}
                    <div className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar space-y-8">

                        {/* Search Car */}
                        <div className="bg-slate-950/50 border border-slate-700/50 p-6 rounded-[2rem] space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={14} className="text-fuchsia-500" /> Identificar Veículo
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <input placeholder="Marca (Ex: Fiat)" value={autoForm.make} onChange={e => setAutoForm({ ...autoForm, make: e.target.value })} className="px-5 py-4 bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-fuchsia-500 text-white placeholder-slate-600 shadow-inner" />
                                <input placeholder="Modelo (Ex: Fiorino)" value={autoForm.model} onChange={e => setAutoForm({ ...autoForm, model: e.target.value })} className="px-5 py-4 bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-fuchsia-500 text-white placeholder-slate-600 shadow-inner" />
                                <div className="flex gap-2">
                                    <input placeholder="Ano" value={autoForm.year} onChange={e => setAutoForm({ ...autoForm, year: e.target.value })} className="flex-1 px-5 py-4 bg-slate-800 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-fuchsia-500 text-white placeholder-slate-600 shadow-inner" />
                                    <button onClick={handleSearchVehicle} disabled={isSearchingAuto} className="bg-fuchsia-600 text-white px-6 rounded-2xl hover:bg-fuchsia-500 transition-colors shadow-lg shadow-fuchsia-500/20 disabled:opacity-50">
                                        {isSearchingAuto ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Configuration */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nível de Material</label>
                                <select value={materialLevel} onChange={e => setMaterialLevel(e.target.value as any)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-fuchsia-500 text-white">
                                    {Object.keys(MATERIAL_LEVELS).map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Complexidade / Curvas</label>
                                <select value={complexity} onChange={e => setComplexity(e.target.value as any)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-fuchsia-500 text-white">
                                    {Object.keys(COMPLEXITY_MULTIPLIERS).map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Parts Selection */}
                        {autoBreakdown && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Layers size={14} className="text-fuchsia-500" /> Seleção de Peças
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(autoBreakdown).map(([part, dim]) => (
                                        <button
                                            key={part}
                                            onClick={() => toggleAutoPart(part)}
                                            className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all ${selectedAutoParts.has(part) ? 'bg-fuchsia-600/20 border-fuchsia-500 text-white' : 'bg-slate-800 border-white/5 text-slate-400 hover:border-white/20 hover:bg-slate-700'}`}
                                        >
                                            <div className="flex justify-between w-full">
                                                <span className="font-bold text-xs uppercase">{part}</span>
                                                {selectedAutoParts.has(part) && <Check size={14} className="text-fuchsia-400" />}
                                            </div>
                                            <span className="text-[10px] opacity-60">{(dim as any).w}m x {(dim as any).h}m</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preview / Footer - Right Side */}
                    <div className="w-full lg:w-[400px] bg-gradient-to-br from-fuchsia-900 to-purple-900 text-white p-8 flex flex-col justify-between shadow-inner border-t lg:border-t-0 lg:border-l border-white/10 relative overflow-hidden">

                        {/* Background Effect */}
                        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-[100px] pointer-events-none"></div>

                        <div className="space-y-8 relative z-10">
                            <div>
                                <p className="text-fuchsia-300 text-[10px] font-black uppercase tracking-widest">Orçamento Estimado</p>
                                <div className="mt-4">
                                    <p className="text-5xl font-black tracking-tighter">R$ {currentTotal.toFixed(2)}</p>
                                    <p className="text-xs text-fuchsia-200 mt-2 font-medium bg-black/20 inline-block px-3 py-1 rounded-lg">Multiplicador: {priceMultiplier.toFixed(2)}x</p>
                                </div>
                            </div>

                            <div className="bg-black/20 rounded-2xl p-6 space-y-3 border border-white/10 backdrop-blur-sm">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-fuchsia-200">Área Total</span>
                                    <span className="font-bold">{currentAutoArea.toFixed(2)} m²</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-fuchsia-200">Peças Selecionadas</span>
                                    <span className="font-bold">{selectedAutoParts.size}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-fuchsia-200">Complexidade</span>
                                    <span className="font-bold text-fuchsia-300">{complexity}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={currentTotal === 0}
                            className="w-full py-5 bg-white text-fuchsia-900 hover:bg-fuchsia-50 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-8 relative z-10"
                        >
                            Confirmar Envelopamento <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutomotiveModal;
