import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ShieldAlert,
  UserX,
  ArrowRightLeft,
  Clock,
  BarChart2,
  Zap,
  Upload,
} from 'lucide-react';

const nav = [
  { to: '/',             label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/workers',      label: 'Workers',             icon: Users },
  { to: '/onboarding',   label: 'Onboarding',          icon: ClipboardList },
  { to: '/attendance',   label: 'Attendance',          icon: Clock },
  { to: '/waitlist',     label: 'Waitlist / Furlough', icon: Zap },
  { to: '/terminations', label: 'Terminations & DNA',  icon: UserX },
  { to: '/conversions',  label: 'Conversions',         icon: ArrowRightLeft },
  { to: '/injuries',     label: 'Injuries',            icon: ShieldAlert },
  { to: '/analytics',    label: 'Analytics',           icon: BarChart2 },
];

const utilNav = [
  { to: '/upload', label: 'Upload Data', icon: Upload },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-brand-950 min-h-screen flex flex-col">
      {/* Logo / client name */}
      <div className="px-5 py-5 border-b border-brand-800">
        <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest">YES Staffing</p>
        <h1 className="text-white font-bold text-base leading-tight mt-0.5">Compass Minerals</h1>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-brand-700 text-white font-medium'
                  : 'text-brand-300 hover:text-white hover:bg-brand-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        <div className="mt-3 pt-3 border-t border-brand-800">
          {utilNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-700 text-white font-medium'
                    : 'text-brand-300 hover:text-white hover:bg-brand-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-brand-800">
        <p className="text-xs text-brand-500">Compass Dashboard v1.0</p>
      </div>
    </aside>
  );
}
