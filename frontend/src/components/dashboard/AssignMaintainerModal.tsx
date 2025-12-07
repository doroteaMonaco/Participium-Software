import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, CheckCircle2, AlertCircle, Loader2, Briefcase } from "lucide-react";

interface ExternalMaintainer {
  id: string;
  name: string;
  company: string;
  specialty: string;
  activeReports: number;
  rating?: number;
}

interface AssignMaintainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportCategory: string;
  reportTitle: string;
  onAssign: (maintainerId: string, maintainerName: string) => void;
}

// Mock data for external maintainers based on category
const getMaintainersByCategory = (category: string): ExternalMaintainer[] => {
  const maintainersMap: Record<string, ExternalMaintainer[]> = {
    "Public Lighting": [
      { id: "m1", name: "Enel X", company: "Enel Group", specialty: "Public Lighting", activeReports: 5, rating: 4.8 },
      { id: "m2", name: "Lighting Solutions Ltd", company: "LS Group", specialty: "Street Lights", activeReports: 3, rating: 4.5 },
      { id: "m3", name: "Illumina Services", company: "Illumina Corp", specialty: "LED Systems", activeReports: 7, rating: 4.7 },
    ],
    "Roads & Urban Furnishings": [
      { id: "m4", name: "Urban Works Co", company: "UW Group", specialty: "Road Maintenance", activeReports: 4, rating: 4.6 },
      { id: "m5", name: "Pavement Solutions", company: "PS Ltd", specialty: "Pavement Repair", activeReports: 6, rating: 4.4 },
    ],
    "Waste": [
      { id: "m6", name: "EcoClean Services", company: "EcoClean Group", specialty: "Waste Management", activeReports: 8, rating: 4.9 },
      { id: "m7", name: "Green Waste Solutions", company: "GWS Corp", specialty: "Recycling", activeReports: 5, rating: 4.3 },
    ],
    "Water Supply – Drinking Water": [
      { id: "m8", name: "AquaTech Services", company: "AquaTech Group", specialty: "Water Systems", activeReports: 4, rating: 4.7 },
      { id: "m9", name: "H2O Maintenance", company: "H2O Corp", specialty: "Water Supply", activeReports: 3, rating: 4.5 },
    ],
    "Sewer System": [
      { id: "m10", name: "DrainPro Services", company: "DrainPro Ltd", specialty: "Sewer Maintenance", activeReports: 6, rating: 4.6 },
    ],
  };

  return maintainersMap[category] || [
    { id: "m99", name: "General Contractors", company: "Multi-Service", specialty: "General Maintenance", activeReports: 2, rating: 4.0 },
  ];
};

export const AssignMaintainerModal: React.FC<AssignMaintainerModalProps> = ({
  isOpen,
  onClose,
  reportId,
  reportCategory,
  reportTitle,
  onAssign,
}) => {
  const [selectedMaintainer, setSelectedMaintainer] = useState<ExternalMaintainer | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const maintainers = getMaintainersByCategory(reportCategory);

  const handleAssign = () => {
    if (!selectedMaintainer) return;

    setAssigning(true);
    // Simulate API call
    setTimeout(() => {
      onAssign(selectedMaintainer.id, selectedMaintainer.name);
      setSuccessMessage(`Report successfully assigned to ${selectedMaintainer.name}!`);
      setAssigning(false);
      
      // Close modal after showing success message
      setTimeout(() => {
        setSuccessMessage(null);
        setSelectedMaintainer(null);
        onClose();
      }, 1500);
    }, 1000);
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
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
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Report Info */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                Report Details
              </p>
              <p className="text-sm font-bold text-slate-900 mb-1">
                {reportTitle}
              </p>
              <p className="text-xs text-slate-600">
                Report ID: {reportId}
              </p>
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

            {/* Info Banner */}
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Specialized Contractors Available
                  </p>
                  <p className="text-xs text-blue-700">
                    These external maintainers specialize in <strong>{reportCategory}</strong> and can handle this intervention.
                  </p>
                </div>
              </div>
            </div>

            {/* Maintainers List */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-4">
                Select External Maintainer:
              </label>
              <div className="space-y-3">
                {maintainers.map((maintainer) => (
                  <motion.button
                    key={maintainer.id}
                    type="button"
                    onClick={() => setSelectedMaintainer(maintainer)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedMaintainer?.id === maintainer.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-1.5 rounded-lg ${
                            selectedMaintainer?.id === maintainer.id
                              ? "bg-indigo-600"
                              : "bg-slate-600"
                          }`}>
                            <Briefcase className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900">
                              {maintainer.name}
                            </p>
                            <p className="text-sm text-slate-600">
                              {maintainer.company}
                            </p>
                          </div>
                        </div>
                        
                        <div className="ml-8 space-y-1">
                          <p className="text-xs text-indigo-600 font-medium">
                            Specialty: {maintainer.specialty}
                          </p>
                          {maintainer.rating && (
                            <p className="text-xs text-amber-600 font-medium">
                              ⭐ {maintainer.rating} / 5.0
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900">
                            {maintainer.activeReports}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            active reports
                          </p>
                        </div>
                        {selectedMaintainer?.id === maintainer.id && (
                          <CheckCircle2 className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            {selectedMaintainer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl"
              >
                <p className="text-xs font-semibold text-indigo-900 mb-1">
                  Assignment Details
                </p>
                <p className="text-xs text-indigo-800">
                  <strong>{selectedMaintainer.name}</strong> will be assigned to manage this intervention.
                </p>
                <ul className="mt-1 ml-4 text-xs text-indigo-700 space-y-0.5 list-disc">
                  <li>View and update the report status</li>
                  <li>Add progress comments and photos</li>
                  <li>Mark the intervention as resolved</li>
                </ul>
              </motion.div>
            )}
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
              disabled={!selectedMaintainer || assigning}
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
