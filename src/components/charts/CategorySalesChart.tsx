import React, { useMemo } from 'react';
import { Quote } from '../../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface CategorySalesChartProps {
    quotes: Quote[];
    productsMap: Record<string, { category: string }>;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

const CategorySalesChart: React.FC<CategorySalesChartProps> = ({ quotes, productsMap }) => {
    const data = useMemo(() => {
        const categoryRevenue: Record<string, number> = {};

        quotes.forEach(q => {
            q.items.forEach(item => {
                const product = productsMap[item.productId];
                const category = product?.category || 'Outros';

                // Use total amount of item (subtotal)
                // Note: If quote has discount, we might want to distribute it, but for simplicity we use item subtotal
                // Ideally we should scale down by quote discount ratio if exact revenue matters
                // For now, let's use raw subtotal to see volume
                if (!categoryRevenue[category]) categoryRevenue[category] = 0;
                categoryRevenue[category] += item.subtotal;
            });
        });

        return Object.entries(categoryRevenue)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

    }, [quotes, productsMap]);

    return (
        <div className="bg-surface rounded-3xl p-6 border border-white/5 h-96 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4">Vendas por Categoria</h3>
            <div className="flex-1 min-h-0 relative">
                {data.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-50">
                        <PieChartIcon className="text-secondary mb-2" size={48} />
                        <p className="text-sm text-secondary font-medium">Nenhuma venda registrada</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: any) => `R$ ${(Number(value) || 0).toFixed(2)}`}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default CategorySalesChart;
