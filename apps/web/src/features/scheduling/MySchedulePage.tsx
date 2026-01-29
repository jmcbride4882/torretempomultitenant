import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMins: number;
}

interface Schedule {
  id: string;
  date: string;
  shift: Shift;
  location?: {
    id: string;
    name: string;
  };
  isPublished: boolean;
}

export function MySchedulePage() {
  const { t } = useTranslation();

  // Fetch my published schedules
  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ['mySchedules'],
    queryFn: () => api.get('/scheduling/my-schedule'),
  });

  // Group schedules by week
  const groupByWeek = (schedules: Schedule[]) => {
    const weeks: { [key: string]: Schedule[] } = {};

    schedules.forEach((schedule) => {
      const date = new Date(schedule.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Go to Sunday
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(schedule);
    });

    return weeks;
  };

  const weeklySchedules = groupByWeek(schedules);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t('scheduling.mySchedule')}
        </h1>

        {schedules.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
            <p className="text-gray-500 text-center">
              {t('scheduling.noPublishedSchedules')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(weeklySchedules)
              .sort()
              .reverse()
              .map((weekKey) => {
                const weekSchedules = weeklySchedules[weekKey];
                const weekStart = new Date(weekKey);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                return (
                  <div
                    key={weekKey}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      {weekStart.toLocaleDateString()} -{' '}
                      {weekEnd.toLocaleDateString()}
                    </h2>

                    <div className="grid gap-3">
                      {weekSchedules
                        .sort(
                          (a, b) =>
                            new Date(a.date).getTime() -
                            new Date(b.date).getTime(),
                        )
                        .map((schedule) => {
                          const scheduleDate = new Date(schedule.date);
                          const isToday =
                            scheduleDate.toDateString() ===
                            new Date().toDateString();

                          return (
                            <div
                              key={schedule.id}
                              className={`border rounded-lg p-4 ${
                                isToday
                                  ? 'border-blue-200 bg-blue-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3
                                    className={`font-semibold ${
                                      isToday
                                        ? 'text-blue-900'
                                        : 'text-gray-900'
                                    }`}
                                  >
                                    {scheduleDate.toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </h3>
                                  {isToday && (
                                    <span className="text-xs text-blue-600 font-medium">
                                      {t('scheduling.today')}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    isToday
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {schedule.shift.name}
                                </span>
                              </div>

                              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-500 mb-1">
                                    {t('scheduling.startTime')}
                                  </p>
                                  <p
                                    className={
                                      isToday
                                        ? 'text-blue-900 font-medium'
                                        : 'text-gray-900 font-medium'
                                    }
                                  >
                                    {schedule.shift.startTime}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-gray-500 mb-1">
                                    {t('scheduling.endTime')}
                                  </p>
                                  <p
                                    className={
                                      isToday
                                        ? 'text-blue-900 font-medium'
                                        : 'text-gray-900 font-medium'
                                    }
                                  >
                                    {schedule.shift.endTime}
                                  </p>
                                </div>

                                {schedule.shift.breakMins > 0 && (
                                  <div>
                                    <p className="text-gray-500 mb-1">
                                      {t('scheduling.breakMinutes')}
                                    </p>
                                    <p
                                      className={
                                        isToday
                                          ? 'text-blue-900 font-medium'
                                          : 'text-gray-900 font-medium'
                                      }
                                    >
                                      {schedule.shift.breakMins}
                                    </p>
                                  </div>
                                )}

                                {schedule.location && (
                                  <div>
                                    <p className="text-gray-500 mb-1">
                                      {t('scheduling.location')}
                                    </p>
                                    <p
                                      className={
                                        isToday
                                          ? 'text-blue-900 font-medium'
                                          : 'text-gray-900 font-medium'
                                      }
                                    >
                                      {schedule.location.name}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
