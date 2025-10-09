import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Calendar, 
  MapPin, 
  Phone, 
  User,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/format';
import { toast } from 'sonner';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice?: number;
  image: string;
  selectedSize?: {
    id: string;
    label: string;
    price: number;
  } | null;
  selectedAddons?: Array<{
    id: string;
    label: string;
    price_delta: number;
  }>;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  deliveryInfo: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const Orders = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile && userProfile.uid) {
      console.log('User profile loaded, fetching orders...');
      fetchOrders();
    } else {
      console.log('No user profile or uid, setting loading to false');
      setLoading(false);
    }
  }, [userProfile]);

  const fetchOrders = async () => {
    if (!userProfile || !userProfile.uid) {
      console.log('No user profile or uid available');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching orders for user:', userProfile.uid);
      console.log('User profile:', userProfile);
      
      const ordersRef = collection(db, 'orders');
      // استخدام فلتر فقط بدون ترتيب لتجنب الحاجة للفهرس المركب
      const q = query(
        ordersRef,
        where('userId', '==', userProfile.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const ordersData: Order[] = [];
      
      console.log('Query snapshot size:', querySnapshot.size);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Order data:', data);
        ordersData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
        } as Order);
      });
      
      // ترتيب البيانات محلياً بدلاً من ترتيبها في الاستعلام
      ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      console.log('Processed orders:', ordersData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('حدث خطأ أثناء جلب الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'قيد الانتظار' },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'تم التأكيد' },
      shipped: { color: 'bg-purple-100 text-purple-800', icon: Package, text: 'تم الشحن' },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'تم التوصيل' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'ملغي' },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  // Show loading state while authentication is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">يرجى تسجيل الدخول</h2>
          <p className="text-muted-foreground mb-4">
            يجب عليك تسجيل الدخول لعرض طلباتك
          </p>
          <Link to="/">
            <Button>العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!userProfile.uid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">معلومات المستخدم غير مكتملة</h2>
          <p className="text-muted-foreground mb-4">
            يبدو أن معلومات المستخدم غير مكتملة. يرجى تسجيل الدخول مرة أخرى
          </p>
          <Link to="/">
            <Button>العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">طلباتي</h1>
            <p className="text-muted-foreground">
              عرض جميع طلباتك السابقة والحالية
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
              <p className="text-muted-foreground mb-4">
                لم تقم بأي طلب بعد. ابدأ بالتسوق الآن!
              </p>
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-gray-100 p-4 rounded-lg mb-4 text-left">
                  <p className="text-sm font-medium mb-2">معلومات تشخيص (للطور):</p>
                  <p className="text-xs text-gray-600">User ID: {userProfile?.uid}</p>
                  <p className="text-xs text-gray-600">User Email: {userProfile?.email}</p>
                  <p className="text-xs text-gray-600">User Name: {userProfile?.displayName}</p>
                </div>
              )}
              <Link to="/products">
                <Button>تصفح المنتجات</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-lg">
                          طلب #{order.id.slice(-8)}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(order.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {order.deliveryInfo.fullName}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(order.status)}
                      <div className="text-right">
                        <p className="font-semibold text-lg">
                          {formatCurrency(order.total, 'جنيه')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} منتج
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Delivery Info */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        معلومات التوصيل
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>الاسم:</strong> {order.deliveryInfo.fullName}</p>
                        <p><strong>الهاتف:</strong> {order.deliveryInfo.phoneNumber}</p>
                        <p><strong>العنوان:</strong> {order.deliveryInfo.address}</p>
                        <p><strong>المدينة:</strong> {order.deliveryInfo.city}</p>
                        {order.deliveryInfo.notes && (
                          <p><strong>ملاحظات:</strong> {order.deliveryInfo.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">تفاصيل الطلب</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>رقم الطلب:</strong> {order.id}</p>
                        <p><strong>تاريخ الطلب:</strong> {formatDateTime(order.createdAt)}</p>
                        <p><strong>آخر تحديث:</strong> {formatDateTime(order.updatedAt)}</p>
                        <p><strong>عدد المنتجات:</strong> {order.items.length}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Order Items */}
                  <div>
                    <h4 className="font-semibold mb-4">المنتجات المطلوبة</h4>
                    <div className="space-y-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="h-16 w-16 rounded-md object-cover"
                          />
                          <div className="flex-1">
                            <h5 className="font-medium">{item.productName}</h5>
                            {item.selectedSize && (
                              <p className="text-sm text-blue-600 font-medium">
                                📐 الحجم: {item.selectedSize.label}
                              </p>
                            )}
                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                              <p className="text-sm text-green-600">
                                ➕ الإضافات: {item.selectedAddons.map(addon => addon.label).join(', ')}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              الكمية: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatCurrency((item.totalPrice || (item.price * item.quantity)), 'جنيه')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.price, 'جنيه')} للقطعة
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Order Summary */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">المجموع الكلي</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(order.total, 'جنيه')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">حالة الطلب</p>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders; 