import React, { useState, useEffect, useRef } from 'react';
import { apiClient, type DiningTable } from '../../api/client';
import { useWebSocket } from '../../hooks/useWebSocket';

interface DraggableTable extends DiningTable {
  pos_x: number;
  pos_y: number;
}

export default function TableLayout() {
  const [tables, setTables] = useState<DraggableTable[]>([]);
  const [mapUrl, setMapUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { lastMessage: websocketLastMessage } = useWebSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tablesData, configData] = await Promise.all([
          apiClient.getTables(),
          apiClient.getMapImageUrl(),
        ]);
        
        const tablesWithPositions = tablesData.map(t => ({
          ...t,
          pos_x: t.pos_x || 0,
          pos_y: t.pos_y || 0,
        }));
        setTables(tablesWithPositions);
        setMapUrl(configData.url || '');
      } catch (err) {
        setError('Failed to load layout data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (websocketLastMessage && websocketLastMessage.type === 'TABLE_MOVED') {
      const { tableId, x, y } = websocketLastMessage;
      if (tableId !== undefined && x !== undefined && y !== undefined) {
        setTables(prevTables =>
          prevTables.map(t => (t.tableId === tableId ? { ...t, pos_x: x, pos_y: y } : t))
        );
      } else {
        console.warn('Received TABLE_MOVED message with missing tableId, x, or y:', websocketLastMessage);
      }
    }
  }, [websocketLastMessage]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, tableId: string) => {
    const tableElement = e.currentTarget;
    const rect = tableElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setDragging({ id: tableId, offsetX, offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left - dragging.offsetX;
    const y = e.clientY - containerRect.top - dragging.offsetY;

    setTables(prevTables =>
      prevTables.map(t =>
        t.tableId === dragging.id
          ? { ...t, pos_x: Math.max(0, Math.min(x, containerRect.width - 80)), pos_y: Math.max(0, Math.min(y, containerRect.height - 80)) }
          : t
      )
    );
  };

  const handleMouseUp = () => {
    if (!dragging) return;
    const table = tables.find(t => t.tableId === dragging.id);
    if (table) {
      apiClient.updateTablePosition(table.tableId, table.pos_x, table.pos_y).catch(() => {
        setError('Failed to save table position. Please refresh.');
        // Consider reverting the UI change here
      });
    }
    setDragging(null);
  };
  
  const handleMapUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMapUrl(e.target.value);
  };

  const handleMapUrlSave = () => {
    apiClient.setMapImageUrl(mapUrl).catch(() => {
      setError('Failed to save map URL.');
    });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Table Layout</h1>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={mapUrl}
          onChange={handleMapUrlChange}
          placeholder="Enter URL for restaurant floor plan image"
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
        <button onClick={handleMapUrlSave} className="px-4 py-2 rounded bg-blue-500 text-white">
          Save Map
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative w-full h-[600px] bg-gray-200 border border-dashed border-gray-400 rounded-lg select-none"
        style={{ backgroundImage: `url(${mapUrl})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {tables.map(table => (
          <div
            key={table.tableId}
            onMouseDown={(e) => handleMouseDown(e, table.tableId)}
            className="absolute w-20 h-20 bg-blue-500 text-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            style={{ left: table.pos_x, top: table.pos_y }}
          >
            <div className="text-center">
              <div>{table.name}</div>
              <div className="text-xs">Cap: {table.capacity}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
