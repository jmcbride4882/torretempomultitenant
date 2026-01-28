// Torre Tempo - Shared Types

// ============================================
// ENUMS
// ============================================

export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export enum EntryOrigin {
  MANUAL = 'MANUAL',
  QR = 'QR',
  GEOFENCE = 'GEOFENCE',
  OFFLINE = 'OFFLINE',
}

export enum EntryStatus {
  ACTIVE = 'ACTIVE',
  EDITED = 'EDITED',
  DELETED = 'DELETED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ReportType {
  MONTHLY_EMPLOYEE = 'MONTHLY_EMPLOYEE',
  MONTHLY_COMPANY = 'MONTHLY_COMPANY',
  COMPLIANCE_EXPORT = 'COMPLIANCE_EXPORT',
}

// ============================================
// CORE ENTITIES
// ============================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  locale: string;
  convenioCode: string | null;
  maxWeeklyHours: number;
  maxAnnualHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeCode: string | null;
  role: Role;
  isActive: boolean;
  locale: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  isActive: boolean;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  qrEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  tenantId: string;
  userId: string;
  locationId: string | null;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number | null;
  origin: EntryOrigin;
  qrTokenId: string | null;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
  offlineId: string | null;
  syncedAt: string | null;
  conflictFlag: boolean;
  status: EntryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EditRequest {
  id: string;
  timeEntryId: string;
  requestedById: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  status: ApprovalStatus;
  approvedById: string | null;
  approvalNote: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface Shift {
  id: string;
  tenantId: string;
  locationId: string | null;
  name: string;
  startTime: string;
  endTime: string;
  breakMins: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  tenantId: string;
  userId: string;
  shiftId: string;
  locationId: string | null;
  date: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// API TYPES
// ============================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ClockInRequest {
  locationId?: string;
  qrToken?: string;
  coordinates?: Coordinates;
  offlineId?: string;
  timestamp?: string; // ISO 8601, for offline sync
}

export interface ClockOutRequest {
  coordinates?: Coordinates;
  offlineId?: string;
  timestamp?: string;
}

export interface ClockResponse {
  success: boolean;
  entry?: TimeEntry;
  warnings?: HoursWarning[];
  errors?: string[];
}

export interface HoursWarning {
  type:
    | 'WEEKLY_LIMIT_WARNING'
    | 'WEEKLY_LIMIT_REACHED'
    | 'DAILY_LIMIT_WARNING'
    | 'DAILY_LIMIT_REACHED'
    | 'ANNUAL_LIMIT_WARNING'
    | 'ANNUAL_LIMIT_REACHED';
  hours: number;
  limit?: number;
}

export interface EditRequestCreate {
  timeEntryId: string;
  fieldName: string;
  newValue: string;
  reason: string;
}

export interface ApprovalAction {
  status: 'APPROVED' | 'REJECTED';
  note?: string;
}

// ============================================
// OFFLINE SYNC
// ============================================

export interface OfflineQueueItem {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  payload: ClockInRequest | ClockOutRequest;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface SyncRequest {
  items: OfflineQueueItem[];
}

export interface SyncResponse {
  results: Array<{
    offlineId: string;
    success: boolean;
    entry?: TimeEntry;
    error?: string;
  }>;
}

// ============================================
// AUTH
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
  tenant: Tenant;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
}

// ============================================
// CONVENIO RULES
// ============================================

export interface ConvenioRules {
  code: string;
  maxWeeklyHours: number;
  maxDailyHours: number;
  maxAnnualHours: number;
  minRestBetweenShifts: number;
  minWeeklyRest: number;
  breakAfterHours: number;
  breakMinutes: number;
  nightPremiumStart: string;
  nightPremiumEnd: string;
  nightPremiumRate: number;
}

export const DEFAULT_CONVENIO: ConvenioRules = {
  code: '30000805011981',
  maxWeeklyHours: 40,
  maxDailyHours: 9,
  maxAnnualHours: 1822,
  minRestBetweenShifts: 12,
  minWeeklyRest: 1.5,
  breakAfterHours: 6,
  breakMinutes: 15,
  nightPremiumStart: '22:00',
  nightPremiumEnd: '06:00',
  nightPremiumRate: 1.25,
};

// ============================================
// CONSTANTS
// ============================================

export const SUPPORTED_LOCALES = ['es', 'en', 'fr', 'de', 'pl', 'nl-BE'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_TIMEZONE = 'Europe/Madrid';
export const DEFAULT_LOCALE: SupportedLocale = 'es';

export const DATA_RETENTION_YEARS = 5;
