import React, { useEffect, useState } from "react";
import {
  getReportComments,
  addReportComment,
  getReportById,
} from "../../services/api";
import type { Comment, CommentRequest } from "../../services/api";
import { ReportModel, ReportStatus } from "../../services/models";
import { useAuth } from "../../contexts/AuthContext";

interface CommentsSectionProps {
  reportId: number;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ reportId }) => {
  const [report, setReport] = useState<ReportModel>({} as ReportModel);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Only show for MUNICIPALITY_USER or EXTERNAL_MAINTAINER
  const canViewComments =
    user?.role === "MUNICIPALITY" || user?.role === "EXTERNAL_MAINTAINER";

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await getReportById(reportId);
        setReport(new ReportModel(data));
      } catch (err) {
        console.error(err);
        setError("Could not load report details");
      }
    };

    const fetchComments = async () => {
      try {
        setLoading(true);
        const data = await getReportComments(reportId);
        setComments(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch comments", err);
        setError("Failed to load comments.");
      } finally {
        setLoading(false);
      }
    };

    if (canViewComments) {
      fetchComments();
      fetchReport();
    } else {
      setLoading(false);
    }
  }, [reportId, canViewComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const commentData: CommentRequest = { content: newComment };
      const addedComment = await addReportComment(reportId, commentData);
      setComments([...comments, addedComment]);
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment", err);
      alert("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!canViewComments) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-8 p-4 text-center text-gray-500">
        Loading internal comments...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-4 text-red-500 bg-red-50 rounded-lg">{error}</div>
    );
  }

  return (
    <div className="mt-8 bg-slate-50 rounded-lg border border-slate-200 p-6">
      {/* Report Summary */}
      {report && (
        <div className="mb-6 rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Report Summary
          </h2>
          <p className="text-sm font-semibold text-slate-900 mb-1">
            Title: {report.title}
          </p>
          <p className="text-sm font-semibold text-slate-900 mb-1">
            Description: {report.description}
          </p>
        </div>
      )}

      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-slate-500 italic">No internal comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-sm text-slate-700">
                  {comment.municipality_user_id
                    ? `Municipality Staff`
                    : comment.external_maintainer_id
                      ? `External Maintainer`
                      : "Unknown User"}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-slate-800 whitespace-pre-wrap text-sm">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="new-comment"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Add Comment <span className="text-red-500">*</span>
          </label>
          {report.status === ReportStatus.RESOLVED && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-2">
              <p className="text-sm text-amber-800">
                💤 This report is resolved. Comments cannot be added to completed reports.
              </p>
            </div>
          )}
          <textarea
            id="new-comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write an internal comment..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            rows={4}
            disabled={submitting || report.status === ReportStatus.RESOLVED}
          />
          <p className="text-xs text-slate-500 mt-1">
            Comments help track progress and communicate with team members.
          </p>
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={submitting || !newComment.trim() || report.status === ReportStatus.RESOLVED}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CommentsSection;
