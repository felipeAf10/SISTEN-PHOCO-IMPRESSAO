import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Quote, Product } from '../../types';
import { Package } from 'lucide-react';

interface TopProductsChartProps {
    quotes: Quote[];
    products: Product[];
}

const TopProductsChart: React.FC<TopProductsChartProps> = ({ quotes, products }) => {
    const chartData = useMemo(() => {
        const productStats: Record<string, { name: string; revenue: number; qty: number }> = {};

        quotes.forEach(quote => {
            if (quote.status === 'draft') return; // Ignore drafts

            quote.items.forEach(item => {
                if (!productStats[item.productId]) {
                    const product = products.find(p => p.id === item.productId);
                    productStats[item.productId] = {
                        name: product?.name || 'Item Desconhecido',
                        revenue: 0,
                        qty: 0
                    };
                }
                productStats[item.productId].revenue += item.subtotal;
                productStats[item.productId].qty += item.quantity;
            });
        });

        // Convert to array and sort by revenue
        return Object.values(productStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5); // Top 5
    }, [quotes, products]);

    const COLORS = ['#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b', '#10b981'];

    return (
        <div className="glass-card p-6 rounded-[2rem] shadow-lg border border-white/5 relative overflow-hidden">
            <h3 className="text-lg font-black text-primary mb-2 flex items-center gap-2">
                <Package size={20} className="text-fuchsia-500 drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]" />
                Top Produtos (Receita)
            </h3>
            <p className="text-xs text-secondary font-medium mb-6 uppercase tracking-wider">Campeões de venda</p>

            {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[250px] text-secondary opacity-50">
                    <Package size={40} className="mb-2" />
                    <p className="text-xs font-bold uppercase">Sem dados suficientes</p>
                </div>
            ) : (
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                        >
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                tick={{ fill: '#e2e8f0', fontSize: 10, fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                                }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                formatter={(value: number | undefined) => [`R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita Total']}
                            />
                            <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={20} animationDuration={1000}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default TopProductsChart;
