import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Quote } from '../../types';

interface RevenueChartProps {
    quotes: Quote[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ quotes }) => {
    const chartData = useMemo(() => {
        const today = new Date();
        const data: { name: string; fullName: string; monthIndex: number; year: number; revenue: number; count: number }[] = [];

        // Generate last 6 months placeholders
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' });
            const year = d.getFullYear();
            const month = d.getMonth();

            data.push({
                name: monthLabel,
                fullName: `${monthLabel}/${year}`,
                monthIndex: month,
                year: year,
                revenue: 0,
                count: 0
            });
        }

        // Fill with data
        quotes.forEach(quote => {
            if (quote.status === 'draft') return; // Ignore drafts

            const qDate = new Date(quote.date);
            const qMonth = qDate.getMonth();
            const qYear = qDate.getFullYear();

            const monthData = data.find(d => d.monthIndex === qMonth && d.year === qYear);
            if (monthData) {
                monthData.revenue += quote.totalAmount;
                monthData.count += 1;
            }
        });

        return data;
    }, [quotes]);

    return (
        <div className="glass-card p-6 rounded-[2rem] shadow-lg border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUpIcon size={100} className="text-cyan-400" />
            </div>

            <h3 className="text-lg font-black text-primary mb-6 flex items-center gap-2 relative z-10">
                <TrendingUpIcon size={20} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                Receita Mensal
            </h3>

            <div className="h-[300px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} stroke="#ffffff" vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                            tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                            }}
                            itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                            labelStyle={{ color: '#e2e8f0', marginBottom: '4px', fontWeight: 'bold' }}
                            formatter={(value: number | undefined) => [`R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#22d3ee"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// Simple Icon component to avoid import issues if Lucide isn't available in this file scope (though it usually is)
// But better to import properly.
import { TrendingUp as TrendingUpIcon } from 'lucide-react';

export default RevenueChart;
