import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
  Truck,
  CheckSquare,
  ShoppingCart,
  ArrowUpDown,
  MoreHorizontal
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/format';
import { toast } from 'sonner';
import { useRevenue } from '@/hooks/useRevenue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createPortal } from 'react-dom';

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

type SortConfig = {
  key: keyof Order | 'createdAt' | 'total';
  direction: 'asc' | 'desc';
};

const AdminOrders = () => {
  const { t } = useTranslation();
  const { orders, loading, refreshData, totalRevenue } = useRevenue();
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });

  useEffect(() => {
    filterData();
  }, [orders, searchTerm, statusFilter, dateFilter, sortConfig]);

  const filterData = () => {
    let filtered = [...orders];

    // Filter by search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.deliveryInfo.fullName.toLowerCase().includes(lowerTerm) ||
        order.deliveryInfo.phoneNumber.includes(lowerTerm) ||
        order.id.toLowerCase().includes(lowerTerm)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by date range
    if (dateFilter.start) {
      const startDate = new Date(dateFilter.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(order => new Date(order.createdAt) >= startDate);
    }
    if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => new Date(order.createdAt) <= endDate);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle dates specifically if sort key is createdAt or updatedAt
      if (sortConfig.key === 'createdAt' || sortConfig.key === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredOrders(filtered);
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date(),
      });

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
      pending: { color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', icon: Clock, text: 'قيد الانتظار' },
      confirmed: { color: 'bg-blue-100 text-blue-800 hover:bg-blue-200', icon: CheckCircle, text: 'تم التأكيد' },
      shipped: { color: 'bg-purple-100 text-purple-800 hover:bg-purple-200', icon: Truck, text: 'تم الشحن' },
      delivered: { color: 'bg-green-100 text-green-800 hover:bg-green-200', icon: CheckSquare, text: 'تم التوصيل' },
      cancelled: { color: 'bg-red-100 text-red-800 hover:bg-red-200', icon: XCircle, text: 'ملغي' },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border-0 px-2 py-1`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container py-8 max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">إدارة الطلبات</h1>
              <p className="text-muted-foreground mt-1">
                نظرة شاملة على جميع الطلبات وحالاتها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Card className="px-4 py-2 bg-white shadow-sm border-none">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">الإجمالي:</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue, 'جنيه')}</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Filters & Search */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="بحث بالاسم، رقم الهاتف، أو رقم الطلب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="الحالة" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="confirmed">تم التأكيد</SelectItem>
                    <SelectItem value="shipped">تم الشحن</SelectItem>
                    <SelectItem value="delivered">تم التوصيل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-md border">
                  <Input
                    type="date"
                    value={dateFilter.start}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                    className="w-auto h-9 border-none bg-transparent focus-visible:ring-0 text-sm"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="date"
                    value={dateFilter.end}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                    className="w-auto h-9 border-none bg-transparent focus-visible:ring-0 text-sm"
                  />
                </div>

                <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
                  {filteredOrders.length} طلب
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Area */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-dashed">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد طلبات</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' || dateFilter.start
                ? 'لم يتم العثور على طلبات تطابق معايير البحث الحالية.'
                : 'لم يتم استلام أي طلبات حتى الآن.'}
            </p>
            {(searchTerm || statusFilter !== 'all' || dateFilter.start) && (
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDateFilter({ start: '', end: '' });
                }}
              >
                مسح التصفيات
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="w-[120px] text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-2">
                        التاريخ
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('total')}>
                      <div className="flex items-center gap-2">
                        الإجمالي
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[100px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50" onClick={() => {
                      setSelectedOrder(order);
                      setShowOrderDetails(true);
                    }}>
                      <TableCell className="font-medium text-primary">#{order.id.slice(-6)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{order.deliveryInfo.fullName}</span>
                          <span className="text-xs text-muted-foreground">{order.deliveryInfo.phoneNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <div className="flex flex-col">
                          <span>{formatDate(order.createdAt)}</span>
                          <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex">
                          {getStatusBadge(order.status)}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-gray-900">{formatCurrency(order.total, 'جنيه')}</TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetails(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>تحديث الحالة</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'confirmed')}>
                              قيد التحضير
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'shipped')}>
                              تم الشحن
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'delivered')}>
                              تم التوصيل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                              إلغاء الطلب
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden border-none shadow-sm" onClick={() => {
                  setSelectedOrder(order);
                  setShowOrderDetails(true);
                }}>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">#{order.id.slice(-8)}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="flex items-center gap-3 py-2">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{order.deliveryInfo.fullName}</p>
                        <p className="text-xs text-muted-foreground">{order.deliveryInfo.phoneNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t mt-2">
                      <span className="font-bold text-lg text-primary">{formatCurrency(order.total, 'جنيه')}</span>
                      <Button variant="ghost" size="sm" className="text-xs">
                        عرض التفاصيل
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Order Details Modal via Portal */}
        {showOrderDetails && selectedOrder && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Fixed at top */}
              <div className="flex-none bg-white border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">تفاصيل الطلب #{selectedOrder.id.slice(-8)}</h2>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowOrderDetails(false)} className="hover:bg-gray-100 rounded-full">
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Info Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      معلومات العميل
                    </h3>
                    <div className="bg-gray-50/50 p-4 rounded-lg space-y-3 text-sm border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الاسم:</span>
                        <span className="font-medium">{selectedOrder.deliveryInfo.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الهاتف:</span>
                        <span className="font-medium">{selectedOrder.deliveryInfo.phoneNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الموقع:</span>
                        <span className="font-medium text-right">{selectedOrder.deliveryInfo.city}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-muted-foreground mb-1">العنوان بالتفصيل:</p>
                        <p className="font-medium leading-relaxed">{selectedOrder.deliveryInfo.address}</p>
                      </div>
                      {selectedOrder.deliveryInfo.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground mb-1">ملاحظات:</p>
                          <p className="font-medium text-amber-600">{selectedOrder.deliveryInfo.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      ملخص الطلب
                    </h3>
                    <div className="bg-gray-50/50 p-4 rounded-lg space-y-3 text-sm border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">تاريخ الطلب:</span>
                        <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">وقت الطلب:</span>
                        <span className="font-medium">{new Date(selectedOrder.createdAt).toLocaleTimeString('ar-EG')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">عدد المنتجات:</span>
                        <span className="font-medium">{selectedOrder.items.length} منتجات</span>
                      </div>
                      <div className="pt-3 border-t flex justify-between items-center">
                        <span className="font-semibold text-lg">الإجمالي:</span>
                        <span className="font-bold text-xl text-primary">{formatCurrency(selectedOrder.total, 'جنيه')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Items List */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    المنتجات ({selectedOrder.items.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                        <div className="h-20 w-20 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                          <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900 truncate">{item.productName}</h4>
                              {item.selectedSize && (
                                <Badge variant="outline" className="mt-1 text-xs font-normal mr-2">
                                  {item.selectedSize.label}
                                </Badge>
                              )}
                            </div>
                            <span className="font-semibold">{formatCurrency(item.totalPrice || (item.price * item.quantity), 'جنيه')}</span>
                          </div>

                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.selectedAddons.map((addon, i) => (
                                <span key={i} className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                                  + {addon.label}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-2 text-sm text-muted-foreground">
                            {item.quantity} × {formatCurrency(item.price, 'جنيه')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer - Fixed at bottom */}
              <div className="flex-none bg-gray-50 p-4 border-t flex gap-3 justify-end items-center">
                <span className="text-sm text-muted-foreground ml-auto">
                  تغيير الحالة إلى:
                </span>
                <div className="flex gap-2">
                  {selectedOrder.status === 'pending' && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'confirmed');
                        setShowOrderDetails(false);
                      }}
                    >
                      تأكيد الطلب
                    </Button>
                  )}
                  {['confirmed', 'shipped'].includes(selectedOrder.status) && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'delivered');
                        setShowOrderDetails(false);
                      }}
                    >
                      تأكيد التوصيل
                    </Button>
                  )}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'cancelled');
                        setShowOrderDetails(false);
                      }}
                    >
                      إلغاء الطلب
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default AdminOrders;