
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

export interface ProductComponent {
  productId: string;
  quantity: number; // How much of this component is needed per 1 unit of the parent?
  // Logic:
  // - If parent is m2, and component is m2, ratio is 1:1 if quantity is 1.
  // - If parent is m2, and component is un (e.g. Grommets), quantity is 'per m2' or fixed?
  // Let's simplify: Quantity is "Amount of Component per 1 Unit of Parent"
}

export interface Product {
  id: string;
  name: string;
  category: string;
  unitType: UnitType;
  // Composite Product Support
  isComposite?: boolean;
  composition?: ProductComponent[]; // List of materials/services that make up this product

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
  hourlyRate?: number; // Calculated: (Fixed Costs + Deprec) / Hours
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
  productName: string;
  quantity: number;
  width?: number; // meters
  height?: number; // meters
  unitPrice: number;
  subtotal: number;
  labelData?: {
    type: 'sticker';
    mode: 'quantity' | 'area';
    singleWidth: number; // mm
    singleHeight: number; // mm
    gapMm: number;
    totalLabels: number;
    areaM2: number;
  };
  manualPrice?: number; // Override/Promo price
  requirements?: Record<string, boolean>;
  productionTime?: number; // Minutes
  unitCost?: number; // Snapshot of cost price at moment of quote
}

export type QuoteStatus = 'draft' | 'sent' | 'negotiating' | 'confirmed' | 'rejected' | 'pre_print' | 'production' | 'printing_cut_electronic' | 'printing_cut_manual' | 'printing_lamination' | 'printing_finishing' | 'finished' | 'delivered';

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
  discount?: number; // Percent 0-5
  discountType?: 'percent' | 'fixed';
  finalPrice?: number; // Override/Promo price
  paymentMethod?: string;
  downPaymentMethod?: string;
  userId?: string;
  commissionPaid?: boolean;
  commissionDate?: string;
  commissionPercent?: number; // Snapshot at creation
  stockDeducted?: boolean; // Inventory control
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



export type AppView = 'dashboard' | 'products' | 'customers' | 'quotes' | 'production' | 'financial' | 'new-quote' | 'scheduling' | 'access-control' | 'time-clock' | 'hours-management' | 'inventory' | 'commissions' | 'sales-pipeline' | 'scanner' | 'laser-calc' | 'vector-lab';

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  date: string;
  userId?: string;
  userName?: string;
}

export type InventoryStatus = 'low' | 'ok' | 'out';



export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  recipient_id?: string | null; // Null = Public Channel
  created_at: string;
  user_id?: string;
}

export type UserStatus = 'online' | 'busy' | 'away';

export interface ChatUser {
  id: string;
  name: string;
  role: string;
  status: UserStatus;
  last_seen: string;
  avatar?: string;
}

