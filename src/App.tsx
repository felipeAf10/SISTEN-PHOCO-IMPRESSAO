
import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  LayoutDashboard, Package, Users, FileText, Plus, Menu, Search, TrendingUp, Settings,
  ClipboardList, Calculator, CalendarDays, ShieldAlert, LogOut, ChevronRight, Palette, Clock, Loader2, Zap
} from 'lucide-react';
import { AppView, Product, Customer, Quote, FixedAsset, FixedCost, FinancialConfig, ScheduleEvent, User, UserRole, RolePermissions } from './types';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';

const Dashboard = React.lazy(() => import('./components/Dashboard'));
const ProductList = React.lazy(() => import('./components/ProductList'));
const CustomerList = React.lazy(() => import('./components/CustomerList'));
const QuoteBuilder = React.lazy(() => import('./components/QuoteBuilder'));
const QuoteList = React.lazy(() => import('./components/QuoteList'));
const ProductionBoard = React.lazy(() => import('./components/ProductionBoard'));
const FinancialModule = React.lazy(() => import('./components/FinancialModule'));
const SchedulingModule = React.lazy(() => import('./components/SchedulingModule'));
const InventoryModule = React.lazy(() => import('./components/InventoryModule'));
const AccessControl = React.lazy(() => import('./components/AccessControl'));
const TimeClock = React.lazy(() => import('./components/TimeClock'));
const TimeBankManagement = React.lazy(() => import('./components/TimeBankManagement'));
const AdminCommissionPanel = React.lazy(() => import('./components/AdminCommissionPanel'));
const SalesPipeline = React.lazy(() => import('./components/SalesPipeline'));
const ClientPortal = React.lazy(() => import('./components/ClientPortal'));
const OrderScanner = React.lazy(() => import('./components/OrderScanner'));
const LaserCalculator = React.lazy(() => import('./components/LaserCalculator'));
const VectorizationLab = React.lazy(() => import('./components/VectorizationLab'));
const SupplierManager = React.lazy(() => import('./components/SupplierManager'));

import { api } from './services/api';
import { supabase } from './lib/supabase';

import { Routes, Route, useLocation } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import TeamChat from './components/TeamChat';

const queryClient = new QueryClient();

const App: React.FC = () => {
  const location = useLocation();
  const isClientPortal = location.pathname.startsWith('/my-quote/');

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
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);

  const [finConfig, setFinConfig] = useState<FinancialConfig>({
    productiveHoursPerMonth: 160,
    taxPercent: 6,
    commissionPercent: 3,
    targetProfitMargin: 20
  });

  const [isLoading, setIsLoading] = useState(true);
  const lastUserIdRef = React.useRef<string | null>(null);
  const userRef = React.useRef<User | null>(null); // Ref to avoid stale closure in auth listener
  const isFetchingRef = React.useRef(false); // Ref to prevent double fetching

  // Keep userRef in sync
  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

        fetchWithLog('config', api.financial.getConfig()),
        fetchWithLog('users', api.users.list()),
        fetchWithLog('permissions', api.permissions.getAll())
      ]);

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Data fetch timeout')), 60000));

      console.log("Waiting for Promise.all...");
      const [
        prodData, custData, quoteData,
        assetData, costData,
        configData, usersData, permData
      ] = await Promise.race([fetchDataPromise, timeoutPromise]) as any;

      console.log('Data fetch completed. Processing...');

      if (prodData) setProducts(prodData);
      if (custData) setCustomers(custData);
      if (quoteData) setQuotes(quoteData);
      if (assetData) setFixedAssets(assetData);
      if (costData) setFixedCosts(costData);

      if (configData) setFinConfig(configData);
      if (usersData) setUsers(usersData);
      if (permData && permData.length > 0) {
        setPermissions(prev => {
          // ... logic
          const next = { ...prev };
          permData.forEach((p: any) => {
            if (next[p.role as UserRole]) next[p.role as UserRole] = p.permissions;
          });
          return next;
        });
      }

      // If we have an email, try to log the user in from the fetched users list
      if (currentUserEmail) {
        let foundUser = usersData ? (usersData as User[]).find(u => u.email === currentUserEmail) : null;

        // Fallback: If not found in list (maybe list is restricted due to RLS), try fetching specifically
        if (!foundUser) {
          console.log("User not found in list, attempting direct fetch by email...");
          try {
            foundUser = await api.users.getByEmail(currentUserEmail);
          } catch (e) {
            console.warn("Direct fetch also failed", e);
          }
        }

        if (foundUser) {
          console.log("App.tsx: User found via fetchAppData:", foundUser);
          handleLogin(foundUser);
        } else {
          console.error("User authenticated but not found in app_users table:", currentUserEmail);
          toast.error("Usuário não encontrado no sistema. Contate o administrador.");
          // Only sign out if we are sure we have data but user isn't there
          if (usersData || !isLoading) { // avoiding premature signout if fetch failed 
            await supabase.auth.signOut();
            setUser(null);
          }
        }
      }

    } catch (error) {
      console.error("Failed to load data from Supabase:", error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Auth Listener & Initial Load
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // Safety timeout: If nothing happens in 10s, stop loading to allow retry/login
      const safetyTimer = setTimeout(() => {
        if (mounted && isLoading) {
          console.warn("Safety timeout triggered: Forcing loading stop.");
          setIsLoading(false);
        }
      }, 10000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          console.log("App.tsx: Session found on mount:", session.user.email);
          await fetchAppData(session.user.email);
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Init Auth Error:", e);
        setIsLoading(false);
      } finally {
        clearTimeout(safetyTimer);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth State Change:", event, session?.user?.email);

      if (event === 'SIGNED_IN' && session?.user?.email) {
        // Use Ref to check current state without stale closure
        const currentUser = userRef.current;

        // Prevent re-fetch if we are already seeing this user or currently fetching
        if (isFetchingRef.current) return;

        if (!currentUser || currentUser.email !== session.user.email) {
          isFetchingRef.current = true; // Mark as fetching
          await fetchAppData(session.user.email, true);
        } else {
          // Just background refresh, don't show loader
          await fetchAppData(session.user.email, false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setActiveView('dashboard');
        setProducts([]);
        setQuotes([]);
        setCustomers([]);
        setIsLoading(false);
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
    // Only reset view if this is a fresh login (no user loaded yet)
    if (!userRef.current) {
      if (u.role === 'production') setActiveView('production');
      else setActiveView('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('phoco_user'); // Clear legacy if any
      sessionStorage.clear(); // Clear any session data
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      // Force reload to ensure clean state
      window.location.href = '/';
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setActiveView('new-quote');
  };

  const costPerHour = useMemo(() => {
    const totalFixedCosts = fixedCosts.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
    const totalDepreciation = fixedAssets.reduce((acc, a) => acc + (Number(a.monthlyDepreciation) || 0), 0);
    const hours = Number(finConfig.productiveHoursPerMonth) || 0;
    return hours > 0 ? (totalFixedCosts + totalDepreciation) / hours : 0;
  }, [fixedCosts, fixedAssets, finConfig]);

  const navItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard, permission: 'dashboard' },
    { id: 'scheduling', label: 'Agenda & Prazos', icon: CalendarDays, permission: 'scheduling' },
    { id: 'laser-calc', label: 'Calculadora Laser', icon: Zap, permission: 'quotes' },
    { id: 'customers', label: 'Clientes', icon: Users, permission: 'customers' },
    { id: 'commissions', label: 'Comissões', icon: Calculator, permission: 'financial', adminOnly: true },
    { id: 'inventory', label: 'Estoque', icon: TrendingUp, permission: 'products' },
    { id: 'financial', label: 'Financeiro', icon: Calculator, permission: 'financial' },
    { id: 'suppliers', label: 'Fornecedores', icon: Truck, permission: 'products' },
    { id: 'access-control', label: 'Gestão de Equipe', icon: ShieldAlert, permission: 'financial', adminOnly: true },
    { id: 'hours-management', label: 'Gestão de Horas', icon: Users, permission: 'financial', adminOnly: true },
    { id: 'products', label: 'Materiais', icon: Package, permission: 'products' },
    { id: 'quotes', label: 'Orçamentos', icon: FileText, permission: 'quotes' },
    { id: 'sales-pipeline', label: 'Pipeline de Vendas', icon: TrendingUp, permission: 'quotes' },
    { id: 'production', label: 'Produção', icon: ClipboardList, permission: 'production' },
    { id: 'time-clock', label: 'RH / Ponto', icon: Clock, permission: 'time_clock' },
    { id: 'scanner', label: 'Scanner de Pedido', icon: ClipboardList, permission: 'production' },
    { id: 'vector-lab', label: 'Vetorizador (Beta)', icon: Palette, permission: 'production' },
  ];

  const visibleNavItems = useMemo(() => {
    if (!user) return [];
    return navItems.filter(item => {
      // Special case: Scanner is visible to everyone
      if (item.id === 'scanner') return true;

      if (item.adminOnly && user.role !== 'admin') return false;
      const permKey = item.permission as keyof RolePermissions;
      return permissions[user.role][permKey];
    });
  }, [user, permissions]);

  // IF Client Portal, Render Only That
  if (isClientPortal) {
    return (
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/my-quote/:id" element={
            <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-cyan-400" size={32} /></div>}>
              <ClientPortal />
            </React.Suspense>
          } />
          {/* Fallback for missing ID */}
          <Route path="/my-quote" element={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white flex-col gap-4 p-4 text-center">
              <ShieldAlert size={48} className="text-red-500" />
              <h1 className="text-xl font-bold">Link Inválido</h1>
              <p className="text-white/60">O link que você acessou parece estar incompleto (falta o ID do orçamento).</p>
              <p className="text-sm text-white/40">Solicite um novo link ao vendedor.</p>
            </div>
          } />
          {/* Catch-all for weird paths under /my-quote/ */}
          <Route path="*" element={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
              <p>Página não encontrada.</p>
            </div>
          } />
        </Routes>
        <Toaster richColors position="top-right" theme="dark" />
      </QueryClientProvider>
    );
  }

  // --- STANDARD AUTH & ADMIN APP ---
  if (!user && !isLoading) {
    return (
      <QueryClientProvider client={queryClient}>
        <Login onLogin={handleLogin} users={users} />
        <Toaster richColors position="top-right" theme="dark" />
      </QueryClientProvider>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-cyan-400" size={48} />
          <p className="text-white/50 text-sm animate-pulse">Carregando Sistema Phoco...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-slate-900 text-gray-100 overflow-hidden font-sans selection:bg-cyan-500/30">
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-surface/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        )}

        <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface text-primary transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-8 h-full flex flex-col">
            <div className="flex items-center justify-center mb-10">
              <img src="/logo-phoco-white.png" alt="Phoco Logo" className="h-24 w-auto object-contain drop-shadow-2xl" />
            </div>

            <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {visibleNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveView(item.id as AppView); setIsSidebarOpen(false); setGlobalSearch(''); if (item.id === 'new-quote') setEditingQuote(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all group relative overflow-hidden ${activeView === (item.id as AppView) || (item.id === 'quotes' && activeView === 'new-quote') ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 neon-border' : 'text-secondary hover:bg-white/5 hover:text-primary'}`}
                >
                  {activeView === (item.id as AppView) && <div className="absolute inset-y-0 left-0 w-1 bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>}
                  <item.icon size={20} className={activeView === item.id ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-secondary group-hover:text-cyan-400 transition-colors'} />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="pt-6 border-t border-white/10">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">
                    {user!.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-primary leading-none">{user!.name}</p>
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-1">DESIGN RESPONSÁVEL</p>
                  </div>
                </div>
              </div>
              <div className="mt-auto px-4 py-4 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors group"
                >
                  <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                  Sair do Sistema
                </button>
                <p className="text-[10px] text-secondary text-center mt-4 opacity-50">v1.14 (Premium Dark UI)</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 md:h-20 glass-nav border-b-0 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-lg z-10 relative">
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 text-secondary" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
              <div className="hidden lg:flex items-center gap-2 text-[10px] font-black text-secondary uppercase tracking-widest">
                <span>Fluxo Operacional Phoco</span>
                <ChevronRight size={10} />
                <span className="text-cyan-400 font-bold drop-shadow-sm uppercase tracking-widest text-[11px]">{activeView}</span>
                {isLoading && <Loader2 size={12} className="animate-spin text-cyan-400 ml-2" />}
              </div>
            </div>
            <div className="flex-1 max-w-xl mx-2 md:mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                <input type="text" placeholder="Pesquisar..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/50 transition-all text-primary placeholder-secondary shadow-inner" />
              </div>
            </div>
            {permissions[user!.role].quotes && (
              <button onClick={() => setActiveView('new-quote')} className="hidden md:flex bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-xl text-sm font-black items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-95 uppercase tracking-tight border border-cyan-400/20">
                <Plus size={20} /> Novo Orçamento
              </button>
            )}
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <React.Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-cyan-400" size={32} /></div>}>
                {activeView === 'dashboard' && permissions[user!.role].dashboard && <Dashboard currentUser={user!} />}
                {activeView === 'products' && permissions[user!.role].products && <ProductList products={products} setProducts={setProducts} costPerHour={costPerHour} finConfig={finConfig} initialSearch={globalSearch} />}
                {activeView === 'customers' && permissions[user!.role].customers && <CustomerList customers={customers} setCustomers={setCustomers} initialSearch={globalSearch} />}
                {activeView === 'new-quote' && permissions[user!.role].quotes && (
                  <ErrorBoundary>
                    <QuoteBuilder products={products} customers={customers} setQuotes={setQuotes} quotes={quotes} finConfig={finConfig} currentUser={user!} onFinish={() => { setActiveView('quotes'); setEditingQuote(null); }} initialQuote={editingQuote} />
                  </ErrorBoundary>
                )}
                {activeView === 'quotes' && permissions[user!.role].quotes && <QuoteList quotes={quotes} setQuotes={setQuotes} customers={customers} products={products} onNewQuote={() => { setEditingQuote(null); setActiveView('new-quote'); }} onEditQuote={handleEditQuote} initialSearch={globalSearch} currentUser={user!} />}
                {activeView === 'sales-pipeline' && (permissions[user!.role].quotes || user!.role === 'admin') && (
                  <ErrorBoundary>
                    <SalesPipeline />
                  </ErrorBoundary>
                )}
                {activeView === 'production' && permissions[user!.role].production && <ProductionBoard quotes={quotes} setQuotes={setQuotes} customers={customers} products={products} />}
                {activeView === 'scanner' && <OrderScanner quotes={quotes} customers={customers} />}
                {activeView === 'laser-calc' && <LaserCalculator products={products} />}
                {activeView === 'vector-lab' && <VectorizationLab />}
                {activeView === 'financial' && permissions[user!.role].financial && <FinancialModule />}
                {activeView === 'financial' && permissions[user!.role].financial && <FinancialModule />}
                {activeView === 'scheduling' && permissions[user!.role].scheduling && <SchedulingModule />}
                {activeView === 'inventory' && <InventoryModule products={products} setProducts={setProducts} currentUser={user!} />}
                {activeView === 'suppliers' && permissions[user!.role].products && <SupplierManager />}
                {activeView === 'access-control' && user!.role === 'admin' && <AccessControl permissions={permissions} setPermissions={setPermissions} users={users} setUsers={setUsers} />}
                {activeView === 'time-clock' && <TimeClock user={user!} />}

                {activeView === 'hours-management' && user!.role === 'admin' && <TimeBankManagement currentUser={user!} />}
                {activeView === 'commissions' && user!.role === 'admin' && <AdminCommissionPanel />}
              </React.Suspense>
            </div>
          </div>
        </main>
      </div>
      {user && <TeamChat currentUser={user} />}
      <Toaster richColors position="top-right" theme="dark" />
    </QueryClientProvider>
  );
};

export default App;
