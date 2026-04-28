'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { Users, CalendarOff, GraduationCap, ClipboardCheck, AlertCircle, UserCircle, Award } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export default function DashboardPage() {
  const { role, user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState({
    employees: 0,
    leaves: 0,
    trainings: 0,
    evaluations: 0
  });
  const [leaveBalance, setLeaveBalance] = useState(0);
  const [deptData, setDeptData] = useState<{name: string, value: number}[]>([]);
  const [absenceData, setAbsenceData] = useState<{name: string, absences: number}[]>([]);
  const [alerts, setAlerts] = useState<{text: string, type: string}[]>([]);
  const COLORS = ['#1B2A4A', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !role) return;
      
      try {
        if (role === 'employee') {
          // Fetch employee data to calculate balance
          const empDoc = await getDoc(doc(db, 'employees', user.uid));
          if (empDoc.exists()) {
            const empData = empDoc.data();
            if (empData.startDate) {
              const start = new Date(empData.startDate);
              const now = new Date();
              const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
              setLeaveBalance(Math.max(0, months * 2.5));
            }
          }
        } else {
          // Fetch real data for stats
          const [empSnap, leavesSnap, trainingsSnap, evalsSnap] = await Promise.all([
            getDocs(collection(db, 'employees')),
            getDocs(collection(db, 'leaves')),
            getDocs(collection(db, 'trainings')),
            getDocs(collection(db, 'evaluations'))
          ]);
          
          const employees = empSnap.docs.map(d => d.data());
          const leaves = leavesSnap.docs.map(d => d.data());

          setStats({
            employees: empSnap.size,
            leaves: leaves.filter(l => l.status === 'pending').length,
            trainings: trainingsSnap.size,
            evaluations: evalsSnap.size
          });

          // Department distribution
          const depts: Record<string, number> = {};
          employees.forEach(emp => {
            const d = emp.department || 'Non défini';
            depts[d] = (depts[d] || 0) + 1;
          });
          setDeptData(Object.entries(depts).map(([name, value]) => ({ name, value })));

          // Absences evolution (last 6 months)
          const now = new Date();
          const monthsNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
          const absData = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth();
            const count = leaves.filter(l => {
              const start = new Date(l.startDate);
              return l.status === 'approved_rh' && start.getMonth() === m && start.getFullYear() === d.getFullYear();
            }).length;
            absData.push({ name: monthsNames[m], absences: count });
          }
          setAbsenceData(absData);

          // Real Alerts
          const newAlerts = [];
          const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
          if (pendingLeaves > 0) {
            newAlerts.push({ text: `<strong>${pendingLeaves} demandes de congés</strong> en attente de validation.`, type: 'blue' });
          }

          const expiringCDD = employees.filter(emp => {
            if (emp.contractType !== 'CDD' || !emp.contractEndDate) return false;
            const end = new Date(emp.contractEndDate);
            const diff = end.getTime() - now.getTime();
            return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
          }).length;
          if (expiringCDD > 0) {
            newAlerts.push({ text: `<strong>${expiringCDD} contrats CDD</strong> expirent dans moins de 30 jours.`, type: 'amber' });
          }

          if (newAlerts.length === 0) {
            newAlerts.push({ text: "Aucune alerte urgente pour le moment.", type: 'blue' });
          }
          setAlerts(newAlerts);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, [user, role]);

  if (role === 'employee') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.displayName}</h1>
          <p className="text-gray-500 mt-1">Bienvenue sur votre espace personnel RISE HR</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/dashboard/profile" className="bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.04)] border border-gray-100/80 p-7 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex items-center gap-5 group">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <UserCircle size={28} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Mon Dossier RH</h3>
              <p className="text-sm text-gray-500 mt-0.5">Voir mes infos et fiches de paie</p>
            </div>
          </Link>

          <Link href="/dashboard/leaves" className="bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.04)] border border-gray-100/80 p-7 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex items-center gap-5 group">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-emerald-600 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CalendarOff size={28} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Mes Congés</h3>
              <p className="text-sm text-gray-500 mt-0.5">Solde: <span className="font-medium text-emerald-600">{leaveBalance}</span> jours</p>
            </div>
          </Link>

          <Link href="/dashboard/onboarding" className="bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.04)] border border-gray-100/80 p-7 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex items-center gap-5 group">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-purple-600 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Award size={28} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Mon Intégration</h3>
              <p className="text-sm text-gray-500 mt-0.5">Voir mes tâches d&apos;accueil</p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  const kpis = [
    { title: t('dashboard.employees'), value: stats.employees, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { title: t('dashboard.leaves'), value: stats.leaves, icon: CalendarOff, color: 'text-emerald-600 bg-emerald-50' },
    { title: t('dashboard.trainings'), value: stats.trainings, icon: GraduationCap, color: 'text-amber-600 bg-amber-50' },
    { title: t('dashboard.evaluations'), value: stats.evaluations, icon: ClipboardCheck, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('nav.dashboard')}</h1>
        <p className="text-gray-500 mt-2 text-lg">Vue d&apos;ensemble de vos ressources humaines</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-gray-100/80 p-7 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${kpi.color}`}>
                <Icon size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{kpi.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-gray-100/80 p-7">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <CalendarOff size={20} className="text-gray-400" />
              Évolution des absences
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={absenceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                  <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="absences" fill="#1B2A4A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-gray-100/80 p-7">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Users size={20} className="text-gray-400" />
              Répartition par département
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {deptData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {entry.name}
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-gray-100/80 p-7">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertCircle className="text-amber-500" size={18} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('dashboard.alerts')}</h3>
            </div>
            <div className="space-y-3">
              {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                  <div key={index} className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
                    alert.type === 'amber' 
                      ? 'bg-amber-50/50 border-amber-100/50 text-amber-900' 
                      : 'bg-blue-50/50 border-blue-100/50 text-blue-900'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                      alert.type === 'amber' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <p dangerouslySetInnerHTML={{ __html: alert.text }} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">Aucune alerte pour le moment.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
