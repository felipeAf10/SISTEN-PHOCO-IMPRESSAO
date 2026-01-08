import React, { useMemo } from 'react';
import { Quote } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart as BarChartIcon } from 'lucide-react';

interface TopClientsChartProps {
    quotes: Quote[];
    customersMap: Record<string, { name: string }>;
}

const TopClientsChart: React.FC<TopClientsChartProps> = ({ quotes, customersMap }) => {
    const data = useMemo(() => {
        const clientRevenue: Record<string, number> = {};

        quotes.forEach(q => {
            const customerName = customersMap[q.customerId]?.name || 'Consumidor Final';
            if (!clientRevenue[customerName]) clientRevenue[customerName] = 0;
            clientRevenue[customerName] += q.totalAmount;
        });

        // Top 10
        return Object.entries(clientRevenue)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

    }, [quotes, customersMap]);

    return (
        <div className="bg-surface rounded-3xl p-6 border border-white/5 h-96 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4">Top 10 Clientes</h3>
            <div className="flex-1 min-h-0 relative">
                {data.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-50">
                        <BarChartIcon className="text-secondary mb-2" size={48} />
                        <p className="text-sm text-secondary font-medium">Sem dados suficientes</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                tick={{ fill: '#9ca3af', fontSize: 10 }}
                                interval={0}
                            />
                            <Tooltip
                                cursor={{ fill: '#ffffff05' }}
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: any) => `R$ ${(Number(value) || 0).toFixed(2)}`}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index < 3 ? '#10B981' : '#6366F1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default TopClientsChart;
