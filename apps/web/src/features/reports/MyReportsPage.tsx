import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { SignatureCanvas } from './SignatureCanvas';

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
  }>;
}

export function MyReportsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [signingReportId, setSigningReportId] = useState<string | null>(null);

  // Fetch my reports
  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ['my-reports'],
    queryFn: async () => {
      const response = await api.get<Report[]>('/reports/my/reports');
      return response;
    },
  });

  // Sign report mutation
  const signMutation = useMutation({
    mutationFn: async (data: { reportId: string; imageBase64: string }) => {
      return api.post(`/reports/${data.reportId}/sign`, {
        imageBase64: data.imageBase64,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reports'] });
      setSigningReportId(null);
    },
  });

  const handleSignReport = (signatureBase64: string) => {
    if (signingReportId) {
      signMutation.mutate({
        reportId: signingReportId,
        imageBase64: signatureBase64,
      });
    }
  };

  const handleDownloadPDF = (reportId: string) => {
    window.open(`/api/reports/${reportId}/pdf`, '_blank');
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
      <h1 className="text-3xl font-bold mb-6">{t('reports.myReports')}</h1>

      {/* Reports List */}
      <div className="grid gap-4">
        {!reports || reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            {t('reports.noReports')}
          </div>
        ) : (
          reports.map((report) => {
            const isSigned = report.signatures.length > 0;
            const isCurrentlySigning = signingReportId === report.id;

            return (
              <div key={report.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {t('reports.monthlyReport')} - {report.period}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {t('reports.generatedAt')}: {new Date(report.generatedAt).toLocaleString()}
                    </p>
                    {isSigned && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {t('reports.signed')} - {' '}
                        {new Date(report.signatures[0].acknowledgedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      isSigned
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {isSigned ? t('reports.signed') : t('reports.unsigned')}
                  </span>
                </div>

                {/* Signature Section */}
                {!isSigned && !isCurrentlySigning && (
                  <div className="mt-4">
                    <button
                      onClick={() => setSigningReportId(report.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {t('reports.signReport')}
                    </button>
                  </div>
                )}

                {isCurrentlySigning && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">{t('reports.signature')}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('reports.signatureInstructions')}
                    </p>
                    <SignatureCanvas
                      onSave={handleSignReport}
                      onCancel={() => setSigningReportId(null)}
                    />
                    {signMutation.isError && (
                      <p className="text-red-600 text-sm mt-2">
                        {t('reports.signatureError')}
                      </p>
                    )}
                  </div>
                )}

                {/* Download Button */}
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => handleDownloadPDF(report.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    📄 {t('reports.downloadPDF')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
