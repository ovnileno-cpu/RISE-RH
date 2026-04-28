'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { logOut } from '@/lib/firebase';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  GraduationCap, 
  ClipboardCheck, 
  LogOut,
  Building2,
  UserCircle,
  Award,
  CalendarOff,
  Settings
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Chargement...</div>;
  }

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard'), roles: ['admin', 'manager', 'employee'] },
    { href: '/dashboard/profile', icon: UserCircle, label: 'Mon Dossier RH', roles: ['admin', 'manager', 'employee'] },
    { href: '/dashboard/onboarding', icon: Award, label: 'Intégration', roles: ['admin', 'manager', 'employee'] },
    { href: '/dashboard/leaves', icon: CalendarOff, label: 'Mes Congés', roles: ['manager', 'employee'] },
    { href: '/dashboard/leave-management', icon: CalendarOff, label: 'Congés & Absences', roles: ['admin', 'manager'] },
    { href: '/dashboard/admin', icon: Users, label: t('nav.admin'), roles: ['admin', 'manager'] },
    { href: '/dashboard/recruitment', icon: Briefcase, label: t('nav.recruitment'), roles: ['admin', 'manager'] },
    { href: '/dashboard/training', icon: GraduationCap, label: t('nav.training'), roles: ['admin', 'manager', 'employee'] },
    { href: '/dashboard/evaluations', icon: ClipboardCheck, label: t('nav.evaluation'), roles: ['admin', 'manager', 'employee'] },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0B152A] text-[#9ca3af] flex flex-col fixed h-full z-10 border-r border-[#1a2b4b]">
        <div className="p-7 flex items-center gap-3 border-b border-[#1a2b4b]">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">RISE HR</span>
        </div>

        <div className="p-5 border-b border-[#1a2b4b] bg-[#0f1b33]">
          <p className="text-sm font-medium text-white truncate">{user.displayName || user.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <p className="text-xs text-blue-300 font-medium capitalize">{role}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto sidebar-nav-scrollbar">
          {navItems.filter(item => item.roles.includes(role || '')).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 font-medium' 
                    : 'hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-300"} />
                <span className="text-sm tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-5 border-t border-[#1a2b4b] space-y-3 bg-[#0f1b33]">
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-xl transition-all duration-200 group ${
              pathname === '/dashboard/settings' 
                ? 'bg-blue-600/10 text-blue-400 font-medium' 
                : 'hover:bg-white/5 hover:text-white'
            }`}
          >
            <Settings size={20} className={pathname === '/dashboard/settings' ? "text-blue-500" : "text-gray-400 group-hover:text-gray-300"} />
            <span className="text-sm tracking-wide">Paramètres</span>
          </Link>

          <button
            onClick={logOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
          >
            <LogOut size={20} className="text-red-400 opacity-70 group-hover:opacity-100 transition-opacity" />
            <span className="text-sm tracking-wide">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 bg-[#f8f9fc] min-h-screen relative shadow-[inset_1px_0_0_0_rgba(0,0,0,0.05)]">
        {/* Subtle top gradient for depth */}
        <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-[#eef2f6] to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto p-8 md:p-10 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
