interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMins: number;
}

interface ShiftCardProps {
  shift: Shift;
  isPublished: boolean;
  isDragging?: boolean;
}

export function ShiftCard({ shift, isPublished, isDragging }: ShiftCardProps) {
  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 cursor-move select-none transition-all
        ${
          isPublished
            ? 'bg-blue-50 border-blue-300 text-blue-900'
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }
        ${isDragging ? 'shadow-xl scale-105 rotate-2' : 'shadow-sm hover:shadow-md'}
      `}
    >
      <div className="font-semibold text-sm truncate">{shift.name}</div>
      <div className="text-xs opacity-80">
        {shift.startTime} - {shift.endTime}
      </div>
      {shift.breakMins > 0 && (
        <div className="text-xs opacity-60 mt-1">
          Break: {shift.breakMins}min
        </div>
      )}
      {!isPublished && (
        <div className="text-xs font-medium mt-1 opacity-75">DRAFT</div>
      )}
    </div>
  );
}
