// Types for Attendance & Employee Management System

export type ExcuseStatus = 'pending' | 'approved' | 'rejected';

export type DeductionType = 'fixed' | 'hourly' | 'none' | 'quarter_day' | 'half_day';

export interface WorkingHours {
  checkIn: string; // Format: "HH:mm" (e.g., "09:00")
  checkOut: string; // Format: "HH:mm" (e.g., "17:00")
}

export interface Employee {
  id: string;
  name: string;
  username?: string; // اسم المستخدم (رقم أو اسم)
  password?: string; // كلمة المرور
  monthlySalary: number; // الراتب الشهري
  monthlyWorkingHours: number; // عدد ساعات العمل الشهرية الرسمية
  workingHours: WorkingHours; // مواعيد الحضور والانصراف
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // Format: "YYYY-MM-DD"
  checkInTime: string | null; // Format: "HH:mm" or null if absent
  checkOutTime: string | null; // Format: "HH:mm" or null if absent
  delayMinutes: number; // مدة التأخير بالدقائق
  hasExcuse: boolean;
  excuseText: string | null;
  excuseStatus: ExcuseStatus;
  deductionType: DeductionType;
  deductionAmount: number; // قيمة الخصم
  overtimeHours: number; // عدد ساعات الـ Overtime
  overtimeAmount: number; // قيمة الـ Overtime
  dailyNet: number; // الصافي اليومي
  createdAt: string;
  updatedAt: string;
}

export interface MonthlySummary {
  employeeId: string;
  employeeName: string;
  month: string; // Format: "YYYY-MM"
  baseSalary: number;
  totalDeductions: number;
  totalOvertime: number;
  finalSalary: number;
  attendanceDays: number;
  absentDays: number;
  totalDelayMinutes: number;
  pendingExcuses: number;
  approvedExcuses: number;
  rejectedExcuses: number;
}

// Delay deduction rules
export const DELAY_DEDUCTION_RULES = {
  lessThan15: 0,
  moreThan15: 15,
  moreThan30: 25,
  moreThan45: 50,
  moreThan60: 'quarter_day', // خصم ربع يوم
  moreThan90: 'half_day', // خصم نصف يوم
} as const;

// Helper function to calculate delay deduction
export function calculateDelayDeduction(
  delayMinutes: number,
  excuseStatus: ExcuseStatus,
  monthlySalary: number,
  monthlyWorkingHours: number
): { type: DeductionType; amount: number } {
  if (excuseStatus === 'approved') {
    // Calculate by actual hours
    const hourlyRate = monthlySalary / monthlyWorkingHours;
    const delayHours = delayMinutes / 60;
    return {
      type: 'hourly',
      amount: delayHours * hourlyRate,
    };
  }

  if (excuseStatus === 'pending') {
    // While pending, apply normal deduction rules
    // This will be recalculated when status changes
  }

  // Rejected or no excuse - apply fixed deduction rules
  if (delayMinutes < 15) {
    return { type: 'none', amount: 0 };
  } else if (delayMinutes < 30) {
    return { type: 'fixed', amount: DELAY_DEDUCTION_RULES.moreThan15 };
  } else if (delayMinutes < 45) {
    return { type: 'fixed', amount: DELAY_DEDUCTION_RULES.moreThan30 };
  } else if (delayMinutes < 60) {
    return { type: 'fixed', amount: DELAY_DEDUCTION_RULES.moreThan45 };
  } else if (delayMinutes < 90) {
    // Quarter day deduction
    const dailySalary = monthlySalary / 30; // Assuming 30 days per month
    return { type: 'quarter_day', amount: dailySalary / 4 };
  } else {
    // Half day deduction
    const dailySalary = monthlySalary / 30;
    return { type: 'half_day', amount: dailySalary / 2 };
  }
}

// Helper function to calculate overtime
export function calculateOvertime(
  checkInTime: string | null,
  checkOutTime: string | null,
  workingHours: WorkingHours,
  monthlySalary: number,
  monthlyWorkingHours: number
): { hours: number; amount: number } {
  if (!checkInTime || !checkOutTime) {
    return { hours: 0, amount: 0 };
  }

  const checkIn = parseTime(checkInTime);
  const checkOut = parseTime(checkOutTime);
  const officialCheckOut = parseTime(workingHours.checkOut);

  if (checkOut <= officialCheckOut) {
    return { hours: 0, amount: 0 };
  }

  const overtimeMinutes = (checkOut - officialCheckOut) / (1000 * 60);
  const overtimeHours = overtimeMinutes / 60;
  const hourlyRate = monthlySalary / monthlyWorkingHours;
  // Double rate for overtime
  const overtimeAmount = overtimeHours * hourlyRate * 2;

  return {
    hours: Math.round(overtimeHours * 100) / 100, // Round to 2 decimal places
    amount: Math.round(overtimeAmount * 100) / 100,
  };
}

// Helper function to parse time string to Date
function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

// Helper function to calculate delay in minutes
export function calculateDelay(
  checkInTime: string | null,
  workingHours: WorkingHours
): number {
  if (!checkInTime) {
    return 0;
  }

  const checkIn = parseTime(checkInTime);
  const officialCheckIn = parseTime(workingHours.checkIn);

  if (checkIn <= officialCheckIn) {
    return 0;
  }

  return Math.floor((checkIn - officialCheckIn) / (1000 * 60));
}

