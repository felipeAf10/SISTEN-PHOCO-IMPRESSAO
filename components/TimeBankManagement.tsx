
import React, { useState, useEffect } from 'react';
import { api } from '../src/services/api';
import { User, TimeRecord } from '../types';
import { Users, Calendar, Save, Trash2, Edit, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface TimeBankManagementProps {
    currentUser: User;
}

const TimeBankManagement: React.FC<TimeBankManagementProps> = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState<'employees' | 'records' | 'report'>('employees');
    const [users, setUsers] = useState<User[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Date Filters for Records
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Edit Modal State
    const [editingRecord, setEditingRecord] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({
        clockIn: '',
        lunchStart: '',
        lunchEnd: '',
        breakStart: '',
        breakEnd: '',
        clockOut: ''
    });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'employees') {
                const uData = await api.users.list();
                setUsers(uData || []);
            } else if (activeTab === 'records' || activeTab === 'report') {
                try {
                    const recs = await api.timeRecords.getAll(startDate, endDate);
                    setRecords(recs || []);
                } catch (err: any) {
                    console.error("Error fetching records:", err);
                    if (err?.code === 'PGRST116') {
                        setRecords([]);
                    } else {
                        // Fallback: If getAll fails (maybe RLS permission issue for non-admins disguised), just show empty
                        // Ideally checking user role before calling getAll would be better, but we want to avoid crashing.
                        console.warn("Falling back to empty records due to API error.");
                        setRecords([]);
                    }
                }
            }
        } catch (error) {
            console.error("Error loading data", error);
            alert("Erro ao carregar dados. Verifique sua conexão.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateWorkload = async (userId: string, config: { default: number, saturday: number }) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            // Legacy workloadHours is approx default hours
            const legacyHours = Math.round(config.default / 60);
            await api.users.update(userId, {
                ...user,
                workloadConfig: config,
                workloadHours: legacyHours
            });
            alert("Carga horária atualizada!");
            loadData();
        } catch (error) {
            console.error("Error updating workload", error);
            alert("Erro ao atualizar.");
        }
    };

    const handleEditClick = (record: any) => {
        setEditingRecord(record);
        setEditForm({
            clockIn: record.clockIn ? new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            lunchStart: record.lunchStart ? new Date(record.lunchStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            lunchEnd: record.lunchEnd ? new Date(record.lunchEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            breakStart: record.breakStart ? new Date(record.breakStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            breakEnd: record.breakEnd ? new Date(record.breakEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            clockOut: record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        });
    };

    // Live Calculation in Modal
    const liveStats = React.useMemo(() => {
        if (!editForm.clockIn || !editForm.clockOut) return { worked: 0, balance: 0, breakTime: 0 };

        const getMin = (timeStr: string) => {
            if (!timeStr) return 0;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const start = getMin(editForm.clockIn);
        let end = getMin(editForm.clockOut);
        if (end < start) end += 24 * 60; // Overnight

        let breakTime = 0;
        if (editForm.lunchStart && editForm.lunchEnd) {
            let ls = getMin(editForm.lunchStart);
            let le = getMin(editForm.lunchEnd);
            if (le < ls) le += 24 * 60;
            breakTime += (le - ls);
        }
        if (editForm.breakStart && editForm.breakEnd) {
            let bs = getMin(editForm.breakStart);
            let be = getMin(editForm.breakEnd);
            if (be < bs) be += 24 * 60;
            breakTime += (be - bs);
        }

        const worked = end - start - breakTime;

        // Determine Target based on Day of Week
        let targetMin = 480; // Default to 8 hours (480 minutes)
        if (editingRecord) {
            const recDate = new Date(editingRecord.date); // e.g. "2023-10-27"
            // Careful: "2023-10-27" parsed as UTC might be previous day in local if using getDay() directly without context
            // Use string split to be safe or ensure local time
            const day = new Date(recDate.getUTCFullYear(), recDate.getUTCMonth(), recDate.getUTCDate()).getDay();

            const config = editingRecord.userConfig; // We need to ensure we have this

            if (config) {
                if (day === 6) targetMin = config.saturday || config.default;
                else if (day === 0) targetMin = config.sunday || config.default;
                else targetMin = config.default;
            } else {
                targetMin = (editingRecord.userWorkload || 8) * 60;
            }
        }

        const balance = worked - targetMin;

        return { worked, balance, breakTime, targetMin };
    }, [editForm, editingRecord]);

    const handleSaveEdit = async () => {
        if (!editingRecord) return;
        try {
            // Robust Date Combination (Local Time -> ISO)
            const combine = (dateStr: string, timeStr: string) => {
                if (!timeStr) return null;
                // Ensure we have a YYYY-MM-DD string
                const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
                const [y, m, d] = datePart.split('-').map(Number);
                const [hours, minutes] = timeStr.split(':').map(Number);

                // Constructor: new Date(year, monthIndex, day, hours, minutes)
                // This creates a date in the Local Timezone of the browser
                const localDate = new Date(y, m - 1, d, hours, minutes);
                return localDate.toISOString();
            };

            const updates = {
                id: editingRecord.id,
                clockIn: combine(editingRecord.date, editForm.clockIn),
                lunchStart: combine(editingRecord.date, editForm.lunchStart),
                lunchEnd: combine(editingRecord.date, editForm.lunchEnd),
                breakStart: combine(editingRecord.date, editForm.breakStart),
                breakEnd: combine(editingRecord.date, editForm.breakEnd),
                clockOut: combine(editingRecord.date, editForm.clockOut),
                totalMinutes: liveStats.worked,
                balanceMinutes: liveStats.balance,
                targetMinutes: liveStats.targetMin
            };

            await api.timeRecords.updateAdmin(updates);
            alert("Registro atualizado com sucesso!");
            setEditingRecord(null);
            await loadData(); // Await to ensure loading state clears
        } catch (error) {
            console.error("Error saving record", error);
            alert("Erro ao salvar registro. Verifique os dados.");
        }
    };


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-50 uppercase tracking-tight neon-text">Gestão de Banco de Horas</h2>
                    <p className="text-xs text-fuchsia-400 font-bold uppercase tracking-widest mt-1">Área Administrativa</p>
                </div>
            </div>

            {/* Edit Modal */}
            {editingRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
                            <h3 className="font-bold uppercase tracking-widest">Editar Ponto - {editingRecord.userName}</h3>
                            <button onClick={() => setEditingRecord(null)}><div className="bg-white/10 p-2 rounded-full hover:bg-white/20"><Trash2 size={16} className="rotate-45" /></div></button>
                        </div>
                        <div className="p-4 md:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Entrada</label>
                                    <input type="time" value={editForm.clockIn} onChange={e => setEditForm({ ...editForm, clockIn: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Saída</label>
                                    <input type="time" value={editForm.clockOut} onChange={e => setEditForm({ ...editForm, clockOut: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Saída Almoço</label>
                                    <input type="time" value={editForm.lunchStart} onChange={e => setEditForm({ ...editForm, lunchStart: e.target.value })} className="w-full px-3 py-2 bg-orange-50 border border-orange-100 rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Volta Almoço</label>
                                    <input type="time" value={editForm.lunchEnd} onChange={e => setEditForm({ ...editForm, lunchEnd: e.target.value })} className="w-full px-3 py-2 bg-orange-50 border border-orange-100 rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Saída Café</label>
                                    <input type="time" value={editForm.breakStart} onChange={e => setEditForm({ ...editForm, breakStart: e.target.value })} className="w-full px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Volta Café</label>
                                    <input type="time" value={editForm.breakEnd} onChange={e => setEditForm({ ...editForm, breakEnd: e.target.value })} className="w-full px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl" />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">Pausas</p>
                                        <p className="text-lg font-black text-slate-700">{Math.floor(liveStats.breakTime / 60)}h {liveStats.breakTime % 60}m</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">Trabalhado</p>
                                        <p className="text-lg font-black text-brand-cyan">{Math.floor(liveStats.worked / 60)}h {liveStats.worked % 60}m</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">Saldo Dia</p>
                                        <p className={`text-lg font-black ${liveStats.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {liveStats.balance > 0 ? '+' : ''}{liveStats.balance}m
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleSaveEdit} className="w-full py-4 bg-brand-cyan text-white font-black uppercase rounded-xl hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/20">
                                Confirmar e Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-1">
                <button onClick={() => setActiveTab('employees')} className={`px-4 py-2 text-xs font-bold uppercase rounded-t-lg transition-colors ${activeTab === 'employees' ? 'bg-slate-800 border border-slate-700 text-cyan-400 border-b-slate-800 -mb-[1px]' : 'text-slate-500 hover:text-slate-300'}`}>
                    Carga Horária
                </button>
                <button onClick={() => setActiveTab('records')} className={`px-4 py-2 text-xs font-bold uppercase rounded-t-lg transition-colors ${activeTab === 'records' ? 'bg-slate-800 border border-slate-700 text-cyan-400 border-b-slate-800 -mb-[1px]' : 'text-slate-500 hover:text-slate-300'}`}>
                    Registros & Ajustes
                </button>
                <button onClick={() => setActiveTab('report')} className={`px-4 py-2 text-xs font-bold uppercase rounded-t-lg transition-colors ${activeTab === 'report' ? 'bg-slate-800 border border-slate-700 text-cyan-400 border-b-slate-800 -mb-[1px]' : 'text-slate-500 hover:text-slate-300'}`}>
                    Relatório Semanal
                </button>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-sm min-h-[400px]">
                {loading ? <div className="text-center p-10 text-slate-400">Carregando...</div> : (
                    <>
                        {/* EMPLOYEES TAB */}
                        {activeTab === 'employees' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {users.map(u => (
                                    <div key={u.id} className="p-4 rounded-xl border border-white/5 bg-slate-800/50 flex flex-col gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-700 text-indigo-400 rounded-lg flex items-center justify-center font-black">
                                                {u.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-200">{u.name}</p>
                                                <p className="text-xs text-slate-500 uppercase">{u.role}</p>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-slate-200 space-y-3">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Segunda a Sexta (HH:MM)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="time"
                                                        defaultValue={(() => {
                                                            const min = u.workloadConfig?.default || (u.workloadHours || 8) * 60;
                                                            const h = Math.floor(min / 60).toString().padStart(2, '0');
                                                            const m = (min % 60).toString().padStart(2, '0');
                                                            return `${h}:${m}`;
                                                        })()}
                                                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-bold text-slate-200 [color-scheme:dark]"
                                                        id={`workload-default-${u.id}`}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Sábado (HH:MM)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="time"
                                                        defaultValue={(() => {
                                                            const min = u.workloadConfig?.saturday || 0;
                                                            const h = Math.floor(min / 60).toString().padStart(2, '0');
                                                            const m = (min % 60).toString().padStart(2, '0');
                                                            return `${h}:${m}`;
                                                        })()}
                                                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-bold text-slate-200 [color-scheme:dark]"
                                                        id={`workload-saturday-${u.id}`}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const defVal = (document.getElementById(`workload-default-${u.id}`) as HTMLInputElement).value;
                                                    const satVal = (document.getElementById(`workload-saturday-${u.id}`) as HTMLInputElement).value;

                                                    const parseMin = (t: string) => {
                                                        const [h, m] = t.split(':').map(Number);
                                                        return (h * 60) + m;
                                                    }

                                                    const config = {
                                                        default: parseMin(defVal),
                                                        saturday: parseMin(satVal)
                                                    };

                                                    handleUpdateWorkload(u.id, config);
                                                }}
                                                className="w-full py-2 bg-brand-cyan text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2 text-xs font-bold uppercase"
                                            >
                                                <Save size={14} /> Salvar Carga
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* RECORDS TAB */}
                        {activeTab === 'records' && (
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-400">De</label>
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full px-3 py-2 rounded-lg border-slate-700 bg-slate-900 text-sm text-slate-200 [color-scheme:dark]" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-400">Até</label>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="block w-full px-3 py-2 rounded-lg border-slate-700 bg-slate-900 text-sm text-slate-200 [color-scheme:dark]" />
                                    </div>
                                    <button onClick={loadData} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-xs font-bold uppercase hover:bg-black transition-colors">Filtrar</button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-200">
                                                <th className="py-3 px-4">Data</th>
                                                <th className="py-3 px-4">Funcionário</th>
                                                <th className="py-3 px-4">Entrada</th>
                                                <th className="py-3 px-4">Saída</th>
                                                <th className="py-3 px-4">Saldo</th>
                                                <th className="py-3 px-4 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm text-slate-600">
                                            {records.map(r => (
                                                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="py-3 px-4 font-mono text-xs text-slate-300">{new Date(r.date + 'T00:00:00').toLocaleDateString()}</td>
                                                    <td className="py-3 px-4 font-bold text-slate-200">{r.userName}</td>
                                                    <td className="py-3 px-4 text-slate-400">{r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                                                    <td className="py-3 px-4 text-slate-400">{r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`font-bold ${(r.balanceMinutes || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {r.balanceMinutes}m
                                                        </span>
                                                        <span className="text-[10px] text-slate-300 ml-1">
                                                            (Meta: {r.targetMinutes || (r.userWorkload * 60) || 480}m)
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button className="text-slate-400 hover:text-brand-cyan" onClick={() => handleEditClick(r)}>
                                                            <Edit size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* REPORT TAB */}
                        {activeTab === 'report' && (
                            <div className="space-y-6">
                                <div className="flex gap-4 items-end bg-slate-50 p-4 rounded-xl">
                                    <p className="text-xs text-slate-500">Relatório consolidado de horas por funcionário no período selecionado.</p>
                                    <div className="ml-auto flex gap-2">
                                        <button onClick={loadData} className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-xs font-bold uppercase hover:bg-cyan-600 transition-colors">Atualizar</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Group records by user */}
                                    {Object.entries(records.reduce((acc: any, curr) => {
                                        const name = curr.userName || 'Unknown';
                                        if (!acc[name]) acc[name] = { totalBalance: 0, days: 0 };
                                        acc[name].totalBalance += (curr.balanceMinutes || 0);
                                        acc[name].days += 1;
                                        return acc;
                                    }, {})).map(([name, stats]: any) => (
                                        <div key={name} className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg">{name}</h3>
                                                <p className="text-xs text-slate-400">{stats.days} dias registrados no período</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold uppercase text-slate-400">Saldo Total</p>
                                                <p className={`text-2xl font-black ${stats.totalBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {stats.totalBalance > 0 ? '+' : ''}{Math.floor(stats.totalBalance / 60)}h {Math.abs(stats.totalBalance % 60)}m
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default TimeBankManagement;
