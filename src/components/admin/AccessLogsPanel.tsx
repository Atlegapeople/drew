'use client';

import { useState } from 'react';

interface AccessLog {
  id: number;
  profileId?: number;
  cardUid?: string;
  method: string;
  result: string;
  timestamp: string;
}

interface AccessLogsPanelProps {
  logs: AccessLog[];
}

export default function AccessLogsPanel({ logs }: AccessLogsPanelProps) {
  const [showDetails, setShowDetails] = useState<number | null>(null);
  
  if (!logs || logs.length === 0) {
    return (
      <div className="text-gray-500 py-4 text-center">
        No access logs available
      </div>
    );
  }
  
  // Format timestamp to a more readable format
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
      {logs.map((log) => (
        <div 
          key={log.id}
          className={`p-2 rounded-lg border ${
            log.result === 'granted' 
              ? 'border-green-100 bg-green-50' 
              : 'border-red-100 bg-red-50'
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  log.result === 'granted' ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span className="font-medium text-sm">
                  {log.method === 'rfid' ? 'RFID' : 'PIN'} Access
                </span>
              </div>
              <div className="text-xs text-gray-500 ml-4 mt-1">
                {log.cardUid ? `Card: ${log.cardUid}` : 'No card'}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-500">
                {formatTimestamp(log.timestamp)}
              </div>
              <div className="text-xs">
                <span className={`${
                  log.result === 'granted' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {log.result === 'granted' ? 'Successful' : 'Failed'}
                </span>
              </div>
            </div>
          </div>
          
          {showDetails === log.id && (
            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
              <div>ID: {log.id}</div>
              <div>Profile ID: {log.profileId || 'None'}</div>
              <div>Method: {log.method}</div>
              <div>Result: {log.result}</div>
              <div>Time: {new Date(log.timestamp).toLocaleString()}</div>
            </div>
          )}
          
          <button 
            className="text-xs text-blue-500 hover:text-blue-700 mt-1"
            onClick={() => setShowDetails(showDetails === log.id ? null : log.id)}
          >
            {showDetails === log.id ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      ))}
      
      <div className="text-center pt-2">
        <button 
          className="text-sm text-[#ff66c4] hover:text-pink-700 transition-colors"
          onClick={() => {
            // This would navigate to a full logs page in production
            alert('This would open the full access logs in production');
          }}
        >
          View All Logs →
        </button>
      </div>
    </div>
  );
}
