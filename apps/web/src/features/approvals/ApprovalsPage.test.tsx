import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test-utils';
import { ApprovalsPage } from './ApprovalsPage';
import * as api from '../../lib/api';

// Mock the API
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ApprovalsPage', () => {
  const mockRequests = [
    {
      id: 'req-1',
      fieldName: 'clockIn',
      oldValue: '2024-01-15T09:00:00.000Z',
      newValue: '2024-01-15T09:15:00.000Z',
      reason: 'Forgot to clock in on time',
      status: 'PENDING' as const,
      createdAt: '2024-01-15T10:00:00.000Z',
      timeEntry: {
        id: 'entry-1',
        clockIn: '2024-01-15T09:00:00.000Z',
        clockOut: '2024-01-15T17:00:00.000Z',
      },
      requestedBy: {
        id: 'user-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('displays loading message when fetching requests', async () => {
      vi.mocked(api.api.get).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ApprovalsPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays no requests message when no requests available', async () => {
      vi.mocked(api.api.get).mockResolvedValue({
        requests: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });

      render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no approval requests/i)).toBeInTheDocument();
      });
    });
  });

  describe('Requests List', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockResolvedValue({
        requests: mockRequests,
        total: 1,
        page: 1,
        pageSize: 10,
      });
    });

    it('displays approval requests', async () => {
      render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('displays request details', async () => {
      render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText(/forgot to clock in on time/i)).toBeInTheDocument();
      });
    });

    it('displays status badge', async () => {
      render(<ApprovalsPage />);

      await waitFor(() => {
        const pendingElements = screen.getAllByText(/pending/i);
        const statusBadge = pendingElements.find((el: HTMLElement) => 
          el.className.includes('bg-yellow-100')
        );
        expect(statusBadge).toBeDefined();
        expect(statusBadge).toHaveClass('bg-yellow-100');
      });
    });

    it('displays approve and reject buttons for pending requests', async () => {
      render(<ApprovalsPage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const approveButton = buttons.find((btn: HTMLElement) => 
          btn.textContent?.match(/^Approve$/i) && !btn.textContent?.match(/Approved/i)
        );
        const rejectButton = buttons.find((btn: HTMLElement) => 
          btn.textContent?.match(/^Reject$/i) && !btn.textContent?.match(/Rejected/i)
        );
        expect(approveButton).toBeDefined();
        expect(rejectButton).toBeDefined();
      });
    });
  });

  describe('Status Filter', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockResolvedValue({
        requests: mockRequests,
        total: 1,
        page: 1,
        pageSize: 10,
      });
    });

    it('displays filter buttons', async () => {
      render(<ApprovalsPage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const filterButtons = buttons.filter((btn: HTMLElement) => 
          btn.textContent?.match(/^(Pending|Approved|Rejected)$/i)
        );
        expect(filterButtons.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('changes filter when clicked', async () => {
      const mockGet = vi.mocked(api.api.get);
      const { user } = render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const approvedButton = buttons.find((btn: HTMLElement) => 
        btn.textContent?.match(/^Approved$/i)
      );
      expect(approvedButton).toBeDefined();
      
      await user.click(approvedButton!);

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('status=APPROVED'));
    });
  });

  describe('Approve Request', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockResolvedValue({
        requests: mockRequests,
        total: 1,
        page: 1,
        pageSize: 10,
      });
      vi.mocked(api.api.post).mockResolvedValue({});
      
      // Mock window.confirm to always return true
      global.confirm = vi.fn(() => true);
    });

    it('calls API when approve button is clicked', async () => {
      const mockPost = vi.mocked(api.api.post);
      const { user } = render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const approveButton = buttons.find((btn: HTMLElement) => 
        btn.textContent?.match(/^Approve$/i)
      );
      expect(approveButton).toBeDefined();
      
      await user.click(approveButton!);

      expect(global.confirm).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalledWith(
        '/approvals/edit-requests/req-1/approve',
        expect.any(Object)
      );
    });

    it('does not call API if confirm is cancelled', async () => {
      global.confirm = vi.fn(() => false);
      const mockPost = vi.mocked(api.api.post);
      const { user } = render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const approveButton = buttons.find((btn: HTMLElement) => 
        btn.textContent?.match(/^Approve$/i)
      );
      expect(approveButton).toBeDefined();
      
      await user.click(approveButton!);

      expect(global.confirm).toHaveBeenCalled();
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('Reject Request', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockResolvedValue({
        requests: mockRequests,
        total: 1,
        page: 1,
        pageSize: 10,
      });
      vi.mocked(api.api.post).mockResolvedValue({});
      
      // Mock window.confirm to always return true
      global.confirm = vi.fn(() => true);
    });

    it('calls API when reject button is clicked', async () => {
      const mockPost = vi.mocked(api.api.post);
      const { user } = render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const rejectButton = buttons.find((btn: HTMLElement) => 
        btn.textContent?.match(/^Reject$/i)
      );
      expect(rejectButton).toBeDefined();
      
      await user.click(rejectButton!);

      expect(global.confirm).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalledWith(
        '/approvals/edit-requests/req-1/reject',
        expect.any(Object)
      );
    });
  });

  describe('Review Comment', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockResolvedValue({
        requests: mockRequests,
        total: 1,
        page: 1,
        pageSize: 10,
      });
      vi.mocked(api.api.post).mockResolvedValue({});
      global.confirm = vi.fn(() => true);
    });

    it('allows entering review comment', async () => {
      const { user } = render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/review comment/i)).toBeInTheDocument();
      });

      const commentInput = screen.getByPlaceholderText(/review comment/i);
      await user.type(commentInput, 'Approved - looks good');

      expect(commentInput).toHaveValue('Approved - looks good');
    });

    it('includes comment in API call when approving', async () => {
      const mockPost = vi.mocked(api.api.post);
      const { user } = render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/review comment/i)).toBeInTheDocument();
      });

      const commentInput = screen.getByPlaceholderText(/review comment/i);
      await user.type(commentInput, 'Test comment');

      const buttons = screen.getAllByRole('button');
      const approveButton = buttons.find((btn: HTMLElement) => 
        btn.textContent?.match(/^Approve$/i)
      );
      expect(approveButton).toBeDefined();
      
      await user.click(approveButton!);

      expect(mockPost).toHaveBeenCalledWith(
        '/approvals/edit-requests/req-1/approve',
        { approvalNote: 'Test comment' }
      );
    });
  });

  describe('Approved/Rejected Requests', () => {
    const approvedRequest = {
      ...mockRequests[0],
      status: 'APPROVED' as const,
      approvedById: 'manager-1',
      approvedAt: '2024-01-15T11:00:00.000Z',
      approvalNote: 'Approved - valid reason',
      approvedBy: {
        id: 'manager-1',
        email: 'manager@example.com',
        firstName: 'Jane',
        lastName: 'Manager',
      },
    };

    it('displays approved status badge', async () => {
      vi.mocked(api.api.get).mockResolvedValue({
        requests: [approvedRequest],
        total: 1,
        page: 1,
        pageSize: 10,
      });

      render(<ApprovalsPage />);

      await waitFor(() => {
        const approvedElements = screen.getAllByText(/approved/i);
        const statusBadge = approvedElements.find((el: HTMLElement) => 
          el.className.includes('bg-green-100')
        );
        expect(statusBadge).toBeDefined();
        expect(statusBadge).toHaveClass('bg-green-100');
      });
    });

    it('displays reviewer information for approved requests', async () => {
      vi.mocked(api.api.get).mockResolvedValue({
        requests: [approvedRequest],
        total: 1,
        page: 1,
        pageSize: 10,
      });

      render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane Manager')).toBeInTheDocument();
      });
    });

    it('displays approval note', async () => {
      vi.mocked(api.api.get).mockResolvedValue({
        requests: [approvedRequest],
        total: 1,
        page: 1,
        pageSize: 10,
      });

      render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText(/approved - valid reason/i)).toBeInTheDocument();
      });
    });

    it('does not display approve/reject buttons for approved requests', async () => {
      vi.mocked(api.api.get).mockResolvedValue({
        requests: [approvedRequest],
        total: 1,
        page: 1,
        pageSize: 10,
      });

      render(<ApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane Manager')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const actionButtons = buttons.filter((btn: HTMLElement) => 
        btn.textContent?.match(/^(Approve|Reject)$/i)
      );
      expect(actionButtons.length).toBe(0);
    });
  });
});
