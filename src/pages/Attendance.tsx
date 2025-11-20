import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesService, attendanceService } from '@/lib/firebase';
import { Employee, AttendanceRecord, ExcuseStatus, MonthlySummary } from '@/types/attendance';
import { useAttendanceAuth } from '@/hooks/useAttendanceAuth';
import AttendanceLogin from '@/components/AttendanceLogin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  DollarSign,
  Filter,
  Download,
  Save,
  LogOut,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Attendance() {
  const queryClient = useQueryClient();
  const { isAuthenticated, session, loading: authLoading, loginEmployee, loginAdmin, logout } = useAttendanceAuth();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), 'yyyy-MM')
  );
  const [selectedExcuseStatus, setSelectedExcuseStatus] = useState<string>('all');
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [isExcuseDialogOpen, setIsExcuseDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedRecordForExcuse, setSelectedRecordForExcuse] = useState<AttendanceRecord | null>(null);

  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    username: '',
    password: '',
    monthlySalary: 0,
    monthlyWorkingHours: 270, // Default: 8 hours * 22 days
    checkIn: '09:00',
    checkOut: '17:00',
  });

  // Check if user is admin
  const isAdmin = session?.userType === 'admin';
  const currentEmployeeId = session?.employeeId;

  // Attendance form state
  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    checkInTime: '',
    checkOutTime: '',
    excuseText: '',
  });

  // Fetch employees (only if admin)
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesService.getAllEmployees(),
    enabled: isAdmin, // Only fetch if admin
  });

  // Fetch current employee (if logged in as employee)
  const { data: currentEmployee } = useQuery({
    queryKey: ['employee', currentEmployeeId],
    queryFn: () => currentEmployeeId ? employeesService.getEmployeeById(currentEmployeeId) : null,
    enabled: !isAdmin && !!currentEmployeeId,
  });

  // Fetch attendance records
  const { data: attendanceRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['attendance', selectedMonth, currentEmployeeId],
    queryFn: async () => {
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;
      
      // If employee, only fetch their records
      if (!isAdmin && currentEmployeeId) {
        return attendanceService.getAttendanceRecordsByEmployee(currentEmployeeId);
      }
      
      // If admin, fetch all records
      return attendanceService.getAttendanceRecordsByDateRange(startDate, endDate);
    },
    enabled: isAuthenticated,
  });

  // Filter records
  const filteredRecords = attendanceRecords.filter((record) => {
    // If employee, only show their records
    if (!isAdmin && record.employeeId !== currentEmployeeId) return false;
    
    // Apply filters (only for admin)
    if (isAdmin) {
      if (selectedEmployee !== 'all' && record.employeeId !== selectedEmployee) return false;
      if (selectedExcuseStatus !== 'all' && record.excuseStatus !== selectedExcuseStatus) return false;
    } else {
      // For employees, filter by excuse status if selected
      if (selectedExcuseStatus !== 'all' && record.excuseStatus !== selectedExcuseStatus) return false;
    }
    return true;
  });

  // Auto-set employee ID when dialog opens for employees
  useEffect(() => {
    if (isAttendanceDialogOpen && !isAdmin && currentEmployeeId) {
      setAttendanceForm(prev => ({
        ...prev,
        employeeId: currentEmployeeId,
      }));
    }
  }, [isAttendanceDialogOpen, isAdmin, currentEmployeeId]);

  // Add/Update Employee mutation
  const employeeMutation = useMutation({
    mutationFn: async (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (editingEmployee) {
        return employeesService.updateEmployee(editingEmployee.id, data);
      } else {
        return employeesService.addEmployee(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(editingEmployee ? 'تم تحديث بيانات الموظف بنجاح' : 'تم إضافة الموظف بنجاح');
      setIsEmployeeDialogOpen(false);
      resetEmployeeForm();
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + (error.message || 'فشل العملية'));
    },
  });

  // Delete Employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      return employeesService.deleteEmployee(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم حذف الموظف بنجاح');
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + (error.message || 'فشل العملية'));
    },
  });

  // Add/Update Attendance mutation
  const attendanceMutation = useMutation({
    mutationFn: async () => {
      // If employee, use currentEmployee; if admin, find from employees list
      let employee: Employee | undefined;
      if (!isAdmin && currentEmployee) {
        employee = currentEmployee;
      } else {
        employee = employees.find((e) => e.id === attendanceForm.employeeId);
      }
      
      if (!employee) throw new Error('الموظف غير موجود');

      return attendanceService.addOrUpdateAttendanceRecord(
        employee,
        attendanceForm.date,
        attendanceForm.checkInTime || null,
        attendanceForm.checkOutTime || null,
        attendanceForm.excuseText || null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('تم تسجيل الحضور بنجاح');
      setIsAttendanceDialogOpen(false);
      resetAttendanceForm();
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + (error.message || 'فشل العملية'));
    },
  });

  // Update Excuse Status mutation
  const excuseStatusMutation = useMutation({
    mutationFn: async ({ recordId, status }: { recordId: string; status: ExcuseStatus }) => {
      if (!selectedRecordForExcuse) throw new Error('السجل غير موجود');
      const employee = employees.find((e) => e.id === selectedRecordForExcuse.employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      return attendanceService.updateExcuseStatus(recordId, status, employee);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('تم تحديث حالة العذر بنجاح');
      setIsExcuseDialogOpen(false);
      setSelectedRecordForExcuse(null);
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + (error.message || 'فشل العملية'));
    },
  });

  const resetEmployeeForm = () => {
    setEmployeeForm({
      name: '',
      username: '',
      password: '',
      monthlySalary: 0,
      monthlyWorkingHours: 270,
      checkIn: '09:00',
      checkOut: '17:00',
    });
    setEditingEmployee(null);
  };

  const resetAttendanceForm = () => {
    // Auto-select employee if logged in as employee
    const autoEmployeeId = !isAdmin && currentEmployeeId ? currentEmployeeId : '';
    setAttendanceForm({
      employeeId: autoEmployeeId,
      date: format(new Date(), 'yyyy-MM-dd'),
      checkInTime: '',
      checkOutTime: '',
      excuseText: '',
    });
  };

  const openEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      username: employee.username || '',
      password: '', // Don't show existing password
      monthlySalary: employee.monthlySalary,
      monthlyWorkingHours: employee.monthlyWorkingHours,
      checkIn: employee.workingHours.checkIn,
      checkOut: employee.workingHours.checkOut,
    });
    setIsEmployeeDialogOpen(true);
  };

  const openExcuseDialog = (record: AttendanceRecord) => {
    setSelectedRecordForExcuse(record);
    setIsExcuseDialogOpen(true);
  };

  const getExcuseStatusBadge = (status: ExcuseStatus) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: 'بانتظار الموافقة' },
      approved: { variant: 'default' as const, label: 'مقبول' },
      rejected: { variant: 'destructive' as const, label: 'مرفوض' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDeductionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      none: 'لا يوجد',
      fixed: 'خصم ثابت',
      hourly: 'خصم بالساعات',
      quarter_day: 'ربع يوم',
      half_day: 'نصف يوم',
    };
    return labels[type] || type;
  };

  const handleLogout = async () => {
    await logout();
    toast.success('تم تسجيل الخروج بنجاح');
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Helmet>
          <title>جاري التحميل...</title>
          <meta name="description" content="جاري التحقق من تسجيل الدخول" />
        </Helmet>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">جاري التحقق من تسجيل الدخول...</span>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>تسجيل الدخول - نظام الحضور والغياب</title>
          <meta name="description" content="تسجيل الدخول لنظام إدارة الحضور والغياب" />
        </Helmet>
        <AttendanceLogin
          onLoginEmployee={loginEmployee}
          onLoginAdmin={loginAdmin}
          loading={authLoading}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Helmet>
        <title>{isAdmin ? 'إدارة الحضور والغياب' : 'حضوري وغيابي'}</title>
        <meta name="description" content={isAdmin ? "نظام إدارة حضور الموظفين والغياب والأعذار" : "عرض بيانات الحضور والغياب الخاصة بي"} />
      </Helmet>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {isAdmin ? 'إدارة الحضور والغياب' : `حضوري وغيابي - ${session?.employeeName || ''}`}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin 
                ? 'تسجيل الحضور والغياب وإدارة الأعذار والرواتب'
                : 'عرض بيانات الحضور والغياب والرواتب الخاصة بي'
              }
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {session && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                {isAdmin ? (
                  <>
                    <Shield className="h-4 w-4" />
                    <span>المسؤول</span>
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4" />
                    <span>{session.employeeName}</span>
                  </>
                )}
              </div>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
            {/* Attendance Dialog - Available for both Admin and Employee */}
            <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={resetAttendanceForm}>
                  <Calendar className="h-4 w-4 ml-2" />
                  تسجيل حضور
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>تسجيل حضور/انصراف</DialogTitle>
                  <DialogDescription>
                    {isAdmin 
                      ? 'اختر الموظف والتاريخ ووقت الحضور والانصراف'
                      : 'أدخل التاريخ ووقت الحضور والانصراف'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {isAdmin && (
                    <div>
                      <Label htmlFor="attendance-employee">الموظف</Label>
                      <Select
                        value={attendanceForm.employeeId}
                        onValueChange={(value) =>
                          setAttendanceForm({ ...attendanceForm, employeeId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الموظف" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {!isAdmin && currentEmployee && (
                    <div>
                      <Label>الموظف</Label>
                      <Input
                        value={currentEmployee.name}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="attendance-date">التاريخ</Label>
                    <Input
                      id="attendance-date"
                      type="date"
                      value={attendanceForm.date}
                      onChange={(e) =>
                        setAttendanceForm({ ...attendanceForm, date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="attendance-checkin">وقت الحضور</Label>
                    <Input
                      id="attendance-checkin"
                      type="time"
                      value={attendanceForm.checkInTime}
                      onChange={(e) =>
                        setAttendanceForm({ ...attendanceForm, checkInTime: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="attendance-checkout">وقت الانصراف</Label>
                    <Input
                      id="attendance-checkout"
                      type="time"
                      value={attendanceForm.checkOutTime}
                      onChange={(e) =>
                        setAttendanceForm({ ...attendanceForm, checkOutTime: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="attendance-excuse">نص العذر (اختياري)</Label>
                    <Textarea
                      id="attendance-excuse"
                      value={attendanceForm.excuseText}
                      onChange={(e) =>
                        setAttendanceForm({ ...attendanceForm, excuseText: e.target.value })
                      }
                      placeholder="أدخل نص العذر إن وجد"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAttendanceDialogOpen(false);
                      resetAttendanceForm();
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={() => attendanceMutation.mutate()}
                    disabled={!attendanceForm.employeeId || attendanceMutation.isPending}
                  >
                    {attendanceMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {isAdmin && (
              <>
            <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetEmployeeForm}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة موظف
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
                  </DialogTitle>
                  <DialogDescription>
                    أدخل بيانات الموظف ومواعيد العمل
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">اسم الموظف</Label>
                    <Input
                      id="name"
                      value={employeeForm.name}
                      onChange={(e) =>
                        setEmployeeForm({ ...employeeForm, name: e.target.value })
                      }
                      placeholder="اسم الموظف"
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">اسم المستخدم (رقم أو اسم)</Label>
                    <Input
                      id="username"
                      value={employeeForm.username}
                      onChange={(e) =>
                        setEmployeeForm({ ...employeeForm, username: e.target.value })
                      }
                      placeholder="اسم المستخدم"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">
                      {editingEmployee ? 'كلمة المرور الجديدة (اتركها فارغة للاحتفاظ بالقديمة)' : 'كلمة المرور'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={employeeForm.password}
                      onChange={(e) =>
                        setEmployeeForm({ ...employeeForm, password: e.target.value })
                      }
                      placeholder="كلمة المرور"
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthlySalary">الراتب الشهري (جنيه)</Label>
                    <Input
                      id="monthlySalary"
                      type="number"
                      value={employeeForm.monthlySalary}
                      onChange={(e) =>
                        setEmployeeForm({
                          ...employeeForm,
                          monthlySalary: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthlyWorkingHours">عدد ساعات العمل الشهرية</Label>
                    <Input
                      id="monthlyWorkingHours"
                      type="number"
                      value={employeeForm.monthlyWorkingHours}
                      onChange={(e) =>
                        setEmployeeForm({
                          ...employeeForm,
                          monthlyWorkingHours: Number(e.target.value),
                        })
                      }
                      placeholder="176"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="checkIn">ميعاد الحضور</Label>
                      <Input
                        id="checkIn"
                        type="time"
                        value={employeeForm.checkIn}
                        onChange={(e) =>
                          setEmployeeForm({ ...employeeForm, checkIn: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="checkOut">ميعاد الانصراف</Label>
                      <Input
                        id="checkOut"
                        type="time"
                        value={employeeForm.checkOut}
                        onChange={(e) =>
                          setEmployeeForm({ ...employeeForm, checkOut: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEmployeeDialogOpen(false);
                      resetEmployeeForm();
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={() => {
                      const employeeData: any = {
                        name: employeeForm.name,
                        monthlySalary: employeeForm.monthlySalary,
                        monthlyWorkingHours: employeeForm.monthlyWorkingHours,
                        workingHours: {
                          checkIn: employeeForm.checkIn,
                          checkOut: employeeForm.checkOut,
                        },
                      };
                      
                      // Add username if provided
                      if (employeeForm.username.trim()) {
                        employeeData.username = employeeForm.username.trim();
                      }
                      
                      // Add password if provided (or if editing and password is set)
                      if (employeeForm.password.trim()) {
                        employeeData.password = employeeForm.password.trim();
                      }
                      
                      employeeMutation.mutate(employeeData);
                    }}
                    disabled={!employeeForm.name || employeeMutation.isPending}
                  >
                    {employeeMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              الفلاتر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isAdmin && (
                <div>
                  <Label>الموظف</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الموظفين" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الموظفين</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>الشهر</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              <div>
                <Label>حالة العذر</Label>
                <Select value={selectedExcuseStatus} onValueChange={setSelectedExcuseStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">بانتظار الموافقة</SelectItem>
                    <SelectItem value="approved">مقبول</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="attendance">سجل الحضور</TabsTrigger>
            <TabsTrigger value="summary">الملخص الشهري</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>سجل الحضور والغياب</CardTitle>
                <CardDescription>
                  عرض جميع سجلات الحضور والغياب حسب الفلاتر المحددة
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد سجلات حضور
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {isAdmin && <TableHead>اسم الموظف</TableHead>}
                          <TableHead>التاريخ</TableHead>
                          <TableHead>وقت الحضور</TableHead>
                          <TableHead>وقت الانصراف</TableHead>
                          <TableHead>مدة التأخير</TableHead>
                          <TableHead>العذر</TableHead>
                          <TableHead>حالة العذر</TableHead>
                          <TableHead>نوع الخصم</TableHead>
                          <TableHead>قيمة الخصم</TableHead>
                          <TableHead>ساعات Overtime</TableHead>
                          <TableHead>قيمة Overtime</TableHead>
                          <TableHead>الصافي اليومي</TableHead>
                          {isAdmin && <TableHead>الإجراءات</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => (
                          <TableRow key={record.id}>
                            {isAdmin && (
                              <TableCell className="font-medium">{record.employeeName}</TableCell>
                            )}
                            <TableCell>{record.date}</TableCell>
                            <TableCell>
                              {record.checkInTime ? (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {record.checkInTime}
                                </span>
                              ) : (
                                <Badge variant="destructive">غياب</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {record.checkOutTime ? (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {record.checkOutTime}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {record.delayMinutes > 0 ? (
                                <span className="text-orange-600">
                                  {record.delayMinutes} دقيقة
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {record.hasExcuse ? (
                                <span className="text-sm">{record.excuseText}</span>
                              ) : (
                                'لا يوجد'
                              )}
                            </TableCell>
                            <TableCell>
                              {record.hasExcuse ? (
                                getExcuseStatusBadge(record.excuseStatus)
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>{getDeductionTypeLabel(record.deductionType)}</TableCell>
                            <TableCell>
                              {record.deductionAmount > 0 ? (
                                <span className="text-red-600">
                                  -{record.deductionAmount.toFixed(2)} جنيه
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {record.overtimeHours > 0 ? (
                                <span className="text-green-600">
                                  {record.overtimeHours.toFixed(2)} ساعة
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {record.overtimeAmount > 0 ? (
                                <span className="text-green-600">
                                  +{record.overtimeAmount.toFixed(2)} جنيه
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  record.dailyNet >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }
                              >
                                {record.dailyNet >= 0 ? '+' : ''}
                                {record.dailyNet.toFixed(2)} جنيه
                              </span>
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {record.hasExcuse && record.excuseStatus === 'pending' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openExcuseDialog(record)}
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isAdmin ? (
                employees.map((employee) => (
                  <MonthlySummaryCard
                    key={employee.id}
                    employee={employee}
                    month={selectedMonth}
                  />
                ))
              ) : currentEmployee ? (
                <MonthlySummaryCard
                  key={currentEmployee.id}
                  employee={currentEmployee}
                  month={selectedMonth}
                />
              ) : null}
            </div>
          </TabsContent>
        </Tabs>

        {/* Employees Management - Only for Admin */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>إدارة الموظفين</CardTitle>
              <CardDescription>عرض وتعديل بيانات الموظفين</CardDescription>
            </CardHeader>
          <CardContent>
            {employeesLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا يوجد موظفين. أضف موظف جديد للبدء.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم الموظف</TableHead>
                      <TableHead>الراتب الشهري</TableHead>
                      <TableHead>ساعات العمل الشهرية</TableHead>
                      <TableHead>ميعاد الحضور</TableHead>
                      <TableHead>ميعاد الانصراف</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.monthlySalary.toFixed(2)} جنيه</TableCell>
                        <TableCell>{employee.monthlyWorkingHours} ساعة</TableCell>
                        <TableCell>{employee.workingHours.checkIn}</TableCell>
                        <TableCell>{employee.workingHours.checkOut}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditEmployee(employee)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (
                                  confirm(
                                    `هل أنت متأكد من حذف الموظف "${employee.name}"؟`
                                  )
                                ) {
                                  deleteEmployeeMutation.mutate(employee.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      {/* Excuse Approval Dialog - Only for Admin */}
      {isAdmin && (
        <Dialog open={isExcuseDialogOpen} onOpenChange={setIsExcuseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مراجعة العذر</DialogTitle>
            <DialogDescription>
              {selectedRecordForExcuse && (
                <div className="space-y-2 mt-4">
                  <p>
                    <strong>الموظف:</strong> {selectedRecordForExcuse.employeeName}
                  </p>
                  <p>
                    <strong>التاريخ:</strong> {selectedRecordForExcuse.date}
                  </p>
                  <p>
                    <strong>مدة التأخير:</strong> {selectedRecordForExcuse.delayMinutes} دقيقة
                  </p>
                  <p>
                    <strong>نص العذر:</strong>
                  </p>
                  <p className="bg-muted p-3 rounded-md">
                    {selectedRecordForExcuse.excuseText}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsExcuseDialogOpen(false);
                setSelectedRecordForExcuse(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedRecordForExcuse) {
                  excuseStatusMutation.mutate({
                    recordId: selectedRecordForExcuse.id,
                    status: 'rejected',
                  });
                }
              }}
              disabled={excuseStatusMutation.isPending}
            >
              <XCircle className="h-4 w-4 ml-2" />
              رفض
            </Button>
            <Button
              onClick={() => {
                if (selectedRecordForExcuse) {
                  excuseStatusMutation.mutate({
                    recordId: selectedRecordForExcuse.id,
                    status: 'approved',
                  });
                }
              }}
              disabled={excuseStatusMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 ml-2" />
              قبول
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}

// Monthly Summary Card Component
function MonthlySummaryCard({
  employee,
  month,
}: {
  employee: Employee;
  month: string;
}) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['monthlySummary', employee.id, month],
    queryFn: () => attendanceService.getMonthlySummary(employee.id, month),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{employee.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{employee.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">لا توجد بيانات لهذا الشهر</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {employee.name}
        </CardTitle>
        <CardDescription>ملخص شهر {month}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">الراتب الأساسي:</span>
            <p className="font-semibold">{summary.baseSalary.toFixed(2)} جنيه</p>
          </div>
          <div>
            <span className="text-muted-foreground">إجمالي الخصومات:</span>
            <p className="font-semibold text-red-600">
              -{summary.totalDeductions.toFixed(2)} جنيه
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">إجمالي Overtime:</span>
            <p className="font-semibold text-green-600">
              +{summary.totalOvertime.toFixed(2)} جنيه
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">الراتب النهائي:</span>
            <p className="font-semibold text-lg">
              {summary.finalSalary.toFixed(2)} جنيه
            </p>
          </div>
        </div>
        <div className="pt-3 border-t space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">أيام الحضور:</span>
            <span className="font-medium">{summary.attendanceDays} يوم</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">أيام الغياب:</span>
            <span className="font-medium text-red-600">{summary.absentDays} يوم</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">إجمالي التأخير:</span>
            <span className="font-medium">{summary.totalDelayMinutes} دقيقة</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">أعذار معلقة:</span>
            <span className="font-medium">{summary.pendingExcuses}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

