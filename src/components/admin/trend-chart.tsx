"use client";

interface TrendDataPoint {
  date: string;
  active_members: number;
  document_requests: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
}

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No trend data available
      </div>
    );
  }

  const maxMembers = Math.max(...data.map((d) => d.active_members), 1);
  const maxRequests = Math.max(...data.map((d) => d.document_requests), 1);
  const maxValue = Math.max(maxMembers, maxRequests);

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const toPath = (values: number[]) => {
    return values
      .map((val, i) => {
        const x = padding.left + i * xStep;
        const y = padding.top + chartHeight - (val / maxValue) * chartHeight;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const membersPath = toPath(data.map((d) => d.active_members));
  const requestsPath = toPath(data.map((d) => d.document_requests));

  // Y-axis labels
  const yLabels = [0, Math.round(maxValue / 2), maxValue];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-500 rounded" />
          <span className="text-muted-foreground">Active Members</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-500 rounded" />
          <span className="text-muted-foreground">Document Requests</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis grid lines and labels */}
        {yLabels.map((label) => {
          const y =
            padding.top + chartHeight - (label / maxValue) * chartHeight;
          return (
            <g key={label}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* X-axis labels (show first, middle, last) */}
        {data.length > 0 && (
          <>
            <text
              x={padding.left}
              y={height - 5}
              textAnchor="start"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {formatDate(data[0].date)}
            </text>
            {data.length > 2 && (
              <text
                x={padding.left + chartWidth / 2}
                y={height - 5}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {formatDate(data[Math.floor(data.length / 2)].date)}
              </text>
            )}
            <text
              x={width - padding.right}
              y={height - 5}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {formatDate(data[data.length - 1].date)}
            </text>
          </>
        )}

        {/* Lines */}
        <path
          d={membersPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={requestsPath}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = date.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${day} ${months[date.getMonth()]}`;
}
