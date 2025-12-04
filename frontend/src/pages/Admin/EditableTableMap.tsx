import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient, type DiningTable } from '../../api/client';
import TableMapView from '../../components/TableMapView';
import { PhotoIcon, XCircleIcon, CheckIcon } from '@heroicons/react/24/outline';
import { debounce } from 'lodash';

// Define a type for a table being dragged
interface DraggableTable extends DiningTable {
  isDragging: boolean;
}

const EditableTableMap: React.FC<{ refreshKey?: string | number }> = ({ refreshKey }) => {
  const [tables, setTables] = useState<DraggableTable[]>([]);
  const [mapImageUrl, setMapImageUrl] = useState<string>('');
  const [newMapImageUrlInput, setNewMapImageUrlInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isMapImageLoading, setIsMapImageLoading] = useState<boolean>(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    try {
      const [tablesData, mapImageData] = await Promise.all([
        apiClient.getTables(),
        apiClient.getMapImageUrl(),
      ]);
      console.log('Fetched tables data:', tablesData);
      console.log('Fetched map image data:', mapImageData);
      setTables(tablesData.map((t) => ({
        ...t,
        pos_x: (t as any).pos_x ?? (t as any).posX ?? 0,
        pos_y: (t as any).pos_y ?? (t as any).posY ?? 0,
        isDragging: false
      })));
      setMapImageUrl(mapImageData.url || '');
      setNewMapImageUrlInput(mapImageData.url || '');
    } catch (error) {
      console.error('Failed to fetch map data:', error);
      // Optionally set an error state here
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData, refreshKey]);

  const handleDragStart = (e: React.DragEvent, tableId: string) => {
    e.dataTransfer.setData('tableId', tableId);
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
    setTables((prevTables) =>
      prevTables.map((t) =>
        t.tableId === tableId ? { ...t, isDragging: true } : t
      )
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const debouncedUpdateTablePosition = useCallback(
    debounce(async (tableId: string, x: number, y: number) => {
      try {
        await apiClient.updateTablePosition(tableId, x, y);
        console.log(`Updated table ${tableId} position to x:${x}, y:${y}`);
        // Refresh from server to ensure persisted state stays in sync
        fetchMapData();
      } catch (error) {
        console.error(`Failed to update table ${tableId} position:`, error);
        // Implement rollback or error notification if needed
        fetchMapData(); // Re-fetch to revert to last saved state
      }
    }, 500),
    [fetchMapData]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const tableId = e.dataTransfer.getData('tableId');
    const mapContainer = mapRef.current;

    if (mapContainer) {
      const mapRect = mapContainer.getBoundingClientRect();
      const newX = e.clientX - mapRect.left - 40; // Adjust for half table width (80/2)
      const newY = e.clientY - mapRect.top - 40; // Adjust for half table height (80/2)

      setTables((prevTables) =>
        prevTables.map((t) => {
          if (t.tableId === tableId) {
            debouncedUpdateTablePosition(tableId, newX, newY);
      return { ...t, pos_x: newX, pos_y: newY, posX: newX, posY: newY, isDragging: false };
          }
          return { ...t, isDragging: false };
        })
      );
    }
  };

  const handleDragEnd = (e: React.DragEvent, tableId: string) => {
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
    setTables((prevTables) =>
      prevTables.map((t) =>
        t.tableId === tableId ? { ...t, isDragging: false } : t
      )
    );
  };

  const handleSetMapImage = async () => {
    if (!newMapImageUrlInput.trim()) {
      alert('Map image URL cannot be empty.');
      return;
    }
    setIsMapImageLoading(true);
    try {
      await apiClient.setMapImageUrl(newMapImageUrlInput);
      setMapImageUrl(newMapImageUrlInput);
      alert('Map image URL updated successfully!');
    } catch (error) {
      console.error('Failed to set map image URL:', error);
      alert('Failed to update map image URL.');
    } finally {
      setIsMapImageLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-gray-500">Loading table layout...</p>
      </div>
    );
  }

  // Define static values for table dimensions, similar to the TableMapView
  const tableWidth = 80;
  const tableHeight = 80;

  const viewBox = tables.reduce(
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
    backgroundImage: mapImageUrl ? `url(${mapImageUrl})` : 'none',
    backgroundSize: 'cover', // Changed to cover for better fit of potentially smaller images
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    minHeight: '400px', // Ensure a minimum height even without an image
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
    pageBreakInside: 'avoid',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900">Restaurant Layout Editor</h3>

      {/* Map Image URL Configuration */}
      <div className="flex items-center gap-2">
        <label htmlFor="mapImageUrl" className="sr-only">
          Map Image URL
        </label>
        <input
          type="text"
          id="mapImageUrl"
          value={newMapImageUrlInput}
          onChange={(e) => setNewMapImageUrlInput(e.target.value)}
          placeholder="Enter URL for restaurant floor map image"
          className="flex-1 rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <button
          onClick={handleSetMapImage}
          disabled={isMapImageLoading}
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {isMapImageLoading ? (
            'Updating...'
          ) : (
            <>
              <CheckIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Update Map
            </>
          )}
        </button>
      </div>

      {mapImageUrl ? (
        <div
          ref={mapRef}
          style={containerStyle}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="relative bg-gray-100 flex items-center justify-center"
        >
          {tables.length === 0 && (
            <p className="text-gray-500 text-center">
              No tables available. Add tables using the "New table" button.
            </p>
          )}
          {tables.map((table) => (
            <div
              key={table.tableId}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, table.tableId)}
              onDragEnd={(e) => handleDragEnd(e, table.tableId)}
              style={{
                position: 'absolute',
                left: `${table.pos_x ?? 0}px`,
                top: `${table.pos_y ?? 0}px`,
                width: `${tableWidth}px`,
                height: `${tableHeight}px`,
                backgroundColor: 'rgba(59, 130, 246, 0.7)', // Blue for editable tables
                color: 'white',
                border: '2px solid #2563eb',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'grab',
                transition: table.isDragging ? 'none' : 'all 0.2s ease-in-out',
                boxShadow: 'rgba(0, 0, 0, 0.2) 0px 5px 15px',
                zIndex: table.isDragging ? 1000 : 1,
                textAlign: 'center',
              }}
              title={`Drag to reposition Table ${table.name}`}
            >
              <div className="text-base font-bold">{table.name}</div>
              <div className="text-sm">Cap: {table.capacity}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
          <PhotoIcon className="h-12 w-12 mb-2" />
          <p>No map image set. Please provide a URL above.</p>
        </div>
      )}
      <p className="text-sm text-gray-600">
        Drag and drop tables to arrange your restaurant layout. Positions are saved automatically.
      </p>
    </div>
  );
};

export default EditableTableMap;
