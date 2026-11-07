// Shared API payload types for the Klub Santa admin panel.
// Dates arrive as ISO strings over JSON.

export interface AdminUser {
  email: string
  name: string
  role: string
}

export interface Product {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  points: string
  ribbon: string | null
  badge: string | null
  ctaLabel: string
  priceCents: number
  currency: string
  image: string | null
  featured: boolean
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface OrderSummary {
  id: string
  status: string
  amountCents: number
  currency: string
  provider: string
}

export interface JobSummary {
  id: string
  status: string
  kind: string
}

export interface BookingListItem {
  id: string
  reference: string
  planName: string
  recipientName: string
  pronunciation: string
  ageRange: string
  language: string
  parentEmail: string
  memoryNote: string
  scheduledFor: string | null
  status: string
  adminNote: string | null
  createdAt: string
  updatedAt: string
  product: { name: string; priceCents: number; currency: string } | null
  orders: OrderSummary[]
  jobs: JobSummary[]
}

export interface BookingListResponse {
  items: BookingListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface OrderFull {
  id: string
  bookingId: string
  amountCents: number
  currency: string
  status: string
  provider: string
  sessionRef: string | null
  paymentRef: string | null
  paidAt: string | null
  refundedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface JobFull {
  id: string
  orderId: string | null
  bookingId: string
  provider: string
  kind: string
  status: string
  providerJobId: string | null
  scriptText: string | null
  outputUrl: string | null
  error: string | null
  attempts: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface BookingDetail extends Omit<BookingListItem, 'product' | 'orders' | 'jobs'> {
  product: Product | null
  orders: OrderFull[]
  jobs: JobFull[]
}

export interface OrderListItem extends OrderFull {
  booking: {
    reference: string
    recipientName: string
    parentEmail: string
    planName: string
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface JobListItem extends JobFull {
  booking: {
    reference: string
    recipientName: string
    language: string
    parentEmail: string
  }
}

export interface Faq {
  id: string
  question: string
  answer: string
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Subscriber {
  id: string
  email: string
  source: string
  unsubscribedAt: string | null
  createdAt: string
}

export interface EmailLogItem {
  id: string
  toEmail: string
  subject: string
  template: string
  status: string
  provider: string
  providerId: string | null
  error: string | null
  createdAt: string
}

export interface SettingRow {
  key: string
  value: string
  updatedAt: string
}

export interface StatsResponse {
  bookings: {
    total: number
    new: number
    awaitingPayment: number
    completed: number
  }
  revenue: {
    cents: number
    currencies: string[]
    paidOrders: number
  }
  subscribers: number
  jobs: { active: number; failed: number }
  emailsFailed: number
  productCount: number
  byLanguage: { language: string; count: number }[]
  recentBookings: {
    id: string
    reference: string
    recipientName: string
    language: string
    status: string
    planName: string
    parentEmail: string
    createdAt: string
  }[]
}

export interface OrderActionResult {
  ok: boolean
  message: string
}

export interface JobActionResult {
  ok: boolean
  message: string
}
