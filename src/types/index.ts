// 0: Superadmin | 1: Admin | 2: Sale | 3: Thợ chụp ảnh | 4: Cộng tác viên sale | 5: Kế toán
export type UserRole = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ROLE_LABELS: Record<UserRole, string> = {
  0: 'Superadmin',
  1: 'Admin',
  2: 'Sale',
  3: 'Thợ chụp ảnh',
  4: 'Cộng tác viên sale',
  5: 'Kế toán',
  6: 'Khách hàng',
};

export interface User {
  _id: string;
  username: string;
  name?: string;
  roles: UserRole[];
  isActive: boolean;
  telegramId?: string;
  createdAt?: string;
}

export interface Customer {
  _id: string;
  className: string;
  school?: string;
  contactName: string;
  contactPhone: string;
  contactAddress: string;
  total: number;
  totalMale?: number;
  totalFemale?: number;
  notes?: string;
  season?: string | null;
  createdAt?: string;
}

export interface CostumeType {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Costume {
  _id: string;
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'unisex';
  type?: string;
  itemKind?: 'clothing' | 'accessory';
  isRentalItem?: boolean;
  rentalPrice?: number;
  inventory?: CostumeInventory[];
  createdAt?: string;
}

export interface CostumeInventory {
  size: string;
  quantity: number;
  condition: 'good' | 'repair' | 'damaged' | 'retired';
}

export interface RentalCatalogItem {
  _id: string;
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'unisex';
  itemKind: 'clothing' | 'accessory';
  categoryId?: string | null;
  category?: string | null;
  rentalPrice: number;
  sizes: string[];
}

export interface RentalCatalogFilters {
  itemKind?: 'clothing' | 'accessory';
  categoryId?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
}

/** Populated Costume returned by GET endpoints (type is populated). */
export interface CostumeResponse extends Omit<Costume, 'type'> {
  type?: CostumeType;
}

export interface Package {
  _id: string;
  name: string;
  pricePerMember: number;
  duration?: 'full_day' | 'half_day' | 'two_thirds_day';
  costumes?: CostumeType[];
  crewRatio?: string;
  editingScope?: 'full' | 'partial';
  deliveryDays?: number;
  studentsPerCrew?: number;
  description?: string;
  isPopular?: boolean;
  createdAt?: string;
}

/**
 * Schedule model — relations are stored as ObjectId strings.
 * Use this type for create/update payloads.
 * For populated GET responses, use `ScheduleResponse` instead.
 */
export interface Schedule {
  _id: string;
  customer: string;
  package: string | null;
  costumes: string[];
  workflowBooking?: string;
  costumeReservations?: ScheduleCostumeReservation[];
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  leadPhotographer: string | null;
  supportPhotographers: string[];
  bookedBy: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  season?: string | null;
  contractUrl?: string;
  driveFolderUrl?: string;
  driveFolderId?: string;
  createdAt?: string;
}

export interface ScheduleCostumeReservation {
  costume: string;
  size: string;
  quantity: number;
  receiveDate: string;
  returnDate: string;
}

/** Populated Schedule returned by GET endpoints (backend uses `.populate`). */
export interface ScheduleResponse extends Omit<
  Schedule,
  'customer' | 'package' | 'costumes' | 'leadPhotographer' | 'supportPhotographers' | 'bookedBy'
> {
  customer: Customer;
  package: Package | null;
  costumes: Costume[];
  leadPhotographer: User | null;
  supportPhotographers: User[];
  bookedBy: User | null;
}

export interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  isDefault: boolean;
  createdBy?: string;
}

/**
 * Transaction model — relations are stored as ObjectId strings.
 * Use this type for create/update payloads.
 * For populated GET responses, use `TransactionResponse` instead.
 */
export interface Transaction {
  _id: string;
  customer: string | null;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  description?: string;
  date: string;
  createdBy: string | null;
  accountantRefunded?: boolean;
  season?: string | null;
  createdAt?: string;
}

/** Populated Transaction returned by GET endpoints. */
export interface TransactionResponse extends Omit<
  Transaction,
  'customer' | 'categoryId' | 'createdBy'
> {
  customer: Customer | null;
  categoryId: Category;
  createdBy: User | null;
}

export interface TransactionSummaryRow {
  _id: string | null;
  customer?: Customer;
  income: number;
  expense: number;
  profit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalMale?: number;
  totalFemale?: number;
}

export interface Student {
  _id: string;
  customer: string;
  name: string;
  gender: 'male' | 'female';
  height?: number;
  weight?: number;
  notes?: string;
  costumes: string[];
  createdAt?: string;
}

/** Populated Student returned by GET endpoints. */
export interface StudentResponse extends Omit<Student, 'costumes'> {
  costumes: Costume[];
}

export interface FeedbackItem {
  rating: number;
  description?: string;
}

export interface Feedback {
  _id: string;
  customer: string | null;
  phone?: string;
  crewFeedback?: FeedbackItem;
  albumFeedback?: FeedbackItem;
  content?: string;
  suggestion?: string;
  isRead: boolean;
  createdAt: string;
}

/** Populated Feedback returned by GET endpoints. */
export interface FeedbackResponse extends Omit<Feedback, 'customer'> {
  customer: Customer | null;
}

export interface Season {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt?: string;
}

/**
 * Public (unauthenticated) schedule shape returned by `/public/schedules/:customer`.
 * Intentionally narrower than `ScheduleResponse` to avoid leaking staff / booking info.
 */
export interface PublicScheduleResponse {
  _id: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: Schedule['status'];
  customer: Pick<Customer, '_id' | 'className' | 'school'>;
  costumes: Costume[];
  package: {
    _id: string;
    name: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Standard API response envelopes (matches backend sendResponse utility)
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalMale?: number;
  totalFemale?: number;
  totalRead?: number;
  totalUnread?: number;
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: PaginationMeta;
}
