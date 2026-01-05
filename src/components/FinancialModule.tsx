import React, { useState } from 'react';
import { Plus, Trash2, Calculator, Timer, TrendingUp, Wallet, Users, Edit2, Check, Loader2, Truck, Flag } from 'lucide-react';
import { Quote, FixedAsset, FixedCost, FinancialConfig } from '../types';
import { api } from '../services/api';
import ProfitabilityDashboard from './ProfitabilityDashboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';

interface FinancialModuleProps {
  // Props removed as data is now fetched internally
}

const FinancialModule: React.FC<FinancialModuleProps> = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'config'>('dashboard');

  const [assetName, setAssetName] = useState('');
  const [assetVal, setAssetVal] = useState(0);
  const [assetLife, setAssetLife] = useState(5);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  const [costDesc, setCostDesc] = useState('');
  const [costVal, setCostVal] = useState(0);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);

  // --- QUERIES ---
  const { data: fixedAssets = [], isLoading: isLoadingAssets } = useQuery({
    queryKey: ['fixedAssets'],
    queryFn: api.financial.listAssets,
    staleTime: 1000 * 60 * 5,
  });

  const { data: fixedCosts = [], isLoading: isLoadingCosts } = useQuery({
    queryKey: ['fixedCosts'],
    queryFn: api.financial.listCosts,
    staleTime: 1000 * 60 * 5,
  });

  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['financialConfig'],
    queryFn: api.financial.getConfig,
    staleTime: 1000 * 60 * 5,
  });

  const { data: quotes = [], isLoading: isLoadingQuotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: api.quotes.list,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = isLoadingAssets || isLoadingCosts || isLoadingConfig || isLoadingQuotes;

  // --- MUTATIONS ---
  const saveAssetMutation = useMutation({
    mutationFn: api.financial.saveAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixedAssets'] });
      toast.success('Ativo salvo com sucesso!');
      setAssetName(''); setAssetVal(0); setAssetLife(5);
      setEditingAssetId(null);
    },
    onError: (error: any) => toast.error(`Erro ao salvar ativo: ${error.message}`)
  });

  const deleteAssetMutation = useMutation({
    mutationFn: api.financial.deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixedAssets'] });
      toast.success('Ativo excluído com sucesso!');
    },
    onError: (error: any) => toast.error(`Erro ao excluir ativo: ${error.message}`)
  });

  const saveCostMutation = useMutation({
    mutationFn: api.financial.saveCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixedCosts'] });
      toast.success('Custo fixo salvo com sucesso!');
      setCostDesc(''); setCostVal(0);
      setEditingCostId(null);
    },
    onError: (error: any) => toast.error(`Erro ao salvar custo: ${error.message}`)
  });

  const deleteCostMutation = useMutation({
    mutationFn: api.financial.deleteCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixedCosts'] });
      toast.success('Custo fixo excluído com sucesso!');
    },
    onError: (error: any) => toast.error(`Erro ao excluir custo: ${error.message}`)
  });

  const updateConfigMutation = useMutation({
    mutationFn: api.financial.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialConfig'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error: any) => toast.error(`Erro ao salvar configurações: ${error.message}`)
  });

  // --- CALCULATIONS ---
  const totalFixedCosts = fixedCosts.reduce((acc, c) => acc + c.value, 0);
  const totalDepreciation = fixedAssets.reduce((acc, a) => acc + a.monthlyDepreciation, 0);
  const grandTotalMonthly = totalFixedCosts + totalDepreciation;
  // Use config logic safely
  const productiveHours = config?.productiveHoursPerMonth || 1;
  const costPerHour = grandTotalMonthly / productiveHours;

  const saveAsset = () => {
    if (!assetName || assetVal <= 0) {
      toast.error("Preencha o nome e valor do ativo.");
      return;
    }
    const monthlyDepr = (assetVal / assetLife) / 12;

    const asset: FixedAsset = {
      id: editingAssetId || crypto.randomUUID(),
      name: assetName,
      value: assetVal,
      usefulLifeYears: assetLife,
      monthlyDepreciation: monthlyDepr
    };
    saveAssetMutation.mutate(asset);
  };

  const startEditAsset = (asset: FixedAsset) => {
    setEditingAssetId(asset.id);
    setAssetName(asset.name);
    setAssetVal(asset.value);
    setAssetLife(asset.usefulLifeYears);
  };

  const saveCost = () => {
    if (!costDesc || costVal <= 0) {
      toast.error("Preencha a descrição e valor do custo.");
      return;
    }
    const cost: FixedCost = {
      id: editingCostId || crypto.randomUUID(),
      description: costDesc,
      value: costVal
    };
    saveCostMutation.mutate(cost);
  };

  const startEditCost = (cost: FixedCost) => {
    setEditingCostId(cost.id);
    setCostDesc(cost.description);
    setCostVal(cost.value);
  };

  const handleSaveConfig = () => {
    if (!config) return;
    // We update the local config object with the calculated rate before sending, 
    // although strictly speaking the backend/DB might not need 'hourlyRate' if it's dynamic.
    // The previous code sent 'updatedConfig'. Let's assume we just send the fields we edit + the calculated rate if needed.
    // Ideally, costPerHour is derived, but let's persist it if the existing API expects it.
    const updatedConfig = { ...config, hourlyRate: costPerHour };
    updateConfigMutation.mutate(updatedConfig);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in">
        <div className="flex justify-between items-center">
          <Skeleton className="h-12 w-64 rounded-xl" />
          <Skeleton className="h-24 w-64 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[500px] w-full rounded-3xl" />
          <Skeleton className="h-[500px] w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  // Fallback for null config (shouldn't happen often if initialized)
  const currentConfig = config || {
    id: 'default',
    productiveHoursPerMonth: 160,
    taxPercent: 0,
    commissionPercent: 0,
    targetProfitMargin: 20
  };

  // DASHBOARD VIEW
  if (activeTab === 'dashboard') {
    return (
      <div className="p-6 h-full flex flex-col">
        <div className="flex gap-4 mb-6 shrink-0">
          <button onClick={() => setActiveTab('dashboard')} className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20">Resultados</button>
          <button onClick={() => setActiveTab('config')} className="px-6 py-2 bg-surface hover:bg-surface-hover text-secondary rounded-xl font-bold text-sm transition-colors border border-white/5">Configurações e Despesas</button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ProfitabilityDashboard quotes={quotes} finConfig={currentConfig} />
        </div>
      </div>
    );
  }

  // CONFIG VIEW
  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar">
      <div className="flex gap-4 mb-2">
        <button onClick={() => setActiveTab('dashboard')} className="px-6 py-2 bg-surface hover:bg-surface-hover text-secondary rounded-xl font-bold text-sm transition-colors border border-white/5">Resultados</button>
        <button onClick={() => setActiveTab('config')} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20">Configurações e Despesas</button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Calculator className="text-indigo-500" size={32} />
            Gestão Financeira
          </h2>
          <p className="text-secondary mt-1 max-w-xl">
            Cadastre seus custos fixos e ativos para calcular o valor real da sua hora de trabalho.
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Timer size={64} className="text-white" />
          </div>
          <p className="text-indigo-100 font-bold text-xs uppercase tracking-widest mb-1">Custo Hora Real</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-white">R$ {costPerHour.toFixed(2)}</span>
            <span className="text-indigo-200 text-sm">/hora</span>
          </div>
          <p className="text-[10px] text-indigo-200 mt-2 opacity-80 max-w-[150px]">
            Baseado em {grandTotalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de custo mensal
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fixed Costs */}
        <div className="bg-surface rounded-3xl border border-white/5 overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-white/5 bg-surface-active flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg"><TrendingUp className="text-red-400" size={20} /></div>
              <div>
                <h3 className="font-bold text-white">Custos Fixos Mensais</h3>
                <p className="text-xs text-secondary">Aluguel, Internet, Luz, Softwares...</p>
              </div>
            </div>
            <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-lg text-xs font-black">
              {totalFixedCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className="p-4 bg-surface border-b border-white/5 flex gap-2">
            <input
              type="text"
              placeholder="Descrição (ex: Energia)"
              value={costDesc}
              onChange={e => setCostDesc(e.target.value)}
              className="flex-1 bg-input border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-xs">R$</span>
              <input
                type="number"
                placeholder="0.00"
                value={costVal}
                onChange={e => setCostVal(Number(e.target.value))}
                className="w-full bg-input border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={saveCost}
              disabled={saveCostMutation.isPending}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {saveCostMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {fixedCosts.map(cost => (
              <div key={cost.id} className="group flex justify-between items-center p-4 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-secondary text-xs font-bold">
                    {cost.description.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-zinc-300">{cost.description}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-white">R$ {cost.value.toFixed(2)}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditCost(cost)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => deleteCostMutation.mutate(cost.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            {fixedCosts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-secondary opacity-50">
                <TrendingUp size={32} className="mb-2" />
                <p className="text-sm">Nenhum custo fixo cadastrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Assets (Depreciation) */}
        <div className="bg-surface rounded-3xl border border-white/5 overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-white/5 bg-surface-active flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg"><Wallet className="text-amber-400" size={20} /></div>
              <div>
                <h3 className="font-bold text-white">Ativos & Depreciação</h3>
                <p className="text-xs text-secondary">Máquinas, Móveis, Equipamentos</p>
              </div>
            </div>
            <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-lg text-xs font-black">
              {totalDepreciation.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
            </span>
          </div>

          <div className="p-4 bg-surface border-b border-white/5 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome do Ativo (ex: Plotter)"
                value={assetName}
                onChange={e => setAssetName(e.target.value)}
                className="flex-1 bg-input border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-xs">R$</span>
                <input
                  type="number"
                  placeholder="Valor"
                  value={assetVal}
                  onChange={e => setAssetVal(Number(e.target.value))}
                  className="w-full bg-input border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-xs flex items-center gap-1"><Timer size={10} /> Vida Útil:</span>
                <input
                  type="number"
                  value={assetLife}
                  onChange={e => setAssetLife(Number(e.target.value))}
                  className="w-full bg-input border border-white/10 rounded-xl pl-20 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-xs">anos</span>
              </div>
              <button
                onClick={saveAsset}
                disabled={saveAssetMutation.isPending}
                className="w-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {saveAssetMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {fixedAssets.map(asset => (
              <div key={asset.id} className="group flex justify-between items-center p-4 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/5">
                <div>
                  <p className="font-medium text-zinc-200">{asset.name}</p>
                  <p className="text-[10px] text-zinc-500">Valor: R$ {asset.value} • {asset.usefulLifeYears} anos</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-amber-500/80 text-sm">R$ {asset.monthlyDepreciation.toFixed(2)}/mês</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditAsset(asset)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => deleteAssetMutation.mutate(asset.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            {fixedAssets.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-secondary opacity-50">
                <Wallet size={32} className="mb-2" />
                <p className="text-sm">Nenhum ativo cadastrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Config */}
      <div className="bg-surface rounded-3xl border border-white/5 p-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Calculator size={24} className="text-indigo-500" />
          Configurações Globais
        </h3>
        {/* Local form to handle configuration updates */}

        {/* 
            NOTE: Since we switched to React Query, 'config' is immutable. 
            We need a local state form to handle edits, initializing it when 'config' loads.
            However, we can't easily do `useState(config)` because config is undefined initially.
            We will use a separate small component or valid strategy.
            For now, let's just use a key on a wrapper to reset state when config loads, 
            or use `useEffect` to sync.
        */}
        <FinancialConfigForm config={currentConfig} onSave={val => updateConfigMutation.mutate(val)} isSaving={updateConfigMutation.isPending} />
      </div>
    </div>
  );
};

// Sub-component to handle local form state for Config
const FinancialConfigForm: React.FC<{ config: FinancialConfig, onSave: (c: FinancialConfig) => void, isSaving: boolean }> = ({ config, onSave, isSaving }) => {
  const [localConfig, setLocalConfig] = useState(config);

  // Sync if prop updates (e.g. refetch)
  React.useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-secondary tracking-widest">Horas Produtivas / Mês</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
            <input
              type="number"
              value={localConfig.productiveHoursPerMonth}
              onChange={e => setLocalConfig({ ...localConfig, productiveHoursPerMonth: Number(e.target.value) })}
              className="w-full pl-12 pr-4 py-4 bg-input border border-white/10 rounded-xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <p className="text-[10px] text-zinc-500">Ex: 22 dias x 6h reais = 132h</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-secondary tracking-widest">Impostos (Simples/Outros)</label>
          <div className="relative">
            <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
            <input
              type="number"
              value={localConfig.taxPercent}
              onChange={e => setLocalConfig({ ...localConfig, taxPercent: Number(e.target.value) })}
              className="w-full pl-12 pr-4 py-4 bg-input border border-white/10 rounded-xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-secondary tracking-widest">Comissão de Vendas</label>
          <div className="relative">
            <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
            <input
              type="number"
              value={localConfig.commissionPercent}
              onChange={e => setLocalConfig({ ...localConfig, commissionPercent: Number(e.target.value) })}
              className="w-full pl-12 pr-4 py-4 bg-input border border-white/10 rounded-xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-secondary tracking-widest">Margem de Lucro Alvo</label>
          <div className="relative">
            <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
            <input
              type="number"
              value={localConfig.targetProfitMargin}
              onChange={e => setLocalConfig({ ...localConfig, targetProfitMargin: Number(e.target.value) })}
              className="w-full pl-12 pr-4 py-4 bg-input border border-white/10 rounded-xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <p className="text-[10px] text-zinc-500">Lucro desejado sobre o custo</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-secondary tracking-widest">Preço por Km (Frete)</label>
          <div className="relative">
            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
            <input
              type="number"
              value={localConfig.pricePerKm || 0}
              onChange={e => setLocalConfig({ ...localConfig, pricePerKm: Number(e.target.value) })}
              className="w-full pl-12 pr-4 py-4 bg-input border border-white/10 rounded-xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-secondary tracking-widest">Taxa Fixa de Saída</label>
          <div className="relative">
            <Flag className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
            <input
              type="number"
              value={localConfig.fixedLogisticsFee || 0}
              onChange={e => setLocalConfig({ ...localConfig, fixedLogisticsFee: Number(e.target.value) })}
              className="w-full pl-12 pr-4 py-4 bg-input border border-white/10 rounded-xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
        <button
          onClick={() => onSave(localConfig)}
          disabled={isSaving}
          className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Salvar Configurações
        </button>
      </div>
    </div>
  );
};

export default FinancialModule;
