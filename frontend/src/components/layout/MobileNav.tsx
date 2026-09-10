import type { FC } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Map as MapIcon,
  Users,
  Menu,
} from 'lucide-react';

interface MobileNavProps {
  onToggleMenu: () => void;
}

const MobileNav: FC<MobileNavProps> = ({ onToggleMenu }) => {
  const navItems = [
    { to: '/', label: 'HOME', icon: LayoutDashboard },
    { to: '/analysis', label: 'ANALYSIS', icon: BarChart3 },
    { to: '/survivors', label: 'SURVIVORS', icon: Users },
    { to: '/map', label: 'MAP', icon: MapIcon },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-[0_-2px_12px_rgba(15,23,42,0.1)]"
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold tracking-wider transition-all duration-150 min-w-[48px] ${
              isActive
                ? 'text-sky-600 bg-sky-50'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`
          }
        >
          {({ isActive }) => {
            const Icon = item.icon;
            return (
              <>
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </>
            );
          }}
        </NavLink>
      ))}

      {/* Menu Drawer Toggle */}
      <button
        type="button"
        onClick={onToggleMenu}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold tracking-wider text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all min-w-[48px]"
        aria-label="Open full menu"
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span>MENU</span>
      </button>
    </nav>
  );
};

export default MobileNav;
