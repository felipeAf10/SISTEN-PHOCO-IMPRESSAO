import React, { useMemo } from 'react';
import { Quote, FixedCost } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, AlertCircle } from 'lucide-react';

interface CashFlowForecastProps {
    quotes: Quote[];
    fixedCosts: FixedCost[];
    currentBalance?: number; // Optional starting balance
}

const CashFlowForecast: React.FC<CashFlowForecastProps> = ({ quotes, fixedCosts, currentBalance = 0 }) => {

    // helper to add days
    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    const projection = useMemo(() => {
        const today = new Date();
        const days = 30;
        let runningBalance = currentBalance;
        const dailyData: { date: string, balance: number, income: number, expense: number, events: any[] }[] = [];

        for (let i = 0; i < days; i++) {
            const date = addDays(today, i);
            const dateStr = date.toISOString().split('T')[0];
            let dailyIncome = 0;
            let dailyExpense = 0;
            const events: any[] = [];

            // 1. Fixed Costs (Assume they hit on day 5 of month)
            // If day is 5, add all fixed costs
            // Or better: Distribute them? Let's simplify: All hit on day 10.
            if (date.getDate() === 10) {
                const totalFixed = fixedCosts.reduce((acc, c) => acc + c.value, 0);
                dailyExpense += totalFixed;
                events.push({ type: 'cost', name: 'Custos Fixos Mensais', value: totalFixed });
            }

            // 2. Incoming Quotes
            // Logic: Quote Date + Deadline = Payment Date (Approximation)
            // Or if has installments, split? 
            // MVP: Full payment on deadline.
            quotes.forEach(q => {
                if (q.status !== 'approved' && q.status !== 'production' && q.status !== 'finished' && q.status !== 'delivered') return;

                // Calculate due date
                const created = new Date(q.date);
                const due = addDays(created, q.deadlineDays || 0);

                // If due date is THIS day
                if (due.toISOString().split('T')[0] === dateStr) {
                    dailyIncome += q.totalAmount;
                    events.push({ type: 'income', name: `Pedido #${q.id.slice(-4)}`, value: q.totalAmount });
                }
            });

            runningBalance += dailyIncome - dailyExpense;
            dailyData.push({
                date: `${date.getDate()}/${date.getMonth() + 1}`,
                balance: runningBalance,
                income: dailyIncome,
                expense: dailyExpense,
                events
            });
        }
        return dailyData;
    }, [quotes, fixedCosts, currentBalance]);

    const finalBalance = projection[projection.length - 1].balance;
    const lowestPoint = Math.min(...projection.map(d => d.balance));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-white">Previsão de 30 Dias</h2>
                    <p className="text-secondary text-sm">Baseado em custos fixos (dia 10) e recebimentos de pedidos.</p>
                </div>
                <div className={`text-right px-4 py-2 rounded-xl border ${finalBalance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest text-secondary">Saldo Projetado</p>
                    <p className={`text-2xl font-black ${finalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        R$ {finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {lowestPoint < 0 && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="text-rose-400" size={24} />
                    <div>
                        <h4 className="font-bold text-white">Alerta de Caixa Negativo</h4>
                        <p className="text-sm text-rose-200">Sua previsão indica que o saldo pode ficar negativo em alguns dias. Verifique os custos.</p>
                    </div>
                </div>
            )}

            <div className="h-64 w-full bg-surface-active/30 rounded-3xl border border-white/5 p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projection}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val / 1000}k`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                        />
                        <Area type="monotone" dataKey="balance" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Upcoming Events List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projection.filter(d => d.events.length > 0).slice(0, 6).map((day, i) => (
                    <div key={i} className="bg-surface border border-white/5 p-4 rounded-2xl">
                        <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Calendar size={12} /> {day.date}
                        </p>
                        <div className="space-y-2">
                            {day.events.map((ev, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className={ev.type === 'income' ? 'text-white' : 'text-zinc-400'}>{ev.name}</span>
                                    <span className={`font-bold ${ev.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {ev.type === 'income' ? '+' : '-'} R$ {ev.value.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CashFlowForecast;
