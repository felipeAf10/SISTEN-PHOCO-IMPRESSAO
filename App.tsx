
import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Package, Users, FileText, Plus, Menu, Search, TrendingUp, Settings,
  ClipboardList, Calculator, CalendarDays, ShieldAlert, LogOut, ChevronRight, Palette
} from 'lucide-react';
import { AppView, Product, Customer, Quote, FixedAsset, FixedCost, FinancialConfig, ScheduleEvent, User, UserRole, RolePermissions } from './types';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import CustomerList from './components/CustomerList';
import QuoteBuilder from './components/QuoteBuilder';
import QuoteList from './components/QuoteList';
import ProductionBoard from './components/ProductionBoard';
import FinancialModule from './components/FinancialModule';
import SchedulingModule from './components/SchedulingModule';
import Login from './components/Login';
import AccessControl from './components/AccessControl';
import { api } from './src/services/api';

const App: React.FC = () => {
  // State Initialization with empty arrays
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Record<UserRole, RolePermissions>>({
    admin: { dashboard: true, quotes: true, scheduling: true, production: true, products: true, financial: true, customers: true },
    sales: { dashboard: true, quotes: true, scheduling: true, production: false, products: true, financial: false, customers: true },
    production: { dashboard: false, quotes: false, scheduling: true, production: true, products: false, financial: false, customers: false }
  });

  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [finConfig, setFinConfig] = useState<FinancialConfig>({
    productiveHoursPerMonth: 160,
    taxPercent: 6,
    commissionPercent: 3,
    targetProfitMargin: 20
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load Data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          prodData, custData, quoteData,
          assetData, costData, eventData,
          configData, usersData
        ] = await Promise.all([
          api.products.list(),
          api.customers.list(),
          api.quotes.list(),
          api.financial.listAssets(),
          api.financial.listCosts(),
          api.scheduling.list(),
          api.financial.getConfig(),
          api.users.list()
        ]);

        if (prodData) setProducts(prodData);
        if (custData) setCustomers(custData);
        if (quoteData) setQuotes(quoteData);
        if (assetData) setFixedAssets(assetData);
        if (costData) setFixedCosts(costData);
        if (eventData) setEvents(eventData);
        if (configData) setFinConfig(configData);
        if (usersData) setUsers(usersData);

      } catch (error) {
        console.error("Failed to load data from Supabase:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('phoco_user', JSON.stringify(u));
    if (u.role === 'production') setActiveView('production');
    else setActiveView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('phoco_user');
    setActiveView('dashboard');
  };

  const costPerHour = useMemo(() => {
    const totalFixedCosts = fixedCosts.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
    const totalDepreciation = fixedAssets.reduce((acc, a) => acc + (Number(a.monthlyDepreciation) || 0), 0);
    const hours = Number(finConfig.productiveHoursPerMonth) || 0;
    return hours > 0 ? (totalFixedCosts + totalDepreciation) / hours : 0;
  }, [fixedCosts, fixedAssets, finConfig]);

  const navItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard, permission: 'dashboard' },
    { id: 'quotes', label: 'Projetos Design', icon: Palette, permission: 'quotes' },
    { id: 'scheduling', label: 'Agenda & Prazos', icon: CalendarDays, permission: 'scheduling' },
    { id: 'production', label: 'Produção', icon: ClipboardList, permission: 'production' },
    { id: 'products', label: 'Materiais', icon: Package, permission: 'products' },
    { id: 'financial', label: 'Financeiro', icon: Calculator, permission: 'financial' },
    { id: 'customers', label: 'Clientes', icon: Users, permission: 'customers' },
    { id: 'access-control', label: 'Gestão de Equipe', icon: ShieldAlert, permission: 'financial', adminOnly: true },
  ];

  const visibleNavItems = useMemo(() => {
    if (!user) return [];
    return navItems.filter(item => {
      if (item.adminOnly && user.role !== 'admin') return false;
      const permKey = item.permission as keyof RolePermissions;
      return permissions[user.role][permKey];
    });
  }, [user, permissions]);

  if (!user) {
    return <Login users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-[#1E293B]">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0F172A] text-white transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center justify-center mb-10">
            <img src="/logo-phoco.png" alt="Phoco Logo" className="h-24 w-auto object-contain drop-shadow-2xl" />
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id as AppView); setIsSidebarOpen(false); setGlobalSearch(''); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all group ${activeView === (item.id as AppView) || (item.id === 'quotes' && activeView === 'new-quote') ? 'bg-brand-magenta text-white shadow-[0_0_15px_rgba(236,0,140,0.5)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon size={20} className={activeView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-brand-cyan transition-colors'} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-slate-800">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-white leading-none">{user.name}</p>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-1">DESIGN RESPONSÁVEL</p>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full py-2 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                <LogOut size={12} /> Sair do Sistema
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Fluxo Operacional Phoco</span>
              <ChevronRight size={10} />
              <span className="text-indigo-600">{activeView}</span>
            </div>
          </div>
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Pesquisar em todo o ERP..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>
          </div>
          {permissions[user.role].quotes && (
            <button onClick={() => setActiveView('new-quote')} className="bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 uppercase tracking-tight">
              <Plus size={20} /> Novo Projeto
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#F1F5F9]">
          {activeView === 'dashboard' && permissions[user.role].dashboard && <Dashboard products={products} customers={customers} quotes={quotes} fixedCosts={fixedCosts} fixedAssets={fixedAssets} finConfig={finConfig} />}
          {activeView === 'products' && permissions[user.role].products && <ProductList products={products} setProducts={setProducts} costPerHour={costPerHour} finConfig={finConfig} initialSearch={globalSearch} />}
          {activeView === 'customers' && permissions[user.role].customers && <CustomerList customers={customers} setCustomers={setCustomers} initialSearch={globalSearch} />}
          {activeView === 'new-quote' && permissions[user.role].quotes && <QuoteBuilder products={products} customers={customers} setQuotes={setQuotes} quotes={quotes} finConfig={finConfig} currentUser={user} onFinish={() => setActiveView('quotes')} />}
          {activeView === 'quotes' && permissions[user.role].quotes && <QuoteList quotes={quotes} setQuotes={setQuotes} customers={customers} products={products} onNewQuote={() => setActiveView('new-quote')} initialSearch={globalSearch} currentUser={user} />}
          {activeView === 'production' && permissions[user.role].production && <ProductionBoard quotes={quotes} setQuotes={setQuotes} customers={customers} />}
          {activeView === 'financial' && permissions[user.role].financial && <FinancialModule fixedAssets={fixedAssets} setFixedAssets={setFixedAssets} fixedCosts={fixedCosts} setFixedCosts={setFixedCosts} config={finConfig} setConfig={setFinConfig} />}
          {activeView === 'scheduling' && permissions[user.role].scheduling && <SchedulingModule events={events} setEvents={setEvents} customers={customers} quotes={quotes} />}
          {activeView === 'access-control' && user.role === 'admin' && <AccessControl permissions={permissions} setPermissions={setPermissions} users={users} setUsers={setUsers} />}
        </div>
      </main>
    </div>
  );
};

export default App;
