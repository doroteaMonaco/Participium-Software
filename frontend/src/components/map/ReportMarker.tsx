import { CircleMarker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import { type ReportModel, ReportStatus } from "src/services/models";
import { Badge } from "src/components/shared/Badge";

function getColorForStatus(status?: ReportStatus): string {
  switch (status) {
    case ReportStatus.PENDING:
      return "indigo";
    case ReportStatus.ASSIGNED:
      return "blue";
    case ReportStatus.IN_PROGRESS:
      return "amber";
    case ReportStatus.SUSPENDED:
      return "slate";
    case ReportStatus.REJECTED:
      return "red";
    case ReportStatus.RESOLVED:
      return "green";
    default:
      return "black";
  }
}

const ReportMarker: React.FC<{ report: ReportModel }> = ({ report }) => {
  const color = getColorForStatus(report.status);

  return (
    <CircleMarker
      key={report.id}
      center={[report.lat, report.lng]}
      radius={10}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.6,
        weight: 1.5,
      }}
    >
      <Popup>
        <div className="text-center space-y-2 max-w-xs">
          <Badge color={`bg-${color}-50 text-${color}-700`}>
            {report.status}
          </Badge>
          <div className="flex-1">
            <div className="text-sm font-semibold">
              {report.title ?? `Report #${report.id}`}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Created: {new Date(report.createdAt).toLocaleString()}
            </div>
          </div>
          {/* Link to report details; stop propagation so popup/map behavior is preserved. */}
          <Link
            to={`/report/${report.id}`}
            className="inline-block text-sm font-medium text-indigo-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View details
          </Link>
        </div>
      </Popup>
    </CircleMarker>
  );
};

export default ReportMarker;
