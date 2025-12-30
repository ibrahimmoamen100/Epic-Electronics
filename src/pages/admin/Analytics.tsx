import { useState, useEffect, useCallback } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AdminLogin from "@/components/AdminLogin";
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
  MapPin,
  Wifi,
  Signal,
  User,
  Map,
  Package,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Analytics = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("30");
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const { isAuthenticated, loading: authLoading, session, login } = useAdminAuth();
  
  // Handle login using the hook's login function
  const handleLogin = useCallback(async (password: string) => {
    console.log('🔐 Analytics: handleLogin called');
    const result = await login(password);
    console.log('🔐 Analytics: handleLogin result:', result);
    return result;
  }, [login]);
  
  // Only load analytics data if authenticated
  const { 
    data, 
    loading, 
    error, 
    realTimeVisitors, 
    lastUpdated, 
    refreshData, 
    exportData 
  } = useAnalytics(isAuthenticated ? parseInt(timeRange) : 0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('Analytics: User not authenticated, showing login');
    }
  }, [isAuthenticated, authLoading]);

  // Show login if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">جاري التحقق من الصلاحيات...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} loading={authLoading} />;
  }

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ar-EG').format(num);
  };

  const getPageName = (path: string, productName?: string) => {
    // If it's a product page and we have productName from analytics data, use it
    if (path.startsWith('/product/') && productName) {
      return productName;
    }
    
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
    
    // For product pages without productName, extract readable name from slug
    if (path.startsWith('/product/') && !productName) {
      const slug = path.replace('/product/', '').split('?')[0].split('#')[0];
      const words = slug.split('-').slice(0, 6);
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || path;
    }
    
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

        {/* Real-time Visitors & Data Status */}
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
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
              {data && (
                <div className="flex-1 min-w-[200px]">
                  <div className="text-xs text-green-700 mb-1">حالة البيانات:</div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm text-green-700">
                      البيانات محدثة • {data.totalVisitors} زائر • {data.pageViews} مشاهدة
                    </span>
                  </div>
                </div>
              )}
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

        {/* Advanced Analytics Cards */}
        {data && (data as any).totalOrders !== undefined && (
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber((data as any).totalOrders || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  في آخر {timeRange} يوم
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">معدل التحويل الإجمالي</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.totalVisitors > 0 
                    ? (((data as any).totalOrders || 0) / data.totalVisitors * 100).toFixed(2)
                    : '0.00'}%
                </div>
                <p className="text-xs text-muted-foreground">
                  من الزوار إلى عملاء
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط قيمة الطلب</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber((data as any).avgOrderValue || 0)} جنيه
                </div>
                <p className="text-xs text-muted-foreground">
                  لكل طلب
                </p>
              </CardContent>
            </Card>
          </div>
        )}

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
              <div className="space-y-2">
                {data?.topPages.slice(0, 8).map((page, index) => (
                  <div key={page.page} className="border rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedPage(expandedPage === page.page ? null : page.page)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Badge variant="secondary">{index + 1}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{getPageName(page.page)}</p>
                          <p className="text-sm text-muted-foreground truncate">{page.page}</p>
                        </div>
                      </div>
                      <div className="text-right ml-4 flex items-center gap-2">
                        <div>
                          <p className="font-semibold">{formatNumber(page.views)}</p>
                          <p className="text-xs text-muted-foreground">
                            {data.totalVisitors ? Math.round((page.views / data.totalVisitors) * 100) : 0}%
                          </p>
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            ⏱️ {formatDuration(page.avgTimeOnPage || 0)}
                          </p>
                        </div>
                        {expandedPage === page.page ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {expandedPage === page.page && (
                      <div className="p-4 bg-muted/30 border-t space-y-4">
                        {/* Demographics */}
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            بيانات الزوار الديموغرافية
                          </h4>
                          <div className="grid gap-4 md:grid-cols-2">
                            {/* Age Groups */}
                            <div>
                              <p className="text-sm font-medium mb-2">الفئات العمرية:</p>
                              <div className="space-y-2">
                                {page.demographics.ageGroups.length > 0 ? (
                                  page.demographics.ageGroups.map((age) => (
                                    <div key={age.ageGroup} className="flex items-center justify-between text-sm">
                                      <span>{age.ageGroup} سنة</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold">{formatNumber(age.count)}</span>
                                        <span className="text-muted-foreground">({age.percentage.toFixed(1)}%)</span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
                                )}
                                {page.demographics.averageAge > 0 && (
                                  <div className="pt-2 border-t">
                                    <p className="text-sm">
                                      <span className="font-medium">متوسط العمر:</span> {page.demographics.averageAge.toFixed(1)} سنة
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Gender */}
                            <div>
                              <p className="text-sm font-medium mb-2">النوع:</p>
                              <div className="space-y-2">
                                {page.demographics.genders.length > 0 ? (
                                  page.demographics.genders.map((gender) => (
                                    <div key={gender.gender} className="flex items-center justify-between text-sm">
                                      <span>{gender.gender}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold">{formatNumber(gender.count)}</span>
                                        <span className="text-muted-foreground">({gender.percentage.toFixed(1)}%)</span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Locations */}
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            المواقع الجغرافية
                          </h4>
                          <div className="space-y-2">
                            {page.locations.length > 0 ? (
                              page.locations.map((location) => (
                                <div key={location.region} className="flex items-center justify-between p-2 bg-background rounded border">
                                  <span className="text-sm font-medium">{location.region}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">{formatNumber(location.count)}</span>
                                    <span className="text-xs text-muted-foreground">({location.percentage.toFixed(1)}%)</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">لا توجد بيانات عن المواقع الجغرافية</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Sources */}
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            مصادر الزيارات
                          </h4>
                          <div className="space-y-2">
                            {page.sources.length > 0 ? (
                              page.sources.map((source) => {
                                const getSourceIcon = (src: string) => {
                                  if (src.includes('Facebook')) return '📘';
                                  if (src.includes('Instagram')) return '📷';
                                  if (src.includes('Twitter') || src.includes('X')) return '🐦';
                                  if (src.includes('YouTube')) return '📺';
                                  if (src.includes('Google')) return '🔍';
                                  if (src.includes('WhatsApp')) return '💬';
                                  if (src.includes('Telegram')) return '✈️';
                                  if (src.includes('LinkedIn')) return '💼';
                                  return '🔗';
                                };
                                
                                return (
                                  <div key={source.source} className="flex items-center justify-between p-2 bg-background rounded border">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{getSourceIcon(source.source)}</span>
                                      <span className="text-sm font-medium">{source.source}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold">{formatNumber(source.count)}</span>
                                      <span className="text-xs text-muted-foreground">({source.percentage.toFixed(1)}%)</span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-sm text-muted-foreground">لا توجد بيانات عن مصادر الزيارات</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
                {data?.topReferrers.length > 0 ? (
                  data.topReferrers.slice(0, 8).map((referrer, index) => {
                    // Get icon based on referrer
                    const getReferrerIcon = (ref: string) => {
                      if (ref.includes('Facebook')) return '📘';
                      if (ref.includes('Instagram')) return '📷';
                      if (ref.includes('Twitter') || ref.includes('X')) return '🐦';
                      if (ref.includes('YouTube')) return '📺';
                      if (ref.includes('Google')) return '🔍';
                      if (ref.includes('WhatsApp')) return '💬';
                      if (ref.includes('Telegram')) return '✈️';
                      if (ref.includes('LinkedIn')) return '💼';
                      return '🔗';
                    };
                    
                    return (
                      <div key={referrer.referrer} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span className="text-lg">{getReferrerIcon(referrer.referrer)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {referrer.referrer}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold">{formatNumber(referrer.visits)}</p>
                          <p className="text-sm text-muted-foreground">
                            {referrer.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    لا توجد بيانات عن مصادر الزيارات
                  </div>
                )}
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
              {data?.hourlyTraffic && (
                <Badge variant="secondary" className="ml-2">
                  إجمالي: {formatNumber(data.hourlyTraffic.reduce((sum, h) => sum + h.visitors, 0))} زائر
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.hourlyTraffic && data.hourlyTraffic.length > 0 ? (
              <>
                <div className="grid grid-cols-24 gap-1 h-32 items-end">
                  {data.hourlyTraffic.map((hour) => {
                    const maxVisitors = Math.max(...data.hourlyTraffic.map(h => h.visitors), 1);
                    const height = maxVisitors > 0 ? (hour.visitors / maxVisitors) * 100 : 0;
                    
                    return (
                      <div key={hour.hour} className="flex flex-col items-center group relative">
                        <div
                          className="w-full bg-primary rounded-t transition-all hover:bg-primary/80 cursor-pointer"
                          style={{ height: `${height}%`, minHeight: hour.visitors > 0 ? '2px' : '0' }}
                          title={`${hour.hour}:00 - ${hour.visitors} زائر`}
                        />
                        <span className="text-xs text-muted-foreground mt-1">
                          {hour.hour.toString().padStart(2, '0')}
                        </span>
                        {hour.visitors > 0 && (
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap">
                            {hour.hour}:00 - {formatNumber(hour.visitors)} زائر
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    الوقت (24 ساعة)
                  </div>
                  <div className="text-sm text-muted-foreground">
                    الذروة: {(() => {
                      const peak = data.hourlyTraffic.reduce((max, h) => h.visitors > max.visitors ? h : max, data.hourlyTraffic[0]);
                      return `${peak.hour}:00 (${formatNumber(peak.visitors)} زائر)`;
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                لا توجد بيانات عن حركة الزوار بالساعة
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Traffic Chart */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              حركة الزوار اليومية
              {data?.dailyTraffic && (
                <Badge variant="secondary" className="ml-2">
                  إجمالي: {formatNumber(data.dailyTraffic.reduce((sum, d) => sum + d.visitors, 0))} زائر
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.dailyTraffic && data.dailyTraffic.length > 0 ? (
              <>
                <div className="grid grid-cols-7 gap-2 h-32 items-end">
                  {data.dailyTraffic.slice(-7).map((day) => {
                    const maxVisitors = Math.max(...data.dailyTraffic.slice(-7).map(d => d.visitors), 1);
                    const height = maxVisitors > 0 ? (day.visitors / maxVisitors) * 100 : 0;
                    const date = new Date(day.date + 'T00:00:00');
                    const dayName = date.toLocaleDateString('ar-EG', { weekday: 'short' });
                    const dayNumber = date.getDate();
                    
                    return (
                      <div key={day.date} className="flex flex-col items-center group relative">
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer"
                          style={{ height: `${height}%`, minHeight: day.visitors > 0 ? '2px' : '0' }}
                          title={`${day.date} - ${day.visitors} زائر`}
                        />
                        <span className="text-xs text-muted-foreground mt-1">
                          {dayName}
                        </span>
                        <span className="text-xs font-medium">
                          {formatNumber(day.visitors)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {dayNumber}
                        </span>
                        {day.visitors > 0 && (
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap">
                            {day.date} - {formatNumber(day.visitors)} زائر
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    آخر 7 أيام
                  </div>
                  <div className="text-sm text-muted-foreground">
                    المتوسط اليومي: {(() => {
                      const last7Days = data.dailyTraffic.slice(-7);
                      const avg = last7Days.reduce((sum, d) => sum + d.visitors, 0) / last7Days.length;
                      return formatNumber(Math.round(avg));
                    })()} زائر
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                لا توجد بيانات عن حركة الزوار اليومية
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Analytics Tabs */}
        <Tabs defaultValue="demographics" className="mt-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="demographics">الديموغرافيا</TabsTrigger>
            <TabsTrigger value="geography">الجغرافيا</TabsTrigger>
            <TabsTrigger value="connection">نوع الاتصال</TabsTrigger>
            <TabsTrigger value="devices">الأجهزة</TabsTrigger>
            <TabsTrigger value="products">صفحات المنتجات</TabsTrigger>
          </TabsList>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Age Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    توزيع الفئات العمرية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.ageDistribution.map((age) => (
                      <div key={age.ageGroup} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{age.ageGroup} سنة</span>
                          <span className="text-sm font-semibold">{age.percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={age.percentage} className="h-2" />
                      </div>
                    ))}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">متوسط العمر</span>
                        <span className="font-semibold">{data?.averageAge ? data.averageAge.toFixed(1) : 'N/A'} سنة</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">الفئة الأكثر نشاطاً</span>
                        <span className="font-semibold">{data?.mostActiveAgeGroup || 'غير محدد'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gender Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    توزيع النوع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.genderDistribution.map((gender) => (
                      <div key={gender.gender} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{gender.gender}</span>
                          <span className="text-sm font-semibold">{gender.percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={gender.percentage} className="h-2" />
                      </div>
                    ))}
                    <div className="pt-4 border-t space-y-2">
                      <div className="text-sm font-medium mb-2">متوسط مدة الجلسة حسب النوع:</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">ذكر</span>
                        <span className="font-semibold">{formatDuration(data?.genderByAction.avgSessionDuration.male || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">أنثى</span>
                        <span className="font-semibold">{formatDuration(data?.genderByAction.avgSessionDuration.female || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">غير محدد</span>
                        <span className="font-semibold">{formatDuration(data?.genderByAction.avgSessionDuration.not_specified || 0)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Geography Tab */}
          <TabsContent value="geography" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Egypt Regions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    المحافظات المصرية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.egyptRegions.length > 0 ? (
                      data.egyptRegions.map((region) => (
                        <div key={region.region} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{region.region}</span>
                            <span className="text-sm font-semibold">{formatNumber(region.visitors)} زائر</span>
                          </div>
                          <Progress value={(region.visitors / (data.totalVisitors || 1)) * 100} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            معدل التحويل: {region.conversionRate.toFixed(1)}%
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        لا توجد بيانات جغرافية متاحة
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* International Visitors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    الزوار الدوليين
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">مصر</span>
                        <span className="text-sm font-semibold">{formatNumber(data?.egyptVsInternational.egypt || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">دول أخرى</span>
                        <span className="text-sm font-semibold">{formatNumber(data?.egyptVsInternational.international || 0)}</span>
                      </div>
                    </div>
                    {data?.internationalVisitors.length > 0 ? (
                      data.internationalVisitors.slice(0, 10).map((visitor) => (
                        <div key={visitor.country} className="flex items-center justify-between">
                          <span className="text-sm">{visitor.country}</span>
                          <span className="text-sm font-semibold">{formatNumber(visitor.visitors)} ({visitor.percentage.toFixed(1)}%)</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-4">
                        لا توجد زيارات دولية
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Connection Type Tab */}
          <TabsContent value="connection" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  توزيع نوع الاتصال
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    {data?.connectionTypeDistribution.map((conn) => (
                      <div key={conn.type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {conn.type === 'WiFi' && <Wifi className="h-4 w-4" />}
                            {conn.type.includes('G') && <Signal className="h-4 w-4" />}
                            <span className="font-medium">{conn.type}</span>
                          </div>
                          <span className="text-sm font-semibold">{conn.percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={conn.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium mb-3">مقاييس الأداء حسب نوع الاتصال:</div>
                      {Object.entries(data?.connectionMetrics.bounceRate || {}).map(([type, rate]) => (
                        <div key={type} className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">{type}</span>
                          <div className="text-right">
                            <div className="text-sm font-semibold">معدل الارتداد: {rate.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">
                              صفحات/جلسة: {(data?.connectionMetrics.pagesPerSession[type] || 0).toFixed(1)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Phone Models */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    موديلات الهواتف
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {data?.phoneModels.length > 0 ? (
                      data.phoneModels.map((phone) => (
                        <div key={phone.model} className="space-y-2 p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{phone.model}</span>
                            <span className="text-sm font-semibold">{phone.percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={phone.percentage} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(phone.count)} زائر • متوسط الجلسة: {formatDuration(phone.avgSessionDuration)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        لا توجد بيانات عن موديلات الهواتف
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* OS Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    أنظمة التشغيل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {data?.osBreakdown.length > 0 ? (
                      data.osBreakdown.map((os) => (
                        <div key={`${os.os}-${os.version}`} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{os.os} {os.version !== 'Unknown' && `(${os.version})`}</span>
                            <span className="text-sm font-semibold">{os.percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={os.percentage} className="h-2" />
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        لا توجد بيانات عن أنظمة التشغيل
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Product Pages Tab */}
          <TabsContent value="products" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  تحليلات صفحات المنتجات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="بحث عن منتج..."
                    className="max-w-sm"
                    onChange={(e) => {
                      // Add search functionality if needed
                    }}
                  />
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اسم المنتج</TableHead>
                        <TableHead>الزيارات</TableHead>
                        <TableHead>متوسط الوقت</TableHead>
                        <TableHead>معدل الارتداد</TableHead>
                        <TableHead>معدل التحويل</TableHead>
                        <TableHead>الكمية المباعة</TableHead>
                        <TableHead>الإيرادات</TableHead>
                        <TableHead>المصدر الأساسي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.productPages.length > 0 ? (
                        data.productPages.map((product) => (
                          <TableRow key={product.productId || product.productName}>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell>{formatNumber(product.views)}</TableCell>
                            <TableCell>{formatDuration(product.avgTimeOnPage)}</TableCell>
                            <TableCell>
                              <Badge variant={product.bounceRate > 50 ? "destructive" : "secondary"}>
                                {product.bounceRate.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.conversionRate > 5 ? "default" : "outline"}>
                                {product.conversionRate.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatNumber((product as any).orderQuantity || 0)}
                            </TableCell>
                            <TableCell className="font-semibold text-green-700">
                              {formatNumber((product as any).revenue || 0)} جنيه
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{product.topSource}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            لا توجد بيانات عن صفحات المنتجات
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics; 