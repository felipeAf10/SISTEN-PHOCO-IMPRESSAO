
import React from 'react';
import { Quote, QuoteStatus, Customer, Product } from '../types';
import { Clock, Scissors, CheckCircle, Truck, AlertCircle, Printer, Layers, Paintbrush, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';
import { generateWorkOrderPDF } from '../services/pdfService';

interface ProductionBoardProps {
  quotes: Quote[];
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  customers: Customer[];
  products: Product[];
}

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const ProductionBoard: React.FC<ProductionBoardProps> = ({ quotes, setQuotes, customers, products }) => {
  const columns: { id: QuoteStatus; label: string; icon: any; color: string }[] = [
    { id: 'production', label: 'Em Produção', icon: Scissors, color: 'text-indigo-500' },
    { id: 'pre_print', label: 'Pré-Impressão', icon: Printer, color: 'text-purple-500' },
    { id: 'printing_cut_electronic', label: 'Aguard. Corte Eletrônico', icon: Scissors, color: 'text-orange-500' },
    { id: 'printing_cut_manual', label: 'Aguard. Corte Manual', icon: Scissors, color: 'text-amber-500' },
    { id: 'printing_lamination', label: 'Aguard. Laminação', icon: Layers, color: 'text-cyan-500' },
    { id: 'printing_finishing', label: 'Aguard. Acabamento', icon: Paintbrush, color: 'text-pink-500' },
    { id: 'finished', label: 'Finalizado', icon: CheckCircle, color: 'text-emerald-500' },
    { id: 'delivered', label: 'Entregue', icon: Truck, color: 'text-secondary' },
  ];

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as QuoteStatus;

    // Optimistic Update
    setQuotes(prev => prev.map(q => q.id === draggableId ? { ...q, status: newStatus } : q));

    try {
      const quote = quotes.find(q => q.id === draggableId);
      if (quote) {
        await api.quotes.update({ ...quote, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Erro ao mover card. Revertendo...");
      // Revert if needed (simple reload or more complex revert logic)
      window.location.reload();
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-primary uppercase tracking-tight">Fluxo de Produção</h2>
            <p className="text-xs text-brand-magenta font-bold uppercase tracking-widest mt-1">Gestão de Pedidos Confirmados</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-secondary glass-card bg-surface/50 px-4 py-2 rounded-xl border border-white/5">
            <AlertCircle size={16} className="text-brand-magenta" />
            {quotes.filter(q => q.status === 'production').length} em execução
          </div>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-6 min-h-[calc(100vh-200px)]">
          {columns.map(col => (
            <div key={col.id} className="glass-card bg-surface/30 rounded-[2rem] p-4 flex flex-col min-w-[320px] max-w-[320px] border border-white/10 shrink-0">
              <div className="flex items-center gap-2 mb-4 px-3 py-2 sticky top-0 bg-surface/80 backdrop-blur-sm z-10 rounded-xl">
                <col.icon size={18} className={col.color.replace('indigo-500', 'text-brand-cyan')} />
                <h3 className="font-black text-primary text-[11px] uppercase tracking-wider">{col.label}</h3>
                <span className="ml-auto bg-surface/50 px-3 py-1 rounded-lg text-[10px] font-black text-secondary border border-white/10 shadow-sm">
                  {quotes.filter(q => q.status === col.id).length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-[100px]"
                  >
                    {quotes.filter(q => q.status === col.id).map((quote, index) => {
                      const customer = customers.find(c => c.id === quote.customerId);
                      return (
                        <Draggable key={quote.id} draggableId={quote.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-surface p-5 rounded-2xl shadow-sm border hover:shadow-lg transition-all group cursor-grab active:cursor-grabbing relative ${(() => {
                                  if (['finished', 'delivered'].includes(quote.status)) return 'border-white/10 hover:border-brand-cyan/20';
                                  const created = new Date(quote.date);
                                  const deadline = quote.deadlineDays || 0;
                                  const dueDate = new Date(created);
                                  dueDate.setDate(dueDate.getDate() + deadline);
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  dueDate.setHours(0, 0, 0, 0);
                                  const diffTime = dueDate.getTime() - today.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                  if (diffDays < 0) return 'border-rose-500 shadow-rose-500/10 hover:border-rose-500';
                                  if (diffDays === 0) return 'border-amber-500 shadow-amber-500/10 hover:border-amber-500';
                                  return 'border-white/10 hover:border-brand-cyan/20';
                                })()
                                }`}
                            >
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (customer) generateWorkOrderPDF(quote, customer, products);
                                }}
                                className="absolute top-2 right-2 p-2 text-secondary hover:text-cyan-400 bg-surface/50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20"
                                title="Imprimir Ordem de Produção"
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <Printer size={16} />
                              </button>

                              <div className="flex justify-between items-start mb-3">
                                <span className="text-[9px] font-black text-brand-cyan bg-cyan-500/10 px-2 py-1 rounded-lg uppercase">#{quote.id.slice(-4)}</span>
                                <div className="text-right">
                                  <p className="text-[9px] text-secondary font-bold">{new Date(quote.date).toLocaleDateString()}</p>
                                  {(() => {
                                    if (['finished', 'delivered'].includes(quote.status)) return null;

                                    const created = new Date(quote.date);
                                    const deadline = quote.deadlineDays || 0;

                                    // Add business days approximation (simple logic: just adding days for MVP)
                                    // ideally use date-fns addBusinessDays if available, or simple date add
                                    const dueDate = new Date(created);
                                    dueDate.setDate(dueDate.getDate() + deadline);

                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    dueDate.setHours(0, 0, 0, 0);

                                    const diffTime = dueDate.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                    if (diffDays < 0) {
                                      return <span className="text-[9px] font-black text-white bg-rose-500 px-1.5 py-0.5 rounded uppercase ml-auto block mt-1 w-fit animate-pulse">Atrasado ({Math.abs(diffDays)}d)</span>
                                    } else if (diffDays === 0) {
                                      return <span className="text-[9px] font-black text-black bg-amber-500 px-1.5 py-0.5 rounded uppercase ml-auto block mt-1 w-fit">Entrega Hoje</span>
                                    } else if (diffDays <= 2) {
                                      return <span className="text-[9px] font-bold text-amber-500 block mt-1">Prazo: {diffDays} dias</span>
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                              <p className="font-black text-primary text-xs uppercase mb-1">{customer?.name}</p>
                              <p className="text-[10px] text-secondary font-medium mb-4 line-clamp-1">
                                {quote.items.length} item(s) • R$ {quote.totalAmount.toLocaleString('pt-BR')}
                              </p>

                              {/* Thumbnail Section */}
                              <div className="mb-4">
                                {(quote as any).preview_url ? (
                                  <div className="relative w-full h-32 rounded-xl overflow-hidden group/img mb-2 shadow-sm">
                                    <img src={(quote as any).preview_url} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                      onClick={async (e) => {
                                        // Prevent Drag conflict
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (confirm('Remover imagem?')) {
                                          await api.quotes.update({ ...quote, preview_url: null } as any);
                                          setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, preview_url: null } as any : q));
                                        }
                                      }}
                                      className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                                      onMouseDown={(e) => e.stopPropagation()}
                                    >
                                      <AlertCircle size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="w-full h-20 bg-surface/50 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-1 group/upload hover:border-brand-magenta/50 cursor-pointer transition-colors relative"
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        try {
                                          const fileExt = file.name.split('.').pop();
                                          const fileName = `${quote.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                                          const { error: uploadError } = await api.storage.uploadProof(fileName, file);

                                          if (uploadError) throw uploadError;

                                          const publicUrl = api.storage.getPublicUrl(fileName);

                                          await api.quotes.update({ ...quote, preview_url: publicUrl } as any);
                                          setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, preview_url: publicUrl } as any : q));
                                        } catch (err) {
                                          console.error("Upload failed", err);
                                          alert("Erro ao enviar imagem. Tente novamente.");
                                        }
                                      }}
                                    />
                                    <ImageIcon size={16} className="text-secondary group-hover/upload:text-brand-magenta" />
                                    <span className="text-[9px] text-secondary font-bold uppercase">Enviar Imagem/Prova</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
};

export default ProductionBoard;
