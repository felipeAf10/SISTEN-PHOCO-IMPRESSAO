
import React, { useState, useMemo } from 'react';
import {
  Phone, Users, Hourglass, Flag, AtSign, Utensils, Car, ExternalLink,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User,
  Check, X, Briefcase, Info, Plus, Scissors, Truck, MapPin, Edit2, Trash2
} from 'lucide-react';
import { ScheduleEvent, ScheduleEventType, Customer, Quote } from '../types';
import { api } from '../src/services/api';

interface SchedulingModuleProps {
  events: ScheduleEvent[];
  setEvents: React.Dispatch<React.SetStateAction<ScheduleEvent[]>>;
  customers: Customer[];
  quotes: Quote[];
}

const EVENT_TYPES: { type: ScheduleEventType; icon: any; label: string }[] = [
  { type: 'ligar', icon: Phone, label: 'Ligar' },
  { type: 'reuniao', icon: Users, label: 'Reunião' },
  { type: 'medicao', icon: Hourglass, label: 'Medição' },
  { type: 'visita', icon: Flag, label: 'Visita Técnica' },
  { type: 'email', icon: AtSign, label: 'E-mail' },
  { type: 'almoco', icon: Utensils, label: 'Almoço/Intervalo' },
  { type: 'entrega', icon: Car, label: 'Entrega' },
  { type: 'outro', icon: ExternalLink, label: 'Outro' },
];

const RESPONSIBLES = ['Comercial', 'Produção', 'Arte Final', 'Instalação'];

const SchedulingModule: React.FC<SchedulingModuleProps> = ({ events, setEvents, customers, quotes }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeType, setActiveType] = useState<ScheduleEventType>('ligar');
  const [formData, setFormData] = useState({
    title: '',
    time: '09:00',
    duration: '30',
    description: '',
    responsible: 'Comercial',
    customerId: '',
    markAsDone: false
  });
  /* New State for Editing */
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 to 21:00

  const eventsOnSelectedDay = useMemo(() => {
    return events.filter(e => e.date.startsWith(selectedDate));
  }, [events, selectedDate]);

  const handleEditEvent = (event: ScheduleEvent) => {
    setEditingEventId(event.id);
    setActiveType(event.type);

    // Parse date and time from ISO string "YYYY-MM-DDTHH:MM:SS"
    const [datePart, timePart] = event.date.split('T');

    setFormData({
      title: event.title,
      time: timePart.substring(0, 5), // HH:MM
      duration: event.durationMinutes.toString(),
      description: event.description || '',
      responsible: event.responsible,
      customerId: event.customerId || '',
      markAsDone: event.status === 'completed'
    });
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setFormData({
      title: '',
      time: '09:00',
      duration: '30',
      description: '',
      responsible: 'Comercial',
      customerId: '',
      markAsDone: false
    });
  };

  const handleAddEvent = async (stayInModal = false) => {
    if (!formData.title) return;

    try {
      if (editingEventId) {
        // UPDATE Existing Event
        const updatedEvent: ScheduleEvent = {
          id: editingEventId,
          type: activeType,
          title: formData.title,
          date: `${selectedDate}T${formData.time}:00`,
          durationMinutes: parseInt(formData.duration),
          description: formData.description,
          responsible: formData.responsible,
          customerId: formData.customerId,
          status: formData.markAsDone ? 'completed' : 'pending'
        };

        await api.scheduling.update(updatedEvent);
        setEvents(prev => prev.map(e => e.id === editingEventId ? updatedEvent : e));
        handleCancelEdit(); // Exit edit mode
      } else {
        // CREATE New Event
        const newEvent: ScheduleEvent = {
          id: crypto.randomUUID(),
          type: activeType,
          title: formData.title,
          date: `${selectedDate}T${formData.time}:00`,
          durationMinutes: parseInt(formData.duration),
          description: formData.description,
          responsible: formData.responsible,
          customerId: formData.customerId,
          status: formData.markAsDone ? 'completed' : 'pending'
        };

        await api.scheduling.create(newEvent);
        setEvents(prev => [...prev, newEvent]);

        if (!stayInModal) {
          handleCancelEdit(); // Reset form
        }
      }
    } catch (error) {
      console.error("Error saving event:", error);
      alert(`Erro ao salvar agendamento: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este agendamento?")) {
      try {
        await api.scheduling.delete(id);
        setEvents(prev => prev.filter(e => e.id !== id));
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Erro ao excluir.");
      }
    }
  };

  // ... (Helpers getEventForHour, formatDateDisplay, getDayOfWeek unchanged)

  const getEventForHour = (hour: number) => {
    return eventsOnSelectedDay.find(e => {
      const h = new Date(e.date).getHours();
      return h === hour;
    });
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'long' });
  };

  return (
    <div className="glass-card rounded-[2rem] shadow-xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <div className="p-4 lg:p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
        <h2 className="text-3xl font-black text-slate-50 uppercase tracking-tight flex items-center gap-3 neon-text">
          <CalendarIcon size={32} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" /> {editingEventId ? 'Editar Agendamento' : 'Agendar Nova Tarefa'}
        </h2>
        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-700 hover:text-white transition-colors border border-slate-700">
          <X size={24} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-[700px]">
        {/* Coluna Esquerda: Formulário */}
        <div className="flex-1 p-4 lg:p-10 border-r border-white/5 space-y-8">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">{editingEventId ? 'Atualizar Detalhes' : 'Criar Tarefa'}</h3>

            {/* Seletor de Tipo */}
            <div className="flex flex-wrap gap-2 mb-8">
              {EVENT_TYPES.map((et) => (
                <button
                  key={et.type}
                  onClick={() => setActiveType(et.type)}
                  title={et.label}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeType === et.type ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300 border border-slate-700'}`}
                >
                  <et.icon size={20} />
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título da Tarefa *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-cyan-500 text-slate-100 placeholder-slate-600"
                  placeholder="Ex: Ligar para confirmar medidas"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data *</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hora & Duração *</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      className="flex-1 px-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-2xl font-bold text-sm outline-none text-slate-100 [color-scheme:dark]"
                    />
                    <select
                      value={formData.duration}
                      onChange={e => setFormData({ ...formData, duration: e.target.value })}
                      className="flex-1 px-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-2xl font-bold text-sm outline-none text-slate-100"
                    >
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="60">1h 00m</option>
                      <option value="120">2h 00m</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</label>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700 flex gap-4 text-slate-500">
                    <button type="button" className="font-serif font-black hover:text-cyan-400">B</button>
                    <button type="button" className="italic font-serif hover:text-cyan-400">I</button>
                    <button type="button" className="underline font-serif hover:text-cyan-400">U</button>
                  </div>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full h-32 px-5 py-4 bg-slate-900/50 outline-none text-sm font-medium resize-none text-slate-300 placeholder-slate-600"
                    placeholder="Descreva os detalhes da tarefa..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Responsável *</label>
                  <select
                    value={formData.responsible}
                    onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none"
                  >
                    {RESPONSIBLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Negócio / Cliente</label>
                  <select
                    value={formData.customerId}
                    onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none"
                  >
                    <option value="">Selecione um negócio...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="markAsDone"
                  checked={formData.markAsDone}
                  onChange={e => setFormData({ ...formData, markAsDone: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="markAsDone" className="text-sm font-black text-slate-600 uppercase tracking-tight cursor-pointer">Marcar como feita</label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-100">
            <button onClick={handleCancelEdit} className="px-8 py-3.5 border border-slate-600 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all">Cancelar</button>
            {!editingEventId && (
              <button onClick={() => handleAddEvent(true)} className="px-8 py-3.5 bg-cyan-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/20">Agendar e Criar Outra</button>
            )}
            <button onClick={() => handleAddEvent(false)} className="px-10 py-3.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:from-fuchsia-500 hover:to-purple-500 transition-all shadow-[0_0_20px_rgba(217,70,239,0.4)] flex-1 border border-fuchsia-500/20">
              {editingEventId ? 'Salvar Alterações' : 'Agendar'}
            </button>
          </div>
        </div>

        {/* Coluna Direita: Agenda Visual */}
        <div className="flex-1 bg-slate-900/30 p-4 lg:p-10 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Agenda Diária</h3>
            <select className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-300 outline-none">
              <option>Todos os Responsáveis</option>
              {RESPONSIBLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div className="bg-slate-900/50 rounded-[2rem] border border-white/5 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-1">
                <button onClick={() => {
                  const d = new Date(selectedDate + 'T12:00:00');
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><ChevronLeft size={20} /></button>
                <button onClick={() => {
                  const d = new Date(selectedDate + 'T12:00:00');
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"><ChevronRight size={20} /></button>
                <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-cyan-400 transition-colors">Hoje</button>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-200 uppercase tracking-tight">{formatDateDisplay(selectedDate)}</p>
                <p className="text-[10px] font-bold text-cyan-500 uppercase">{getDayOfWeek(selectedDate)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-900/40">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-800/50">
                    <th className="w-20 p-3 text-[10px] font-black text-slate-500 border-r border-slate-700/50 uppercase">Horário</th>
                    <th className="p-3 text-[10px] font-black text-slate-500 uppercase">Compromissos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  <tr className="bg-amber-900/10">
                    <td className="p-3 text-[10px] font-bold text-slate-500 border-r border-slate-700/50 text-center">dia inteiro</td>
                    <td className="p-3"></td>
                  </tr>
                  {hours.map(hour => {
                    const event = getEventForHour(hour);
                    return (
                      <tr key={hour} className="h-16 group hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-[10px] font-bold text-slate-600 border-r border-slate-700/50 text-center">{hour.toString().padStart(2, '0')}h</td>
                        <td className="p-2 relative">
                          {event ? (
                            <div className={`p-3 rounded-xl border shadow-sm flex items-center justify-between group/card ${event.status === 'completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`}>
                              <div className="flex items-center gap-3">
                                {EVENT_TYPES.find(t => t.type === event.type) ? React.createElement(EVENT_TYPES.find(t => t.type === event.type)!.icon, { size: 16, className: event.status === 'completed' ? 'text-emerald-500' : 'text-indigo-500' }) : <Clock size={16} />}
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black uppercase leading-tight truncate">{event.title}</p>
                                  <p className="text-[8px] font-bold opacity-60 uppercase">{event.responsible} • {event.durationMinutes}min</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                <button onClick={() => handleEditEvent(event)} className="p-1 hover:bg-indigo-200 rounded text-indigo-700" title="Editar"><Edit2 size={12} /></button>
                                <button onClick={() => handleDeleteEvent(event.id)} className="p-1 hover:bg-rose-200 rounded text-rose-700" title="Excluir"><Trash2 size={12} /></button>
                                {event.status === 'completed' && <Check size={14} className="text-emerald-500 shrink-0" />}
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setFormData({ ...formData, time: `${hour.toString().padStart(2, '0')}:00` })} className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center">
                              <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all">
                                <Plus size={16} />
                              </div>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>


          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shadow-inner">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase">Total do Dia</p>
                <p className="text-sm font-black text-slate-200">{eventsOnSelectedDay.length} Compromissos</p>
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shadow-inner">
                <Check size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase">Concluídos</p>
                <p className="text-sm font-black text-slate-200">{eventsOnSelectedDay.filter(e => e.status === 'completed').length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulingModule;
