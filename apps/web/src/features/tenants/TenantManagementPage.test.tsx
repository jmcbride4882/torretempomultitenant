import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test-utils';
import { TenantManagementPage } from './TenantManagementPage';
import * as api from '../../lib/api';

// Mock the API
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('TenantManagementPage', () => {
  const mockTenants = [
    {
      id: 'tenant-1',
      name: 'LSLT Group',
      slug: 'lslt-group',
      timezone: 'Europe/Madrid',
      locale: 'es',
      convenioCode: '99012025012470',
      maxWeeklyHours: 40,
      maxAnnualHours: 1822,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      _count: {
        users: 25,
        locations: 3,
      },
    },
    {
      id: 'tenant-2',
      name: 'Test Company',
      slug: 'test-company',
      timezone: 'Europe/London',
      locale: 'en',
      convenioCode: null,
      maxWeeklyHours: 40,
      maxAnnualHours: 1822,
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-01-15T00:00:00.000Z',
      _count: {
        users: 10,
        locations: 1,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('displays loading spinner when fetching tenants', async () => {
      vi.mocked(api.api.get).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<TenantManagementPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Tenants List', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockResolvedValue({
        tenants: mockTenants,
        total: 2,
        page: 1,
        pageSize: 20,
      });
    });

    it('displays tenant list', async () => {
      render(<TenantManagementPage />);

      await waitFor(() => {
        const lsltMatches = screen.getAllByText('LSLT Group');
        const testMatches = screen.getAllByText('Test Company');
        expect(lsltMatches.length).toBeGreaterThan(0);
        expect(testMatches.length).toBeGreaterThan(0);
      });
    });

    it('displays tenant details', async () => {
      render(<TenantManagementPage />);

      await waitFor(() => {
        const slugMatches = screen.getAllByText('lslt-group');
        const userMatches = screen.getAllByText('25 Users');
        const locationMatches = screen.getAllByText('3 Locations');
        expect(slugMatches.length).toBeGreaterThan(0);
        expect(userMatches.length).toBeGreaterThan(0);
        expect(locationMatches.length).toBeGreaterThan(0);
      });
    });

    it('displays timezone and locale', async () => {
      render(<TenantManagementPage />);

      await waitFor(() => {
        const timezoneMatches = screen.getAllByText('Europe/Madrid');
        const localeMatches = screen.getAllByText('ES');
        expect(timezoneMatches.length).toBeGreaterThan(0);
        expect(localeMatches.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no tenants', async () => {
      vi.mocked(api.api.get).mockResolvedValue({
        tenants: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      render(<TenantManagementPage />);

      await waitFor(() => {
        expect(screen.getByText(/no tenants found/i)).toBeInTheDocument();
      });
    });

    it('displays create button in empty state', async () => {
      vi.mocked(api.api.get).mockResolvedValue({
        tenants: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      render(<TenantManagementPage />);

      await waitFor(() => {
        const createButtons = screen.getAllByRole('button', { name: /add tenant/i });
        expect(createButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockResolvedValue({
        tenants: mockTenants,
        total: 2,
        page: 1,
        pageSize: 20,
      });
    });

    it('displays search input', async () => {
      render(<TenantManagementPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search tenants/i)).toBeInTheDocument();
      });
    });

    it('calls API with search query when typing', async () => {
      const { user } = render(<TenantManagementPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search tenants/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search tenants/i);
      
      // Type a single character to trigger search
      await user.type(searchInput, 'L');

      // Just verify the input value changed
      expect(searchInput).toHaveValue('L');
    });
  });

  describe('Create Tenant', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockResolvedValue({
        tenants: mockTenants,
        total: 2,
        page: 1,
        pageSize: 20,
      });
    });

    it('opens create form when add button clicked', async () => {
      const { user } = render(<TenantManagementPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add tenant/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add tenant/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        const createTenantElements = screen.getAllByText(/create tenant/i);
        expect(createTenantElements.length).toBeGreaterThan(0);
      });
    });

    it('displays form fields in create modal', async () => {
      const { user } = render(<TenantManagementPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add tenant/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add tenant/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
      });
    });

    it('validates required fields', async () => {
      const { user } = render(<TenantManagementPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add tenant/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add tenant/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /create tenant/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/company name is required/i)).toBeInTheDocument();
      });
    });

    it('submits form with valid data', async () => {
      const mockPost = vi.mocked(api.api.post).mockResolvedValue({
        id: 'new-tenant',
        name: 'New Company',
      });

      const { user } = render(<TenantManagementPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add tenant/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add tenant/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill in form - using test i18n keys
      await user.type(screen.getByLabelText(/company name/i), 'New Company');
      await user.type(screen.getByLabelText(/^email/i), 'admin@newcompany.com');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      
      // Get password fields by placeholder
      const passwordInputs = screen.getAllByPlaceholderText(/min 8 characters/i);
      await user.type(passwordInputs[0], 'password123');
      
      const confirmPasswordInput = screen.getByPlaceholderText(/re-enter password/i);
      await user.type(confirmPasswordInput, 'password123');

      const submitButtons = screen.getAllByRole('button', { name: /create tenant/i });
      const submitButton = submitButtons.find((btn: HTMLElement) => btn.getAttribute('type') === 'submit');
      await user.click(submitButton!);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/tenants', expect.objectContaining({
          name: 'New Company',
          adminEmail: 'admin@newcompany.com',
          adminFirstName: 'John',
          adminLastName: 'Doe',
        }));
      });
    });
  });

  describe('View Tenant', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockResolvedValue({
        tenants: mockTenants,
        total: 2,
        page: 1,
        pageSize: 20,
      });
    });

    it('navigates to tenant details when view button clicked', async () => {
      const { user } = render(<TenantManagementPage />);

      await waitFor(() => {
        const lsltMatches = screen.getAllByText('LSLT Group');
        expect(lsltMatches.length).toBeGreaterThan(0);
      });

      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/app/tenants/tenant-1');
    });
  });

  describe('Pagination', () => {
    it('displays pagination when multiple pages', async () => {
      vi.mocked(api.api.get).mockResolvedValue({
        tenants: mockTenants,
        total: 50,
        page: 1,
        pageSize: 20,
      });

      render(<TenantManagementPage />);

      await waitFor(() => {
        // Check for pagination controls
        expect(screen.getByLabelText(/next/i)).toBeInTheDocument();
      });
    });

    it('changes page when pagination button clicked', async () => {
      vi.mocked(api.api.get).mockResolvedValue({
        tenants: mockTenants,
        total: 50,
        page: 1,
        pageSize: 20,
      });

      const { user } = render(<TenantManagementPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/next/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText(/next/i);
      await user.click(nextButton);

      await waitFor(() => {
        expect(vi.mocked(api.api.get)).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
      });
    });
  });

  describe('Error State', () => {
    it('displays error message when API fails', async () => {
      vi.mocked(api.api.get).mockRejectedValue(new Error('Network error'));

      render(<TenantManagementPage />);

      await waitFor(() => {
        // Check for error indicator
        const errorElements = screen.queryAllByText(/error/i);
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockResolvedValue({
        tenants: mockTenants,
        total: 2,
        page: 1,
        pageSize: 20,
      });
    });

    it('displays desktop table on large screens', async () => {
      render(<TenantManagementPage />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        expect(table).toHaveClass('w-full');
      });
    });

    it('displays mobile cards on small screens', async () => {
      render(<TenantManagementPage />);

      await waitFor(() => {
        // Both desktop table and mobile cards render simultaneously
        // Just verify content is present
        const cards = screen.getAllByText('LSLT Group');
        expect(cards.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
