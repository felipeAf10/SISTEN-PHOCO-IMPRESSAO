
import React, { useState } from 'react';
import { Plus, Trash2, Calculator, Timer, TrendingUp, Info, AlertTriangle, Percent, DollarSign, Wallet, Users, Edit2, Check, X } from 'lucide-react';
import { FixedAsset, FixedCost, FinancialConfig } from '../types';
import { api } from '../src/services/api';

interface FinancialModuleProps {
  fixedAssets: FixedAsset[];
  setFixedAssets: (assets: FixedAsset[]) => void;
  fixedCosts: FixedCost[];
  setFixedCosts: (costs: FixedCost[]) => void;
  config: FinancialConfig;
  setConfig: (config: FinancialConfig) => void;
}

const FinancialModule: React.FC<FinancialModuleProps> = ({
  fixedAssets, setFixedAssets, fixedCosts, setFixedCosts, config, setConfig
}) => {
  const [assetName, setAssetName] = useState('');
  const [assetVal, setAssetVal] = useState(0);
  const [assetLife, setAssetLife] = useState(5);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  const [costDesc, setCostDesc] = useState('');
  const [costVal, setCostVal] = useState(0);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);

  const totalFixedCosts = fixedCosts.reduce((acc, c) => acc + c.value, 0);
  const totalDepreciation = fixedAssets.reduce((acc, a) => acc + a.monthlyDepreciation, 0);
  const grandTotalMonthly = totalFixedCosts + totalDepreciation;
  const costPerHour = grandTotalMonthly / (config.productiveHoursPerMonth || 1);

  const saveAsset = async () => {
    if (!assetName || assetVal <= 0) return;
    const monthlyDepr = (assetVal / assetLife) / 12;

    try {
      if (editingAssetId) {
        const updatedAsset: FixedAsset = {
          id: editingAssetId,
          name: assetName,
          value: assetVal,
          usefulLifeYears: assetLife,
          monthlyDepreciation: monthlyDepr
        };
        await api.financial.saveAsset(updatedAsset);
        setFixedAssets(fixedAssets.map(a => a.id === editingAssetId ? updatedAsset : a));
        setEditingAssetId(null);
      } else {
        const newAsset: FixedAsset = {
          id: crypto.randomUUID(),
          name: assetName,
          value: assetVal,
          usefulLifeYears: assetLife,
          monthlyDepreciation: monthlyDepr
        };
        await api.financial.saveAsset(newAsset);
        setFixedAssets([...fixedAssets, newAsset]);
      }
      setAssetName(''); setAssetVal(0); setAssetLife(5);
    } catch (error) {
      console.error("Error saving asset:", error);
      alert("Erro ao salvar ativo.");
    }
  };

  const startEditAsset = (asset: FixedAsset) => {
    setEditingAssetId(asset.id);
    setAssetName(asset.name);
    setAssetVal(asset.value);
    setAssetLife(asset.usefulLifeYears);
  };

  const saveCost = async () => {
    if (!costDesc || costVal <= 0) return;

    try {
      if (editingCostId) {
        const updatedCost: FixedCost = {
          id: editingCostId,
          description: costDesc,
          value: costVal
        };
        await api.financial.saveCost(updatedCost);
        setFixedCosts(fixedCosts.map(c => c.id === editingCostId ? updatedCost : c));
        setEditingCostId(null);
      } else {
        const newCost: FixedCost = { id: crypto.randomUUID(), description: costDesc, value: costVal };
        await api.financial.saveCost(newCost);
        setFixedCosts([...fixedCosts, newCost]);
      }
      setCostDesc(''); setCostVal(0);
    } catch (error) {
      console.error("Error saving cost:", error);
      alert("Erro ao salvar custo.");
    }
  };

  const startEditCost = (cost: FixedCost) => {
    setEditingCostId(cost.id);
    setCostDesc(cost.description);
    setCostVal(cost.value);
  };

  const handleSaveConfig = async () => {
    try {
      await api.financial.updateConfig(config);
    } catch (error) {
      console.error("Error saving config:", error);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Engenharia <span className="text-brand-magenta">Financeira</span></h2>
          <p className="text-slate-500 font-medium mt-1">Configure as variáveis que garantem a saúde do caixa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card bg-[#0F172A] p-6 rounded-[2rem] text-white shadow-xl border border-white/10">
          <Percent size={20} className="text-brand-magenta mb-3" />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Impostos (DAS)</p>
          <div className="flex items-center gap-2 mt-2">
            <input type="number" value={config.taxPercent} onChange={e => setConfig({ ...config, taxPercent: parseFloat(e.target.value) })} onBlur={handleSaveConfig} className="bg-transparent border-b border-brand-magenta text-2xl font-black w-20 outline-none" />
            <span className="text-xl">%</span>
          </div>
        </div>
        <div className="glass-card bg-[#0F172A] p-6 rounded-[2rem] text-white shadow-xl border border-white/10">
          <Users size={20} className="text-brand-cyan mb-3" />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Comissão Vendedor</p>
          <div className="flex items-center gap-2 mt-2">
            <input type="number" value={config.commissionPercent} onChange={e => setConfig({ ...config, commissionPercent: parseFloat(e.target.value) })} onBlur={handleSaveConfig} className="bg-transparent border-b border-brand-cyan text-2xl font-black w-20 outline-none" />
            <span className="text-xl">%</span>
          </div>
        </div>
        <div className="glass-card bg-[#0F172A] p-6 rounded-[2rem] text-white shadow-xl border border-white/10">
          <Wallet size={20} className="text-brand-yellow mb-3" />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Margem de Lucro</p>
          <div className="flex items-center gap-2 mt-2">
            <input type="number" value={config.targetProfitMargin} onChange={e => setConfig({ ...config, targetProfitMargin: parseFloat(e.target.value) })} onBlur={handleSaveConfig} className="bg-transparent border-b border-brand-yellow text-2xl font-black w-20 outline-none" />
            <span className="text-xl">%</span>
          </div>
        </div>
        <div className="glass-card bg-brand-magenta p-6 rounded-[2rem] text-white shadow-xl shadow-pink-500/20 border border-white/10">
          <Timer size={20} className="text-pink-200 mb-3" />
          <p className="text-[10px] font-black uppercase text-pink-100 tracking-widest">Capacidade Mensal</p>
          <div className="flex items-center gap-2 mt-2">
            <input type="number" value={config.productiveHoursPerMonth} onChange={e => setConfig({ ...config, productiveHoursPerMonth: parseInt(e.target.value) })} onBlur={handleSaveConfig} className="bg-transparent border-b border-white text-2xl font-black w-20 outline-none" />
            <span className="text-sm font-bold">HORAS</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* IMOBILIZADO */}
        <div className="glass-card bg-white/70 rounded-[2.5rem] shadow-sm border border-white/50 overflow-hidden">
          <div className="bg-[#FF4136] p-5 text-white flex justify-between items-center">
            <h3 className="font-black text-sm tracking-widest uppercase">{editingAssetId ? 'Editando Ativo' : 'MÁQUINAS - DEPRECIAÇÃO'}</h3>
            <AlertTriangle size={18} className="opacity-50" />
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" value={assetName} onChange={e => setAssetName(e.target.value)} className="col-span-2 px-4 py-3 bg-slate-50 border-none rounded-2xl font-bold transition-all focus:ring-2 focus:ring-red-500 shadow-inner" placeholder="Nome da Máquina" />
              <input type="number" value={assetVal} onChange={e => setAssetVal(parseFloat(e.target.value))} className="px-4 py-3 bg-slate-50 border-none rounded-2xl font-bold transition-all focus:ring-2 focus:ring-red-500 shadow-inner" placeholder="Valor Compra" />
              <input type="number" value={assetLife} onChange={e => setAssetLife(parseInt(e.target.value))} className="px-4 py-3 bg-slate-50 border-none rounded-2xl font-bold transition-all focus:ring-2 focus:ring-red-500 shadow-inner" placeholder="Vida Útil (Anos)" />
              <div className="col-span-2 flex gap-2">
                <button onClick={saveAsset} className="flex-1 bg-gradient-to-br from-[#FF4136] to-[#e63a30] text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:from-[#f03a30] hover:to-[#FF4136] shadow-xl shadow-red-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                  {editingAssetId ? <><Check size={18} /> Salvar Alteração</> : <><Plus size={18} /> Cadastrar Ativo</>}
                </button>
                {editingAssetId && (
                  <button onClick={() => { setEditingAssetId(null); setAssetName(''); setAssetVal(0); setAssetLife(5); }} className="px-5 bg-slate-200 text-slate-600 rounded-2xl hover:bg-slate-300 transition-all">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {fixedAssets.map(asset => (
                <div key={asset.id} className={`p-4 rounded-2xl flex justify-between items-center group transition-colors ${editingAssetId === asset.id ? 'bg-red-50 border border-red-200' : 'bg-white/50 border border-transparent hover:bg-white'}`}>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{asset.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Deprec. R$ {asset.monthlyDepreciation.toFixed(2)}/mês • R$ {asset.value.toLocaleString()} ({asset.usefulLifeYears} anos)</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEditAsset(asset)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={async () => {
                      if (confirm("Excluir ativo?")) {
                        try { await api.financial.deleteAsset(asset.id); setFixedAssets(fixedAssets.filter(a => a.id !== asset.id)); } catch (e) { alert("Erro ao excluir"); }
                      }
                    }} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CUSTOS FIXOS */}
        <div className="glass-card bg-white/70 rounded-[2.5rem] shadow-sm border border-white/50 overflow-hidden">
          <div className="bg-black p-5 text-white flex justify-between items-center">
            <h3 className="font-black text-sm tracking-widest uppercase">{editingCostId ? 'Editando Custo' : 'CUSTOS FIXOS MENSAIS'}</h3>
            <Calculator size={18} className="opacity-50" />
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" value={costDesc} onChange={e => setCostDesc(e.target.value)} className="col-span-2 px-4 py-3 bg-slate-50 border-none rounded-2xl font-bold transition-all focus:ring-2 focus:ring-brand-cyan shadow-inner" placeholder="Descrição do Custo (Ex: Aluguel)" />
              <input type="number" value={costVal} onChange={e => setCostVal(parseFloat(e.target.value))} className="col-span-2 px-4 py-3 bg-slate-50 border-none rounded-2xl font-bold transition-all focus:ring-2 focus:ring-brand-cyan shadow-inner" placeholder="Valor Mensal" />
              <div className="col-span-2 flex gap-2">
                <button onClick={saveCost} className="flex-1 bg-gradient-to-br from-brand-cyan to-cyan-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:from-cyan-400 hover:to-brand-cyan shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                  {editingCostId ? <><Check size={18} /> Atualizar Custo</> : <><Plus size={18} /> Adicionar Custo</>}
                </button>
                {editingCostId && (
                  <button onClick={() => { setEditingCostId(null); setCostDesc(''); setCostVal(0); }} className="px-5 bg-slate-200 text-slate-600 rounded-2xl hover:bg-slate-300 transition-all">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {fixedCosts.map(cost => (
                <div key={cost.id} className={`p-4 rounded-2xl flex justify-between items-center group transition-colors ${editingCostId === cost.id ? 'bg-cyan-50 border border-cyan-200' : 'bg-white/50 border border-transparent hover:bg-white'}`}>
                  <p className="font-black text-slate-800 text-sm uppercase">{cost.description}</p>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-black text-slate-900">R$ {cost.value.toFixed(2)}</p>
                    <div className="flex gap-1">
                      <button onClick={() => startEditCost(cost)} className="p-2 text-slate-300 hover:text-brand-cyan transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={async () => {
                        if (confirm("Excluir custo?")) {
                          try { await api.financial.deleteCost(cost.id); setFixedCosts(fixedCosts.filter(c => c.id !== cost.id)); } catch (e) { alert("Erro ao excluir"); }
                        }
                      }} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialModule;
