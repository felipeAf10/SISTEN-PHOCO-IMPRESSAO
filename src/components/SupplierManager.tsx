import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Supplier } from '../types';
import { Plus, Search, Edit2, Trash2, X, Phone, Mail, Building, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SupplierManager: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Supplier>>({
        name: '',
        contactName: '',
        phone: '',
        email: '',
        category: '',
        active: true
    });

    const { data: suppliers = [], isLoading } = useQuery({
        queryKey: ['suppliers'],
        queryFn: api.suppliers.list,
    });

    const createMutation = useMutation({
        mutationFn: api.suppliers.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success('Fornecedor cadastrado com sucesso!');
            handleCloseModal();
        },
        onError: () => toast.error('Erro ao cadastrar fornecedor.')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) => api.suppliers.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success('Fornecedor atualizado com sucesso!');
            handleCloseModal();
        },
        onError: () => toast.error('Erro ao atualizar fornecedor.')
    });

    const deleteMutation = useMutation({
        mutationFn: api.suppliers.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success('Fornecedor removido.');
        }
    });

    const handleOpenModal = (supplier?: Supplier) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData(supplier);
        } else {
            setEditingSupplier(null);
            setFormData({ name: '', contactName: '', phone: '', email: '', category: '', active: true });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return toast.error('Nome é obrigatório');

        if (editingSupplier) {
            updateMutation.mutate({ id: editingSupplier.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-primary tracking-tight uppercase neon-text">Fornecedores</h2>
                    <p className="text-secondary text-sm mt-1">Gerencie seus parceiros de compras.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-900/20 transition-all flex items-center gap-2"
                >
                    <Plus size={16} /> Novo Fornecedor
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nome ou categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-surface border border-white/5 rounded-2xl text-primary focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                />
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSuppliers.map(supplier => (
                        <div key={supplier.id} className="glass-card bg-surface/50 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group relative">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest bg-indigo-500/10 px-2 py-1 rounded mb-2 inline-block">
                                        {supplier.category || 'Geral'}
                                    </span>
                                    <h3 className="font-bold text-lg text-white leading-tight">{supplier.name}</h3>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(supplier)} className="p-2 hover:bg-white/10 rounded-lg text-secondary hover:text-white transition-colors"><Edit2 size={14} /></button>
                                    <button
                                        onClick={() => { if (confirm('Excluir fornecedor?')) deleteMutation.mutate(supplier.id) }}
                                        className="p-2 hover:bg-red-500/20 rounded-lg text-secondary hover:text-red-500 transition-colors"
                                    ><Trash2 size={14} /></button>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-secondary">
                                {supplier.contactName && <div className="flex items-center gap-2"><Building size={14} className="text-zinc-500" /> {supplier.contactName}</div>}
                                {supplier.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-zinc-500" /> {supplier.phone}</div>}
                                {supplier.email && <div className="flex items-center gap-2"><Mail size={14} className="text-zinc-500" /> {supplier.email}</div>}
                            </div>
                        </div>
                    ))}

                    {filteredSuppliers.length === 0 && (
                        <div className="col-span-full text-center py-10 opacity-50">
                            <p>Nenhum fornecedor encontrado.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-surface-active">
                            <h3 className="font-bold text-white">{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                            <button onClick={handleCloseModal} className="text-secondary hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-secondary mb-1">Nome da Empresa *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-input border border-white/10 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-secondary mb-1">Contato</label>
                                    <input
                                        type="text"
                                        value={formData.contactName}
                                        onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                        className="w-full bg-input border border-white/10 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none"
                                        placeholder="Ex: João"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-secondary mb-1">Categoria</label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-input border border-white/10 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none"
                                        placeholder="Ex: Papelaria"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-secondary mb-1">Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-input border border-white/10 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-secondary mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-input border border-white/10 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-2"
                            >
                                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="animate-spin" size={16} />}
                                Salvar
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierManager;
