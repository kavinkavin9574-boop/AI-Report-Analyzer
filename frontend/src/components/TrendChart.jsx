import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

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
          <div key={param.parameter} className="bg-white rounded-lg border p-4">
            <h4 className="font-medium mb-2">
              {param.parameter} {param.unit ? `(${param.unit})` : ""}
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
