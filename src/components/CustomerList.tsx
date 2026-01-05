
import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, User, Phone, Mail, MapPin, X, Search, ShoppingBag } from 'lucide-react';
import { Customer, Quote } from '../types';
import { api } from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';

interface CustomerListProps {
  // customers and setCustomers are no longer needed as we fetch internally
  // But we keep them optional to avoid breaking parent usage immediately if not updated
  customers?: Customer[];
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  initialSearch?: string;
}

const CustomerList: React.FC<CustomerListProps> = ({ initialSearch = '' }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  // History State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<Customer | null>(null);
  const [customerQuotes, setCustomerQuotes] = useState<Quote[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // FETCH CUSTOMERS
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: api.customers.list,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // MUTATIONS
  const createMutation = useMutation({
    mutationFn: api.customers.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente cadastrado com sucesso!');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao cadastrar: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: api.customers.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente atualizado com sucesso!');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.customers.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
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
    if (editingCustomer) {
      updateMutation.mutate({ ...editingCustomer, ...formData });
    } else {
      createMutation.mutate({ id: crypto.randomUUID(), ...formData });
    }
  };

  const handleDelete = async (id: string) => {
    toast('Excluir cliente?', {
      action: {
        label: 'Confirmar',
        onClick: () => deleteMutation.mutate(id),
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => { },
      },
    });
  };

  const handleViewHistory = async (customer: Customer) => {
    setSelectedHistoryCustomer(customer);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    // Note: We could also migrate this to useQuery, but for now we kept it simple as it's a sub-modal
    try {
      const allQuotes = await api.quotes.list();
      const filtered = allQuotes.filter(q => q.customerId === customer.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setCustomerQuotes(filtered);
    } catch (error) {
      console.error("Error fetching history", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoadingHistory(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-[2rem]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase tracking-tight neon-text">Gestão de <span className="text-cyan-400">Clientes</span></h2>
          <p className="text-secondary text-sm">Gerencie seu cadastro de contatos.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-input/50 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/50 shadow-sm outline-none text-primary placeholder-secondary"
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
              <div className="w-12 h-12 bg-surface/50 text-cyan-400 border border-white/5 rounded-2xl flex items-center justify-center font-black text-xl uppercase shadow-inner">
                {customer.name.charAt(0)}
              </div>
              <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenModal(customer)}
                  className="p-2 text-secondary hover:text-cyan-400 hover:bg-surface-hover rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(customer.id)}
                  className="p-2 text-secondary hover:text-rose-500 hover:bg-surface-hover rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 className="font-black text-primary text-lg mb-4 uppercase truncate group-hover:text-white transition-colors">{customer.name}</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-secondary">
                <Phone size={16} className="text-secondary" />
                <span className="font-bold">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <Mail size={16} className="text-secondary" />
                <span className="truncate font-medium">{customer.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <MapPin size={16} className="text-secondary" />
                <span className="truncate font-medium">{customer.address}</span>
              </div>
            </div>

            <button
              onClick={() => handleViewHistory(customer)}
              className="w-full mt-6 py-3 border border-white/5 bg-surface/50 text-secondary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface hover:text-cyan-400 hover:border-cyan-500/30 transition-all shadow-sm"
            >
              Histórico de Compras
            </button>
          </div>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="col-span-full p-20 text-center bg-surface/30 glass-card rounded-[2rem] border border-dashed border-white/10">
            <User size={48} className="mx-auto text-secondary mb-4" />
            <h4 className="text-secondary font-black uppercase text-sm tracking-tight">Nenhum cliente encontrado</h4>
            <p className="text-secondary text-xs font-bold uppercase mt-1">Refine sua busca ou cadastre um novo contato.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-card bg-surface w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10">
            <div className="p-8 bg-surface text-primary flex items-center justify-between border-b border-white/5">
              <h3 className="font-black text-xl uppercase tracking-tight">{editingCustomer ? 'Editar Cliente' : 'Novo Cadastro'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:text-primary">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Nome Completo</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-3 bg-input border border-white/5 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-1">WhatsApp</label>
                  <input
                    required
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-5 py-3 bg-input border border-white/5 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-3 bg-input border border-white/5 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Endereço</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-5 py-3 bg-input border border-white/5 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-primary"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-4 border border-white/10 text-secondary font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/5 transition-all">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 px-4 py-4 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PURCHASE HISTORY MODAL */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-card bg-surface w-full max-w-2xl h-[80vh] rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col">
            <div className="p-6 bg-surface/80 backdrop-blur-md border-b border-white/5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-xl text-white uppercase tracking-tight">Histórico de Compras</h3>
                <p className="text-secondary text-sm">{selectedHistoryCustomer?.name}</p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-secondary hover:text-white hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {loadingHistory ? (
                <div className="text-center py-20 text-secondary animate-pulse">Carregando histórico...</div>
              ) : customerQuotes.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-secondary">
                    <ShoppingBag size={32} />
                  </div>
                  <h4 className="text-white font-bold mb-2">Nenhuma compra encontrada</h4>
                  <p className="text-secondary text-sm">Este cliente ainda não possui orçamentos ou pedidos.</p>
                </div>
              ) : (
                customerQuotes.map(quote => (
                  <div key={quote.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400 font-bold text-xs">
                          #{quote.id.slice(-4)}
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">Orçamento #{quote.id.slice(-4)}</p>
                          <p className="text-secondary text-xs">{new Date(quote.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${quote.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                        quote.status === 'draft' ? 'bg-zinc-500/20 text-zinc-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                        {quote.status === 'confirmed' ? 'Aprovado' : quote.status === 'draft' ? 'Rascunho' : 'Pendente'}
                      </span>
                    </div>

                    <div className="bg-black/20 rounded-xl p-3 mb-3">
                      {quote.items.length > 0 ? (
                        <div className="space-y-1">
                          {quote.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-secondary">
                              <span>{item.quantity}x {item.productName}</span>
                              <span className="text-white">R$ {item.subtotal.toFixed(2)}</span>
                            </div>
                          ))}
                          {quote.items.length > 2 && <p className="text-[10px] text-zinc-500 italic">+ {quote.items.length - 2} outros itens</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 italic">Sem itens listados</p>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-xs text-secondary font-medium">Total do Pedido</span>
                      <span className="text-lg font-black text-white">R$ {quote.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
