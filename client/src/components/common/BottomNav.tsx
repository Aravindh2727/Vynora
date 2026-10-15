import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CreditCard, Plus, CheckSquare, Settings } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      id: 'finance',
      label: 'Finance',
      path: '/finance',
      icon: CreditCard,
      isActive: location.pathname.startsWith('/finance') && !location.search.includes('action=new')
    },
    {
      id: 'expense',
      label: 'Expense',
      path: '/finance?action=new',
      icon: Plus,
      isExpense: true,
      isActive: location.search.includes('action=new')
    },
    {
      id: 'home',
      label: 'Home',
      path: '/',
      icon: Home,
      isCenter: true,
      isActive: location.pathname === '/'
    },
    {
      id: 'tasks',
      label: 'Tasks',
      path: '/tasks',
      icon: CheckSquare,
      isActive: location.pathname.startsWith('/tasks')
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      isActive: location.pathname.startsWith('/settings')
    }
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-glass px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(0,0,0,0.25)]"
    >
      <div className="grid grid-cols-5 max-w-md mx-auto items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          const isExpense = (item as any).isExpense;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all min-h-[42px] group active:scale-95 w-full"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* Icon Container — Identical h-7 height and centering for all 5 navigation items */}
              <div className="h-7 flex items-center justify-center">
                {isExpense ? (
                  /* Red circular '+' button positioned consistently within the navigation area */
                  <div
                    className={`w-6 h-6 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-rose-400 text-white flex items-center justify-center shadow-sm transition-all duration-200 ${
                      active
                        ? 'ring-2 ring-rose-400 ring-offset-1 ring-offset-background scale-110 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                        : 'group-hover:scale-105'
                    }`}
                  >
                    <Icon size={15} strokeWidth={3} className="text-white" />
                  </div>
                ) : (
                  /* Standard Navigation Icon */
                  <div
                    className={`transition-all duration-200 flex items-center justify-center ${
                      active
                        ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(0,242,254,0.4)]'
                        : 'text-textMuted group-hover:text-textMain'
                    }`}
                  >
                    <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
                  </div>
                )}
              </div>

              {/* Text Label — Identical mt-1 and font size for all 5 navigation items */}
              <span
                className={`text-[10px] leading-tight tracking-tight mt-1 transition-colors ${
                  isExpense
                    ? active
                      ? 'text-rose-500 dark:text-rose-400 font-bold'
                      : 'text-rose-500/90 dark:text-rose-400/90 font-medium group-hover:text-rose-400'
                    : active
                    ? 'text-primary font-bold'
                    : 'text-textMuted font-medium group-hover:text-textMain'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
