import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import userEvent from '@testing-library/user-event';

// Create a test i18n instance
const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['translation'],
  defaultNS: 'translation',
  resources: {
    en: {
      translation: {
        // Common translations used in tests
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.close': 'Close',
        'common.cancel': 'Cancel',
        'common.next': 'Next',
        'common.back': 'Back',
        'clocking.title': 'Clock In/Out',
        'clocking.clockIn': 'Clock In',
        'clocking.clockOut': 'Clock Out',
        'clocking.clockedIn': 'Clocked In',
        'clocking.clockedOut': 'Clocked Out',
        'clocking.status': 'Status',
        'clocking.timeElapsed': 'Time Elapsed',
        'clocking.clockInTime': 'Clock In Time',
        'clocking.location': 'Location',
        'clocking.recentEntries': 'Recent Entries',
        'clocking.offlineMode': 'Offline Mode',
        'clocking.pendingSync': '{{count}} pending sync',
        'clocking.getLocation': 'Get Location',
        'clocking.elapsedTime': 'Elapsed Time: {{time}}',
        'clocking.locationTimeout': 'Location request timed out',
        'clocking.locationUnavailable': 'Location unavailable',
        'clock.success.clockIn': 'Clocked in successfully',
        'clock.success.clockOut': 'Clocked out successfully',
        'clock.error.alreadyClockedIn': 'Already clocked in',
        'clock.error.notClockedIn': 'Not clocked in',
        'clock.error.geofence': 'Outside allowed area',
        'clock.error.qrInvalid': 'Invalid QR code',
        'locations.scanQR': 'Scan QR Code',
        'locations.gpsPermissionRequired': 'GPS permission required',
        'locations.gpsPermissionDenied': 'GPS permission denied',
        'locations.gettingLocation': 'Getting location...',
        'locations.insideGeofence': 'Inside geofence',
        'qr.validCode': 'Valid QR code',
        'entries.noEntries': 'No entries',
        'entries.clockIn': 'Clock In',
        'entries.clockOut': 'Clock Out',
        'entries.duration': 'minutes',
        'entries.location': 'Location',
        'approvals.title': 'Approvals',
        'approvals.pending': 'Pending',
        'approvals.approved': 'Approved',
        'approvals.rejected': 'Rejected',
        'approvals.noRequests': 'No approval requests',
        'approvals.approve': 'Approve',
        'approvals.reject': 'Reject',
        'approvals.approveConfirm': 'Approve this request?',
        'approvals.rejectConfirm': 'Reject this request?',
        'approvals.reviewComment': 'Review comment (optional)',
        'approvals.fieldName': 'Field',
        'approvals.oldValue': 'Old Value',
        'approvals.newValue': 'New Value',
        'approvals.requestReason': 'Reason',
        'approvals.reviewedBy': 'Reviewed By',
        'approvals.reviewedAt': 'Reviewed At',
        'approvals.fields.clockIn': 'Clock In',
        'approvals.fields.clockOut': 'Clock Out',
        'approvals.fields.breakMinutes': 'Break Minutes',
        'tenants.title': 'Tenant Management',
        'tenants.create': 'Create Tenant',
        'tenants.addTenant': 'Add Tenant',
        'tenants.add': 'Add',
        'tenants.viewDetails': 'View Details',
        'tenants.noTenants': 'No tenants',
        'tenants.noTenantsFound': 'No tenants found',
        'tenants.noTenantsDescription': 'Get started by creating your first tenant',
        'tenants.totalCount': '{{count}} tenants',
        'tenants.searchPlaceholder': 'Search tenants...',
        'tenants.company': 'Company',
        'tenants.companyName': 'Company Name',
        'tenants.companyNamePlaceholder': 'Enter company name',
        'tenants.companyInfo': 'Company Information',
        'tenants.slug': 'Slug',
        'tenants.users': 'Users',
        'tenants.locations': 'Locations',
        'tenants.timezone': 'Timezone',
        'tenants.locale': 'Language',
        'tenants.createdAt': 'Created',
        'tenants.actions': 'Actions',
        'tenants.createTenant': 'Create Tenant',
        'tenants.createSuccess': 'Tenant created successfully',
        'tenants.createError': 'Failed to create tenant',
        'tenants.laborLawSettings': 'Labor Law Settings',
        'tenants.convenioCode': 'Convenio Code',
        'tenants.convenioCodePlaceholder': 'e.g., 99012025012470',
        'tenants.convenioCodeHint': 'Spanish collective agreement code',
        'tenants.maxWeeklyHours': 'Max Weekly Hours',
        'tenants.maxWeeklyHoursPlaceholder': '40',
        'tenants.maxAnnualHours': 'Max Annual Hours',
        'tenants.maxAnnualHoursPlaceholder': '1822',
        'tenants.adminAccount': 'Admin Account',
        'tenants.adminAccountHint': 'Create an admin user for this tenant',
        'tenants.adminFirstName': 'First Name',
        'tenants.adminFirstNamePlaceholder': 'John',
        'tenants.adminLastName': 'Last Name',
        'tenants.adminLastNamePlaceholder': 'Doe',
        'tenants.adminEmail': 'Email',
        'tenants.adminEmailPlaceholder': 'admin@company.com',
        'tenants.adminPassword': 'Password',
        'tenants.adminPasswordPlaceholder': 'Min 8 characters',
        'tenants.confirmPassword': 'Confirm Password',
        'tenants.confirmPasswordPlaceholder': 'Re-enter password',
        'tenants.passwordHint': 'Minimum 8 characters',
        'tenants.validation.nameRequired': 'Company name is required',
        'tenants.validation.emailRequired': 'Email is required',
        'tenants.validation.emailInvalid': 'Email is invalid',
        'tenants.validation.passwordRequired': 'Password is required',
        'tenants.validation.passwordMinLength': 'Password must be at least 8 characters',
        'tenants.validation.passwordMismatch': 'Passwords do not match',
        'tenants.validation.firstNameRequired': 'First name is required',
        'tenants.validation.lastNameRequired': 'Last name is required',
        'tenants.validation.maxWeeklyHoursRange': 'Must be between 1 and 168',
        'tenants.validation.maxAnnualHoursRange': 'Must be between 1 and 8760',
        'tenants.pagination': 'Showing {{start}} to {{end}} of {{total}}',
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

// Create a new QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps components with all necessary providers
 */
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    initialEntries = ['/'],
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  const Router = initialEntries.length > 0 ? MemoryRouter : BrowserRouter;
  const routerProps = initialEntries.length > 0 ? { initialEntries } : {};

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Router {...routerProps}>
          <I18nextProvider i18n={testI18n}>
            {children}
          </I18nextProvider>
        </Router>
      </QueryClientProvider>
    );
  }

  return {
    user: userEvent.setup(),
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { customRender as render, createTestQueryClient };
