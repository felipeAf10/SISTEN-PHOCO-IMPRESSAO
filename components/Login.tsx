
import React, { useState } from 'react';
import { TrendingUp, Lock, User as UserIcon, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Busca usuário na lista dinâmica
    setTimeout(() => {
      const foundUser = users.find(u => u.username === username && u.password === password);
      
      if (foundUser) {
        onLogin(foundUser);
      } else {
        setError('Usuário ou senha incorretos. Verifique com o administrador.');
        setIsLoading(false);
      }
    }, 8000); // Um pouco mais de tempo para simular segurança
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 mx-auto mb-6">
            <TrendingUp size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">PHOCO <span className="text-indigo-400">ADMIN</span></h1>
          <p className="text-slate-400 text-sm mt-2 font-medium uppercase tracking-widest">Acesse sua estação de trabalho</p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-2xl shadow-black/40">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold animate-shake">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/10 transition-all"
                  placeholder="Seu usuário..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/10 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              disabled={isLoading}
              type="submit" 
              className="w-full py-5 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={18} /> Entrar no Sistema</>}
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PriceFlow Engine v2.5</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
