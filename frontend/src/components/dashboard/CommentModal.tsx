import React from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { createPortal } from "react-dom";

interface Report {
  id: string;
  title: string;
  location: string;
}

interface CommentModalProps {
  isOpen: boolean;
  report: Report | null;
  comment: string;
  onCommentChange: (comment: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  report,
  comment,
  onCommentChange,
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
          <MessageSquare className="h-5 w-5 text-indigo-600" />
          Add Comment
        </h2>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Report Summary */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900 mb-1">
              {report.id}: {report.title}
            </p>
            <p className="text-xs text-slate-600">{report.location}</p>
          </div>

          {/* Comment Input */}
          <div>
            <label
              htmlFor={`comment-input-${report.id}`}
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Comment <span className="text-red-500">*</span>
            </label>
            <textarea
              id={`comment-input-${report.id}`}
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Add notes about progress, issues, or resolution..."
              required
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Comments help track progress and communicate with team members.
            </p>
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
              Add Comment
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
};
