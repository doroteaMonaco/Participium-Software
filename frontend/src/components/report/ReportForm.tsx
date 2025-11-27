import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, MapPin } from "lucide-react";
import { createReport } from "src/services/api";
import type { ReportCategory, ReportRequest } from "src/services/api";

interface ReportFormProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSuccess?: (createdReport?: any) => void;
}

const CATEGORIES: ReportCategory[] = [
  "Water Supply – Drinking Water",
  "Architectural Barriers",
  "Sewer System",
  "Public Lighting",
  "Waste",
  "Road Signs and Traffic Lights",
  "Roads and Urban Furnishings",
  "Public Green Areas and Playgrounds",
  "Other",
];

// Map human-friendly labels to backend enum values
const CATEGORY_MAP: Record<string, string> = {
  "Water Supply – Drinking Water": "WATER_SUPPLY_DRINKING_WATER",
  "Architectural Barriers": "ARCHITECTURAL_BARRIERS",
  "Sewer System": "SEWER_SYSTEM",
  "Public Lighting": "PUBLIC_LIGHTING",
  Waste: "WASTE",
  "Road Signs and Traffic Lights": "ROAD_SIGNS_TRAFFIC_LIGHTS",
  "Roads and Urban Furnishings": "ROADS_URBAN_FURNISHINGS",
  "Public Green Areas and Playgrounds": "PUBLIC_GREEN_AREAS_PLAYGROUNDS",
  Other: "OTHER",
};

const ReportForm: React.FC<ReportFormProps> = ({
  lat,
  lng,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate number of photos (max 3)
    if (photos.length + files.length > 3) {
      setError("Maximum 3 photos allowed");
      return;
    }

    // Validate file types
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    const invalidFiles = files.filter(
      (file) => !validTypes.includes(file.type),
    );

    if (invalidFiles.length > 0) {
      setError("Only image files (JPEG, PNG, GIF) are allowed");
      return;
    }

    // Validate file sizes (max 5MB each)
    const oversizedFiles = files.filter((file) => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError("Each photo must be less than 5MB");
      return;
    }

    setError("");
    setPhotos([...photos, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    if (!category) {
      setError("Please select a category");
      return;
    }

    if (photos.length === 0) {
      setError("At least one photo is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const reportData: ReportRequest = {
        title,
        description,
        anonymous,
        photos,
        // map displayed category label to backend enum value
        category: (CATEGORY_MAP[category] ?? category) as any,
        latitude: lat,
        longitude: lng,
      };

      const created = await createReport(reportData);

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(created);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Report submission error:", err);
      setError("Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Submit New Report
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Report an issue in your area
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Success Message */}
          {success && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700 flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Report submitted successfully!
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Location Display */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <MapPin className="h-5 w-5 text-indigo-600" />
            <div className="text-sm">
              <span className="font-medium text-slate-700">Location: </span>
              <span className="text-slate-600">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title for the issue"
              required
              maxLength={100}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
            <p className="text-xs text-slate-500 mt-1">
              {title.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              required
              rows={4}
              maxLength={500}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory)}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Photos <span className="text-red-500">*</span>
              <span className="text-slate-500 font-normal ml-1">
                (1-3 photos, max 5MB each)
              </span>
            </label>

            {/* Photo Previews */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border-2 border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {photos.length < 3 && (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 font-medium">
                    Click to upload photos
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    JPEG, PNG, GIF (max 5MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Anonymous Option */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="anonymous"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-200"
            />
            <div className="flex-1">
              <label
                htmlFor="anonymous"
                className="text-sm font-medium text-slate-700 cursor-pointer"
              >
                Submit as anonymous
              </label>
              <p className="text-xs text-slate-500 mt-1">
                Your name will not be visible in the public list of reports
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-indigo-300 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Submitting..."
                : success
                  ? "Submitted!"
                  : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ReportForm;
