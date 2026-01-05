
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TimeRecord, User } from '../types';
import { Clock, Coffee, Utensils, LogOut, Play, AlertTriangle, CheckCircle } from 'lucide-react';

interface TimeClockProps {
    user: User;
}

const TimeClock: React.FC<TimeClockProps> = ({ user }) => {
    const [record, setRecord] = useState<TimeRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<TimeRecord[]>([]);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Parallelize requests to improve performance
            const [today, hist] = await Promise.all([
                api.timeRecords.getToday(user.id).catch(err => { console.warn("Failed to load today's record:", err); return null; }),
                api.timeRecords.getHistory(user.id).catch(err => { console.warn("Failed to load history:", err); return []; })
            ]);

            setRecord(today);
            setHistory(hist || []);
        } catch (error) {
            console.error("Error loading time data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (type: 'entry' | 'lunch_start' | 'lunch_end' | 'break_start' | 'break_end' | 'exit') => {
        try {
            let current = record;
            if (!current) {
                current = await api.timeRecords.createToday(user.id);
            }

            const now = new Date().toISOString();
            let updates: Partial<TimeRecord> = {};

            switch (type) {
                case 'entry': updates = { clockIn: now }; break;
                case 'lunch_start': updates = { lunchStart: now }; break;
                case 'lunch_end': updates = { lunchEnd: now }; break;
                case 'break_start': updates = { breakStart: now }; break;
                case 'break_end': updates = { breakEnd: now }; break;
                case 'exit': updates = { clockOut: now }; break;
            }

            // Calculate totals if exiting
            if (type === 'exit' && current.clockIn) {
                // Simple calculation logic for MVP
                const start = new Date(current.clockIn).getTime();
                const end = new Date(now).getTime();
                const lunch = (current.lunchStart && current.lunchEnd) ? (new Date(current.lunchEnd).getTime() - new Date(current.lunchStart).getTime()) : 0;
                const brk = (current.breakStart && current.breakEnd) ? (new Date(current.breakEnd).getTime() - new Date(current.breakStart).getTime()) : 0;

                const totalMs = end - start - lunch - brk;
                const totalMin = Math.floor(totalMs / 60000);

                const calculationDate = new Date();
                // 0 = Sunday, 6 = Saturday
                const dayOfWeek = calculationDate.getDay();

                let expectedMin = 480; // Default 8h

                if (user.workloadConfig) {
                    if (dayOfWeek === 6 && user.workloadConfig.saturday) {
                        expectedMin = user.workloadConfig.saturday;
                    } else if (dayOfWeek === 0 && user.workloadConfig.sunday) {
                        expectedMin = user.workloadConfig.sunday;
                    } else {
                        expectedMin = user.workloadConfig.default;
                    }
                } else if (user.workloadHours) {
                    expectedMin = user.workloadHours * 60;
                }

                updates.totalMinutes = totalMin;
                updates.balanceMinutes = totalMin - expectedMin;
            }

            await api.timeRecords.update({ ...current, ...updates });
            await loadData();
        } catch (error) {
            console.error("Error updating time record", error);
            alert("Erro ao registrar ponto.");
        }
    };

    const formatTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-secondary font-bold text-sm tracking-widest uppercase animate-pulse">Carregando Ponto...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Clock className="text-cyan-400" /> Registro de Ponto
                </h2>
                <div className="text-right">
                    <p className="text-xs text-secondary font-bold uppercase">Hoje</p>
                    <p className="text-xl font-black text-brand-cyan">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card bg-surface border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 pointer-events-none" />
                        {!record?.clockIn && (
                            <button onClick={() => handleAction('entry')} className="flex flex-col items-center gap-4 group">
                                <div className="w-32 h-32 bg-brand-cyan rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Play size={48} className="text-white fill-current ml-2" />
                                </div>
                                <span className="text-2xl font-black text-white uppercase mt-4">Iniciar Jornada</span>
                            </button>
                        )}

                        {record?.clockIn && !record.clockOut && (
                            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                                {/* ON LUNCH */}
                                {record.lunchStart && !record.lunchEnd ? (
                                    <button onClick={() => handleAction('lunch_end')} className="col-span-2 p-6 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-colors flex flex-col items-center gap-2 shadow-lg">
                                        <Utensils className="text-white" />
                                        <span className="font-black text-xl">Voltar do Almoço</span>
                                    </button>
                                ) : record.breakStart && !record.breakEnd ? (
                                    /* ON BREAK */
                                    <button onClick={() => handleAction('break_end')} className="col-span-2 p-6 bg-purple-500 text-white rounded-2xl hover:bg-purple-600 transition-colors flex flex-col items-center gap-2 shadow-lg">
                                        <Coffee className="text-white" />
                                        <span className="font-black text-xl">Voltar do Café</span>
                                    </button>
                                ) : (
                                    /* WORKING (Before Lunch/Break OR After Lunch/Break) */
                                    <>
                                        {!record.lunchStart && (
                                            <button onClick={() => handleAction('lunch_start')} className="p-6 bg-surface-hover/50 rounded-2xl border-2 border-orange-500/20 hover:border-orange-500 hover:bg-surface-hover transition-colors flex flex-col items-center gap-2">
                                                <Utensils className="text-orange-500" />
                                                <span className="font-bold text-primary">Saída Almoço</span>
                                            </button>
                                        )}

                                        {!record.breakStart && (
                                            <button onClick={() => handleAction('break_start')} className="p-6 bg-surface-hover/50 rounded-2xl border-2 border-purple-500/20 hover:border-purple-500 hover:bg-surface-hover transition-colors flex flex-col items-center gap-2">
                                                <Coffee className="text-purple-500" />
                                                <span className="font-bold text-primary">Pausa Café</span>
                                            </button>
                                        )}

                                        <button onClick={() => handleAction('exit')} className="col-span-2 mt-4 p-8 bg-surface-hover text-white rounded-2xl hover:bg-black transition-colors flex flex-col items-center gap-2 shadow-xl">
                                            <LogOut className="text-white" size={32} />
                                            <span className="font-black text-2xl">Finalizar Expediente</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                        {record?.clockOut && (
                            <div className="text-center space-y-4">
                                <CheckCircle size={64} className="text-emerald-500 mx-auto" />
                                <h3 className="text-2xl font-black text-white">Expediente Finalizado</h3>
                                <p className="text-secondary">Saldo do dia:
                                    <span className={`font-bold ml-2 ${(record.balanceMinutes || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {record.balanceMinutes && record.balanceMinutes > 0 ? '+' : ''}{record.balanceMinutes} min
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Timeline */}
                    <div className="flex justify-between px-4 py-6 bg-surface/50 rounded-2xl border border-white/5">
                        <TimelineItem time={record?.clockIn} label="Entrada" icon={Play} />
                        <TimelineItem time={record?.lunchStart} label="Almoço" icon={Utensils} />
                        <TimelineItem time={record?.lunchEnd} label="Retorno" icon={Utensils} />
                        <TimelineItem time={record?.breakStart} label="Café" icon={Coffee} />
                        <TimelineItem time={record?.breakEnd} label="Retorno" icon={Coffee} />
                        <TimelineItem time={record?.clockOut} label="Saída" icon={LogOut} />
                    </div>
                </div>

                {/* Sidebar Status/History */}
                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-2xl border border-white/5 bg-surface/50">
                        <h3 className="font-black text-secondary uppercase mb-4 text-sm">Resumo Mensal</h3>
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="text-brand-magenta" />
                            <div>
                                <p className="text-xs text-secondary font-bold uppercase">Saldo Banco</p>
                                <p className="text-lg font-black text-white">
                                    {/* Mock calculation for demo/MVP */}
                                    {history.reduce((acc, curr) => acc + (curr.balanceMinutes || 0), 0) > 0 ? '+' : ''}
                                    {history.reduce((acc, curr) => acc + (curr.balanceMinutes || 0), 0)} min
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-white/5 bg-surface/50 shadow-sm h-[400px] overflow-y-auto custom-scrollbar">
                        <h3 className="font-black text-secondary uppercase mb-4 text-sm">Histórico Recente</h3>
                        <div className="space-y-3">
                            {history.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-surface-hover/50 rounded-xl border border-white/5 hover:bg-surface-hover transition-colors">
                                    <div>
                                        <p className="text-xs font-bold text-primary">{new Date(item.date).toLocaleDateString()}</p>
                                        <p className="text-[10px] text-secondary">
                                            {formatTime(item.clockIn)} - {formatTime(item.clockOut)}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-black ${(item.balanceMinutes || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {(item.balanceMinutes || 0)}m
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TimelineItem = ({ time, label, icon: Icon }: any) => (
    <div className={`flex flex-col items-center gap-2 ${!time ? 'opacity-30' : 'opacity-100'}`}>
        <div className="p-2 bg-surface-hover rounded-full border border-white/10">
            <Icon size={16} className="text-cyan-400" />
        </div>
        <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-secondary">{label}</p>
            <p className="text-xs font-black text-primary">{time ? new Date(time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
        </div>
    </div>
);

export default TimeClock;
