import { useState } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { type DiningTable } from '../api/client';
import type { DragEndEvent } from '@dnd-kit/core';

interface TableLayoutEditorProps {
  tables: DiningTable[];
  onSave: (updates: Array<{ tableId: string; posX: number; posY: number }>) => Promise<void>;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TABLE_SIZE = 80;

function DraggableTable({ table, position }: { table: DiningTable; position: { x: number; y: number } }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(table.tableId),
    data: { position },
  });

  const style = {
    position: 'absolute' as const,
    left: position.x,
    top: position.y,
    width: TABLE_SIZE,
    height: TABLE_SIZE,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        rounded-lg shadow-md transition-shadow
        flex flex-col items-center justify-center
        text-white font-medium text-xs
        bg-indigo-500
        ${isDragging ? 'shadow-2xl scale-105 z-10' : 'hover:shadow-lg'}
      `}
    >
      <div className="text-[11px] font-bold leading-tight">
        {table.name || `T${table.tableId}`}
      </div>
      <div className="text-[10px] opacity-90">
        {table.capacity}p
      </div>
      {table.basePrice !== undefined && table.basePrice > 0 && (
        <div className="text-[9px] opacity-90 mt-0.5">
          ${table.basePrice.toFixed(2)}
        </div>
      )}
    </div>
  );
}

function Canvas({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({
    id: 'canvas',
  });

  return (
    <div
      ref={setNodeRef}
      className="relative border-2 border-slate-300 rounded-lg bg-neutral-50"
      style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
    >
      {children}
    </div>
  );
}

export default function TableLayoutEditor({ tables, onSave }: TableLayoutEditorProps) {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(
    new Map(tables.map(t => [String(t.tableId), { x: t.posX ?? 0, y: t.posY ?? 0 }]))
  );
  const [saving, setSaving] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const tableId = String(active.id);
    const currentPos = positions.get(tableId) ?? { x: 0, y: 0 };

    let newX = currentPos.x + delta.x;
    let newY = currentPos.y + delta.y;

    // Keep within canvas bounds
    newX = Math.max(0, Math.min(newX, CANVAS_WIDTH - TABLE_SIZE));
    newY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - TABLE_SIZE));

    setPositions(prev => new Map(prev).set(tableId, { x: newX, y: newY }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = tables.map(t => ({
        tableId: String(t.tableId),
        posX: positions.get(String(t.tableId))?.x ?? 0,
        posY: positions.get(String(t.tableId))?.y ?? 0,
      }));
      await onSave(updates);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Layout Editor</h3>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Layout'}
        </button>
      </div>

      <div className="text-sm text-slate-600">
        Drag tables to position them. This layout will be shown to customers when booking.
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <Canvas>
          {tables.map(table => {
            const pos = positions.get(String(table.tableId)) ?? { x: 0, y: 0 };
            return <DraggableTable key={table.tableId} table={table} position={pos} />;
          })}

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              No tables to arrange
            </div>
          )}
        </Canvas>
      </DndContext>

      <div className="text-xs text-slate-500">
        <strong>Tip:</strong> Drag tables to match your restaurant layout.
      </div>
    </div>
  );
}
