import { ReactNode, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlignJustify, BarChart3, BookOpen, Bot, FileSpreadsheet, Layers3, ListTree, Map, Settings2 } from 'lucide-react';
import clsx from 'clsx';

const navigation = [
  { to: '/', label: 'Tổng quan', icon: BarChart3 },
  { to: '/tours', label: 'Tour nội bộ', icon: Map },
  { to: '/ai', label: 'AI Extraction', icon: Bot },
  { to: '/instructions', label: 'Prompt Builder', icon: BookOpen },
  { to: '/schemas', label: 'Schema', icon: Layers3 },
  { to: '/master-data', label: 'Master Data', icon: Settings2 },
  { to: '/extractions', label: 'Extraction Log', icon: ListTree },
  { to: '/reports', label: 'Xuất Excel', icon: FileSpreadsheet },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = useMemo(() => {
    if (location.pathname === '/') return navigation[0];
    return navigation.find((item) => item.to !== '/' && location.pathname.startsWith(item.to)) ?? navigation[0];
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="lg:grid lg:grid-cols-[280px_1fr] min-h-screen">
        <aside
          className={clsx(
            'bg-white shadow-lg border-r border-slate-200 z-30 flex flex-col',
            'lg:translate-x-0 lg:static fixed inset-y-0 left-0 w-72 transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Cursor Travel</p>
              <p className="text-lg font-semibold text-slate-900">Tour Cost Console</p>
            </div>
            <button
              type="button"
              className="lg:hidden inline-flex items-center justify-center rounded-md border border-slate-200 p-2"
              onClick={() => setMobileOpen(false)}
            >
              <AlignJustify className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.to ||
                (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-100 shadow-sm'
                      : 'text-slate-600 hover:text-primary-600 hover:bg-primary-50/60',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-6 py-5 border-t border-slate-200 text-xs text-slate-500">
            <p>Firebase Project: quantum-ratio-468010-d4</p>
            <p>Environment: {import.meta.env.MODE}</p>
            <p className="mt-2">© {new Date().getFullYear()} Cursor Travel Internal</p>
          </div>
        </aside>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="lg:hidden inline-flex items-center justify-center rounded-md border border-slate-200 p-2"
                  onClick={() => setMobileOpen((prev) => !prev)}
                >
                  <AlignJustify className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Cursor Tour Cost</p>
                  <h1 className="text-xl font-semibold text-slate-900">
                    {activeItem?.label ?? 'Tổng quan'}
                  </h1>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
                <div>
                  <p className="font-medium text-slate-700">Gemini API</p>
                  <p className="text-xs">Kết nối thông qua Cloud Functions</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Firestore</p>
                  <p className="text-xs">Dữ liệu realtime &amp; chuẩn hóa</p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
            <div className="max-w-7xl mx-auto space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
