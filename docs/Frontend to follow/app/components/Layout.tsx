import { Link, useLocation, Outlet } from 'react-router';
import { LayoutDashboard, CalendarDays, Dice3, Trophy, User, Shield } from 'lucide-react';
import { getCurrentUser } from '../data/mockData';
import { useEffect } from 'react';

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Événements', href: '/events', icon: CalendarDays },
  { name: 'Casino', href: '/casino', icon: Dice3 },
  { name: 'Classement', href: '/leaderboard', icon: Trophy },
  { name: 'Profil', href: '/profile', icon: User },
];

export function Layout() {
  const location = useLocation();
  const currentUser = getCurrentUser();

  useEffect(() => {
    // Ensure dark mode is applied
    document.documentElement.classList.add('dark');
  }, []);

  const allNavigation = currentUser.isAdmin 
    ? [...navigation, { name: 'Admin', href: '/admin', icon: Shield }]
    : navigation;

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-zinc-800 bg-zinc-900 hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-zinc-800">
            <Dice3 className="size-8 text-emerald-500" />
            <span className="ml-3 text-xl font-semibold">SIGambling</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {allNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="size-5" />
                  <span className="ml-3">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-zinc-800">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800">
              <div>
                <div className="text-sm text-zinc-400">Solde</div>
                <div className="text-lg font-semibold text-emerald-500">
                  {currentUser.tokens.toLocaleString()}
                </div>
              </div>
              <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-semibold">
                #{currentUser.rank}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-zinc-900 border-t border-zinc-800 lg:hidden z-50">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {allNavigation.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'text-zinc-400'
                }`}
              >
                <Icon className="size-5" />
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            );
          })}
        </div>
        {/* Show Admin in mobile if user is admin and it's not in first 5 */}
        {currentUser.isAdmin && allNavigation.length > 5 && (
          <div className="border-t border-zinc-800 px-2 pb-2">
            <Link
              to="/admin"
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors ${
                isActive('/admin')
                  ? 'bg-purple-500/10 text-purple-500'
                  : 'text-zinc-400 bg-zinc-800'
              }`}
            >
              <Shield className="size-4" />
              <span className="text-sm">Panneau Admin</span>
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
}