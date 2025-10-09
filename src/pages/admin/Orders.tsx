import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Calendar, 
  MapPin, 
  Phone, 
  User,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Edit,
  Truck,
  CheckSquare,
  ShoppingCart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/format';
import { toast } from 'sonner';
import { useRevenue } from '@/hooks/useRevenue';

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

const AdminOrders = () => {
  const { t } = useTranslation();
  const { orders, loading, refreshData, totalRevenue, revenueByStatus } = useRevenue();
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const filterOrders = () => {
    let filtered = orders;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.deliveryInfo.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.deliveryInfo.phoneNumber.includes(searchTerm) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date(),
      });

      // Refresh data to get updated orders
      await refreshData();

      toast.success(`تم تحديث حالة الطلب إلى ${getStatusText(newStatus)}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الطلب');
    }
  };

  const getStatusText = (status: Order['status']) => {
    const statusMap = {
      pending: 'قيد الانتظار',
      confirmed: 'تم التأكيد',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي'
    };
    return statusMap[status];
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'قيد الانتظار' },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'تم التأكيد' },
      shipped: { color: 'bg-purple-100 text-purple-800', icon: Truck, text: 'تم الشحن' },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckSquare, text: 'تم التوصيل' },
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

  const getStatusActions = (order: Order) => {
    const actions = [];
    
    switch (order.status) {
      case 'pending':
        actions.push(
          <Button
            key="confirm"
            size="sm"
            variant="outline"
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
            onClick={() => updateOrderStatus(order.id, 'confirmed')}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            تأكيد الطلب
          </Button>
        );
        break;
      case 'confirmed':
        actions.push(
          <Button
            key="ship"
            size="sm"
            variant="outline"
            className="text-purple-600 border-purple-600 hover:bg-purple-50"
            onClick={() => updateOrderStatus(order.id, 'shipped')}
          >
            <Truck className="h-4 w-4 mr-1" />
            شحن الطلب
          </Button>
        );
        break;
      case 'shipped':
        actions.push(
          <Button
            key="deliver"
            size="sm"
            variant="outline"
            className="text-green-600 border-green-600 hover:bg-green-50"
            onClick={() => updateOrderStatus(order.id, 'delivered')}
          >
            <CheckSquare className="h-4 w-4 mr-1" />
            تأكيد التوصيل
          </Button>
        );
        break;
    }

    if (order.status === 'pending') {
      actions.push(
        <Button
          key="cancel"
          size="sm"
          variant="outline"
          className="text-red-600 border-red-600 hover:bg-red-50"
          onClick={() => updateOrderStatus(order.id, 'cancelled')}
        >
          <XCircle className="h-4 w-4 mr-1" />
          إلغاء الطلب
        </Button>
      );
    }

    return actions;
  };

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
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">إدارة الطلبات</h1>
            <p className="text-muted-foreground">
              عرض وإدارة جميع طلبات العملاء
            </p>
          </div>
        </div>

        {/* Revenue Statistics */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold text-lg">$</span>
                <h3 className="text-sm font-medium">إجمالي الإيرادات</h3>
              </div>
              <p className="text-2xl font-bold mt-2 text-green-600">
                {formatCurrency(totalRevenue, 'جنيه')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-green-600" />
                <h3 className="text-sm font-medium">إيرادات الطلبات المكتملة</h3>
              </div>
              <p className="text-2xl font-bold mt-2 text-green-600">
                {formatCurrency(revenueByStatus.delivered, 'جنيه')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-medium">إيرادات الكاشير</h3>
              </div>
              <p className="text-2xl font-bold mt-2 text-blue-600">
                {formatCurrency(revenueByStatus.cashier, 'جنيه')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="البحث بالاسم أو رقم الهاتف أو رقم الطلب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الطلبات</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="confirmed">تم التأكيد</SelectItem>
                  <SelectItem value="shipped">تم الشحن</SelectItem>
                  <SelectItem value="delivered">تم التوصيل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {filteredOrders.length} من {orders.length} طلب
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'لا توجد طلبات تطابق معايير البحث' 
                  : 'لم يتم تقديم أي طلبات بعد'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
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
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {order.deliveryInfo.phoneNumber}
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
                  {/* Quick Info */}
                  <div className="grid md:grid-cols-3 gap-6 mb-6">
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

                    <div>
                      <h4 className="font-semibold mb-3">الإجراءات</h4>
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                          }}
                          className="w-full"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          عرض التفاصيل
                        </Button>
                        {getStatusActions(order)}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Order Items Preview */}
                  <div>
                    <h4 className="font-semibold mb-4">المنتجات المطلوبة</h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {order.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="h-12 w-12 rounded-md object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-sm truncate">{item.productName}</h5>
                            <p className="text-xs text-muted-foreground">
                              الكمية: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">
                              {formatCurrency((item.price * item.quantity), 'جنيه')}
                            </p>
                          </div>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            + {order.items.length - 3} منتج آخر
                          </p>
                        </div>
                      )}
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

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">تفاصيل الطلب #{selectedOrder.id.slice(-8)}</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowOrderDetails(false)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Delivery Info */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      معلومات التوصيل
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>الاسم:</strong> {selectedOrder.deliveryInfo.fullName}</p>
                      <p><strong>الهاتف:</strong> {selectedOrder.deliveryInfo.phoneNumber}</p>
                      <p><strong>العنوان:</strong> {selectedOrder.deliveryInfo.address}</p>
                      <p><strong>المدينة:</strong> {selectedOrder.deliveryInfo.city}</p>
                      {selectedOrder.deliveryInfo.notes && (
                        <p><strong>ملاحظات:</strong> {selectedOrder.deliveryInfo.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">تفاصيل الطلب</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>رقم الطلب:</strong> {selectedOrder.id}</p>
                      <p><strong>تاريخ الطلب:</strong> {formatDateTime(selectedOrder.createdAt)}</p>
                      <p><strong>آخر تحديث:</strong> {formatDateTime(selectedOrder.updatedAt)}</p>
                      <p><strong>عدد المنتجات:</strong> {selectedOrder.items.length}</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* All Order Items */}
                <div>
                  <h4 className="font-semibold mb-4">جميع المنتجات</h4>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item, index) => (
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
                      {formatCurrency(selectedOrder.total, 'جنيه')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">حالة الطلب</p>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders; 