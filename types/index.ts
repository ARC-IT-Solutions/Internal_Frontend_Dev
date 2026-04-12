// ─── Auth ──────────────────────────────────────────────────────────────────────
export type Role = 'admin' | 'employee' | 'client';

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  // Derived for UI
  avatar?: string;
}

// ─── Inquiries ─────────────────────────────────────────────────────────────────
export type InquiryStatus   = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'REJECTED';
export type InquirySource   = 'website_form' | 'cold_call' | 'referral' | 'social' | 'other';
export type Priority        = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
  source?: InquirySource;
  status: InquiryStatus;
  priority: Priority;
  assigned_to?: string;
  notes?: string;
  converted_at?: string;
  converted_by?: string;
  converted_project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ConvertInquiryPayload {
  full_name: string;
  password: string;
  project_title: string;
  project_description?: string;
  priority?: Priority;
}

export interface ConvertInquiryResponse {
  inquiry_id: string;
  client_id: string;
  project_id: string;
  client_created: boolean;
  message: string;
}

// ─── Projects ──────────────────────────────────────────────────────────────────
export type ProjectStatus =
  | 'DRAFT' | 'PLANNING' | 'ONBOARDING' | 'IN_PROGRESS'
  | 'ON_HOLD' | 'REVIEW' | 'COMPLETED' | 'CANCELLED';

export const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT:       ['PLANNING', 'CANCELLED'],
  PLANNING:    ['ONBOARDING', 'CANCELLED'],
  ONBOARDING:  ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'REVIEW', 'CANCELLED'],
  ON_HOLD:     ['IN_PROGRESS', 'CANCELLED'],
  REVIEW:      ['COMPLETED', 'IN_PROGRESS'],
  COMPLETED:   [],
  CANCELLED:   [],
};

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  client_id: string;
  assigned_to?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// ─── Onboarding ────────────────────────────────────────────────────────────────
export type OnboardingStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface OnboardingData {
  id: string;
  project_id: string;
  client_id: string;
  business_name?: string;
  business_details?: string;
  requirements?: string;
  target_audience?: string;
  assets_provided?: Record<string, boolean>;
  credentials?: Record<string, string>;
  additional_notes?: string;
  status: OnboardingStatus;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
}

// ─── Milestones ────────────────────────────────────────────────────────────────
export type MilestoneStatus = 'PENDING' | 'INVOICED' | 'PAID';

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  percentage?: number;
  amount?: number;
  due_date?: string;
  order_index: number;
  status: MilestoneStatus;
  invoice_id?: string;
  created_at: string;
}

// ─── Invoices ──────────────────────────────────────────────────────────────────
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoice_number: string;
  title: string;
  description?: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  client_id: string;
  project_id: string;
  due_date?: string;
  paid_at?: string;
  file_path?: string;
  file_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// ─── Payments ──────────────────────────────────────────────────────────────────
export type PaymentMethod = 'bank_transfer' | 'card' | 'upi' | 'cash' | 'other';

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method?: PaymentMethod;
  reference?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface RecordPaymentPayload {
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method?: PaymentMethod;
  reference?: string;
  notes?: string;
}

// ─── Tickets ───────────────────────────────────────────────────────────────────
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: Priority;
  client_id: string;
  project_id?: string;
  assigned_to?: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

// ─── Audit Logs ────────────────────────────────────────────────────────────────
export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'PRIORITY_CHANGE'
  | 'ASSIGN' | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'FILE_UPLOAD'
  | 'FILE_DOWNLOAD' | 'PASSWORD_CHANGE';

export interface AuditLog {
  id: string;
  user_id?: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  old_value?: unknown;
  new_value?: unknown;
  description?: string;
  ip_address?: string;
  timestamp: string;
}

// ─── Pagination ────────────────────────────────────────────────────────────────
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Session (stored in cookie) ────────────────────────────────────────────────
export interface Session {
  access_token: string;
  refresh_token?: string;
  user: User;
  expires: number;
}
