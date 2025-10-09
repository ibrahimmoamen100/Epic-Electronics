import { useState } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Users,
  Eye,
  Clock,
  TrendingUp,
  TrendingDown,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  BarChart3,
  PieChart,
  Activity,
  ArrowLeft,
  RefreshCw,
  Calendar,
  Target,
  MousePointer,
  ExternalLink,
  Download,
} from "lucide-react";

const Analytics = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("30");
  const { 
    data, 
    loading, 
    error, 
    realTimeVisitors, 
    lastUpdated, 
    refreshData, 
    exportData 
  } = useAnalytics(parseInt(timeRange));

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ar-EG').format(num);
  };

  const getPageName = (path: string) => {
    const pageNames: { [key: string]: string } = {
      '/': 'الصفحة الرئيسية',
      '/products': 'المنتجات',
      '/cart': 'سلة التسوق',
      '/about': 'من نحن',
      '/contact': 'اتصل بنا',
      '/admin': 'لوحة التحكم',
      '/cashier': 'نظام الكاشير',
      '/admin/orders': 'إدارة الطلبات',
      '/admin/analytics': 'إحصائيات الزوار',
    };
    return pageNames[path] || path;
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop': return <Monitor className="h-4 w-4" />;
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getDeviceName = (device: string) => {
    switch (device) {
      case 'desktop': return 'الحاسوب';
      case 'mobile': return 'الهاتف المحمول';
      case 'tablet': return 'التابلت';
      default: return device;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">جاري تحميل البيانات...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">خطأ في تحميل البيانات</div>
          <div className="text-muted-foreground mb-4">{error}</div>
          <Button onClick={refreshData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>إحصائيات الزوار - لوحة التحكم</title>
        <meta name="description" content="إحصائيات مفصلة لزوار الموقع" />
      </Helmet>

      <div className="max-w-[95%] mx-auto py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              العودة للوحة التحكم
            </Button>
            <div>
              <h1 className="text-3xl font-bold">إحصائيات الزوار</h1>
              <p className="text-muted-foreground">تحليل مفصل لحركة الزوار في الموقع</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">آخر 7 أيام</SelectItem>
                <SelectItem value="30">آخر 30 يوم</SelectItem>
                <SelectItem value="90">آخر 90 يوم</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={refreshData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button
              onClick={exportData}
              disabled={!data}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير البيانات
            </Button>
          </div>
        </div>

        {/* Real-time Visitors */}
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-green-800">الزوار الآن</h3>
                  <p className="text-sm text-green-600">آخر 5 دقائق</p>
                </div>
              </div>
                             <div className="text-right">
                 <div className="text-3xl font-bold text-green-800">{realTimeVisitors}</div>
                 <div className="text-sm text-green-600">زائر نشط</div>
                 {lastUpdated && (
                   <div className="text-xs text-green-500 mt-1">
                     آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG')}
                   </div>
                 )}
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الزوار</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(data?.totalVisitors || 0)}</div>
              <p className="text-xs text-muted-foreground">
                زائر فريد: {formatNumber(data?.uniqueVisitors || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مشاهدات الصفحات</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(data?.pageViews || 0)}</div>
              <p className="text-xs text-muted-foreground">
                متوسط المشاهدات: {data?.totalVisitors ? Math.round(data.pageViews / data.totalVisitors) : 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">متوسط مدة الجلسة</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(data?.averageSessionDuration || 0)}</div>
              <p className="text-xs text-muted-foreground">دقيقة:ثانية</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">معدل الارتداد</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.bounceRate.toFixed(1) || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {data?.bounceRate && data.bounceRate > 50 ? 'مرتفع' : 'منخفض'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Top Pages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                أكثر الصفحات زيارة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.topPages.slice(0, 8).map((page, index) => (
                  <div key={page.page} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{getPageName(page.page)}</p>
                        <p className="text-sm text-muted-foreground">{page.page}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatNumber(page.views)}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.totalVisitors ? Math.round((page.views / data.totalVisitors) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Device Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                توزيع الأجهزة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.deviceBreakdown.map((device) => (
                  <div key={device.device} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.device)}
                        <span className="font-medium">{getDeviceName(device.device)}</span>
                      </div>
                      <span className="text-sm font-semibold">{device.percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={device.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Browser Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                توزيع المتصفحات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.browserBreakdown.map((browser) => (
                  <div key={browser.browser} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{browser.browser}</span>
                      <span className="text-sm font-semibold">{browser.percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={browser.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Referrers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                مصادر الزيارات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.topReferrers.slice(0, 8).map((referrer, index) => (
                  <div key={referrer.referrer} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <p className="font-medium truncate max-w-[200px]">
                          {referrer.referrer === 'Direct' ? 'زيارة مباشرة' : referrer.referrer}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatNumber(referrer.visits)}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.totalVisitors ? Math.round((referrer.visits / data.totalVisitors) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hourly Traffic Chart */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              حركة الزوار بالساعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-24 gap-1 h-32 items-end">
              {data?.hourlyTraffic.map((hour) => {
                const maxVisitors = Math.max(...data.hourlyTraffic.map(h => h.visitors));
                const height = maxVisitors > 0 ? (hour.visitors / maxVisitors) * 100 : 0;
                
                return (
                  <div key={hour.hour} className="flex flex-col items-center">
                    <div
                      className="w-full bg-primary rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">
                      {hour.hour.toString().padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              الوقت (24 ساعة)
            </div>
          </CardContent>
        </Card>

        {/* Daily Traffic Chart */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              حركة الزوار اليومية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 h-32 items-end">
              {data?.dailyTraffic.slice(-7).map((day) => {
                const maxVisitors = Math.max(...data.dailyTraffic.slice(-7).map(d => d.visitors));
                const height = maxVisitors > 0 ? (day.visitors / maxVisitors) * 100 : 0;
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('ar-EG', { weekday: 'short' });
                
                return (
                  <div key={day.date} className="flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">
                      {dayName}
                    </span>
                    <span className="text-xs font-medium">
                      {formatNumber(day.visitors)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              آخر 7 أيام
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics; 