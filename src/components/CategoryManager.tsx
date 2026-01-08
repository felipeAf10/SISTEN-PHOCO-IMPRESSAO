import React, { useState } from 'react';
import { X, Plus, Trash2, Tag, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { toast } from 'sonner';
import { ProductCategory } from '../services/api';

interface CategoryManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [newCategory, setNewCategory] = useState('');

    const { data: categories = [], isLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: api.categories.list,
        staleTime: 1000 * 60 * 5,
    });

    const createMutation = useMutation({
        mutationFn: api.categories.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Categoria criada!');
            setNewCategory('');
        },
        onError: (error: any) => {
            if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
                toast.error('Esta categoria já existe!');
            } else {
                toast.error(`Erro ao criar: ${error.message}`);
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: api.categories.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Categoria removida!');
        },
        onError: (error: any) => {
            toast.error(`Erro ao remover: ${error.message}`);
        }
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        createMutation.mutate(newCategory.trim());
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="glass-card bg-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[80vh]">
                <div className="p-6 bg-surface-active text-white flex justify-between items-center border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <Tag size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">Categorias</h3>
                            <p className="text-secondary text-xs">Gerencie as categorias de produtos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-secondary hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-hidden flex flex-col">
                    {/* Add New */}
                    <form onSubmit={handleCreate} className="flex gap-2">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            placeholder="Nova Categoria..."
                            className="flex-1 px-4 py-3 bg-input border border-white/10 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-secondary"
                        />
                        <button
                            type="submit"
                            disabled={!newCategory.trim() || createMutation.isPending}
                            className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {createMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                        </button>
                    </form>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {isLoading ? (
                            <div className="text-center py-8 text-secondary text-xs animate-pulse">Carregando categorias...</div>
                        ) : categories.length === 0 ? (
                            <div className="text-center py-8 text-secondary text-xs">Nenhuma categoria cadastrada.</div>
                        ) : (
                            categories.map(cat => (
                                <div key={cat.id} className="group flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-xl hover:bg-surface/50 transition-colors">
                                    <span className="font-bold text-sm text-zinc-300 pl-2">{cat.name}</span>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Excluir a categoria "${cat.name}"?`)) {
                                                deleteMutation.mutate(cat.id);
                                            }
                                        }}
                                        className="p-2 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryManager;
