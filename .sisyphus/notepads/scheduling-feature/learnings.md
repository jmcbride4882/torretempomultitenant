## Drag-and-Drop Scheduling Library Research (2026-01-29)

### Libraries Evaluated

#### 1. **@dnd-kit/core** (RECOMMENDED for custom implementation)
- **Version**: Latest stable
- **GitHub**: https://github.com/clauderic/dnd-kit
- **Stars**: 16.5k
- **Bundle Size**: ~10kb minified (core)
- **React Compatibility**: React 18+ ✅

**Pros**:
- Modern, hook-based API (`useDraggable`, `useDroppable`)
- Zero dependencies, modular architecture
- Excellent TypeScript support
- NOT built on HTML5 DnD API (better touch/mobile support)
- Highly customizable collision detection
- Built-in accessibility (keyboard, screen readers)
- Active maintenance (346 releases)
- Includes `@dnd-kit/sortable` preset for common patterns

**Cons**:
- No built-in calendar/scheduling UI (need to build custom grid)
- Requires more setup for complex scheduling scenarios
- Cannot drag between windows/desktop (not HTML5 DnD)

**Use Case Fit**: ⭐⭐⭐⭐⭐
Perfect for building a custom Deputy-style interface with full control over layout and behavior.

---

#### 2. **react-big-calendar**
- **GitHub**: https://github.com/jquense/react-big-calendar
- **Stars**: High adoption
- **Bundle Size**: Larger (includes calendar UI)

**Pros**:
- Built-in calendar views (week, day, month)
- Resource scheduling support (multiple lanes)
- Drag-and-drop addon (`withDragAndDrop` HOC)
- Event resizing built-in
- Mature, widely used

**Cons**:
- Older API patterns (HOC-based, not hooks)
- Less flexible for custom layouts
- Heavier bundle size
- Styling customization can be challenging
- Resource view is vertical (time horizontal) - opposite of Deputy's layout

**Use Case Fit**: ⭐⭐⭐
Good for standard calendar views, but layout doesn't match Deputy's staff-vertical/time-horizontal grid.

---

#### 3. **Schedule-X** (Modern alternative)
- **GitHub**: https://github.com/schedule-x/schedule-x
- **Stars**: 2.2k
- **Premium**: Resource scheduler is PREMIUM feature

**Pros**:
- Modern, framework-agnostic core
- React wrapper available
- Resource scheduler with drag-and-drop
- Temporal API for dates (modern standard)
- Hourly and daily resource views
- Infinite scroll support
- Mobile-responsive

**Cons**:
- **Resource scheduler requires premium license** 💰
- Smaller community than alternatives
- Less battle-tested in production
- Premium pricing may not fit budget

**Use Case Fit**: ⭐⭐⭐⭐ (if budget allows)
Excellent match for Deputy-style interface, but premium cost is a blocker.

---

### Recommended Approach: Custom Grid + @dnd-kit

**Architecture**:
```
┌─────────────────────────────────────────────────────┐
│ Weekly Grid Component (Custom)                      │
│ ┌─────────┬──────┬──────┬──────┬──────┬──────┬────┐│
│ │ Staff   │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat││
│ ├─────────┼──────┼──────┼──────┼──────┼──────┼────┤│
│ │ Alice   │ [Shift Card] │      │ [Shift]     │    ││ <- useDraggable
│ │ Bob     │      │ [Shift Card] │      │      │    ││
│ │ Charlie │ [Open Shift] │      │      │      │    ││ <- useDroppable
│ └─────────┴──────┴──────┴──────┴──────┴──────┴────┘│
└─────────────────────────────────────────────────────┘
```

**Implementation Pattern**:
1. **Grid Layout**: CSS Grid or Flexbox for staff rows × day columns
2. **Shift Cards**: `useDraggable` hook for each shift
3. **Time Slots**: `useDroppable` hook for each cell (staff + day)
4. **DndContext**: Wrap grid with sensors and collision detection
5. **DragOverlay**: Show dragging shift preview

**Code Example** (from @dnd-kit docs):
```tsx
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

function ShiftCard({ shift }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: shift.id,
    data: { shift }
  });
  
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      {shift.startTime} - {shift.endTime}
    </div>
  );
}

function TimeSlot({ staffId, date }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${staffId}-${date}`,
    data: { staffId, date }
  });
  
  return (
    <div ref={setNodeRef} className={isOver ? 'highlight' : ''}>
      {/* Shift cards render here */}
    </div>
  );
}

function WeeklySchedule() {
  return (
    <DndContext onDragEnd={handleDragEnd}>
      {/* Grid implementation */}
    </DndContext>
  );
}
```

---

### Mobile-First Considerations

**Touch Support**:
- @dnd-kit has built-in touch sensors ✅
- Use `PointerSensor` for unified mouse/touch handling
- Increase touch target sizes (44px minimum)

**Responsive Layout**:
- Horizontal scroll for week view on mobile
- Consider day-by-day view for small screens
- Sticky staff column on scroll

**Performance**:
- Virtualize long staff lists (react-window)
- Lazy load shifts outside viewport
- Use CSS transforms for drag preview (no repaint)

---

### Integration with Existing Stack

**TanStack Query**:
```tsx
const { data: shifts } = useQuery({
  queryKey: ['shifts', weekStart],
  queryFn: () => fetchShifts(weekStart)
});

const updateShiftMutation = useMutation({
  mutationFn: updateShift,
  onSuccess: () => queryClient.invalidateQueries(['shifts'])
});

function handleDragEnd(event) {
  const { active, over } = event;
  updateShiftMutation.mutate({
    shiftId: active.id,
    newStaffId: over.data.staffId,
    newDate: over.data.date
  });
}
```

**Tailwind Styling**:
- Use `@dnd-kit/utilities` for transform calculations
- Apply Tailwind classes for visual states (dragging, over, etc.)
- Color-code shifts by type/status

---

### Real-World Examples Found

**@dnd-kit in production**:
- Ant Design (table drag sorting)
- Supabase Studio (dashboard customization)
- Mantine (form field reordering)

**Pattern**: Most use `SortableContext` for lists, but custom `useDraggable`/`useDroppable` for grids.

---

### Next Steps

1. **Prototype**: Build minimal weekly grid with @dnd-kit
2. **Test**: Verify touch/mobile behavior on actual devices
3. **Optimize**: Add virtualization if staff list > 50
4. **Accessibility**: Test keyboard navigation and screen readers
5. **Polish**: Add animations, visual feedback, conflict detection


## Team Schedules Endpoint Implementation (2026-01-30)

**Task:** Implemented GET /api/scheduling/team-schedules endpoint for Manager Dashboard

### Changes Made:
1. Added `getTeamSchedules` method to `scheduling.service.ts`
2. Added GET /team-schedules endpoint to `scheduling.controller.ts` with @Roles guard (MANAGER/ADMIN)

### Implementation Details:
- Queries next 7 days of schedules (today + 7 days)
- Filters by tenantId and isPublished=true
- Returns data shape: { date, user, shift, location }
- Includes user full name, shift name, location name
- Orders by date ascending

### Key Learnings:
- Had to filter out null user/location values before mapping to prevent runtime errors
- Used TypeScript non-null assertions (!) after filtering to satisfy type checker
- Date formatting: `toISOString().split('T')[0]` for ISO date string (YYYY-MM-DD)

