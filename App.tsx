
import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Package, Users, FileText, Plus, Menu, Search, TrendingUp, Settings,
  ClipboardList, Calculator, CalendarDays, ShieldAlert, LogOut, ChevronRight, Palette, Clock, Loader2
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
import TimeClock from './components/TimeClock';
import TimeBankManagement from './components/TimeBankManagement';
import { api } from './src/services/api';
import { supabase } from './src/lib/supabase';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  // State Initialization with empty arrays
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Record<UserRole, RolePermissions>>({
    admin: { dashboard: true, quotes: true, scheduling: true, production: true, products: true, financial: true, customers: true, time_clock: true },
    sales: { dashboard: true, quotes: true, scheduling: true, production: false, products: true, financial: false, customers: true, time_clock: true },
    production: { dashboard: false, quotes: false, scheduling: true, production: true, products: false, financial: false, customers: false, time_clock: true }
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
  const lastUserIdRef = React.useRef<string | null>(null);

  // Centralized Data Loading
  const fetchAppData = async (currentUserEmail?: string, showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      console.log('Starting data fetch...');

      const fetchWithLog = async (name: string, promise: Promise<any>) => {
        try {
          console.log(`Fetching ${name}...`);
          const res = await promise;
          console.log(`Done ${name}`);
          return res;
        } catch (e) {
          console.error(`Failed ${name}`, e);
          return name === 'config' ? {} : [];
        }
      };

      const fetchDataPromise = Promise.all([
        fetchWithLog('products', api.products.list()),
        fetchWithLog('customers', api.customers.list()),
        fetchWithLog('quotes', api.quotes.list()),
        fetchWithLog('assets', api.financial.listAssets()),
        fetchWithLog('costs', api.financial.listCosts()),
        fetchWithLog('scheduling', api.scheduling.list()),
        fetchWithLog('config', api.financial.getConfig()),
        fetchWithLog('users', api.users.list()),
        fetchWithLog('permissions', api.permissions.getAll())
      ]);

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Data fetch timeout')), 20000));

      const [
        prodData, custData, quoteData,
        assetData, costData, eventData,
        configData, usersData, permData
      ] = await Promise.race([fetchDataPromise, timeoutPromise]) as any;

      console.log('Data fetch completed');

      if (prodData) setProducts(prodData);
      if (custData) setCustomers(custData);
      if (quoteData) setQuotes(quoteData);
      if (assetData) setFixedAssets(assetData);
      if (costData) setFixedCosts(costData);
      if (eventData) setEvents(eventData);
      if (configData) setFinConfig(configData);
      if (usersData) setUsers(usersData);
      if (permData && permData.length > 0) {
        setPermissions(prev => {
          const next = { ...prev };
          permData.forEach((p: any) => {
            if (next[p.role as UserRole]) {
              next[p.role as UserRole] = p.permissions;
            }
          });
          return next;
        });
      }

      // If we have an email, try to log the user in from the fetched users list
      if (currentUserEmail && usersData) {
        const foundUser = usersData.find(u => u.email === currentUserEmail);
        if (foundUser) {
          console.log("App.tsx: User found via fetchAppData:", foundUser);
          handleLogin(foundUser);
        }
      }

    } catch (error) {
      console.error("Failed to load data from Supabase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auth Listener & Initial Load
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        console.log("App.tsx: Session found on mount:", session.user.email);
        await fetchAppData(session.user.email);
      } else {
        setIsLoading(false); // No session, just stop loading (show Login)
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth State Change:", event, session?.user?.email);

      if (event === 'SIGNED_IN' && session?.user?.email) {
        // Reload data and try to login user
        await fetchAppData(session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setActiveView('dashboard');
        setProducts([]);
        setQuotes([]);
        setCustomers([]);
        // We don't need to reload data on logout, just clear state
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    // localStorage.setItem('phoco_user', JSON.stringify(u)); // No longer needed with Supabase Auth persistence usually, but keeping for compat if needed, though onAuthStateChange handles it.
    if (u.role === 'production') setActiveView('production');
    else setActiveView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setUser(null);
      localStorage.removeItem('phoco_user');
      setActiveView('dashboard');
    }
  };

  const costPerHour = useMemo(() => {
    const totalFixedCosts = fixedCosts.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
    const totalDepreciation = fixedAssets.reduce((acc, a) => acc + (Number(a.monthlyDepreciation) || 0), 0);
    const hours = Number(finConfig.productiveHoursPerMonth) || 0;
    return hours > 0 ? (totalFixedCosts + totalDepreciation) / hours : 0;
  }, [fixedCosts, fixedAssets, finConfig]);

  const navItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard, permission: 'dashboard' },
    { id: 'quotes', label: 'Orçamentos', icon: FileText, permission: 'quotes' },
    { id: 'scheduling', label: 'Agenda & Prazos', icon: CalendarDays, permission: 'scheduling' },
    { id: 'production', label: 'Produção', icon: ClipboardList, permission: 'production' },
    { id: 'products', label: 'Materiais', icon: Package, permission: 'products' },
    { id: 'financial', label: 'Financeiro', icon: Calculator, permission: 'financial' },
    { id: 'customers', label: 'Clientes', icon: Users, permission: 'customers' },
    { id: 'time-clock', label: 'RH / Ponto', icon: Clock, permission: 'time_clock' },
    { id: 'hours-management', label: 'Gestão de Horas', icon: Users, permission: 'financial', adminOnly: true },
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

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-brand-magenta animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">Carregando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-transparent overflow-hidden text-slate-100 font-sans">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0F172A] text-white transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center justify-center mb-10">
            <img src="/logo-phoco.png" alt="Phoco Logo" className="h-24 w-24 object-cover rounded-full drop-shadow-2xl" />
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id as AppView); setIsSidebarOpen(false); setGlobalSearch(''); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all group relative overflow-hidden ${activeView === (item.id as AppView) || (item.id === 'quotes' && activeView === 'new-quote') ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 neon-border' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                {activeView === (item.id as AppView) && <div className="absolute inset-y-0 left-0 w-1 bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>}
                <item.icon size={20} className={activeView === item.id ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-slate-500 group-hover:text-cyan-400 transition-colors'} />
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
            </div>
            <div className="mt-auto px-4 py-4 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors group"
              >
                <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                Sair do Sistema
              </button>
              <p className="text-[10px] text-slate-600 text-center mt-4 opacity-50">v1.14 (Premium Dark UI)</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 md:h-20 glass-nav border-b-0 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-lg z-10 relative">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Fluxo Operacional Phoco</span>
              <ChevronRight size={10} />
              <span className="text-cyan-400 font-bold drop-shadow-sm uppercase tracking-widest text-[11px]">{activeView}</span>
              {isLoading && <Loader2 size={12} className="animate-spin text-cyan-400 ml-2" />}
            </div>
          </div>
          <div className="flex-1 max-w-xl mx-2 md:mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Pesquisar..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/50 transition-all text-slate-200 placeholder-slate-500 shadow-inner" />
            </div>
          </div>
          {permissions[user.role].quotes && (
            <button onClick={() => setActiveView('new-quote')} className="hidden md:flex bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-xl text-sm font-black items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-95 uppercase tracking-tight border border-cyan-400/20">
              <Plus size={20} /> Novo Orçamento
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {activeView === 'dashboard' && permissions[user.role].dashboard && <Dashboard products={products} customers={customers} quotes={quotes} fixedCosts={fixedCosts} fixedAssets={fixedAssets} finConfig={finConfig} />}
          {activeView === 'products' && permissions[user.role].products && <ProductList products={products} setProducts={setProducts} costPerHour={costPerHour} finConfig={finConfig} initialSearch={globalSearch} />}
          {activeView === 'customers' && permissions[user.role].customers && <CustomerList customers={customers} setCustomers={setCustomers} initialSearch={globalSearch} />}
          {activeView === 'new-quote' && permissions[user.role].quotes && (
            <ErrorBoundary>
              <QuoteBuilder products={products} customers={customers} setQuotes={setQuotes} quotes={quotes} finConfig={finConfig} currentUser={user} onFinish={() => setActiveView('quotes')} />
            </ErrorBoundary>
          )}
          {activeView === 'quotes' && permissions[user.role].quotes && <QuoteList quotes={quotes} setQuotes={setQuotes} customers={customers} products={products} onNewQuote={() => setActiveView('new-quote')} initialSearch={globalSearch} currentUser={user} />}
          {activeView === 'production' && permissions[user.role].production && <ProductionBoard quotes={quotes} setQuotes={setQuotes} customers={customers} />}
          {activeView === 'financial' && permissions[user.role].financial && <FinancialModule fixedAssets={fixedAssets} setFixedAssets={setFixedAssets} fixedCosts={fixedCosts} setFixedCosts={setFixedCosts} config={finConfig} setConfig={setFinConfig} />}
          {activeView === 'scheduling' && permissions[user.role].scheduling && <SchedulingModule events={events} setEvents={setEvents} customers={customers} quotes={quotes} />}
          {activeView === 'access-control' && user.role === 'admin' && <AccessControl permissions={permissions} setPermissions={setPermissions} users={users} setUsers={setUsers} />}
          {activeView === 'time-clock' && <TimeClock user={user} />}
          {activeView === 'hours-management' && user.role === 'admin' && <TimeBankManagement currentUser={user} />}
        </div>
      </main>
    </div>
  );
};

export default App;
