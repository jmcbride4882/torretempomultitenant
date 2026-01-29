import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMins: number;
  locationId?: string;
  location?: {
    id: string;
    name: string;
  };
  isActive: boolean;
}

interface Location {
  id: string;
  name: string;
}

interface ShiftEditorProps {
  shift?: Shift;
  locations: Location[];
  onSave: (data: {
    name: string;
    startTime: string;
    endTime: string;
    breakMins: number;
    locationId?: string;
  }) => void;
  onCancel: () => void;
}

export function ShiftEditor({
  shift,
  locations,
  onSave,
  onCancel,
}: ShiftEditorProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(shift?.name || '');
  const [startTime, setStartTime] = useState(shift?.startTime || '09:00');
  const [endTime, setEndTime] = useState(shift?.endTime || '17:00');
  const [breakMins, setBreakMins] = useState(shift?.breakMins || 0);
  const [locationId, setLocationId] = useState(shift?.locationId || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (shift) {
      setName(shift.name);
      setStartTime(shift.startTime);
      setEndTime(shift.endTime);
      setBreakMins(shift.breakMins);
      setLocationId(shift.locationId || '');
    }
  }, [shift]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError(t('scheduling.shiftNameRequired'));
      return;
    }

    if (!startTime || !endTime) {
      setError(t('scheduling.timeRequired'));
      return;
    }

    // Check if end time is after start time (handle overnight shifts)
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes && endHour <= startHour) {
      setError(t('scheduling.invalidTimeRange'));
      return;
    }

    onSave({
      name: name.trim(),
      startTime,
      endTime,
      breakMins,
      locationId: locationId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {shift ? t('scheduling.editShift') : t('scheduling.createShift')}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Shift Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('scheduling.shiftName')} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Morning Shift"
                required
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('scheduling.startTime')} *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('scheduling.timeFormat')}
              </p>
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('scheduling.endTime')} *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Break Minutes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('scheduling.breakMinutes')}
              </label>
              <input
                type="number"
                min="0"
                step="15"
                value={breakMins}
                onChange={(e) => setBreakMins(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="30"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('scheduling.location')}
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('scheduling.noLocation')}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
