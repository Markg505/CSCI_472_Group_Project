import { useState } from "react";
import { useAuth } from "../features/auth/useAuth";

interface AuditLogButtonProps {
  entityType: string;
  label?: string;
}

export default function AuditLogButton({ entityType, label = "View Change Log" }: AuditLogButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user || (user as any).role !== "admin") {
    return null;
  }

  const handleExport = async () => {
    try {
      setLoading(true);
      const BASE = (import.meta as any)?.env?.BASE_URL || '/';
      const API_BASE = `${BASE}api`;
      const response = await fetch(`${API_BASE}/audit-log/export?entityType=${entityType}`);

      if (!response.ok) {
        if (response.status === 403) {
          alert("Access denied. Admin privileges required.");
        } else {
          try {
            const errorData = await response.json();
            alert("Error: " + (errorData.error || "Failed to export audit log. Status " + response.status));
          } catch {
            alert("Error: Failed to export audit log. Server returned status " + response.status);
          }
        }
        return;
      }

      const blob = await response.blob();
      const text = await blob.text();
      const lines = text.trim().split("\n");

      if (lines.length <= 1) {
        alert("No change log data available yet for this section.");
        return;
      }

      const url = window.URL.createObjectURL(new Blob([text], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch
        ? filenameMatch[1]
        : `audit_log_${entityType}_${new Date().toISOString().split("T")[0]}.csv`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting audit log:", error);
      alert("Error: Network or system error occurred. Please check the console for details.");
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
      {loading ? "Exporting..." : label}
    </button>
  );
}
