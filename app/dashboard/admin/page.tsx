'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import EmployeesTab from './components/EmployeesTab';
import PayrollTab from './components/PayrollTab';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminPage() {
  const { t } = useI18n();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'signups'>('employees');
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const snap = await getDocs(collection(db, 'signupRequests'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((r: any) => r.status === 'pending');
      setRequests(data);
      setSelectedRoles(Object.fromEntries(data.map((r: any) => [r.id, 'employee'])));
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'signups') fetchRequests();
  }, [activeTab]);

  const approveRequest = async (req: any, roleValue: string) => {
    await setDoc(doc(db, 'users', req.uid), {
      uid: req.uid,
      email: req.email,
      displayName: req.displayName || req.email,
      role: roleValue,
      createdAt: serverTimestamp()
    }, { merge: true });
    await updateDoc(doc(db, 'signupRequests', req.id), { status: 'approved', approvedAt: serverTimestamp(), approvedRole: roleValue });
    fetchRequests();
  };

  const rejectRequest = async (req: any) => {
    await updateDoc(doc(db, 'signupRequests', req.id), { status: 'rejected', rejectedAt: serverTimestamp() });
    fetchRequests();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.admin')}</h1>
        <p className="text-gray-500 mt-1">{t('admin.subtitle')}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'employees' 
                ? 'border-b-2 border-[#1B2A4A] text-[#1B2A4A]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('admin.employees')}
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'payroll' 
                ? 'border-b-2 border-[#1B2A4A] text-[#1B2A4A]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('admin.payroll')}
          </button>
          <button
            onClick={() => setActiveTab('signups')}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'signups'
                ? 'border-b-2 border-[#1B2A4A] text-[#1B2A4A]'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('admin.signups')}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'employees' && <EmployeesTab />}
          {activeTab === 'payroll' && <PayrollTab />}
          {activeTab === 'signups' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('admin.signupsTitle')}</h3>
              {loadingRequests ? (
                <p>{t('common.loading')}</p>
              ) : requests.length === 0 ? (
                <p className="text-gray-500">{t('admin.signupsEmpty')}</p>
              ) : requests.map((req) => (
                <div key={req.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-medium">{req.displayName || t('eval.unknown')}</p>
                    <p className="text-sm text-gray-500">{req.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedRoles[req.id] || 'employee'}
                      onChange={(e) => setSelectedRoles(prev => ({ ...prev, [req.id]: e.target.value }))}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="employee">{t('admin.role.employee')}</option>
                      <option value="manager">{t('admin.role.manager')}</option>
                      <option value="admin">{t('admin.role.admin')}</option>
                    </select>
                    <button onClick={() => approveRequest(req, selectedRoles[req.id] || 'employee')} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">{t('admin.approve')}</button>
                    <button onClick={() => rejectRequest(req)} className="px-3 py-1 bg-red-600 text-white rounded text-sm">{t('admin.reject')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
