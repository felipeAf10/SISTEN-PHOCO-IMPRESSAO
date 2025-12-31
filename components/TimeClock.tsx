
import React, { useState, useEffect } from 'react';
import { api } from '../src/services/api';
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
            const today = await api.timeRecords.getToday(user.id);
            setRecord(today);
            const hist = await api.timeRecords.getHistory(user.id);
            setHistory(hist);
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
            <p className="text-slate-400 font-bold text-sm tracking-widest uppercase animate-pulse">Carregando Ponto...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Registro de Ponto</h2>
                <div className="text-right">
                    <p className="text-xs text-slate-400 font-bold uppercase">Hoje</p>
                    <p className="text-xl font-black text-brand-cyan">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card bg-white p-8 rounded-3xl shadow-lg border border-slate-100 flex flex-col items-center justify-center min-h-[300px]">
                        {!record?.clockIn && (
                            <button onClick={() => handleAction('entry')} className="flex flex-col items-center gap-4 group">
                                <div className="w-32 h-32 bg-brand-cyan rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Play size={48} className="text-white fill-current ml-2" />
                                </div>
                                <span className="text-2xl font-black text-slate-700 uppercase">Iniciar Jornada</span>
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
                                            <button onClick={() => handleAction('lunch_start')} className="p-6 bg-orange-50 rounded-2xl border-2 border-orange-100 hover:border-orange-300 transition-colors flex flex-col items-center gap-2">
                                                <Utensils className="text-orange-500" />
                                                <span className="font-bold text-slate-700">Saída Almoço</span>
                                            </button>
                                        )}

                                        {!record.breakStart && (
                                            <button onClick={() => handleAction('break_start')} className="p-6 bg-purple-50 rounded-2xl border-2 border-purple-100 hover:border-purple-300 transition-colors flex flex-col items-center gap-2">
                                                <Coffee className="text-purple-500" />
                                                <span className="font-bold text-slate-700">Pausa Café</span>
                                            </button>
                                        )}

                                        <button onClick={() => handleAction('exit')} className="col-span-2 mt-4 p-8 bg-slate-800 text-white rounded-2xl hover:bg-black transition-colors flex flex-col items-center gap-2 shadow-xl">
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
                                <h3 className="text-2xl font-black text-slate-800">Expediente Finalizado</h3>
                                <p className="text-slate-500">Saldo do dia:
                                    <span className={`font-bold ml-2 ${(record.balanceMinutes || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {record.balanceMinutes && record.balanceMinutes > 0 ? '+' : ''}{record.balanceMinutes} min
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Timeline */}
                    <div className="flex justify-between px-4 py-6 bg-white rounded-2xl border border-slate-100">
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
                    <div className="glass-card p-6 rounded-2xl border border-white/50 bg-slate-50/50">
                        <h3 className="font-black text-slate-700 uppercase mb-4 text-sm">Resumo Mensal</h3>
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="text-brand-magenta" />
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase">Saldo Banco</p>
                                <p className="text-lg font-black text-slate-800">
                                    {/* Mock calculation for demo/MVP */}
                                    {history.reduce((acc, curr) => acc + (curr.balanceMinutes || 0), 0) > 0 ? '+' : ''}
                                    {history.reduce((acc, curr) => acc + (curr.balanceMinutes || 0), 0)} min
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-white/50 bg-white shadow-sm h-[400px] overflow-y-auto">
                        <h3 className="font-black text-slate-700 uppercase mb-4 text-sm">Histórico Recente</h3>
                        <div className="space-y-3">
                            {history.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">{new Date(item.date).toLocaleDateString()}</p>
                                        <p className="text-[10px] text-slate-400">
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
        <div className="p-2 bg-slate-100 rounded-full">
            <Icon size={16} className="text-slate-600" />
        </div>
        <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
            <p className="text-xs font-black text-slate-700">{time ? new Date(time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
        </div>
    </div>
);

export default TimeClock;
