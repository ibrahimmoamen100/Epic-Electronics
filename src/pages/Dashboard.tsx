import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ShoppingCart,
    Calculator,
    BarChart3,
    TrendingUp,
    Clock,
    Package,
    LayoutDashboard,
    Lock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

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
        title: 'إدارة المنتجات',
        description: 'إدارة المنتجات والمخزون (لوحة التحكم الرئيسية)',
        icon: Package,
        href: '/admin',
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
        title: 'تحليل البيانات',
        description: 'إحصائيات شاملة عن أداء المتجر والمبيعات',
        icon: BarChart3,
        href: '/analytics',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
    },
    {
        title: 'تحليل الأرباح',
        description: 'تقارير مفصلة عن الأرباح والمبيعات والتكاليف',
        icon: TrendingUp,
        href: '/profit-analysis',
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

const DASHBOARD_PASSWORD = "102030";
const AUTH_KEY = "dashboard_auth";

export default function Dashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const auth = localStorage.getItem(AUTH_KEY);
        if (auth === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === DASHBOARD_PASSWORD) {
            localStorage.setItem(AUTH_KEY, 'true');
            setIsAuthenticated(true);
            toast.success('تم تسجيل الدخول بنجاح');
        } else {
            toast.error('كلمة المرور غير صحيحة');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(AUTH_KEY);
        setIsAuthenticated(false);
        toast.info('تم تسجيل الخروج');
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
                <Helmet>
                    <title>تسجيل الدخول - لوحة التحكم</title>
                </Helmet>
                <Card className="w-full max-w-md shadow-lg">
                    <CardContent className="pt-6 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                                <Lock className="h-6 w-6 text-primary" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم المركزية</h1>
                            <p className="text-muted-foreground">أدخل كلمة المرور للوصول إلى أدوات النظام</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <Input
                                type="password"
                                placeholder="كلمة المرور"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="text-center text-lg"
                                autoFocus
                            />
                            <Button type="submit" className="w-full" size="lg">
                                دخول
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>لوحة التحكم - أدوات النظام</title>
            </Helmet>
            <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                                <LayoutDashboard className="h-8 w-8 text-primary" />
                                لوحة التحكم المركزية
                            </h1>
                            <p className="text-muted-foreground text-lg">
                                جميع أدوات النظام في مكان واحد
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            تسجيل الخروج
                        </Button>
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
