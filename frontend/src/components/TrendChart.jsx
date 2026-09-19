import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const axis = { fill: "#94a3b8", fontSize: 12 };
const tooltipStyle = {
  backgroundColor: "#12121c",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#e2e8f0",
};

export default function TrendChart({ parameters }) {
  if (!parameters || parameters.length === 0) {
    return <p className="text-sm text-slate-500">Not enough data across reports to plot a trend yet.</p>;
  }

  return (
    <div className="space-y-6">
      {parameters.map((param) => {
        const data = param.points.map((p) => ({
          date: new Date(p.date).toLocaleDateString(),
          value: p.value,
          inRange: p.in_range,
        }));
        return (
          <div key={param.parameter} className="panel p-4">
            <h4 className="font-medium mb-3 text-slate-200">
              {param.parameter} {param.unit ? `(${param.unit})` : ""}
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" {...axis} stroke="#64748b" />
                <YAxis {...axis} stroke="#64748b" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: "#94a3b8" }} />
                <Line type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} dot={{ r: 4, fill: "#4f46e5" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
