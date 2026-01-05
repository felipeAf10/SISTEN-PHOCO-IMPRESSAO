import React, { useState, useEffect } from 'react';
import { Upload, Download, Image as ImageIcon, Wand2, RefreshCw, ZoomIn, ZoomOut, Contrast, Layers, Filter, Palette } from 'lucide-react';
import { toast } from 'sonner';

import ImageTracer from 'imagetracerjs';
import Upscaler from 'upscaler';

const VectorizationLab: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Config ImageTracer
    const [colormode, setColormode] = useState<'color' | 'binary'>('color');
    const [useAI, setUseAI] = useState(true); // AI Upscaling toggle
    const [upscalerProgress, setUpscalerProgress] = useState(0);
    const [colors, setColors] = useState(16);
    const [blur, setBlur] = useState(0);
    const [scale, setScale] = useState(1);
    const [ltres, setLtres] = useState(1); // Linear error
    const [qtres, setQtres] = useState(1); // Quadratic error
    const [pathomit, setPathomit] = useState(8); // Min path length

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setOriginalImage(event.target.result as string);
                setSvgContent(null);
            }
        };
        reader.readAsDataURL(file);
    };

    const processImage = async () => {
        if (!originalImage) return;
        setIsProcessing(true);
        setUpscalerProgress(0);

        try {
            // 1. AI PRE-PROCESSING (Super Resolution)
            let imageToVec = originalImage;

            if (useAI) {
                toast.info("Iniciando aprimoramento com IA...");
                const upscaler = new Upscaler();

                // Convert base64 to Image object for Upscaler
                const img = new Image();
                img.src = originalImage;
                await new Promise((resolve) => { img.onload = resolve; });

                const upscaledData = await upscaler.upscale(img, {
                    patchSize: 64,
                    padding: 4,
                    progress: (percent) => {
                        setUpscalerProgress(Math.round(percent * 100));
                    }
                });

                imageToVec = upscaledData;
                toast.success("Imagem aprimorada (2x) com sucesso!");
            }

            // 2. CLASSIC VECTORIZATION
            const options = {
                colorsampling: 2, // Deterministic
                numberofcolors: colormode === 'binary' ? 2 : colors,
                mincolorratio: 0,
                blurradius: blur,
                blurdelta: 20,
                ltres: ltres,
                qtres: qtres,
                pathomit: pathomit,
                rightangleenhance: false, // Sometimes makes weird shapes
                colorsupport: true, // Should be default but explicit is good
                scale: scale,
                strokewidth: 0,
                linefilter: true,
                roundcoords: 2,
                viewbox: true,
                desc: false,
                lcpr: 0,
                qcpr: 0,
            };

            // ImageTracer loops can block UI, wrapping in timeout
            setTimeout(() => {
                try {
                    if (typeof ImageTracer === 'undefined') {
                        throw new Error("Motor de vetorização não carregado.");
                    }

                    ImageTracer.imageToSVG(
                        imageToVec, // Use the (potentially) upscaled image
                        (svgstr: string) => {
                            setSvgContent(svgstr);
                            setIsProcessing(false);
                            toast.success("Vetorização concluída!");
                        },
                        options
                    );
                } catch (error: any) {
                    console.error("Vectorization setup error:", error);
                    toast.error("Erro ao vetorizar: " + error.message);
                    setIsProcessing(false);
                }
            }, 100);

        } catch (error: any) {
            console.error("AI/Vectorization error:", error);
            toast.error("Erro no processo: " + error.message);
            setIsProcessing(false);
        }
    };

    const applyPreset = (type: 'logo_bw' | 'logo_color' | 'photo') => {
        if (type === 'logo_bw') {
            setColormode('binary');
            setColors(2);
            setLtres(0.5); // High precision
            setQtres(0.5);
            setPathomit(8);
            setBlur(0);
        } else if (type === 'logo_color') {
            setColormode('color');
            setColors(16);
            setLtres(1);
            setQtres(1);
            setPathomit(8);
            setBlur(0);
        } else if (type === 'photo') {
            setColormode('color');
            setColors(64); // Max colors
            setLtres(0.5); // High precision
            setQtres(0.5);
            setPathomit(2); // Keep small details
            setBlur(1); // Smooth noise
        }
        toast.info("Preset aplicado!");
    };

    const downloadSVG = () => {
        if (!svgContent) return;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'vector-result.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-8 h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Wand2 className="text-indigo-500" size={32} />
                        Vetorizador <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full ml-2">COLOR</span>
                    </h1>
                    <p className="text-secondary mt-1">Motor JavaScript otimizado para Cores e Logos.</p>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => applyPreset('logo_bw')} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-md text-xs border border-white/10 transition-colors">Preset: Logo P&B</button>
                    <button onClick={() => applyPreset('logo_color')} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-md text-xs border border-white/10 transition-colors">Preset: Logo Color</button>
                    <button onClick={() => applyPreset('photo')} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-md text-xs border border-white/10 transition-colors">Preset: Foto Detalhada</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">

                {/* SETTINGS SIDEBAR */}
                <div className="lg:col-span-3 bg-surface rounded-3xl border border-white/5 p-6 space-y-6 h-fit overflow-y-auto max-h-full custom-scrollbar">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 relative group cursor-pointer hover:border-indigo-500/50 transition-colors">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center text-center py-4">
                            <Upload className="text-indigo-400 mb-2 group-hover:scale-110 transition-transform" size={24} />
                            <span className="text-sm font-bold text-white">Carregar Imagem</span>
                        </div>
                    </div>

                    {originalImage && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-xs font-black uppercase text-secondary flex items-center gap-2">
                                    <Wand2 size={12} /> Inteligência Artificial
                                </h3>
                                <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white">Super Resolução (2x)</span>
                                        <span className="text-[10px] text-secondary">Aumenta detalhes com IA</span>
                                    </div>
                                    <button
                                        onClick={() => setUseAI(!useAI)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${useAI ? 'bg-indigo-500' : 'bg-white/20'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useAI ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xs font-black uppercase text-secondary flex items-center gap-2">
                                    <Contrast size={12} /> Modo
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setColormode('color')}
                                        className={`p-2 rounded-lg text-xs font-bold transition-colors ${colormode === 'color' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-secondary hover:bg-white/10'}`}
                                    >
                                        Colorido
                                    </button>
                                    <button
                                        onClick={() => setColormode('binary')}
                                        className={`p-2 rounded-lg text-xs font-bold transition-colors ${colormode === 'binary' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-secondary hover:bg-white/10'}`}
                                    >
                                        P&B
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xs font-black uppercase text-secondary flex items-center gap-2">
                                    <Palette size={12} /> Paleta
                                </h3>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-secondary">
                                        <span>Cores (Max)</span>
                                        <span>{colors}</span>
                                    </div>
                                    <input type="range" min="2" max="64" value={colors} onChange={(e) => setColors(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none" disabled={colormode === 'binary'} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xs font-black uppercase text-secondary flex items-center gap-2">
                                    <Filter size={12} /> Acabamento
                                </h3>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-secondary">
                                        <span>Suavização (Antialias)</span>
                                        <span>{blur}px</span>
                                    </div>
                                    <input type="range" min="0" max="4" step="0.5" value={blur} onChange={(e) => setBlur(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xs font-black uppercase text-secondary flex items-center gap-2">
                                    <Layers size={12} /> Geometria
                                </h3>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-secondary">
                                        <span>Precisão (Erro Linear)</span>
                                        <span>{ltres}px</span>
                                    </div>
                                    {/* Lower is better quality */}
                                    <input type="range" min="0.1" max="5" step="0.1" value={ltres} onChange={(e) => setLtres(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none" />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-secondary">
                                        <span>Curvas (Erro Quad)</span>
                                        <span>{qtres}px</span>
                                    </div>
                                    <input type="range" min="0.1" max="5" step="0.1" value={qtres} onChange={(e) => setQtres(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none" />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-secondary">
                                        <span>Filtro de Ruído (Limpeza)</span>
                                        <span>{pathomit}px</span>
                                    </div>
                                    <input type="range" min="0" max="250" value={pathomit} onChange={(e) => setPathomit(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none" />
                                </div>
                            </div>

                            <button
                                onClick={processImage}
                                disabled={isProcessing}
                                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold uppercase tracking-wide rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
                                {isProcessing ? 'Processando...' : 'Vetorizar'}
                            </button>
                        </div>
                    )}
                </div>

                {/* PREVIEW AREA */}
                <div className="lg:col-span-9 grid grid-cols-2 gap-4 h-[70vh]">
                    <div className="bg-black/40 rounded-3xl border border-white/10 p-4 relative flex flex-col">
                        <span className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white z-10">Original</span>
                        <div className="flex-1 flex items-center justify-center overflow-hidden">
                            {originalImage ? (
                                <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="text-white/20 flex flex-col items-center">
                                    <ImageIcon size={48} className="mb-2" />
                                    <p className="text-sm font-medium">Nenhuma imagem</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-3xl border border-white/10 p-4 relative flex flex-col group">
                        <span className="absolute top-4 left-4 bg-indigo-500/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white z-10">Vetor (SVG)</span>

                        {svgContent && (
                            <button
                                onClick={downloadSVG}
                                className="absolute top-4 right-4 bg-white text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-100 transition-all z-20 flex items-center gap-2 shadow-lg"
                            >
                                <Download size={14} /> Baixar
                            </button>
                        )}

                        <div className="flex-1 flex items-center justify-center overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzIyMiIvPgo8Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0iIzMzMyIvPgo8L3N2Zz4=')]">
                            {svgContent ? (
                                <div dangerouslySetInnerHTML={{ __html: svgContent }} className="w-full h-full [&>svg]:w-full [&>svg]:h-full" />
                            ) : (
                                <div className="text-white/20 flex flex-col items-center">
                                    <Wand2 size={48} className="mb-2" />
                                    <p className="text-sm font-medium">Aguardando vetorização</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default VectorizationLab;
