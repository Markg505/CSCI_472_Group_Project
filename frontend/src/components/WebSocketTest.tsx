import { useWebSocket } from '../hooks/useWebSocket';

export function WebSocketTest() {
  const { isConnected, lastMessage, sendMessage } = useWebSocket();

  const handleTestMessage = () => {
    sendMessage({ type: 'TEST', data: 'Hello WebSocket!' });
  };

  return (
    <div className="fixed bottom-4 right-4 bg-card p-4 rounded-lg border shadow-lg z-50">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm">
          WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {lastMessage && (
        <div className="text-xs mt-2 p-2 bg-white/10 rounded">
          Last: {lastMessage.type} - {lastMessage.message}
        </div>
      )}
      
      <button 
        onClick={handleTestMessage}
        disabled={!isConnected}
        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
      >
        Test Message
      </button>
    </div>
  );
}