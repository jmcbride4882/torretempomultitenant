import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

enum ReportType {
  MONTHLY_EMPLOYEE = 'MONTHLY_EMPLOYEE',
  MONTHLY_COMPANY = 'MONTHLY_COMPANY',
  COMPLIANCE_EXPORT = 'COMPLIANCE_EXPORT',
}

interface Report {
  id: string;
  type: ReportType;
  period: string;
  fileHash: string | null;
  generatedAt: string;
  signatures: Array<{
    id: string;
    userId: string;
    acknowledgedAt: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

export function ReportsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [type, setType] = useState<ReportType>(ReportType.MONTHLY_EMPLOYEE);
  const [period, setPeriod] = useState('');
  const [userId, setUserId] = useState('');

  // Fetch reports
  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ['reports'],
    queryFn: async () => {
      const response = await api.get<Report[]>('/reports');
      return response;
    },
  });

  // Fetch users for employee dropdown
  const { data: usersResponse } = useQuery<{ users: Array<{ id: string; firstName: string; lastName: string; email: string }>; total: number; page: number; pageSize: number }>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<{ users: Array<{ id: string; firstName: string; lastName: string; email: string }>; total: number; page: number; pageSize: number }>('/users');
      return response;
    },
  });

  const users = usersResponse?.users;

  // Generate report mutation
  const generateMutation = useMutation({
    mutationFn: async (data: { type: ReportType; period: string; userId?: string }) => {
      return api.post('/reports/generate', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setShowGenerateForm(false);
      setPeriod('');
      setUserId('');
    },
  });

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate({
      type,
      period,
      userId: type === ReportType.MONTHLY_EMPLOYEE ? userId : undefined,
    });
  };

  const handleDownloadPDF = async (reportId: string) => {
    try {
      const response = await api.get<Blob>(`/reports/${reportId}/pdf`);
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  const handleDownloadCSV = async (reportId: string) => {
    try {
      const response = await api.get<Blob>(`/reports/${reportId}/csv`);
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download CSV:', error);
    }
  };

  const handleDownloadXLSX = async (reportId: string) => {
    try {
      const response = await api.get<Blob>(`/reports/${reportId}/xlsx`);
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download XLSX:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('reports.title')}</h1>
        <button
          onClick={() => setShowGenerateForm(!showGenerateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t('reports.generateReport')}
        </button>
      </div>

      {/* Generate Report Form */}
      {showGenerateForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t('reports.generateReport')}</h2>
          <form onSubmit={handleGenerateReport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('reports.type')}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value={ReportType.MONTHLY_EMPLOYEE}>{t('reports.monthlyEmployee')}</option>
                <option value={ReportType.MONTHLY_COMPANY}>{t('reports.monthlyCompany')}</option>
                <option value={ReportType.COMPLIANCE_EXPORT}>{t('reports.complianceExport')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('reports.period')}
              </label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">{t('reports.periodFormat')}</p>
            </div>

            {type === ReportType.MONTHLY_EMPLOYEE && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('reports.employee')}
                </label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">{t('reports.selectEmployee')}</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={generateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {generateMutation.isPending ? t('common.loading') : t('common.submit')}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerateForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {!reports || reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{t('reports.noReports')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reports.type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reports.period')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reports.generatedAt')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reports.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {t(`reports.${report.type.toLowerCase()}`)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(report.generatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          report.signatures.length > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {report.signatures.length > 0
                          ? t('reports.signed')
                          : t('reports.unsigned')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadPDF(report.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {t('reports.downloadPDF')}
                        </button>
                        <button
                          onClick={() => handleDownloadCSV(report.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {t('reports.downloadCSV')}
                        </button>
                        <button
                          onClick={() => handleDownloadXLSX(report.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {t('reports.downloadXLSX')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
