
import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, User, Phone, Mail, MapPin, X, Search } from 'lucide-react';
import { Customer } from '../types';
import { api } from '../src/services/api';

interface CustomerListProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  initialSearch?: string;
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, setCustomers, initialSearch = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        const updatedCustomer: Customer = { ...editingCustomer, ...formData };
        await api.customers.update(updatedCustomer);
        setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? updatedCustomer : c));
      } else {
        const newCustomer: Customer = { id: crypto.randomUUID(), ...formData };
        await api.customers.create(newCustomer);
        setCustomers(prev => [...prev, newCustomer]);
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving customer:", error);
      alert(`Erro ao salvar cliente: ${error.message || JSON.stringify(error)}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este cliente?')) {
      try {
        await api.customers.delete(id);
        setCustomers(prev => prev.filter(c => c.id !== id));
      } catch (error) {
        console.error("Error deleting customer:", error);
        alert("Erro ao excluir cliente.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-50 uppercase tracking-tight neon-text">Gestão de <span className="text-cyan-400">Clientes</span></h2>
          <p className="text-slate-400 text-sm">Gerencie seu cadastro de contatos.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/50 shadow-sm outline-none text-slate-100 placeholder-slate-500"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-95 whitespace-nowrap border border-cyan-500/20"
          >
            <Plus size={18} />
            Novo Cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="glass-card p-6 rounded-[2rem] shadow-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:-translate-y-1 transition-all group border border-white/5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-800/50 text-cyan-400 border border-white/5 rounded-2xl flex items-center justify-center font-black text-xl uppercase shadow-inner">
                {customer.name.charAt(0)}
              </div>
              <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenModal(customer)}
                  className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(customer.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 className="font-black text-slate-200 text-lg mb-4 uppercase truncate group-hover:text-white transition-colors">{customer.name}</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Phone size={16} className="text-slate-600" />
                <span className="font-bold">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Mail size={16} className="text-slate-600" />
                <span className="truncate font-medium">{customer.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <MapPin size={16} className="text-slate-600" />
                <span className="truncate font-medium">{customer.address}</span>
              </div>
            </div>

            <button
              className="w-full mt-6 py-3 border border-slate-700 bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 hover:text-cyan-400 hover:border-cyan-500/30 transition-all shadow-sm"
            >
              Histórico de Compras
            </button>
          </div>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="col-span-full p-20 text-center bg-slate-800/30 glass-card rounded-[2rem] border border-dashed border-slate-700">
            <User size={48} className="mx-auto text-slate-600 mb-4" />
            <h4 className="text-slate-300 font-black uppercase text-sm tracking-tight">Nenhum cliente encontrado</h4>
            <p className="text-slate-500 text-xs font-bold uppercase mt-1">Refine sua busca ou cadastre um novo contato.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 bg-[#0F172A] text-white flex items-center justify-between">
              <h3 className="font-black text-xl uppercase tracking-tight">{editingCustomer ? 'Editar Cliente' : 'Novo Cadastro'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp</label>
                  <input
                    required
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-4 border border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-4 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98]">Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
