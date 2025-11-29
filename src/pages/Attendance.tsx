import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesService, attendanceService, attendanceSettingsService } from '@/lib/firebase';
import {
  Employee,
  AttendanceRecord,
  AttendanceStatus,
  ExcuseStatus,
  MonthlySummary,
  AttendanceSettings,
  ExcusedAbsencePolicy,
} from '@/types/attendance';
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

const HOURS_12 = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const MINUTES_60 = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
type Meridiem = 'AM' | 'PM';

interface TimeParts {
  hour: string;
  minute: string;
  period: Meridiem;
}

const to12HourParts = (time?: string | null): TimeParts => {
  if (!time) {
    return { hour: '', minute: '', period: 'AM' };
  }
  const [hourStr, minuteStr = '00'] = time.split(':');
  let hour = Number(hourStr);
  if (Number.isNaN(hour)) {
    return { hour: '', minute: '', period: 'AM' };
  }
  const period: Meridiem = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return {
    hour: String(hour).padStart(2, '0'),
    minute: minuteStr.slice(0, 2),
    period,
  };
};

const to24HourString = ({ hour, minute, period }: TimeParts): string => {
  if (!hour || !minute) return '';
  let normalizedHour = Number(hour);
  if (Number.isNaN(normalizedHour)) return '';
  if (period === 'PM' && normalizedHour < 12) {
    normalizedHour += 12;
  }
  if (period === 'AM' && normalizedHour === 12) {
    normalizedHour = 0;
  }
  return `${String(normalizedHour).padStart(2, '0')}:${minute}`;
};

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
  const [excuseDecisionNote, setExcuseDecisionNote] = useState('');
  const [excuseDecisionIntent, setExcuseDecisionIntent] = useState<ExcuseStatus | null>(null);
  const [excuseResolutionMode, setExcuseResolutionMode] = useState<'hourly' | 'no_deduct'>('hourly');

  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    username: '',
    password: '',
    monthlySalary: 0,
    monthlyWorkingHours: 270, // Default: 8 hours * 22 days
    monthlyWorkingDays: 26,
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
    status: 'present' as AttendanceStatus,
    checkInTime: '',
    checkOutTime: '',
    excuseText: '',
    notes: '',
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

  const {
    data: attendanceSettings,
    isLoading: attendanceSettingsLoading,
  } = useQuery({
    queryKey: ['attendanceSettings'],
    queryFn: () => attendanceSettingsService.getSettings(),
    enabled: isAuthenticated,
  });

  const statusOptions = [
    {
      value: 'present' as AttendanceStatus,
      label: 'تسجيل حضور',
      helper: 'يُضاف أجر اليوم للحساب النهائي',
      icon: CheckCircle2,
    },
    {
      value: 'absent' as AttendanceStatus,
      label: 'غياب بدون عذر',
      helper: 'يتم خصم أجر اليوم بالكامل',
      icon: XCircle,
    },
    {
      value: 'absent_excused' as AttendanceStatus,
      label: 'غياب بعذر',
      helper: 'لن يتم خصم اليوم إلا بعد موافقة المسؤول على العذر',
      icon: AlertCircle,
    },
  ];

  const checkInParts = to12HourParts(attendanceForm.checkInTime);
  const checkOutParts = to12HourParts(attendanceForm.checkOutTime);
  const timeInputsDisabled = attendanceForm.status !== 'present';

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

  // Save monthly summaries when month changes
  useEffect(() => {
    const savePreviousMonthSummaries = async () => {
      // Only run for admin and when employees are loaded
      if (!isAdmin || employees.length === 0) return;

      // Get the previous month
      const currentDate = new Date();
      const currentMonth = format(currentDate, 'yyyy-MM');

      // If selectedMonth is different from current month, it means we're viewing a past month
      // We should save summaries for that month
      if (selectedMonth !== currentMonth) {
        console.log(`📅 Month changed to ${selectedMonth}, saving summaries...`);

        // Save summary for each employee
        for (const employee of employees) {
          try {
            const summary = await attendanceService.getMonthlySummary(employee.id, selectedMonth);
            if (summary) {
              await attendanceService.saveMonthlySummary(employee.id, selectedMonth);
            }
          } catch (error) {
            console.error(`Error saving summary for ${employee.name}:`, error);
          }
        }
      }
    };

    savePreviousMonthSummaries();
  }, [selectedMonth, isAdmin, employees]);


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

      return attendanceService.addOrUpdateAttendanceRecord(employee, {
        date: attendanceForm.date,
        status: attendanceForm.status,
        checkInTime: attendanceForm.status === 'present' ? attendanceForm.checkInTime || null : null,
        checkOutTime: attendanceForm.status === 'present' ? attendanceForm.checkOutTime || null : null,
        excuseText: attendanceForm.excuseText || null,
        notes: attendanceForm.notes || null,
        settings: attendanceSettings || null,
      });
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
    mutationFn: async ({
      recordId,
      status,
      note,
      resolution,
    }: {
      recordId: string;
      status: ExcuseStatus;
      note?: string | null;
      resolution?: 'no_deduct' | 'hourly' | null;
    }) => {
      if (!selectedRecordForExcuse) throw new Error('السجل غير موجود');
      const employee = employees.find((e) => e.id === selectedRecordForExcuse.employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      return attendanceService.updateExcuseStatus(recordId, status, employee, note, resolution);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('تم تحديث حالة العذر بنجاح');
      setIsExcuseDialogOpen(false);
      setSelectedRecordForExcuse(null);
      setExcuseDecisionNote('');
      setExcuseDecisionIntent(null);
      setExcuseResolutionMode('hourly');
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + (error.message || 'فشل العملية'));
    },
  });

  const attendancePolicyMutation = useMutation({
    mutationFn: async (policy: ExcusedAbsencePolicy) => {
      return attendanceSettingsService.updateSettings({ excusedAbsencePolicy: policy });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSettings'] });
      toast.success('تم تحديث سياسة الغياب بعذر');
    },
    onError: (error: any) => {
      toast.error('تعذر تحديث السياسة: ' + (error.message || 'فشل العملية'));
    },
  });

  const resetEmployeeForm = () => {
    setEmployeeForm({
      name: '',
      username: '',
      password: '',
      monthlySalary: 0,
      monthlyWorkingHours: 270,
      monthlyWorkingDays: 26,
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
      status: 'present',
      checkInTime: '',
      checkOutTime: '',
      excuseText: '',
      notes: '',
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
      monthlyWorkingDays: employee.monthlyWorkingDays || 26,
      checkIn: employee.workingHours.checkIn,
      checkOut: employee.workingHours.checkOut,
    });
    setIsEmployeeDialogOpen(true);
  };

  const openExcuseDialog = (record: AttendanceRecord, intent?: ExcuseStatus) => {
    setSelectedRecordForExcuse(record);
    setExcuseDecisionNote(record.excuseNote || '');
    setExcuseDecisionIntent(intent ?? null);
    if (record.excuseResolution) {
      setExcuseResolutionMode(record.excuseResolution);
    } else {
      setExcuseResolutionMode('hourly');
    }
    setIsExcuseDialogOpen(true);
  };

  const formatTimeTo12Hour = (time?: string | null) => {
    if (!time) return null;
    const [hoursStr, minutesStr] = time.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
    const dateObj = new Date();
    dateObj.setHours(hours, minutes, 0, 0);
    return format(dateObj, 'hh:mm a');
  };

  const getExcuseStatusBadge = (status: ExcuseStatus) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: 'بانتظار الموافقة' },
      accepted: { variant: 'default' as const, label: 'مقبول' },
      rejected: { variant: 'destructive' as const, label: 'مرفوض' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleTimePartChange = (
    field: 'checkInTime' | 'checkOutTime',
    part: keyof TimeParts,
    value: string
  ) => {
    setAttendanceForm((prev) => {
      const currentParts = to12HourParts(prev[field]);
      const nextParts = { ...currentParts, [part]: value } as TimeParts;
      if (part === 'hour' && nextParts.minute === '') {
        nextParts.minute = '00';
      }
      const nextValue = to24HourString(nextParts);
      return {
        ...prev,
        [field]: nextValue,
      };
    });
  };

  const clearTimeField = (field: 'checkInTime' | 'checkOutTime') => {
    setAttendanceForm((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const variants = {
      present: { variant: 'default' as const, label: 'حضور' },
      absent: { variant: 'destructive' as const, label: 'غياب بدون عذر' },
      absent_excused: { variant: 'secondary' as const, label: 'غياب بعذر' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getExcuseResolutionLabel = (record: AttendanceRecord) => {
    if (record.excuseStatus !== 'accepted') return '-';
    if (record.excuseResolution === 'no_deduct') {
      return 'مقبول بدون خصم';
    }
    if (record.excuseResolution === 'hourly') {
      return 'مقبول واحتساب دقائق التأخير';
    }
    return 'مقبول';
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
                  تسجيل حالة اليوم
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-1rem)] max-w-[95vw] sm:max-w-2xl lg:max-w-3xl p-3 sm:p-6">
                <DialogHeader className="space-y-2 pb-2">
                  <DialogTitle className="text-base sm:text-lg">تسجيل حالة اليوم</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    {isAdmin
                      ? 'اختر الموظف وحدد ما إذا كان اليوم حضورًا أم غيابًا مع أو بدون عذر'
                      : 'اختر حالتك اليومية وسجّل الأوقات أو الملاحظات إن لزم الأمر'
                    }
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(85vh-8rem)] sm:max-h-[calc(80vh-8rem)] pr-2">
                  <div className="space-y-3 sm:space-y-4 pb-2">
                    {/* معلومات الموظف والتاريخ */}
                    <div className="rounded-lg border p-2.5 sm:p-4 space-y-2.5 sm:space-y-3">
                      {isAdmin && (
                        <div>
                          <Label htmlFor="attendance-employee" className="text-xs sm:text-sm">الموظف</Label>
                          <Select
                            value={attendanceForm.employeeId}
                            onValueChange={(value) =>
                              setAttendanceForm({ ...attendanceForm, employeeId: value })
                            }
                          >
                            <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                              <SelectValue placeholder="اختر الموظف" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id} className="text-xs sm:text-sm">
                                  {emp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {!isAdmin && currentEmployee && (
                        <div>
                          <Label className="text-xs sm:text-sm">الموظف</Label>
                          <Input value={currentEmployee.name} disabled className="bg-muted h-9 sm:h-10 text-xs sm:text-sm" />
                        </div>
                      )}
                      <div>
                        <Label htmlFor="attendance-date" className="text-xs sm:text-sm">التاريخ</Label>
                        <Input
                          id="attendance-date"
                          type="date"
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                          value={attendanceForm.date}
                          onChange={(e) =>
                            setAttendanceForm({ ...attendanceForm, date: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {/* أزرار الحالة */}
                    <div className="rounded-lg border p-2.5 sm:p-4 space-y-2.5 sm:space-y-3">
                      <Label className="text-xs sm:text-sm font-medium">اختر الحالة</Label>
                      <div className="grid gap-2 grid-cols-1 xs:grid-cols-3">
                        {statusOptions.map((option) => {
                          const Icon = option.icon;
                          const isActive = attendanceForm.status === option.value;
                          return (
                            <Button
                              key={option.value}
                              type="button"
                              variant={isActive ? 'default' : 'outline'}
                              className="h-auto min-h-[3.5rem] sm:min-h-[4rem] flex flex-col items-start gap-0.5 sm:gap-1 text-right p-2 sm:p-3"
                              onClick={() => {
                                setAttendanceForm((prev) => ({
                                  ...prev,
                                  status: option.value,
                                  ...(option.value !== 'present'
                                    ? { checkInTime: '', checkOutTime: '' }
                                    : {}),
                                }));
                              }}
                            >
                              <span className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium">
                                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                <span className="truncate">{option.label}</span>
                              </span>
                              <span className="text-[0.65rem] sm:text-xs text-muted-foreground leading-tight line-clamp-2">
                                {option.helper}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* أوقات الحضور والانصراف */}
                    <div className="rounded-lg border p-2.5 sm:p-4 space-y-2.5 sm:space-y-3">
                      <p className="text-xs sm:text-sm font-medium">أوقات الحضور والانصراف</p>
                      <div className="grid gap-3 sm:gap-4">
                        {/* وقت الحضور */}
                        <div className={timeInputsDisabled ? 'opacity-60' : ''}>
                          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                            <Label className="text-xs sm:text-sm">وقت الحضور</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 sm:h-7 px-1.5 sm:px-2 text-[0.65rem] sm:text-xs"
                              disabled={timeInputsDisabled || !attendanceForm.checkInTime}
                              onClick={() => clearTimeField('checkInTime')}
                            >
                              مسح
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            <Select
                              value={checkInParts.hour || undefined}
                              onValueChange={(value) =>
                                handleTimePartChange('checkInTime', 'hour', value)
                              }
                              disabled={timeInputsDisabled}
                            >
                              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                                <SelectValue placeholder="ساعة" />
                              </SelectTrigger>
                              <SelectContent>
                                {HOURS_12.map((hour) => (
                                  <SelectItem key={hour} value={hour} className="text-xs sm:text-sm">
                                    {hour}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={checkInParts.minute || undefined}
                              onValueChange={(value) =>
                                handleTimePartChange('checkInTime', 'minute', value)
                              }
                              disabled={timeInputsDisabled || !checkInParts.hour}
                            >
                              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                                <SelectValue placeholder="دقيقة" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {MINUTES_60.map((minute) => (
                                  <SelectItem key={minute} value={minute} className="text-xs sm:text-sm">
                                    {minute}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={checkInParts.period}
                              onValueChange={(value) =>
                                handleTimePartChange('checkInTime', 'period', value as Meridiem)
                              }
                              disabled={timeInputsDisabled || !checkInParts.hour}
                            >
                              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                                <SelectValue placeholder="ص/م" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM" className="text-xs sm:text-sm">صباحاً</SelectItem>
                                <SelectItem value="PM" className="text-xs sm:text-sm">مساءً</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* وقت الانصراف */}
                        <div className={timeInputsDisabled ? 'opacity-60' : ''}>
                          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                            <Label className="text-xs sm:text-sm">وقت الانصراف</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 sm:h-7 px-1.5 sm:px-2 text-[0.65rem] sm:text-xs"
                              disabled={timeInputsDisabled || !attendanceForm.checkOutTime}
                              onClick={() => clearTimeField('checkOutTime')}
                            >
                              مسح
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            <Select
                              value={checkOutParts.hour || undefined}
                              onValueChange={(value) =>
                                handleTimePartChange('checkOutTime', 'hour', value)
                              }
                              disabled={timeInputsDisabled}
                            >
                              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                                <SelectValue placeholder="ساعة" />
                              </SelectTrigger>
                              <SelectContent>
                                {HOURS_12.map((hour) => (
                                  <SelectItem key={`out-${hour}`} value={hour} className="text-xs sm:text-sm">
                                    {hour}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={checkOutParts.minute || undefined}
                              onValueChange={(value) =>
                                handleTimePartChange('checkOutTime', 'minute', value)
                              }
                              disabled={timeInputsDisabled || !checkOutParts.hour}
                            >
                              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                                <SelectValue placeholder="دقيقة" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {MINUTES_60.map((minute) => (
                                  <SelectItem key={`out-minute-${minute}`} value={minute} className="text-xs sm:text-sm">
                                    {minute}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={checkOutParts.period}
                              onValueChange={(value) =>
                                handleTimePartChange('checkOutTime', 'period', value as Meridiem)
                              }
                              disabled={timeInputsDisabled || !checkOutParts.hour}
                            >
                              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                                <SelectValue placeholder="ص/م" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM" className="text-xs sm:text-sm">صباحاً</SelectItem>
                                <SelectItem value="PM" className="text-xs sm:text-sm">مساءً</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* التفاصيل الإضافية */}
                    <div className="rounded-lg border p-2.5 sm:p-4 space-y-2.5 sm:space-y-3">
                      <p className="text-xs sm:text-sm font-medium">التفاصيل الإضافية</p>
                      <div className="space-y-2.5 sm:space-y-3">
                        <div>
                          <Label htmlFor="attendance-excuse" className="text-xs sm:text-sm">نص العذر (اختياري)</Label>
                          <Textarea
                            id="attendance-excuse"
                            className="resize-none text-xs sm:text-sm min-h-[4rem] sm:min-h-[5rem]"
                            value={attendanceForm.excuseText}
                            onChange={(e) =>
                              setAttendanceForm({ ...attendanceForm, excuseText: e.target.value })
                            }
                            placeholder="أدخل نص العذر إن وجد"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="attendance-notes" className="text-xs sm:text-sm">ملاحظات إضافية</Label>
                          <Textarea
                            id="attendance-notes"
                            className="resize-none text-xs sm:text-sm min-h-[4rem] sm:min-h-[5rem]"
                            value={attendanceForm.notes}
                            onChange={(e) =>
                              setAttendanceForm({ ...attendanceForm, notes: e.target.value })
                            }
                            placeholder="أي تفاصيل متعلقة بالحالة"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="gap-2 flex-col sm:flex-row pt-3">
                  <Button
                    variant="outline"
                    className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto order-2 sm:order-1"
                    onClick={() => {
                      setIsAttendanceDialogOpen(false);
                      resetAttendanceForm();
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button
                    className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto order-1 sm:order-2"
                    onClick={() => attendanceMutation.mutate()}
                    disabled={
                      !attendanceForm.employeeId ||
                      attendanceMutation.isPending ||
                      (attendanceForm.status === 'present' &&
                        (!attendanceForm.checkInTime || !attendanceForm.checkOutTime))
                    }
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
                      <div>
                        <Label htmlFor="monthlyWorkingDays">عدد أيام العمل في الشهر</Label>
                        <Input
                          id="monthlyWorkingDays"
                          type="number"
                          value={employeeForm.monthlyWorkingDays}
                          onChange={(e) =>
                            setEmployeeForm({
                              ...employeeForm,
                              monthlyWorkingDays: Number(e.target.value),
                            })
                          }
                          placeholder="26"
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
                            monthlyWorkingDays: employeeForm.monthlyWorkingDays,
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
                    <SelectItem value="accepted">مقبول</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isAdmin && attendanceSettings && (
              <div className="mt-6 border-t pt-4 space-y-2">
                <Label>سياسة الغياب بعذر</Label>
                <Select
                  value={attendanceSettings.excusedAbsencePolicy}
                  onValueChange={(value) => attendancePolicyMutation.mutate(value as ExcusedAbsencePolicy)}
                  disabled={attendancePolicyMutation.isPending || attendanceSettingsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر السياسة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_deduct">بدون خصم</SelectItem>
                    <SelectItem value="deduct">خصم أجر اليوم بالكامل</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  يتم تطبيق السياسة فورًا على أي يوم يسجل كغياب بعذر.
                </p>
              </div>
            )}
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
                          <TableHead>الحالة</TableHead>
                          <TableHead>وقت الحضور</TableHead>
                          <TableHead>وقت الانصراف</TableHead>
                          <TableHead>مدة التأخير</TableHead>
                          <TableHead>العذر</TableHead>
                          <TableHead>ملاحظة المسؤول</TableHead>
                          <TableHead>نتيجة القبول</TableHead>
                          <TableHead>حالة العذر</TableHead>
                          <TableHead>نوع الخصم</TableHead>
                          <TableHead>قيمة الخصم</TableHead>
                          <TableHead>ساعات Overtime</TableHead>
                          <TableHead>قيمة Overtime</TableHead>
                          <TableHead>الصافي اليومي</TableHead>
                          <TableHead>ملاحظات إضافية</TableHead>
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
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell>
                              {record.status === 'present' && record.checkInTime ? (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeTo12Hour(record.checkInTime)}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {record.status === 'present' && record.checkOutTime ? (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeTo12Hour(record.checkOutTime)}
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
                            <TableCell>{record.excuseNote || '-'}</TableCell>
                            <TableCell>{getExcuseResolutionLabel(record)}</TableCell>
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
                            <TableCell>{record.notes || '-'}</TableCell>
                            {isAdmin && (
                              <TableCell>
                                <div className="flex flex-col gap-2">
                                  {record.hasExcuse && record.excuseStatus === 'pending' ? (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openExcuseDialog(record, 'accepted')}
                                      >
                                        قبول العذر
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openExcuseDialog(record, 'rejected')}
                                      >
                                        رفض العذر
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openExcuseDialog(record)}
                                    >
                                      مراجعة السجل
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
        <Dialog
          open={isExcuseDialogOpen}
          onOpenChange={(open) => {
            setIsExcuseDialogOpen(open);
            if (!open) {
              setSelectedRecordForExcuse(null);
              setExcuseDecisionNote('');
              setExcuseDecisionIntent(null);
              setExcuseResolutionMode('hourly');
            }
          }}
        >
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
                    {selectedRecordForExcuse.excuseNote && (
                      <p className="text-sm text-muted-foreground">
                        <strong>آخر ملاحظة للمسؤول:</strong> {selectedRecordForExcuse.excuseNote}
                      </p>
                    )}
                  </div>
                )}
                {excuseDecisionIntent && (
                  <p className="text-sm text-muted-foreground mt-4">
                    تم اختيار {excuseDecisionIntent === 'accepted' ? 'قبول' : 'رفض'} العذر، يرجى التأكيد أدناه بعد مراجعة التفاصيل.
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedRecordForExcuse && (
              <div className="space-y-2">
                <Label htmlFor="admin-excuse-note">ملاحظات المسؤول (اختياري)</Label>
                <Textarea
                  id="admin-excuse-note"
                  className="resize-none"
                  value={excuseDecisionNote}
                  onChange={(e) => setExcuseDecisionNote(e.target.value)}
                  placeholder="أدخل سبب القبول أو الرفض ليظهر في السجل"
                  rows={3}
                />
              </div>
            )}
            {selectedRecordForExcuse && (
              <div className="space-y-3">
                {(excuseDecisionIntent === 'accepted' ||
                  selectedRecordForExcuse.excuseStatus === 'accepted') && (
                    <div className="space-y-2">
                      <Label>طريقة احتساب العذر المقبول</Label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant={excuseResolutionMode === 'no_deduct' ? 'default' : 'outline'}
                          onClick={() => setExcuseResolutionMode('no_deduct')}
                        >
                          قبول بدون خصم
                        </Button>
                        <Button
                          type="button"
                          variant={excuseResolutionMode === 'hourly' ? 'default' : 'outline'}
                          onClick={() => setExcuseResolutionMode('hourly')}
                        >
                          قبول واحتساب التأخير بالدقائق
                        </Button>
                      </div>
                    </div>
                  )}
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsExcuseDialogOpen(false);
                  setSelectedRecordForExcuse(null);
                  setExcuseDecisionNote('');
                  setExcuseDecisionIntent(null);
                  setExcuseResolutionMode('hourly');
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
                      note: excuseDecisionNote,
                      resolution: null,
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
                      status: 'accepted',
                      note: excuseDecisionNote,
                      resolution: excuseResolutionMode,
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
    queryFn: () => attendanceService.getMonthlySummaryWithArchive(employee.id, month),
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

  const recordedDays =
    summary.recordedDays ??
    (summary.attendanceDays + summary.absentDays + (summary.excusedAbsentDays || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {employee.name}
        </CardTitle>
        <CardDescription>ملخص شهر {month} بناءً على الأيام المسجلة</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="col-span-2">
            <span className="text-muted-foreground">الراتب النهائي الحالي:</span>
            <p className="font-semibold text-2xl">{summary.finalSalary.toFixed(2)} جنيه</p>
          </div>
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
        </div>
        <div className="pt-3 border-t space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">الأيام المسجلة:</span>
            <span className="font-medium">{recordedDays} يوم</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">أيام الحضور:</span>
            <span className="font-medium">{summary.attendanceDays} يوم</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">غياب بدون عذر:</span>
            <span className="font-medium text-red-600">{summary.absentDays} يوم</span>
          </div>
          {typeof summary.excusedAbsentDays === 'number' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">غياب بعذر:</span>
              <span className="font-medium text-yellow-600">{summary.excusedAbsentDays} يوم</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">إجمالي التأخير:</span>
            <span className="font-medium">{summary.totalDelayMinutes} دقيقة</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">أعذار معلقة:</span>
            <span className="font-medium">{summary.pendingExcuses}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">أعذار مقبولة:</span>
            <span className="font-medium text-green-600">{summary.acceptedExcuses}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">أعذار مرفوضة:</span>
            <span className="font-medium text-red-600">{summary.rejectedExcuses}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

