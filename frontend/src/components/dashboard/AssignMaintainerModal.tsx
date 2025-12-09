import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wrench,
} from "lucide-react";
import { assignReportToExternalMaintainer } from "src/services/api";

interface AssignMaintainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportCategory: string;
  reportTitle: string;
  onAssign: (maintainerId: string, maintainerName: string) => void;
}

export const AssignMaintainerModal: React.FC<AssignMaintainerModalProps> = ({
  isOpen,
  onClose,
  reportId,
  reportCategory,
  reportTitle,
  onAssign,
}) => {
  const [assigning, setAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extract numeric ID from reportId (e.g., "RPT-123" -> 123)
  const getNumericReportId = (id: string): number => {
    const match = id.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const handleAssign = async () => {
    setAssigning(true);
    setErrorMessage(null);

    try {
      const numericId = getNumericReportId(reportId);
      await assignReportToExternalMaintainer(numericId);
      
      setSuccessMessage(
        `Report successfully assigned to an external maintainer for ${reportCategory}!`,
      );

      // Notify parent and close modal after showing success message
      setTimeout(() => {
        onAssign("auto", "External Maintainer");
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || "Failed to assign external maintainer";
      setErrorMessage(message);
    } finally {
      setAssigning(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Assign to External Maintainer
                </h2>
                <p className="text-xs text-indigo-100">
                  Category: {reportCategory}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={assigning}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Report Info */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                Report Details
              </p>
              <p className="text-sm font-bold text-slate-900 mb-1">
                {reportTitle}
              </p>
              <p className="text-xs text-slate-600">Report ID: {reportId}</p>
            </div>

            {/* Success Message */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center gap-3"
              >
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-green-800">
                  {successMessage}
                </p>
              </motion.div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3"
              >
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-red-800">
                  {errorMessage}
                </p>
              </motion.div>
            )}

            {/* Info Banner */}
            <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-xl">
              <div className="flex items-start gap-3">
                <Wrench className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-900 mb-1">
                    Automatic Assignment
                  </p>
                  <p className="text-xs text-orange-700">
                    The system will automatically assign this report to the 
                    external maintainer specializing in{" "}
                    <strong>{reportCategory}</strong> with the fewest active reports,
                    ensuring optimal workload distribution.
                  </p>
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <p className="text-xs font-semibold text-indigo-900 mb-2">
                What happens next:
              </p>
              <ul className="ml-4 text-xs text-indigo-700 space-y-1 list-disc">
                <li>An external maintainer will be automatically selected</li>
                <li>They will be able to view and update the report status</li>
                <li>They can add progress comments</li>
                <li>They will mark the intervention as resolved when complete</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={assigning}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-600 font-medium hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={assigning}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {assigning ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Assign Report
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
