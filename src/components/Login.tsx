
import React, { useState } from 'react';
import { TrendingUp, Lock, User as UserIcon, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const mounted = React.useRef(true);

  React.useEffect(() => {
    return () => { mounted.current = false; };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        console.log("Attempting Sign Up for:", email);

        // 1. Check if email is authorized (exists in app_users)
        const { data: usersData, error: usersError } = await supabase
          .from('app_users')
          .select('*')
          .eq('email', email);

        if (usersError || !usersData || usersData.length === 0) {
          throw new Error('Este email não foi autorizado pelo administrador. Peça para ele te cadastrar na Equipe primeiro.');
        }

        // 2. Create Auth User
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        console.log("Sign Up Success:", signUpData);
        setError('Conta criada com sucesso! Você já pode entrar.');
        setMode('signin'); // Switch back to login
        setIsLoading(false);
        return;
      }

      // LOGIN MODE
      console.log("Attempting Supabase Login...");
      // Supabase Login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error("Supabase Login Failed:", authError);
        throw authError;
      }

      console.log("Supabase Login Success:", data.user?.user_metadata);
      console.log("Supabase Login Success:", data.user?.user_metadata);
      // No need to fetch user here; App.tsx listener will handle it.
      // We keep loading true because App.tsx should unmount us. 
      // But if it doesn't happen fast, we might want a timeout or let it hang until unmount?
      // Actually, if App.tsx doesn't find the user, we want to stop loading.
      // But we can't know that here.
      // Let's safe-guard:
      setTimeout(() => {
        if (mounted) setIsLoading(false);
      }, 5000); // 5s timeout fallback

    } catch (err: any) {
      console.error("Auth error:", err);
      // Show specific error messages
      if (err.message === 'Invalid login credentials') {
        setError('Email ou senha incorretos.');
      } else if (err.message.includes('Email not confirmed')) {
        setError('Email não confirmado. Verifique seu email ou confirme manualmente no Supabase (Authentication > Três pontos > Confirm User).');
      } else {
        setError(`Erro: ${err.message}`);
      }
      setIsLoading(false); // Only stop loading on error. On success, App.tsx will take over.
    }
  };


  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 mx-auto mb-6">
            <TrendingUp size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight">PHOCO <span className="text-indigo-400">ADMIN</span></h1>
          <p className="text-secondary text-sm mt-2 font-medium uppercase tracking-widest">Acesse sua estação de trabalho</p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-2xl shadow-black/40">
          <div className="flex justify-center mb-6 bg-white/5 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${mode === 'signin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-secondary hover:text-primary'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${mode === 'signup' ? 'bg-indigo-600 text-white shadow-lg' : 'text-secondary hover:text-primary'}`}
            >
              Primeiro Acesso
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-shake ${error.includes('sucesso') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Email Corporativo</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-primary font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/10 transition-all placeholder-secondary"
                  placeholder="seu.nome@empresa.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">{mode === 'signup' ? 'Crie sua Senha' : 'Sua Senha'}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-primary font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/10 transition-all placeholder-secondary"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              disabled={isLoading}
              type="submit"
              className="w-full py-5 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={18} /> {mode === 'signup' ? 'Criar Acesso' : 'Entrar no Sistema'}</>}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">PriceFlow Engine v2.5</p>
          </div>
        </div>

        <p className="text-center text-secondary text-xs mt-8 font-medium">
          &copy; 2024 Phoco Admin • v2.0 (Fixes Applied)
        </p>
      </div>
    </div>
  );
};

export default Login;
