import { useDraggable } from '@dnd-kit/core';
import { ShiftCard } from './ShiftCard';

interface Schedule {
  id: string;
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakMins: number;
  };
  isPublished: boolean;
}

interface DraggableShiftCardProps {
  schedule: Schedule;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export function DraggableShiftCard({
  schedule,
  isSelected,
  onToggleSelect,
}: DraggableShiftCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: schedule.id,
    data: { schedule },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        ${isDragging ? 'opacity-50' : ''}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
      `}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onToggleSelect();
        }
      }}
    >
      <ShiftCard
        shift={schedule.shift}
        isPublished={schedule.isPublished}
        isDragging={isDragging}
      />
    </div>
  );
}
