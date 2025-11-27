import React from "react";
import { motion } from "framer-motion";
import { Edit3 } from "lucide-react";
import { createPortal } from "react-dom";

interface Report {
  id: string;
  title: string;
  location: string;
  status: "Assigned" | "In Progress" | "Suspended" | "Resolved";
}

interface StatusUpdateModalProps {
  isOpen: boolean;
  report: Report | null;
  newStatus: Report["status"] | "";
  onStatusChange: (status: Report["status"]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isOpen,
  report,
  newStatus,
  onStatusChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen || !report) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Edit3 className="h-5 w-5 text-indigo-600" />
          Update Report Status
        </h2>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Report Summary */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900 mb-1">
              {report.id}: {report.title}
            </p>
            <p className="text-xs text-slate-600">{report.location}</p>
            <p className="text-xs text-slate-600">
              Current Status: <strong>{report.status}</strong>
            </p>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New Status <span className="text-red-500">*</span>
            </label>
            <select
              value={newStatus}
              onChange={(e) =>
                onStatusChange(e.target.value as Report["status"])
              }
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            >
              <option value="Assigned">
                Assigned - Newly assigned to office
              </option>
              <option value="In Progress">
                In Progress - Intervention scheduled/started
              </option>
              <option value="Suspended">
                Suspended - Awaiting resources/evaluation
              </option>
              <option value="Resolved">
                Resolved - Problem fixed and closed
              </option>
            </select>
          </div>

          {/* Status Information */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              Status Workflow:
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                <strong>Assigned:</strong> Report received by technical office
              </li>
              <li>
                <strong>In Progress:</strong> Intervention scheduled, work
                started
              </li>
              <li>
                <strong>Suspended:</strong> Paused awaiting resources or
                evaluation
              </li>
              <li>
                <strong>Resolved:</strong> Problem fixed, report closed
              </li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              Update Status
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
};
