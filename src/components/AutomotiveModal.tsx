import React, { useState, useMemo, useEffect } from 'react';
import { X, Car, Sparkles, Loader2, Scissors, Check, ClipboardCheck, ArrowRight, Gauge, Layers, Wrench, Droplets, PaintBucket } from 'lucide-react';
import { Product } from '../types';
import { getVehicleMeasurements, getFallbackDimensions } from '../services/geminiService';
import VehicleSvg from './VehicleSvg';

interface AutomotiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (items: any[]) => void;
    activeProduct: Product | null;
}

const COMPLEXITY_MULTIPLIERS = {
    'Baixa': 1.0,    // Flat surfaces
    'Média': 1.25,   // Standard curves
    'Alta': 1.6,     // Complex recesses
    'Extrema': 2.0   // Bumpers with heavy styling
};

const MATERIAL_LEVELS = {
    'Standard (Promocional)': 1.0,
    'Performance (Polimérico)': 1.4,
    'Premium (Cast/Envelopamento)': 2.2,
};

const AutomotiveModal: React.FC<AutomotiveModalProps> = ({ isOpen, onClose, onConfirm, activeProduct }) => {
    // Car State
    const [autoForm, setAutoForm] = useState({ make: '', model: '', year: '' });
    const [isSearchingAuto, setIsSearchingAuto] = useState(false);

    // Initialize with fallback to prevent empty state
    const [autoBreakdown, setAutoBreakdown] = useState<Record<string, { w: number, h: number }> | null>(() => getFallbackDimensions('small'));

    const [selectedAutoParts, setSelectedAutoParts] = useState<Set<string>>(new Set());

    // Per-Part Complexity State
    const [partComplexities, setPartComplexities] = useState<Record<string, 'Baixa' | 'Média' | 'Alta' | 'Extrema'>>({});

    // Global Settings
    const [materialLevel, setMaterialLevel] = useState<keyof typeof MATERIAL_LEVELS>('Performance (Polimérico)');
    const [vehicleType, setVehicleType] = useState<'small' | 'sedan' | 'suv' | 'pickup'>('small');

    // Extras
    const [extras, setExtras] = useState({
        disassembly: false, // Desmontagem
        wash: false,        // Lavagem Detalhada
        removal: false      // Remoção de Material Antigo
    });

    const EXTRAS_PRICES = {
        disassembly: 250,
        wash: 80,
        removal: 350
    };

    // Auto-detect vehicle type keyword from model
    useEffect(() => {
        const m = autoForm.model.toLowerCase();
        let type: 'small' | 'sedan' | 'suv' | 'pickup' = 'small';

        if (m.includes('saveiro') || m.includes('toro') || m.includes('ranger') || m.includes('s10') || m.includes('hilux')) type = 'pickup';
        else if (m.includes('suv') || m.includes('compass') || m.includes('hrv') || m.includes('cherokee')) type = 'suv';
        else if (m.includes('sedan') || m.includes('corolla') || m.includes('civic')) type = 'sedan';

        setVehicleType(type);

        // Only update breakdown if user hasn't searched yet (rely on fallback update mostly for init or non-search usage)
        if (!isSearchingAuto && (!autoForm.model || autoForm.model.length < 3)) {
            // @ts-ignore
            const fallback = getFallbackDimensions(type); // Uses the type directly since model might be partial
            // Don't override if we have valid data, but here we want to be responsive to "Sedan" keyword if typed?
            // Actually better to leave autoBreakdown stable unless search happens.
        }
    }, [autoForm.model]);

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

    // Calculate Price with granular complexity
    const { baseCost, laborProfit, finalPrice } = useMemo(() => {
        if (!activeProduct || !autoBreakdown) return { baseCost: 0, laborProfit: 0, finalPrice: 0 };

        let total = 0;

        // Material Base Multiplier
        const matMult = MATERIAL_LEVELS[materialLevel];

        // Sum each part
        selectedAutoParts.forEach(part => {
            const dim = autoBreakdown[part];
            if (!dim) return;

            const area = dim.w * dim.h;
            const comp = partComplexities[part] || 'Média'; // Default to medium
            // @ts-ignore
            const compMult = COMPLEXITY_MULTIPLIERS[comp];

            // Formula: Area * BasePrice * MaterialMult * ComplexityMult
            const partPrice = area * activeProduct.salePrice * matMult * compMult;
            total += partPrice;
        });

        // Add extras
        let extrasTotal = 0;
        if (extras.disassembly) extrasTotal += EXTRAS_PRICES.disassembly;
        if (extras.wash) extrasTotal += EXTRAS_PRICES.wash;
        if (extras.removal) extrasTotal += EXTRAS_PRICES.removal;

        total += extrasTotal;

        // Roughly estimate material cost (assuming 30% is material cost in the sale price usually, but let's use activeProduct.unitCost if available or 40% of salePrice as generic base)
        // Actually activeProduct.salePrice is the selling price per m2 base. 
        // Let's assume standard markup logic.
        const estMaterialCost = (activeProduct.costPrice || (activeProduct.salePrice * 0.3)) * currentAutoArea * 1.2; // +20% waste

        return {
            baseCost: estMaterialCost,
            laborProfit: total - estMaterialCost,
            finalPrice: total
        };

    }, [autoBreakdown, selectedAutoParts, partComplexities, materialLevel, activeProduct, extras]);

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

                // Whitelist of parts that are actually visible/clickable in VehicleSvg
                const VALID_PARTS = ['capo', 'teto', 'porta_malas', 'parachoque_dianteiro', 'parachoque_traseiro', 'laterais', 'portas_dianteiras', 'portas_traseiras', 'vidro_traseiro'];

                // @ts-ignore
                Object.entries(breakdown).forEach(([key, val]: [string, any]) => {
                    if (val.w > 0 && val.h > 0 && VALID_PARTS.includes(key)) {
                        initialParts.add(key);
                    }
                });
                // Start with EMPTY selection as per user request to avoid "ghost" parts
                setSelectedAutoParts(new Set());

                // Initialize complexities (all default to Média initially, user can change)
                setPartComplexities({});

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

        // Create a detailed label string with complexities
        const complexitySummary = Array.from(selectedAutoParts).map(p => `${p}: ${partComplexities[p] || 'Média'}`).join(', ');
        const extrasSummary = Object.entries(extras).filter(([k, v]) => v).map(([k]) => k).join(', ');

        onConfirm([{
            quantity: 1,
            width: currentAutoArea, // Total Area
            height: 1,
            unitPrice: finalPrice,
            labelData: {
                type: 'automotive',
                vehicle: `${autoForm.make} ${autoForm.model} ${autoForm.year}`,
                parts: Array.from(selectedAutoParts),
                complexityDetail: partComplexities,
                materialLevel,
                extras: extras,
                complexitySummary,
                vehicleType
            }
        }]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-[90vw] h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex bg-[#09090b] border border-white/10 text-zinc-100 font-sans">

                {/* LEFT: Visual Map & Controls */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    {/* Toolbar */}
                    <div className="absolute top-6 left-6 z-20 flex gap-4">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSearchVehicle(); }}
                            className="glass-panel p-1 rounded-xl flex gap-1 bg-black/40 backdrop-blur-md border border-white/10"
                        >
                            {/* Make/Model Inputs Compact */}
                            <input placeholder="Marca" value={autoForm.make} onChange={e => setAutoForm({ ...autoForm, make: e.target.value })} className="w-24 px-3 py-2 bg-transparent text-xs font-bold text-white outline-none border-r border-white/10 placeholder-zinc-500" />
                            <input placeholder="Modelo" value={autoForm.model} onChange={e => setAutoForm({ ...autoForm, model: e.target.value })} className="w-24 px-3 py-2 bg-transparent text-xs font-bold text-white outline-none border-r border-white/10 placeholder-zinc-500" />
                            <input placeholder="Ano" value={autoForm.year} onChange={e => setAutoForm({ ...autoForm, year: e.target.value })} className="w-16 px-3 py-2 bg-transparent text-xs font-bold text-white outline-none placeholder-zinc-500" />
                            <button type="submit" disabled={isSearchingAuto || !autoForm.model} className="px-3 hover:bg-white/10 rounded-lg transition-colors text-fuchsia-400">
                                {isSearchingAuto ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                            </button>
                        </form>
                    </div>

                    {/* Main Interaction Area */}
                    <div className="flex-1 bg-gradient-to-br from-zinc-900 via-black to-zinc-900 relative flex items-center justify-center p-10">
                        {/* Vehicle SVG Component - Classic Blueprint Layout (Standard 4:3 or 16:9) */}
                        <div className="w-full max-w-4xl aspect-[16/10] bg-black/50 rounded-lg p-2 border border-zinc-800 pointer-events-none select-none opacity-80 grayscale-[0.5]">
                            <VehicleSvg
                                type={vehicleType}
                                selectedParts={selectedAutoParts}
                                onToggle={() => { }} // Disabled interaction
                                // @ts-ignore
                                partComplexities={partComplexities}
                                // @ts-ignore
                                dimensions={autoBreakdown}
                            />
                        </div>

                        {/* Button Selection Grid */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[95%]">
                            <div className="flex flex-wrap justify-center gap-2 p-4 glass-panel bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
                                {autoBreakdown && Object.entries(autoBreakdown).map(([part, dim]: [string, any]) => {
                                    // Filter out utility keys if any, or just show everything visually relevant
                                    if (dim.w === 0 || dim.h === 0) return null;
                                    const isSel = selectedAutoParts.has(part);

                                    return (
                                        <button
                                            key={part}
                                            onClick={() => toggleAutoPart(part)}
                                            className={`px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all duration-200 ${isSel
                                                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] scale-105'
                                                : 'bg-zinc-900 text-zinc-400 border-white/10 hover:bg-zinc-800 hover:border-white/20'
                                                }`}
                                        >
                                            {part.replace(/_/g, ' ')}
                                        </button>
                                    );
                                })}
                                {!autoBreakdown && <div className="text-zinc-500 text-xs animate-pulse">Iniciando sistema...</div>}
                            </div>
                        </div>

                        {/* Hint */}
                        <div className="absolute bottom-8 text-center w-full pointer-events-none">
                            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500">Clique nas peças para selecionar</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Detailed Configuration */}
                <div className="w-[450px] bg-surface border-l border-white/10 flex flex-col z-20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">CONFIGURAÇÃO</h2>
                            <p className="text-xs text-zinc-400 font-medium">{autoForm.make} {autoForm.model || 'Veículo'}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                        {/* Material Config */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-fuchsia-400 mb-1">
                                <Layers size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Material & Acabamento</span>
                            </div>
                            <select value={materialLevel} onChange={e => setMaterialLevel(e.target.value as any)} className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl font-bold text-xs outline-none focus:border-fuchsia-500 text-white transition-colors">
                                {Object.keys(MATERIAL_LEVELS).map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>

                        {/* Extras */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-cyan-400 mb-1">
                                <Sparkles size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Serviços Adicionais</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <button onClick={() => setExtras(prev => ({ ...prev, disassembly: !prev.disassembly }))} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${extras.disassembly ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900'}`}>
                                    <div className="flex items-center gap-3">
                                        <Wrench size={16} className={extras.disassembly ? 'text-cyan-400' : 'text-zinc-500'} />
                                        <div className="text-left">
                                            <p className={`text-xs font-bold ${extras.disassembly ? 'text-white' : 'text-zinc-400'}`}>Desmontagem Técnica</p>
                                            <p className="text-[10px] text-zinc-600">Maçanetas, lanternas, parachoques</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-cyan-500">R$ {EXTRAS_PRICES.disassembly}</span>
                                </button>

                                <button onClick={() => setExtras(prev => ({ ...prev, wash: !prev.wash }))} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${extras.wash ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900'}`}>
                                    <div className="flex items-center gap-3">
                                        <Droplets size={16} className={extras.wash ? 'text-cyan-400' : 'text-zinc-500'} />
                                        <div className="text-left">
                                            <p className={`text-xs font-bold ${extras.wash ? 'text-white' : 'text-zinc-400'}`}>Lavagem Detalhada</p>
                                            <p className="text-[10px] text-zinc-600">Descontaminação da pintura</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-cyan-500">R$ {EXTRAS_PRICES.wash}</span>
                                </button>

                                <button onClick={() => setExtras(prev => ({ ...prev, removal: !prev.removal }))} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${extras.removal ? 'bg-rose-500/10 border-rose-500/50' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900'}`}>
                                    <div className="flex items-center gap-3">
                                        <Scissors size={16} className={extras.removal ? 'text-rose-400' : 'text-zinc-500'} />
                                        <div className="text-left">
                                            <p className={`text-xs font-bold ${extras.removal ? 'text-white' : 'text-zinc-400'}`}>Remoção Material Antigo</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-rose-500">R$ {EXTRAS_PRICES.removal}</span>
                                </button>
                            </div>
                        </div>

                        {/* Dimension Editor (Manual Override) */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                <Gauge size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Medidas & Dimensões</span>
                            </div>
                            <div className="space-y-2">
                                {Array.from(selectedAutoParts).map(part => {
                                    const dim = autoBreakdown?.[part] || { w: 0, h: 0 };
                                    return (
                                        <div key={part} className="flex flex-col gap-1 p-2 bg-zinc-900/50 rounded border border-white/5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold uppercase text-zinc-300">{part.replace(/_/g, ' ')}</span>
                                                <span className="text-[9px] text-zinc-500">{(dim.w * dim.h).toFixed(2)}m²</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex items-center gap-1 bg-black rounded px-2 py-1 border border-white/5 flex-1">
                                                    <span className="text-[9px] text-zinc-500">L</span>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={dim.w}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            // @ts-ignore
                                                            setAutoBreakdown(prev => ({ ...prev, [part]: { ...prev[part], w: val } }));
                                                        }}
                                                        className="w-full bg-transparent text-xs font-mono text-emerald-400 outline-none hover:text-white focus:text-white"
                                                    />
                                                    <span className="text-[9px] text-zinc-600">m</span>
                                                </div>
                                                <div className="flex items-center gap-1 bg-black rounded px-2 py-1 border border-white/5 flex-1">
                                                    <span className="text-[9px] text-zinc-500">A</span>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={dim.h}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            // @ts-ignore
                                                            setAutoBreakdown(prev => ({ ...prev, [part]: { ...prev[part], h: val } }));
                                                        }}
                                                        className="w-full bg-transparent text-xs font-mono text-emerald-400 outline-none hover:text-white focus:text-white"
                                                    />
                                                    <span className="text-[9px] text-zinc-600">m</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {selectedAutoParts.size === 0 && <p className="text-[10px] text-zinc-600 italic py-2">Selecione peças no mapa para editar medidas.</p>}
                            </div>
                        </div>

                        {/* Part Details (Complexity Override) */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-zinc-400 mb-1">
                                <Gauge size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Complexidade</span>
                            </div>
                            <div className="space-y-2">
                                {Array.from(selectedAutoParts).map(part => (
                                    <div key={part} className="flex items-center justify-between text-xs group">
                                        <span className="uppercase font-bold text-zinc-400 group-hover:text-white transition-colors">{part.replace('_', ' ')}</span>
                                        <select
                                            value={partComplexities[part] || 'Média'}
                                            onChange={(e) => setPartComplexities({ ...partComplexities, [part]: e.target.value as any })}
                                            className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[10px] font-bold text-zinc-300 focus:text-white outline-none"
                                        >
                                            <option value="Baixa">Baixa (1.0x)</option>
                                            <option value="Média">Média (1.25x)</option>
                                            <option value="Alta">Alta (1.6x)</option>
                                            <option value="Extrema">Extrema (2.0x)</option>
                                        </select>
                                    </div>
                                ))}
                                {selectedAutoParts.size === 0 && <p className="text-[10px] text-zinc-600 italic py-2">Nenhuma peça selecionada.</p>}
                            </div>
                        </div>

                    </div>

                    {/* Footer / Total */}
                    <div className="p-6 bg-zinc-900 border-t border-white/10 space-y-4">
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                <span>Custo Operacional Est.</span>
                                <span>R$ {baseCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                <span>Margem de Lucro</span>
                                <span className="text-emerald-500">R$ {laborProfit.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest mb-1">Total Final</p>
                                <p className="text-4xl font-black text-white tracking-tighter">R$ {finalPrice.toFixed(2)}</p>
                            </div>
                            <button
                                onClick={handleConfirm}
                                disabled={finalPrice === 0}
                                className="h-12 px-8 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-fuchsia-600/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                            >
                                Adicionar <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AutomotiveModal;
