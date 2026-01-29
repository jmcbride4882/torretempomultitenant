import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';

interface DroppableTimeSlotProps {
  id: string;
  isToday?: boolean;
  children?: ReactNode;
}

export function DroppableTimeSlot({ id, isToday, children }: DroppableTimeSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[80px] p-2 border-l border-slate-200 transition-colors
        ${isToday ? 'bg-blue-50/30' : ''}
        ${isOver ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : ''}
      `}
    >
      {children}
    </div>
  );
}
