import { NavLink, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Processing from "./pages/Processing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ReportDetails from "./pages/ReportDetails.jsx";
import Compare from "./pages/Compare.jsx";
import Chat from "./pages/Chat.jsx";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/compare", label: "Compare" },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold text-lg text-brand-700">AI Report Analyzer</div>
          <nav className="flex gap-4 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? "text-brand-600 font-medium" : "text-slate-500 hover:text-slate-800"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/processing/:id" element={<Processing />} />
          <Route path="/reports/:id" element={<Dashboard />} />
          <Route path="/reports/:id/details" element={<ReportDetails />} />
          <Route path="/reports/:id/chat" element={<Chat />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </main>

      <footer className="border-t bg-white text-center text-xs text-slate-400 py-3">
        AI Report Analyzer — for informational purposes only, not medical advice.
      </footer>
    </div>
  );
}
