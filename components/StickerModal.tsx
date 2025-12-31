import React, { useState, useMemo } from 'react';
import { X, Scissors, Grid, LayoutTemplate, ArrowRight, Info } from 'lucide-react';
import { Product } from '../types';

interface StickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (item: any) => void;
    activeProduct: Product | null;
}

const StickerModal: React.FC<StickerModalProps> = ({ isOpen, onClose, onConfirm, activeProduct }) => {
    const [mode, setMode] = useState<'quantity' | 'area'>('quantity'); // 'quantity' = I want N stickers; 'area' = How many fit in X by Y?

    // Dimensions for single sticker
    const [dims, setDims] = useState({ width: 5, height: 5, gapMm: 3 });

    // Target for 'quantity' mode
    const [targetQty, setTargetQty] = useState(100);

    // Target for 'area' mode
    const [targetArea, setTargetArea] = useState({ w: 1, h: 1 }); // meters

    // Manual Price Override (initially set to product price, fallback to cost)
    const [pricePerM2, setPricePerM2] = useState(activeProduct?.salePrice || activeProduct?.costPrice || 0);

    React.useEffect(() => {
        if (activeProduct) {
            // Ensure we handle potential string numbers
            const rawPrice = activeProduct.salePrice;
            const validPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice) : Number(rawPrice);
            setPricePerM2(validPrice || activeProduct.costPrice || 0);
        }
    }, [activeProduct]);

    const rollWidth = activeProduct?.availableRollWidths?.[0] || 1.20;

    const calculation = useMemo(() => {
        const wCm = dims.width + (dims.gapMm / 10);
        const hCm = dims.height + (dims.gapMm / 10);
        const rollWCm = rollWidth * 100;

        // How many fit in one row (width-wise)?
        const cols = Math.floor(rollWCm / wCm);
        if (cols === 0) return { totalLabels: 0, finalArea: 0, distinctRows: 0 };

        if (mode === 'quantity') {
            // We need N labels. How many rows?
            const rowsNeeded = Math.ceil(targetQty / cols);
            const linearCentimeters = rowsNeeded * hCm;
            const linearMeters = linearCentimeters / 100;
            return {
                totalLabels: targetQty,
                finalArea: linearMeters * rollWidth,
                linearMeters,
                cols
            };
        } else {
            // Fit in Area Mode (W x H)
            const targetWCm = targetArea.w * 100;
            const targetHCm = targetArea.h * 100;

            const colsInArea = Math.floor(targetWCm / wCm);
            const rowsInArea = Math.floor(targetHCm / hCm);
            const totalFit = colsInArea * rowsInArea;

            return {
                totalLabels: totalFit,
                finalArea: targetArea.w * targetArea.h,
                cols: colsInArea,
                rows: rowsInArea
            };
        }
    }, [dims, targetQty, targetArea, mode, rollWidth]);

    const handleConfirm = () => {
        if (!activeProduct) return;

        onConfirm({
            quantity: 1, // We sell 1 "Job" of X area
            width: mode === 'area' ? targetArea.w : calculation.linearMeters || 1, // Store roughly the dimensions
            height: mode === 'area' ? targetArea.h : rollWidth,
            unitPrice: pricePerM2 * calculation.finalArea, // Price for the total area
            labelData: {
                type: 'sticker',
                mode,
                singleWidth: dims.width,
                singleHeight: dims.height,
                gapMm: dims.gapMm,
                totalLabels: calculation.totalLabels,
                areaM2: calculation.finalArea
            },
            overrideUnitPrice: pricePerM2 // Pass unit price for subtotal calc if needed
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            {/* Added bg-slate-900 explicitly here to ensure dark theme even if glass-card fails */}
            <div className="glass-card w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10 bg-slate-900/95 text-slate-200">

                {/* Header */}
                <div className="p-4 lg:p-8 bg-[#0F172A] text-white flex justify-between items-center shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Scissors size={28} className="text-white" />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black uppercase tracking-tight text-white">Estúdio de Adesivos</h4>
                            <p className="text-slate-400 text-xs font-bold uppercase mt-1">Otimização e Corte</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X size={24} /></button>
                </div>

                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-slate-900/50">
                    {/* Controls */}
                    <div className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar space-y-8">

                        {/* Mode Switch */}
                        <div className="flex bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
                            <button
                                onClick={() => setMode('quantity')}
                                className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'quantity' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                            >
                                Tenho a Quantidade
                            </button>
                            <button
                                onClick={() => setMode('area')}
                                className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'area' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                            >
                                Tenho a Área (M²)
                            </button>
                        </div>

                        <div className="space-y-6">
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Grid size={14} /> Configuração da Unidade - {activeProduct?.name}
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase">Largura (cm)</label>
                                    <input type="number" value={dims.width} onChange={e => setDims({ ...dims, width: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl font-black outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase">Altura (cm)</label>
                                    <input type="number" value={dims.height} onChange={e => setDims({ ...dims, height: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl font-black outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase">Sangria (mm)</label>
                                    <input type="number" value={dims.gapMm} onChange={e => setDims({ ...dims, gapMm: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl font-black outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600" />
                                </div>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-2">
                                <label className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-1">
                                    Preço do Material (R$/m²) {pricePerM2 === 0 && <span className="text-red-500">*</span>}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-xs">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={pricePerM2}
                                        onChange={e => setPricePerM2(parseFloat(e.target.value) || 0)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-amber-500/30 rounded-xl font-black text-white outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-600"
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-white/5 w-full" />

                            {mode === 'quantity' ? (
                                <div className="space-y-2 animate-in fade-in slide-in-from-left-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantidade Desejada</label>
                                    <input type="number" value={targetQty} onChange={e => setTargetQty(parseInt(e.target.value) || 0)} className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-400 placeholder-slate-600" />
                                </div>
                            ) : (
                                <div className="space-y-2 animate-in fade-in slide-in-from-right-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Área de Preenchimento (Metros)</label>
                                    <div className="flex gap-4">
                                        <input type="number" step="0.01" value={targetArea.w} onChange={e => setTargetArea({ ...targetArea, w: parseFloat(e.target.value) || 0 })} className="flex-1 px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-400 placeholder-slate-600" placeholder="Largura (m)" />
                                        <span className="self-center font-black text-slate-600">x</span>
                                        <input type="number" step="0.01" value={targetArea.h} onChange={e => setTargetArea({ ...targetArea, h: parseFloat(e.target.value) || 0 })} className="flex-1 px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-400 placeholder-slate-600" placeholder="Altura (m)" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl flex gap-3 text-slate-400">
                            <Info size={20} className="shrink-0 mt-1 text-indigo-500" />
                            <p className="text-xs font-medium leading-relaxed">
                                {mode === 'quantity'
                                    ? `Otimizando para rolo de ${rollWidth.toFixed(2)}m. Calcularemos a metragem linear necessária.`
                                    : `Calculando quantos adesivos de ${dims.width}x${dims.height}cm cabem em ${targetArea.w}x${targetArea.h}m.`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Solution Preview */}
                    <div className="w-full lg:w-[400px] bg-gradient-to-br from-indigo-600 to-indigo-900 text-white p-8 flex flex-col justify-between relative overflow-hidden shadow-inner border-t lg:border-t-0 lg:border-l border-white/10">
                        {/* Background Pattern */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="space-y-8 relative z-10">
                            <div>
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Resultado da Otimização</p>
                                <div className="mt-6 text-center">
                                    <p className="text-6xl font-black tracking-tight">{calculation.totalLabels}</p>
                                    <p className="text-sm font-bold text-indigo-200 mt-2 uppercase">Unidades Totais</p>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-6 space-y-3 backdrop-blur-sm border border-white/5">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-indigo-200">Área de Consumo</span>
                                    <span className="font-bold">{calculation.finalArea.toFixed(2)} m²</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-indigo-200">Aproveitamento</span>
                                    <span className="font-bold">{calculation.cols} por linha (Rolo)</span>
                                </div>
                                <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-indigo-200">Preço Unitário</span>
                                    <span className="font-bold">R$ {((pricePerM2 * calculation.finalArea) / (calculation.totalLabels || 1)).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-3xl font-black text-white">R$ {(pricePerM2 * calculation.finalArea).toFixed(2)}</p>
                                {pricePerM2 === 0 && (
                                    <p className="text-[9px] text-amber-400 font-bold mt-1 max-w-[200px] leading-tight">⚠ Defina um preço por m² para calcular.</p>
                                )}
                                <p className="text-[10px] text-indigo-300 uppercase font-black tracking-widest">Valor Total</p>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={calculation.totalLabels === 0}
                            className="w-full py-5 bg-white text-indigo-700 hover:bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                        >
                            Adicionar {calculation.totalLabels} Adesivos <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default StickerModal;
