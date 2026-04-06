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
  BookOpen,
  Gift,
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
  { to: '/resources',    label: 'Resources',           icon: BookOpen },
];

const utilNav = [
  { to: '/upload', label: 'Upload Data', icon: Upload },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
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
  );
}

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-brand-950 min-h-screen flex flex-col">
      {/* Logo / client name */}
      <div className="px-5 py-5 border-b border-brand-800">
        <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest">YES Staffing</p>
        <h1 className="text-white font-bold text-base leading-tight mt-0.5">Compass Minerals</h1>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3">
        {nav.map(({ to, label, icon }) => (
          <NavItem key={to} to={to} label={label} icon={icon} end={to === '/'} />
        ))}

        {/* Recognition section */}
        <div className="mt-3 pt-3 border-t border-brand-800">
          <p className="px-4 pb-1 text-xs font-semibold text-brand-500 uppercase tracking-widest">Recognition</p>
          <NavItem to="/recognition" label="Recognition" icon={Gift} />
        </div>

        <div className="mt-3 pt-3 border-t border-brand-800">
          {utilNav.map(({ to, label, icon }) => (
            <NavItem key={to} to={to} label={label} icon={icon} />
          ))}
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-brand-800">
        <p className="text-xs text-brand-500">Compass Dashboard v1.0</p>
      </div>
    </aside>
  );
}
