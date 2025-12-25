import { Link } from 'react-router-dom';
import {
    ShoppingCart,
    Calculator,
    BarChart3,
    TrendingUp,
    Clock,
    Package,
    LayoutDashboard
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Helmet } from 'react-helmet-async';

const tools = [
    {
        title: 'إدارة الطلبات',
        description: 'متابعة وإدارة طلبات العملاء وحالات التوصيل',
        icon: ShoppingCart,
        href: '/orders',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
    },
    {
        title: 'إدارة المخزون',
        description: 'إضافة وتعديل المنتجات وإدارة الكميات',
        icon: Package,
        href: '/inventory',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
    },
    {
        title: 'نظام الكاشير',
        description: 'واجهة البيع المباشر وإدارة الفواتير اليومية',
        icon: Calculator,
        href: '/cashier',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
    },
    {
        title: 'إحصائيات الزوار',
        description: 'تحليل حركة المرور وسلوك المستخدمين',
        icon: BarChart3,
        href: '/visitors-stats',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
    },
    {
        title: 'تحليل الأرباح',
        description: 'تقارير مفصلة عن الأرباح والمبيعات والتكاليف',
        icon: TrendingUp,
        href: '/profits-analytics',
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
    },
    {
        title: 'الحضور والانصراف',
        description: 'تسجيل ومتابعة حضور الموظفين وساعات العمل',
        icon: Clock,
        href: '/attendance',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
    },
];

export default function Dashboard() {
    return (
        <>
            <Helmet>
                <title>لوحة التحكم - أدوات النظام</title>
            </Helmet>
            <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                            <LayoutDashboard className="h-8 w-8 text-primary" />
                            لوحة التحكم المركزية
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            جميع أدوات النظام في مكان واحد
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tools.map((tool) => (
                            <Link key={tool.href} to={tool.href} className="group block h-full">
                                <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-transparent hover:border-primary/20 overflow-hidden">
                                    <CardContent className="p-6 flex flex-col items-start gap-4 h-full relative">
                                        <div className={`p-4 rounded-2xl ${tool.bgColor} ${tool.color} transition-colors duration-300 group-hover:scale-110 mb-2`}>
                                            <tool.icon className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                                                {tool.title}
                                            </h3>
                                            <p className="text-muted-foreground leading-relaxed text-sm">
                                                {tool.description}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
