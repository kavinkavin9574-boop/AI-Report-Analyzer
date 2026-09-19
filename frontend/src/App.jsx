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
      <header className="sticky top-0 z-20 border-b border-white/10 bg-canvas/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white shadow-glow">
              AR
            </span>
            <div className="font-semibold text-[15px] tracking-tight text-slate-100">AI Report Analyzer</div>
          </div>
          <nav className="flex gap-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive
                    ? "rounded-full bg-white/10 px-3 py-1.5 font-medium text-white"
                    : "rounded-full px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/processing/:id" element={<Processing />} />
          <Route path="/reports/:id" element={<Dashboard />} />
          <Route path="/reports/:id/details" element={<ReportDetails />} />
          <Route path="/reports/:id/chat" element={<Chat />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </main>

      <footer className="border-t border-white/10 text-center text-xs text-slate-500 py-4">
        AI Report Analyzer — for informational purposes only, not medical advice.
      </footer>
    </div>
  );
}
