import React from 'react';
import { type DiningTable } from '../api/client';

interface TableMapViewProps {
  allTables: DiningTable[];
  availableTables: DiningTable[];
  selectedTableId?: string | number;
  onTableSelect: (tableId: string | number) => void;
  className?: string;
  mapUrl?: string;
}

const TableMapView: React.FC<TableMapViewProps> = ({
  allTables,
  availableTables,
  selectedTableId,
  onTableSelect,
  className = '',
  mapUrl = '',
}) => {
  const availableTableIds = new Set(availableTables.map(t => t.tableId));

  // Define static values for table dimensions, similar to the admin layout
  const tableWidth = 80;
  const tableHeight = 80;

  const viewBox = allTables.reduce(
    (acc, table) => {
      const right = (table.pos_x ?? 0) + tableWidth;
      const bottom = (table.pos_y ?? 0) + tableHeight;
      if (right > acc.maxX) acc.maxX = right;
      if (bottom > acc.maxY) acc.maxY = bottom;
      return acc;
    },
    { maxX: 800, maxY: 600 } // Default container size
  );

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: `${viewBox.maxX}px`,
    height: `${viewBox.maxY}px`,
    margin: '0 auto',
    border: '1px solid #ccc',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundImage: `url(${mapUrl})`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  };

  return (
    <div className={className}>
        <h3 className="text-lg font-semibold mb-4 text-center">Select Your Table</h3>
        <div style={containerStyle}>
        {allTables.map(table => {
            const isAvailable = availableTableIds.has(table.tableId);
            const isSelected = String(table.tableId) === String(selectedTableId);

            const style: React.CSSProperties = {
              position: 'absolute',
              left: `${table.pos_x ?? 0}px`,
              top: `${table.pos_y ?? 0}px`,
              width: `${tableWidth}px`,
              height: `${tableHeight}px`,
              backgroundColor: isSelected ? '#3b82f6' : isAvailable ? '#10b981' : '#e5e7eb',
              color: isSelected ? 'white' : isAvailable ? 'white' : '#4b5563',
              border: `2px solid ${isSelected ? '#2563eb' : isAvailable ? '#059669' : '#d1d5db'}`,
              // Use a fixed shape, e.g., rounded, to match the admin view
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isAvailable ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease-in-out',
              opacity: isAvailable ? 1 : 0.6,
              boxShadow: isSelected ? '0 0 0 4px rgba(59, 130, 246, 0.5)' : 'rgba(0, 0, 0, 0.1) 0px 4px 12px',
              textAlign: 'center',
            };

            const handleClick = () => {
              if (isAvailable) {
                  onTableSelect(table.tableId);
              }
            };

            return (
              <div
                  key={table.tableId}
                  style={style}
                  onClick={handleClick}
                  title={
                  isAvailable
                      ? `Table ${table.name} (Seats ${table.capacity})`
                      : `Table ${table.name} (Unavailable)`
                  }
              >
                  <div className="text-sm font-bold">{table.name}</div>
                  <div className="text-xs">Cap: {table.capacity}</div>
                  {table.basePrice !== undefined && (
                    <div className="text-[11px] mt-0.5">${(table.basePrice ?? 0).toFixed(2)}</div>
                  )}
              </div>
            );
        })}
        </div>
        <div className="mt-4 flex justify-center space-x-4 text-xs">
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>Available</div>
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>Selected</div>
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-300 mr-2 border"></span>Unavailable</div>
        </div>
    </div>
  );
};

export default TableMapView;
