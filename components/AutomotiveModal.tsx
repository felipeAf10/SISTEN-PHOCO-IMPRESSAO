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
                materialLevel,
                vinylBrand,
                areaM2: currentAutoArea
            },
            overrideUnitPrice: activeProduct.salePrice * priceMultiplier // Pass Rate (Price * Multiplier) so (Rate * Area) = Total
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="glass-card w-full max-w-5xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-slate-900/90 border border-white/10">
                <div className="p-4 lg:p-10 bg-[#0F172A] text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] text-cyan-400">
                            <Car size={32} />
                        </div>
                        <div>
                            <h4 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-white">Studio Automotivo Pro</h4>
                            <p className="text-slate-400 text-xs font-bold uppercase mt-1">Envelopamento Comercial & Frota</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"><X size={32} /></button>
                </div>

                <div className="p-4 lg:p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10 bg-transparent">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Marca</label>
                            <input type="text" value={autoForm.make} onChange={e => setAutoForm({ ...autoForm, make: e.target.value })} className="w-full px-5 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl font-black outline-none text-slate-200 placeholder-slate-500" placeholder="Ex: VW" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modelo</label>
                            <input type="text" value={autoForm.model} onChange={e => setAutoForm({ ...autoForm, model: e.target.value })} className="w-full px-5 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl font-black outline-none text-slate-200 placeholder-slate-500" placeholder="Ex: Saveiro G1" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ano</label>
                            <input type="text" value={autoForm.year} onChange={e => setAutoForm({ ...autoForm, year: e.target.value })} className="w-full px-5 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl font-black outline-none text-slate-200 placeholder-slate-500" placeholder="Ex: 1993" />
                        </div>
                        <button onClick={handleSearchVehicle} disabled={isSearchingAuto} className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white h-[52px] rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-[0_4px_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 hover:brightness-110">
                            {isSearchingAuto ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Consultar IA
                        </button>
                    </div>

                    {autoBreakdown && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Scissors size={14} /> Selecione as peças desejadas (sangria de 5cm incluída)</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(autoBreakdown).map(([part, dim]) => {
                                    const d = dim as { w: number, h: number };
                                    const area = d.w * d.h;
                                    if (area <= 0.01) return null;
                                    const isSelected = selectedAutoParts.has(part);

                                    return (
                                        <button
                                            key={part}
                                            onClick={() => toggleAutoPart(part)}
                                            className={`p-5 rounded-[1.5rem] border-2 text-left transition-all relative overflow-hidden group ${isSelected ? 'border-fuchsia-500/50 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(217,70,239,0.2)]' : 'border-white/5 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <p className={`text-[8px] font-black uppercase tracking-widest ${isSelected ? 'text-fuchsia-400' : 'text-slate-500'}`}>{part.replace(/_/g, ' ')}</p>
                                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-fuchsia-500 border-fuchsia-500' : 'border-slate-600 bg-slate-700/50'}`}>
                                                    {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                                                </div>
                                            </div>
                                            <p className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>{area.toFixed(2)} m²</p>
                                            <p className="text-[8px] font-bold text-slate-500 mt-1">{d.w}m x {d.h}m</p>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="pt-8 border-t border-white/5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ClipboardCheck size={14} /> Detalhes Técnicos & Complexidade</h5>
                                        <div className="grid grid-cols-1 gap-4">

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase flex gap-2 items-center"><Gauge size={12} /> Complexidade da Superfície</label>
                                                    <select value={complexity} onChange={e => setComplexity(e.target.value as any)} className="w-full px-4 py-3 bg-slate-800 border border-amber-500/20 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-amber-500 text-amber-400">
                                                        {Object.keys(COMPLEXITY_MULTIPLIERS).map(k => <option key={k} value={k}>{k}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase flex gap-2 items-center"><Layers size={12} /> Linha de Material</label>
                                                    <select value={materialLevel} onChange={e => setMaterialLevel(e.target.value as any)} className="w-full px-4 py-3 bg-slate-800 border border-indigo-500/20 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-400">
                                                        {Object.keys(MATERIAL_LEVELS).map(k => <option key={k} value={k}>{k}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase">Marca do Vinil</label>
                                                <select value={vinylBrand} onChange={e => setVinylBrand(e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl font-bold text-xs outline-none text-slate-200">
                                                    <option>Avery Dennison</option>
                                                    <option>3M Premium</option>
                                                    <option>Oracal 651</option>
                                                    <option>Alltak</option>
                                                    <option>Imprimax</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/20 p-8 rounded-[2.5rem] text-white flex flex-col justify-between shadow-[0_0_30px_rgba(6,182,212,0.1)] backdrop-blur-sm">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Resumo do Projeto Selecionado</p>
                                            <div className="mt-4 space-y-1">
                                                <p className="text-4xl font-black text-white">R$ {currentTotal.toFixed(2)}</p>
                                                <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-2">
                                                    <p className="text-[10px] font-bold text-cyan-200 uppercase tracking-widest">Área: {currentAutoArea.toFixed(2)}m²</p>
                                                    <p className="text-[10px] font-bold text-cyan-200 uppercase tracking-widest">Fator: x{(priceMultiplier).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleConfirm}
                                            disabled={selectedAutoParts.size === 0}
                                            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            Confirmar Seleção <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutomotiveModal;
