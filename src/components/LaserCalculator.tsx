import React, { useState, useEffect } from 'react';
import DxfParser from 'dxf-parser';
import { Upload, Calculator, Zap, FileCode, CheckCircle, AlertCircle, Plus, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Product } from '../types';

interface LaserCalculatorProps {
    products?: Product[];
    onAddToQuote?: (item: any) => void;
}

const LaserCalculator: React.FC<LaserCalculatorProps> = ({ products = [], onAddToQuote }) => {
    const [file, setFile] = useState<File | null>(null);
    const [stats, setStats] = useState({ totalLengthMm: 0, entityCount: 0, widthMm: 0, heightMm: 0, areaM2: 0 });
    const [loading, setLoading] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");

    // Config
    const [config, setConfig] = useState({
        speedMmPerSec: 15, // Default for MDF 3mm approx
        machineCostPerMin: 2.00,
        marginPercent: 100
    });

    const [result, setResult] = useState<{ timeMin: number, cutCost: number, materialCost: number, total: number } | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseDXF(selectedFile);
        }
    };

    const parseDXF = (file: File) => {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parser = new DxfParser();
                const dxfString = e.target?.result as string;
                const dxf = parser.parseSync(dxfString);

                if (!dxf) throw new Error("Invalid DXF");

                let totalLen = 0;
                let count = 0;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

                const updateBounds = (x: number, y: number) => {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                };

                // Iterate entities
                dxf.entities.forEach((entity: any) => {
                    count++;
                    let vertices: any[] = [];

                    switch (entity.type) {
                        case 'LINE':
                            vertices = entity.vertices;
                            totalLen += calcDistance(entity.vertices[0], entity.vertices[1]);
                            break;
                        case 'LWPOLYLINE':
                        case 'POLYLINE':
                            vertices = entity.vertices || [];
                            if (vertices.length > 1) {
                                for (let i = 0; i < vertices.length - 1; i++) {
                                    totalLen += calcDistance(vertices[i], vertices[i + 1]);
                                }
                                if (entity.shape || entity.closed) {
                                    totalLen += calcDistance(vertices[vertices.length - 1], vertices[0]);
                                }
                            }
                            break;
                        case 'CIRCLE':
                            updateBounds(entity.center.x - entity.radius, entity.center.y - entity.radius);
                            updateBounds(entity.center.x + entity.radius, entity.center.y + entity.radius);
                            totalLen += 2 * Math.PI * entity.radius;
                            break;
                        case 'ARC':
                            // Bounds approx for Arc is complex, using center +/- radius as safe loose bounds
                            updateBounds(entity.center.x - entity.radius, entity.center.y - entity.radius);
                            updateBounds(entity.center.x + entity.radius, entity.center.y + entity.radius);

                            let angle = entity.endAngle - entity.startAngle;
                            if (angle < 0) angle += 2 * Math.PI;
                            totalLen += entity.radius * angle;
                            break;
                    }

                    // Update bounds for vertices
                    if (vertices.length > 0) {
                        vertices.forEach((v: any) => updateBounds(v.x, v.y));
                    }
                });

                // Calculate Dimensions
                const widthMm = (maxX - minX) || 0;
                const heightMm = (maxY - minY) || 0;

                // Safety check for empty/invalid
                const safeWidth = widthMm > 0 && widthMm < 100000 ? widthMm : 0;
                const safeHeight = heightMm > 0 && heightMm < 100000 ? heightMm : 0;

                // M2 Calculation
                const areaM2 = (safeWidth * safeHeight) / 1000000;

                setStats({ totalLengthMm: totalLen, entityCount: count, widthMm: safeWidth, heightMm: safeHeight, areaM2 });

                // Calculate initial price
                calculatePrice(totalLen, config.speedMmPerSec, config.machineCostPerMin, config.marginPercent, selectedMaterialId, areaM2);

            } catch (err) {
                console.error("DXF Parse Error", err);
                alert("Erro ao ler DXF. Certifique-se que é um arquivo ASCII DXF válido.");
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const calcDistance = (p1: any, p2: any) => {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    const calculatePrice = (
        len: number = stats.totalLengthMm,
        speed: number = config.speedMmPerSec,
        machCost: number = config.machineCostPerMin,
        margin: number = config.marginPercent,
        matId: string = selectedMaterialId,
        area: number = stats.areaM2
    ) => {
        if (len <= 0) return;

        // Cut Time
        const timeSeconds = len / speed;
        const timeMinutes = timeSeconds / 60;

        // Machine Cost
        const machCostTotal = timeMinutes * machCost;

        // Material Cost
        let matCostTotal = 0;
        if (matId) {
            const material = products.find(p => p.id === matId);
            if (material) {
                // Normalize check for m2, m², M2
                const isArea = ['m2', 'm²', 'M2'].includes(material.unitType) || material.unitType.toLowerCase().includes('m2');

                if (isArea) {
                    matCostTotal = area * material.salePrice;
                } else {
                    // If unit, charge base price
                    matCostTotal = material.salePrice;
                }
            }
        }

        const subtotal = machCostTotal + matCostTotal;
        const total = subtotal * (1 + margin / 100);

        setResult({
            timeMin: timeMinutes,
            cutCost: machCostTotal,
            materialCost: matCostTotal,
            total
        });
    };

    // Update result when dependencies change
    useEffect(() => {
        if (stats.totalLengthMm > 0) {
            calculatePrice(stats.totalLengthMm, config.speedMmPerSec, config.machineCostPerMin, config.marginPercent, selectedMaterialId, stats.areaM2);
        }
    }, [config, stats.totalLengthMm, selectedMaterialId, stats.areaM2]);

    const handleAdd = () => {
        if (!result || !onAddToQuote) return;

        let matName = '';
        if (selectedMaterialId) {
            const material = products.find(p => p.id === selectedMaterialId);
            if (material) matName = `, ${material.name}`;
        }

        onAddToQuote({
            productName: `Corte Laser Personalizado${matName}`,
            quantity: 1,
            unitPrice: result.total,
            subtotal: result.total,
            description: `Tempo: ${result.timeMin.toFixed(1)}min | Mat: ${selectedMaterialId ? 'Sim' : 'Não'}`,
            width: stats.widthMm / 1000,
            height: stats.heightMm / 1000
        });
    };

    return (
        <Card className={`glass-card bg-surface/50 border-white/10 text-white mx-auto ${onAddToQuote ? 'w-full shadow-none border-0' : 'max-w-4xl'}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-brand-magenta">
                    <Zap size={24} />
                    Calculadora de Corte a Laser (DXF)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Upload Area */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl opacity-20 group-hover:opacity-40 transition-opacity blur"></div>
                    <div className="relative bg-surface rounded-xl p-8 border border-white/10 border-dashed flex flex-col items-center justify-center gap-3 text-center hover:border-white/20 transition-all">
                        <Upload size={32} className="text-secondary group-hover:text-cyan-400 transition-colors" />
                        <div>
                            <p className="font-bold text-lg">Arraste seu DXF ou clique para upload</p>
                            <p className="text-sm text-secondary">Suporta: Linhas, Polilinhas, Círculos, Arcos</p>
                        </div>
                        <input
                            type="file"
                            accept=".dxf"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                </div>

                {/* Stats & Config Grid */}
                {file && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* File Stats */}
                        <div className="bg-surface/30 p-5 rounded-xl border border-white/10 space-y-3">
                            <h3 className="flex items-center gap-2 font-bold text-cyan-400">
                                <FileCode size={18} />
                                Geometria
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] uppercase text-secondary font-bold">Perímetro</p>
                                    <p className="text-xl font-black">{(stats.totalLengthMm / 1000).toFixed(2)} <span className="text-sm text-secondary">m</span></p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-secondary font-bold">Área (Box)</p>
                                    <p className="text-xl font-black">{stats.areaM2.toFixed(3)} <span className="text-sm text-secondary">m²</span></p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] uppercase text-secondary font-bold mb-1">Dimensões Envolventes</p>
                                    <p className="text-sm font-bold text-white/80">{stats.widthMm.toFixed(0)}mm x {stats.heightMm.toFixed(0)}mm</p>
                                </div>
                            </div>
                        </div>

                        {/* Configuration */}
                        {/* Configuration */}
                        <div className="bg-surface/30 p-5 rounded-xl border border-white/10 space-y-3">
                            <h3 className="flex items-center gap-2 font-bold text-purple-400">
                                <Calculator size={18} />
                                Configuração
                            </h3>

                            {/* Material Select */}
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-secondary">Material (Estoque)</label>
                                <select
                                    value={selectedMaterialId}
                                    onChange={e => setSelectedMaterialId(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm font-bold text-white focus:border-cyan-500 outline-none"
                                >
                                    <option value="" className="bg-neutral-900 text-white">Apenas Serviço (Sem Material)</option>
                                    {products.filter(p => !p.isComposite).map(p => (
                                        <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                                            {p.name} (R$ {p.salePrice.toFixed(2)}/{p.unitType})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-secondary">Veloc (mm/s)</label>
                                    <input
                                        type="number"
                                        value={config.speedMmPerSec}
                                        onChange={e => setConfig({ ...config, speedMmPerSec: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm font-bold text-white focus:border-cyan-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-secondary">Custo (R$/min)</label>
                                    <input
                                        type="number"
                                        value={config.machineCostPerMin}
                                        onChange={e => setConfig({ ...config, machineCostPerMin: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm font-bold text-white focus:border-cyan-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] uppercase font-bold text-secondary">Margem de Lucro (%)</label>
                                    <input
                                        type="number"
                                        value={config.marginPercent}
                                        onChange={e => setConfig({ ...config, marginPercent: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm font-bold text-white focus:border-cyan-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Footer */}
                {result && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-600/10 border border-emerald-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex bg-surface/50 p-4 rounded-xl items-center gap-4">
                                <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <p className="text-xs uppercase font-bold text-emerald-400">Tempo Estimado</p>
                                    <p className="text-3xl font-black text-white">{result.timeMin.toFixed(2)} <span className="text-sm text-secondary">min</span></p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-xs text-secondary mb-1 flex justify-end gap-3 font-medium">
                                    <span>Máquina: <span className="text-white">R$ {result.cutCost.toFixed(2)}</span></span>
                                    <span>+</span>
                                    <span>Material: <span className="text-white">R$ {result.materialCost.toFixed(2)}</span></span>
                                </div>
                                <p className="text-4xl font-black text-emerald-400">R$ {result.total.toFixed(2)}</p>
                            </div>
                        </div>

                        {onAddToQuote && (
                            <button
                                onClick={handleAdd}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Plus size={20} />
                                Adicionar ao Orçamento
                            </button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card >
    );
};

export default LaserCalculator;
