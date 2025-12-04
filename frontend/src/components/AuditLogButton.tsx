import { useState } from 'react';
import { useAuth } from '../features/auth/useAuth';

interface AuditLogButtonProps {
  entityType: string;
  label?: string;
}

export default function AuditLogButton({ entityType, label = 'View Change Log' }: AuditLogButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Only show button for admin users
  if (!user || (user as any).role !== 'admin') {
    return null;
  }

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/RBOS/api/audit-log/export?entityType=${entityType}`);

      if (!response.ok) {
        if (response.status === 403) {
          alert('Access denied. Admin privileges required.');
        } else {
          alert('Error: Failed to export audit log. Server returned status ' + response.status);
        }
        return;
      }

      // Get the blob and check if it has content
      const blob = await response.blob();

      // Check if CSV is empty or only has headers
      const text = await blob.text();
      const lines = text.trim().split('\n');

      if (lines.length <= 1) {
        // Only header row or empty
        alert('No change log data available yet for this section.');
        return;
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `audit_log_${entityType}_${new Date().toISOString().split('T')[0]}.csv`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting audit log:', error);
      alert('Error: Network or system error occurred. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Download change log as CSV"
    >
      {loading ? 'Exporting...' : label}
    </button>
  );
}
