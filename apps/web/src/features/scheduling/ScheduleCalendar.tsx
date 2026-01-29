import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Schedule {
  id: string;
  date: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakMins: number;
  };
  location?: {
    id: string;
    name: string;
  };
  isPublished: boolean;
}

interface ScheduleCalendarProps {
  schedules: Schedule[];
  onScheduleClick?: (schedule: Schedule) => void;
}

export function ScheduleCalendar({
  schedules,
  onScheduleClick,
}: ScheduleCalendarProps) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get the first day of the month
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );

  // Get the last day of the month
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  );

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = firstDayOfMonth.getDay();

  // Get the number of days in the month
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar days
  const calendarDays: (Date | null)[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add the days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
    );
  }

  // Get schedules for a specific date
  const getSchedulesForDate = (date: Date): Schedule[] => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter((s) => s.date.split('T')[0] === dateStr);
  };

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format month/year for display
  const monthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{monthYear}</h3>
        <div className="flex gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            {t('scheduling.today')}
          </button>
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const daySchedules = getSchedulesForDate(date);
          const today = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={`aspect-square border border-gray-100 rounded-lg p-1 ${
                today ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
            >
              <div
                className={`text-sm font-medium mb-1 ${
                  today ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {daySchedules.slice(0, 2).map((schedule) => (
                  <button
                    key={schedule.id}
                    onClick={() => onScheduleClick?.(schedule)}
                    className={`w-full text-xs px-1 py-0.5 rounded truncate text-left ${
                      schedule.isPublished
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={`${schedule.user.firstName} ${schedule.user.lastName} - ${schedule.shift.name}`}
                  >
                    {schedule.shift.name}
                  </button>
                ))}
                {daySchedules.length > 2 && (
                  <div className="text-xs text-gray-500 px-1">
                    +{daySchedules.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-200 rounded" />
          <span className="text-sm text-gray-600">
            {t('scheduling.published')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded" />
          <span className="text-sm text-gray-600">{t('scheduling.draft')}</span>
        </div>
      </div>
    </div>
  );
}
