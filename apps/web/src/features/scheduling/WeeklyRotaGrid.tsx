import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { DroppableTimeSlot } from './DroppableTimeSlot';
import { DraggableShiftCard } from './DraggableShiftCard';
import { ShiftCard, ComplianceCheckResult } from './ShiftCard';
import { api } from '@/lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMins: number;
  isActive: boolean;
}

interface Location {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  date: string;
  userId: string | null;
  shiftId: string;
  user?: User;
  shift: Shift;
  isPublished: boolean;
  locationId?: string;
  location?: Location;
}

interface ComplianceBatchResult extends ComplianceCheckResult {
  userId: string;
}

type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'GLOBAL_ADMIN';

interface WeeklyRotaGridProps {
  weekStart: Date;
  users: User[];
  schedules: Schedule[];
  openShifts?: Schedule[];
  currentUserRole?: UserRole;
  onScheduleUpdate: (scheduleId: string, newUserId: string, newDate: string) => void;
  onPublishSchedules: (scheduleIds: string[]) => void;
  onAcceptShift?: (scheduleId: string) => void;
}

export function WeeklyRotaGrid({
  weekStart,
  users,
  schedules,
  openShifts = [],
  currentUserRole,
  onScheduleUpdate,
  onPublishSchedules,
  onAcceptShift,
}: WeeklyRotaGridProps) {
  const { t } = useTranslation();
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set());

  // Get unique user IDs from schedules for compliance check
  const userIdsWithSchedules = useMemo(() => {
    const ids = new Set(schedules.map((s) => s.userId));
    return Array.from(ids);
  }, [schedules]);

  // Fetch compliance data for all users with schedules
  const { data: complianceData, isLoading: complianceLoading } = useQuery<ComplianceBatchResult[]>({
    queryKey: ['compliance-batch', userIdsWithSchedules],
    queryFn: async () => {
      if (userIdsWithSchedules.length === 0) return [];
      return api.get<ComplianceBatchResult[]>(
        `/compliance/check-batch?userIds=${userIdsWithSchedules.join(',')}`
      );
    },
    enabled: userIdsWithSchedules.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Create a map of userId -> compliance result for quick lookup
  const complianceByUserId = useMemo(() => {
    const map = new Map<string, ComplianceCheckResult>();
    if (complianceData) {
      complianceData.forEach((result) => {
        map.set(result.userId, result);
      });
    }
    return map;
  }, [complianceData]);

  // Generate week days (Monday to Sunday)
  const weekDays = useMemo(() => {
    const start = startOfWeek(weekStart, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  // Sensors for drag and drop (touch + mouse)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  // Group schedules by user and date
  const schedulesByUserAndDate = useMemo(() => {
    const map = new Map<string, Schedule>();
    schedules.forEach((schedule) => {
      const key = `${schedule.userId}-${schedule.date}`;
      map.set(key, schedule);
    });
    return map;
  }, [schedules]);

  // Get schedule for specific user and date
  const getSchedule = (userId: string, date: Date): Schedule | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedulesByUserAndDate.get(`${userId}-${dateStr}`);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const schedule = schedules.find((s) => s.id === event.active.id);
    setActiveSchedule(schedule || null);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSchedule(null);

    if (!over) return;

    const scheduleId = active.id as string;
    const [newUserId, newDateStr] = (over.id as string).split('-');

    // Find the schedule being dragged
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    // Check if dropped on a different slot
    const currentKey = `${schedule.userId}-${schedule.date}`;
    const newKey = `${newUserId}-${newDateStr}`;

    if (currentKey !== newKey) {
      onScheduleUpdate(scheduleId, newUserId, newDateStr);
    }
  };

  // Toggle schedule selection
  const toggleScheduleSelection = (scheduleId: string) => {
    const newSelection = new Set(selectedSchedules);
    if (newSelection.has(scheduleId)) {
      newSelection.delete(scheduleId);
    } else {
      newSelection.add(scheduleId);
    }
    setSelectedSchedules(newSelection);
  };

  // Publish selected schedules
  const handlePublishSelected = () => {
    if (selectedSchedules.size > 0) {
      onPublishSchedules(Array.from(selectedSchedules));
      setSelectedSchedules(new Set());
    }
  };

  // Count unpublished schedules
  const unpublishedCount = schedules.filter((s) => !s.isPublished).length;

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {t('scheduling.weeklyRota')}
          </h2>
          <p className="text-sm text-slate-600">
            {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
          </p>
        </div>

        {unpublishedCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {selectedSchedules.size > 0
                ? t('scheduling.selectedCount', { count: selectedSchedules.size })
                : t('scheduling.unpublishedCount', { count: unpublishedCount })}
            </span>
            <button
              onClick={handlePublishSelected}
              disabled={selectedSchedules.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {t('scheduling.publishSelected')}
            </button>
          </div>
        )}
      </div>

      {/* Open Shifts Section (only show if there are open shifts) */}
      {openShifts.length > 0 && (
        <div className="mb-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {t('scheduling.openShifts')}
                </h3>
                <p className="text-sm text-slate-600">
                  {t('scheduling.openShiftsDescription', { count: openShifts.length })}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {openShifts.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all"
              >
                {/* Shift Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-slate-900">{schedule.shift.name}</div>
                    <div className="text-sm text-slate-600">
                      {format(new Date(schedule.date), 'EEE, MMM d')}
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    {t('scheduling.open')}
                  </div>
                </div>

                {/* Shift Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{schedule.shift.startTime} - {schedule.shift.endTime}</span>
                  </div>
                  {schedule.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{schedule.location.name}</span>
                    </div>
                  )}
                  {schedule.shift.breakMins > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span>{t('scheduling.breakMinutes')}: {schedule.shift.breakMins}min</span>
                    </div>
                  )}
                </div>

                {/* Accept Button - only for EMPLOYEE role */}
                {currentUserRole === 'EMPLOYEE' && onAcceptShift && (
                  <button
                    onClick={() => onAcceptShift(schedule.id)}
                    className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('scheduling.acceptShift')}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Empty state */}
          {openShifts.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>{t('scheduling.noOpenShifts')}</p>
            </div>
          )}
        </div>
      )}

      {/* Weekly grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Grid container with horizontal scroll on mobile */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header row with days */}
              <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50">
                <div className="p-4 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10">
                  {t('scheduling.staff')}
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="p-4 text-center border-l border-slate-200"
                  >
                    <div className="font-semibold text-slate-900">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-sm text-slate-600">
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Staff rows */}
              {users.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-8 border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Staff name column (sticky) */}
                  <div className="p-4 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200">
                    <div className="truncate">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {user.email}
                    </div>
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const schedule = getSchedule(user.id, day);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <DroppableTimeSlot
                        key={`${user.id}-${dateStr}`}
                        id={`${user.id}-${dateStr}`}
                        isToday={isToday}
                      >
                        {schedule && (
                          <DraggableShiftCard
                            schedule={schedule}
                            isSelected={selectedSchedules.has(schedule.id)}
                            onToggleSelect={() => toggleScheduleSelection(schedule.id)}
                            complianceResult={schedule.userId !== null ? complianceByUserId.get(schedule.userId) : undefined}
                            complianceLoading={complianceLoading}
                          />
                        )}
                      </DroppableTimeSlot>
                    );
                  })}
                </div>
              ))}

              {/* Empty state */}
              {users.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  <p>{t('scheduling.noStaff')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drag overlay (shows dragging shift) */}
        <DragOverlay>
          {activeSchedule && (
            <ShiftCard
              shift={activeSchedule.shift}
              isPublished={activeSchedule.isPublished}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
          <span>{t('scheduling.published')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300"></div>
          <span>{t('scheduling.draft')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-100 border border-slate-300"></div>
          <span>{t('scheduling.unassigned')}</span>
        </div>
      </div>
    </div>
  );
}
