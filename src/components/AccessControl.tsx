import React, { useState } from 'react';
import {
  Shield, Check, X, Users, MessageSquare, ClipboardList, LayoutDashboard,
  Calculator, Package, Plus, Trash2, Edit2, Lock, User as UserIcon, Save,
  Eye, EyeOff
} from 'lucide-react';
import { RolePermissions, UserRole, User } from '../types';
import { api } from '../services/api';

interface AccessControlProps {
  permissions: Record<UserRole, RolePermissions>;
  setPermissions: (perms: Record<UserRole, RolePermissions>) => void;
  users: User[];
  setUsers: (users: User[]) => void;
}

const AccessControl: React.FC<AccessControlProps> = ({ permissions, setPermissions, users, setUsers }) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'users'>('users');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'sales' as UserRole
  });

  const togglePermission = async (role: UserRole, key: keyof RolePermissions) => {
    if (role === 'admin') return;
    const newPerms = { ...permissions };
    newPerms[role] = { ...newPerms[role], [key]: !newPerms[role][key] };
    setPermissions(newPerms);
    try {
      await api.permissions.update(role, newPerms[role]);
    } catch (error) {
      console.error("Error saving permission:", error);
    }
  };

  const roles: { id: UserRole; label: string; icon: any }[] = [
    { id: 'sales', label: 'Vendas / Design', icon: MessageSquare },
    { id: 'production', label: 'Operacional Produção', icon: ClipboardList }
  ];

  const modules: { key: keyof RolePermissions; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { key: 'customers', label: 'Cadastro Clientes', icon: Users },
    { key: 'quotes', label: 'Orçamentos & Vendas', icon: MessageSquare },
    { key: 'scheduling', icon: ClipboardList, label: 'Agenda & Prazos' },
    { key: 'production', label: 'Board Produção', icon: ClipboardList },
    { key: 'products', label: 'Precificação Materiais', icon: Package },
    { key: 'financial', label: 'Módulo Financeiro', icon: Calculator },
    { key: 'time_clock', label: 'RH / Ponto', icon: Users }
  ];

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        name: user.name,
        email: user.email || '',
        username: user.username,
        password: user.password || '',
        role: user.role
      });
    } else {
      setEditingUser(null);
      setUserForm({ name: '', email: '', username: '', password: '', role: 'sales' });
    }
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updatedUser: User = { ...editingUser, ...userForm };
        await api.users.update(updatedUser.id, updatedUser);
        setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
      } else {
        const newUser: User = { id: crypto.randomUUID(), ...userForm, active: true };
        await api.users.create(newUser);
        setUsers([...users, newUser]);
      }
      setIsUserModalOpen(false);
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Erro ao salvar usuário.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (users.find(u => u.id === id)?.role === 'admin' && users.filter(u => u.role === 'admin').length === 1) {
      alert("Não é possível remover o último administrador.");
      return;
    }
    if (window.confirm("Remover este usuário da equipe?")) {
      try {
        await api.users.delete(id);
        setUsers(users.filter(u => u.id !== id));
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Erro ao excluir usuário.");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase">Controle de <span className="text-brand-magenta">Equipe</span></h2>
          <p className="text-secondary font-medium mt-1">Gerencie usuários e suas permissões no sistema.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar glass-card bg-surface-hover/50 p-1.5 rounded-2xl border border-white/10 whitespace-nowrap">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'users' ? 'bg-brand-magenta text-white shadow-lg shadow-pink-500/20' : 'text-secondary hover:text-primary hover:bg-surface-hover/50'}`}
          >
            Usuários
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'permissions' ? 'bg-brand-magenta text-white shadow-lg shadow-pink-500/20' : 'text-secondary hover:text-primary hover:bg-surface-hover/50'}`}
          >
            Cargos
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => handleOpenUserModal()}
              className="bg-brand-magenta text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-pink-500/20 hover:bg-pink-600 transition-all active:scale-95"
            >
              <Plus size={18} /> Novo Usuário
            </button>
          </div>

          <div className="glass-card bg-surface-active/50 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-surface-active/50 border-b border-white/10">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-secondary uppercase tracking-widest">Membro</th>
                  <th className="px-8 py-5 text-[10px] font-black text-secondary uppercase tracking-widest">Login</th>
                  <th className="px-8 py-5 text-[10px] font-black text-secondary uppercase tracking-widest">Cargo</th>
                  <th className="px-8 py-5 text-[10px] font-black text-secondary uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-500/20 text-brand-magenta rounded-xl flex items-center justify-center font-black uppercase border border-pink-500/20">{u.name.charAt(0)}</div>
                        <span className="font-black text-white text-sm">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-secondary">{u.username}</td>
                    <td className="px-8 py-5">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${u.role === 'admin' ? 'bg-brand-magenta/20 text-brand-magenta border border-brand-magenta/20' : u.role === 'sales' ? 'bg-cyan-500/20 text-brand-cyan border border-cyan-500/20' : 'bg-surface-hover text-secondary border border-white/10'}`}>
                        {u.role === 'admin' ? 'Administrador' : u.role === 'sales' ? 'Vendas' : 'Produção'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenUserModal(u)} className="p-2 text-secondary hover:text-brand-cyan transition-colors hover:bg-brand-cyan/10 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-secondary hover:text-rose-500 transition-colors hover:bg-rose-500/10 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {roles.map(role => (
            <div key={role.id} className="glass-card bg-surface-active/50 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-sm">
              <div className="p-8 bg-surface-active/80 text-white flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <role.icon size={24} className="text-brand-cyan" />
                  <h3 className="text-lg font-black uppercase tracking-tight">{role.label}</h3>
                </div>
              </div>
              <div className="p-8 space-y-3">
                {modules.map(mod => (
                  <button
                    key={mod.key}
                    onClick={() => togglePermission(role.id, mod.key)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${permissions[role.id][mod.key] ? 'bg-cyan-500/10 border-brand-cyan/50 text-brand-cyan' : 'bg-surface-hover/30 border-white/5 text-secondary hover:border-white/10 opacity-60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <mod.icon size={18} />
                      <span className="text-xs font-bold uppercase tracking-widest">{mod.label}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${permissions[role.id][mod.key] ? 'bg-brand-cyan text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-surface-hover text-secondary'}`}>
                      {permissions[role.id][mod.key] ? <Check size={16} /> : <X size={16} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE USUÁRIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card bg-surface-active w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/10">
            <div className="p-8 bg-surface-active text-white flex justify-between items-center border-b border-white/10">
              <h3 className="font-black text-xl uppercase tracking-tight">{editingUser ? 'Editar Membro' : 'Novo Membro'}</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-secondary hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Nome do Funcionário</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={16} />
                  <input required type="text" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-input border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-brand-cyan text-white placeholder-secondary" placeholder="Nome Completo" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Email Corporativo</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={16} />
                  <input required type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-input border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-brand-cyan text-white placeholder-secondary" placeholder="email@exemplo.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Login</label>
                  <input required type="text" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} className="w-full px-4 py-3 bg-input border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-brand-cyan text-white placeholder-secondary" placeholder="Ex: joao.vendas" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={16} />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={userForm.password}
                      onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full pl-11 pr-12 py-3 bg-input border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-brand-cyan text-white placeholder-secondary"
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-brand-cyan transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Cargo / Role</label>
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })} className="w-full px-4 py-3 bg-input border-none rounded-2xl font-bold text-sm outline-none text-white appearance-none">
                  <option value="admin">Administrador (Total)</option>
                  <option value="sales">Comercial / Vendas</option>
                  <option value="production">Operador Produção</option>
                </select>
              </div>
              <button type="submit" className="w-full py-5 bg-brand-cyan text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 mt-4 transition-all active:scale-[0.98] hover:brightness-110">
                <Save size={18} /> {editingUser ? 'Atualizar Membro' : 'Cadastrar Membro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControl;
