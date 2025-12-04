import React from 'react';
import type { DiningTable } from '../api/client';

interface CustomerTableLayoutProps {
  tables: DiningTable[];
  availableTables: DiningTable[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  mapUrl?: string;
}

export default function CustomerTableLayout({
  tables,
  availableTables,
  selectedTableId,
  onSelectTable,
  mapUrl,
}: CustomerTableLayoutProps) {
  const availableTableIds = new Set(availableTables.map(t => t.tableId));

  return (
    <div
      className="relative w-full h-[400px] md:h-[600px] bg-gray-200 border border-dashed border-gray-400 rounded-lg"
      style={{
        backgroundImage: `url(${mapUrl})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      {tables.map(table => {
        const isAvailable = availableTableIds.has(table.tableId);
        const isSelected = table.tableId === selectedTableId;

        let bgColor = 'bg-gray-400'; // Not available
        if (isAvailable) bgColor = 'bg-green-500'; // Available
        if (isSelected) bgColor = 'bg-blue-600'; // Selected

        return (
          <div
            key={table.tableId}
            onClick={() => isAvailable && onSelectTable(table.tableId)}
            className={`absolute w-20 h-20 text-white rounded-full flex items-center justify-center transition-colors duration-200
              ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}
              ${bgColor}
            `}
            style={{ left: table.pos_x, top: table.pos_y }}
            title={isAvailable ? `Select ${table.name}` : `${table.name} (Not available)`}
          >
            <div className="text-center">
              <div>{table.name}</div>
              <div className="text-xs">Cap: {table.capacity}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}