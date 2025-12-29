import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
    { name: 'Jan', faturamento: 4000, despesas: 2400 },
    { name: 'Fev', faturamento: 3000, despesas: 1398 },
    { name: 'Mar', faturamento: 2000, despesas: 9800 },
    { name: 'Abr', faturamento: 2780, despesas: 3908 },
    { name: 'Mai', faturamento: 1890, despesas: 4800 },
    { name: 'Jun', faturamento: 2390, despesas: 3800 },
];

const DashboardChart = () => {
    return (
        <div className="glass-card p-6 rounded-xl shadow-lg mt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                📊 Faturamento x Despesas
            </h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                        <YAxis tick={{ fill: '#6b7280' }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            }}
                        />
                        <Legend />
                        <Bar dataKey="faturamento" name="Faturamento" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DashboardChart;
