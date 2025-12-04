import { type DiningTable } from '../api/client';

interface TableLayoutPickerProps {
  tables: DiningTable[];
  availableTables: DiningTable[];
  selectedTableId: string;
  onSelectTable: (tableId: string) => void;
  checkingAvailability: boolean;
}

export default function TableLayoutPicker({
  tables,
  availableTables,
  selectedTableId,
  onSelectTable,
  checkingAvailability,
}: TableLayoutPickerProps) {
  const availableIds = new Set(availableTables.map(t => String(t.tableId)));

  const hasCustomPositions = tables.some(t =>
    t.posX !== undefined && t.posX !== null &&
    t.posY !== undefined && t.posY !== null
  );

  const patioTables = tables.filter(t =>
    t.name?.toLowerCase().includes('patio')
  );
  const indoorTables = tables.filter(t =>
    !t.name?.toLowerCase().includes('patio')
  );

  const getTablePosition = (total: number) => {
    const layouts = [
      { cols: 3, rows: 2 },
      { cols: 4, rows: 3 },
      { cols: 5, rows: 3 },
      { cols: 5, rows: 4 },
    ];

    let layout = layouts[0];
    if (total > 15) layout = layouts[3];
    else if (total > 12) layout = layouts[2];
    else if (total > 6) layout = layouts[1];

    return { cols: layout.cols, rows: layout.rows };
  };

  const layout = getTablePosition(indoorTables.length);

  const renderTable = (table: DiningTable) => {
    const isAvailable = availableIds.has(String(table.tableId));
    const isSelected = String(table.tableId) === String(selectedTableId);

    return (
      <button
        key={table.tableId}
        type="button"
        onClick={() => isAvailable && onSelectTable(String(table.tableId))}
        disabled={!isAvailable}
        className={`
          w-20 h-20 rounded-lg transition-all
          flex flex-col items-center justify-center
          text-white font-medium
          ${isSelected
            ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
            : isAvailable
              ? 'bg-green-500 hover:bg-green-600 hover:scale-110 cursor-pointer'
              : 'bg-red-500 cursor-not-allowed opacity-75'
          }
        `}
      >
        <div className="text-[10px] font-bold leading-tight">
          {table.name || `T${table.tableId}`}
        </div>
        <div className="text-[9px] opacity-90">
          {table.capacity}p
        </div>
        {table.basePrice !== undefined && table.basePrice > 0 && (
          <div className="text-[9px] opacity-90 mt-0.5">
            ${table.basePrice.toFixed(2)}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span className="text-neutral-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded" />
          <span className="text-neutral-600">Booked</span>
        </div>
      </div>

      {checkingAvailability ? (
        <div className="text-center py-8 text-neutral-500">
          Checking availability...
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          No tables configured yet.
        </div>
      ) : hasCustomPositions ? (
        <div className="border border-neutral-300 rounded-lg p-8 bg-neutral-50">
          <div className="relative mx-auto" style={{ width: '800px', height: '600px' }}>
            {tables.map(table => {
              const isAvailable = availableIds.has(String(table.tableId));
              const isSelected = String(table.tableId) === String(selectedTableId);
              const posX = table.posX ?? 0;
              const posY = table.posY ?? 0;

              return (
                <button
                  key={table.tableId}
                  type="button"
                  onClick={() => isAvailable && onSelectTable(String(table.tableId))}
                  disabled={!isAvailable}
                  className={`
                    absolute w-20 h-20 rounded-lg transition-all
                    flex flex-col items-center justify-center
                    text-white font-medium
                    ${isSelected
                      ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                      : isAvailable
                        ? 'bg-green-500 hover:bg-green-600 hover:scale-110 cursor-pointer'
                        : 'bg-red-500 cursor-not-allowed opacity-75'
                    }
                  `}
                  style={{ left: `${posX}px`, top: `${posY}px` }}
                >
                  <div className="text-[10px] font-bold leading-tight">
                    {table.name || `T${table.tableId}`}
                  </div>
                  <div className="text-[9px] opacity-90">
                    {table.capacity}p
                  </div>
                  {table.basePrice !== undefined && table.basePrice > 0 && (
                    <div className="text-[9px] opacity-90 mt-0.5">
                      ${table.basePrice.toFixed(2)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border border-neutral-300 rounded-lg p-8 bg-neutral-50 space-y-8">
          {patioTables.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-500 mb-3 text-center">
                Outdoor Patio
              </div>
              <div className="flex justify-center gap-8 pb-6 border-b-2 border-dashed border-neutral-300">
                {patioTables.map(renderTable)}
              </div>
            </div>
          )}

          {indoorTables.length > 0 && (
            <div>
              {patioTables.length > 0 && (
                <div className="text-xs uppercase tracking-wide text-neutral-500 mb-3 text-center">
                  Indoor Dining
                </div>
              )}
              <div
                className="grid gap-6 max-w-3xl mx-auto"
                style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}
              >
                {indoorTables.map(renderTable)}
              </div>
            </div>
          )}
        </div>
      )}

      {!checkingAvailability && availableTables.length === 0 && tables.length > 0 && (
        <div className="text-center text-sm text-rose-600">
          No tables available for the selected time and party size
        </div>
      )}
    </div>
  );
}
