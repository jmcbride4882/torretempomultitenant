import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

interface EditRequestFormProps {
  timeEntryId: string;
  currentValue: string;
  fieldName: 'clockIn' | 'clockOut' | 'breakMinutes' | 'locationId';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditRequestForm({
  timeEntryId,
  currentValue,
  fieldName,
  onSuccess,
  onCancel,
}: EditRequestFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post('/approvals/edit-requests', {
        timeEntryId,
        fieldName,
        newValue,
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue || !reason) return;
    createMutation.mutate();
  };

  const getInputType = () => {
    if (fieldName === 'clockIn' || fieldName === 'clockOut') {
      return 'datetime-local';
    }
    if (fieldName === 'breakMinutes') {
      return 'number';
    }
    return 'text';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {t('approvals.createEditRequest')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Field Being Edited */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('approvals.fieldName')}
          </label>
          <input
            type="text"
            value={t(`approvals.fields.${fieldName}`)}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
          />
        </div>

        {/* Current Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('approvals.oldValue')}
          </label>
          <input
            type="text"
            value={currentValue}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
          />
        </div>

        {/* New Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('approvals.newValue')} <span className="text-red-500">*</span>
          </label>
          <input
            type={getInputType()}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            required
            min={fieldName === 'breakMinutes' ? 0 : undefined}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('approvals.requestReason')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('approvals.requestReason')}
          />
        </div>

        {/* Error Message */}
        {createMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            {createMutation.error?.message || t('common.error')}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending || !newValue || !reason}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            {createMutation.isPending ? t('common.loading') : t('common.submit')}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={createMutation.isPending}
              className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
