
export type UnitType = 'm2' | 'un' | 'ml';

export type UserRole = 'admin' | 'sales' | 'production';

export interface RolePermissions {
  dashboard: boolean;
  quotes: boolean;
  scheduling: boolean;
  production: boolean;
  products: boolean;
  financial: boolean;
  customers: boolean;
  time_clock: boolean;
}

export interface User {
  id: string;
  username: string;
  email?: string; // Link to Supabase Auth
  password?: string; // Mantido para compatibilidade, mas o Auth gerenciara a senha real
  role: UserRole;
  name: string;
  avatar?: string;
  active: boolean;
  workloadHours?: number; // kept for legacy/fallback
  workloadConfig?: {
    default: number; // minutes
    saturday?: number; // minutes
    sunday?: number; // minutes
  };
}

export interface Product {
  id: string;
  name: string;
  category: string;
  unitType: UnitType;
  costPrice: number;
  productionTimeMinutes?: number;
  wastePercent: number;
  salePrice: number;
  stock: number;
  availableRollWidths?: number[];
}

export interface FixedAsset {
  id: string;
  name: string;
  value: number;
  usefulLifeYears: number;
  monthlyDepreciation: number;
}

export interface FixedCost {
  id: string;
  description: string;
  value: number;
}

export interface FinancialConfig {
  productiveHoursPerMonth: number;
  taxPercent: number;
  commissionPercent: number;
  targetProfitMargin: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  document?: string;
}

export interface QuoteItem {
  productId: string;
  quantity: number;
  width?: number;
  height?: number;
  unitPrice: number;
  subtotal: number;
  labelData?: any;
  rollWidthUsed?: number;
  utilizationPercent?: number;
  // Fixed: added 'number' to the allowed types for requirements values
  requirements?: Record<string, string | boolean | number>;
}

export type QuoteStatus = 'draft' | 'sent' | 'negotiating' | 'confirmed' | 'pre_print' | 'production' | 'printing_cut_electronic' | 'printing_cut_manual' | 'printing_lamination' | 'printing_finishing' | 'finished' | 'delivered';

export interface Quote {
  id: string;
  date: string;
  customerId: string;
  items: QuoteItem[];
  totalAmount: number;
  downPayment: number;
  designFee: number;
  installFee: number;
  status: QuoteStatus;
  deadlineDays: number;
  notes?: string;
}

export type ScheduleEventType = 'ligar' | 'reuniao' | 'medicao' | 'entrega' | 'email' | 'almoco' | 'visita' | 'outro';

export interface ScheduleEvent {
  id: string;
  type: ScheduleEventType;
  title: string;
  date: string;
  durationMinutes: number;
  customerId?: string;
  description: string;
  responsible: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface TimeRecord {
  id: string;
  userId: string;
  date: string;
  clockIn?: string;
  lunchStart?: string;
  lunchEnd?: string;
  breakStart?: string;
  breakEnd?: string;
  clockOut?: string;
  totalMinutes?: number;
  balanceMinutes?: number;
}


export type AppView = 'dashboard' | 'products' | 'customers' | 'quotes' | 'production' | 'financial' | 'new-quote' | 'scheduling' | 'access-control' | 'time-clock' | 'hours-management';
