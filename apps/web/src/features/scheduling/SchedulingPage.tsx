import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ShiftEditor } from './ShiftEditor';
import { ScheduleCalendar } from './ScheduleCalendar';

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

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Schedule {
  id: string;
  date: string;
  user: User;
  shift: Shift;
  location?: {
    id: string;
    name: string;
  };
  isPublished: boolean;
}

export function SchedulingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showShiftEditor, setShowShiftEditor] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | undefined>();
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [error, setError] = useState('');

  // Fetch shifts
  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: () => api.get('/scheduling/shifts'),
  });

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations'),
  });

  // Fetch users (employees)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/auth/users'),
  });

  // Fetch schedules
  const { data: schedules = [] } = useQuery<Schedule[]>({
    queryKey: ['schedules'],
    queryFn: () => api.get('/scheduling/schedules'),
  });

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: (data: {
      name: string;
      startTime: string;
      endTime: string;
      breakMins: number;
      locationId?: string;
    }) => api.post('/scheduling/shifts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowShiftEditor(false);
      setEditingShift(undefined);
    },
  });

  // Update shift mutation
  const updateShiftMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        startTime?: string;
        endTime?: string;
        breakMins?: number;
        locationId?: string;
      };
    }) => api.patch(`/scheduling/shifts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowShiftEditor(false);
      setEditingShift(undefined);
    },
  });

  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/scheduling/shifts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: (data: {
      userId: string;
      shiftId: string;
      date: string;
      locationId?: string;
    }) => api.post('/scheduling/schedules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setSelectedEmployee('');
      setSelectedShift('');
      setSelectedDate('');
      setSelectedLocation('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create schedule');
    },
  });

  // Publish schedule mutation
  const publishScheduleMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/scheduling/schedules/${id}/publish`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/scheduling/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const handleCreateShift = () => {
    setEditingShift(undefined);
    setShowShiftEditor(true);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShowShiftEditor(true);
  };

  const handleSaveShift = (data: {
    name: string;
    startTime: string;
    endTime: string;
    breakMins: number;
    locationId?: string;
  }) => {
    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, data });
    } else {
      createShiftMutation.mutate(data);
    }
  };

  const handleDeleteShift = (id: string) => {
    if (window.confirm(t('scheduling.deleteShiftConfirm'))) {
      deleteShiftMutation.mutate(id);
    }
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedEmployee) {
      setError(t('scheduling.employeeRequired'));
      return;
    }

    if (!selectedShift) {
      setError(t('scheduling.shiftRequired'));
      return;
    }

    if (!selectedDate) {
      setError(t('scheduling.dateRequired'));
      return;
    }

    createScheduleMutation.mutate({
      userId: selectedEmployee,
      shiftId: selectedShift,
      date: selectedDate,
      locationId: selectedLocation || undefined,
    });
  };

  const handlePublishSchedule = (id: string) => {
    if (window.confirm(t('scheduling.publishConfirm'))) {
      publishScheduleMutation.mutate(id);
    }
  };

  const handleDeleteSchedule = (id: string) => {
    if (window.confirm(t('scheduling.deleteScheduleConfirm'))) {
      deleteScheduleMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t('scheduling.title')}
        </h1>

        {/* Shifts Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('scheduling.shifts')}
            </h2>
            <button
              onClick={handleCreateShift}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('scheduling.createShift')}
            </button>
          </div>

          {shifts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {t('scheduling.noShifts')}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shifts
                .filter((s) => s.isActive)
                .map((shift) => (
                  <div
                    key={shift.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {shift.name}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditShift(shift)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {shift.startTime} - {shift.endTime}
                    </p>
                    {shift.breakMins > 0 && (
                      <p className="text-sm text-gray-500">
                        {t('scheduling.breakMinutes')}: {shift.breakMins}
                      </p>
                    )}
                    {shift.location && (
                      <p className="text-sm text-gray-500">
                        {shift.location.name}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Schedule Assignment Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('scheduling.assignShift')}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateSchedule} className="grid sm:grid-cols-5 gap-4">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">{t('scheduling.selectEmployee')}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>

            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">{t('scheduling.selectShift')}</option>
              {shifts
                .filter((s) => s.isActive)
                .map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name}
                  </option>
                ))}
            </select>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('scheduling.noLocation')}</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('scheduling.assignShift')}
            </button>
          </form>
        </div>

        {/* Calendar View */}
        <ScheduleCalendar
          schedules={schedules}
          onScheduleClick={(schedule) => {
            if (!schedule.isPublished) {
              handlePublishSchedule(schedule.id);
            }
          }}
        />

        {/* Schedules List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('scheduling.schedules')}
          </h2>

          {schedules.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {t('scheduling.noSchedules')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      {t('scheduling.employee')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      {t('scheduling.shift')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      {t('scheduling.date')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      {t('scheduling.status')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      {t('common.edit')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {schedule.user.firstName} {schedule.user.lastName}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {schedule.shift.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {new Date(schedule.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {schedule.isPublished ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {t('scheduling.published')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {t('scheduling.draft')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex gap-2">
                          {!schedule.isPublished && (
                            <button
                              onClick={() => handlePublishSchedule(schedule.id)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              {t('scheduling.publish')}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            {t('common.delete')}
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

      {/* Shift Editor Modal */}
      {showShiftEditor && (
        <ShiftEditor
          shift={editingShift}
          locations={locations}
          onSave={handleSaveShift}
          onCancel={() => {
            setShowShiftEditor(false);
            setEditingShift(undefined);
          }}
        />
      )}
    </div>
  );
}
