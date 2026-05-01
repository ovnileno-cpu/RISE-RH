'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { CalendarOff, Clock, Plus, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function LeavesPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(0);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    type: 'annuel',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'leaves'), where('employeeId', '==', user.uid));
      
      const [snap, empDoc] = await Promise.all([
        getDocs(q),
        getDoc(doc(db, 'employees', user.uid))
      ]);

      const fetchedLeaves: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort leaves by date descending
      fetchedLeaves.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setLeaves(fetchedLeaves);

      // Calculate used leaves (only for 'annuel')
      let usedDays = 0;
      fetchedLeaves.forEach(leave => {
        if (leave.type === 'annuel' && leave.status !== 'rejected') {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          usedDays += diffDays;
        }
      });

      if (empDoc.exists()) {
        const empData = empDoc.data();
        if (empData.startDate) {
          const start = new Date(empData.startDate);
          const now = new Date();
          const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
          const totalEarned = Math.max(0, months * 2.5);
          setLeaveBalance(Math.max(0, totalEarned - usedDays));
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError('');
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (end < start) {
      setFormError(t('leaves.error.endBeforeStart'));
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (formData.type === 'annuel' && requestedDays > leaveBalance) {
      setFormError(t('leaves.error.insufficient').replace('{requested}', String(requestedDays)).replace('{balance}', String(leaveBalance)));
      return;
    }
    
    try {
      await addDoc(collection(db, 'leaves'), {
        employeeId: user.uid,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        status: 'pending', // Workflow: pending -> approved_manager -> approved_rh
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setFormData({ type: 'annuel', startDate: '', endDate: '', reason: '' });
      fetchData();
    } catch (error) {
      console.error("Error submitting leave:", error);
      setFormError(t('leaves.error.submit'));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('leaves.confirmDelete'))) {
      try {
        await deleteDoc(doc(db, 'leaves', id));
        fetchData();
      } catch (error) {
        console.error("Error deleting leave:", error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-medium"><Clock size={14} /> {t('leaves.status.pending')}</span>;
      case 'approved_manager': return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 size={14} /> {t('leaves.status.approvedManager')}</span>;
      case 'approved_rh': return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 size={14} /> {t('leaves.status.approvedRh')}</span>;
      case 'rejected': return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium"><XCircle size={14} /> {t('leaves.status.rejected')}</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('leaves.title')}</h1>
          <p className="text-gray-500 mt-1">{t('leaves.subtitle')}</p>
        </div>
        <button onClick={() => { setFormError(''); setShowModal(true); }} className="bg-[#1B2A4A] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#2A3F6C] transition-colors">
          <Plus size={16} /> {t('leaves.newRequest')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <CalendarOff size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t('leaves.balancePaid')}</p>
              <h3 className="text-2xl font-bold text-gray-900">{leaveBalance} <span className="text-sm font-normal text-gray-500">{t('leaves.days')}</span></h3>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">{t('leaves.earnedRate')}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('leaves.history')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-sm font-medium text-gray-500">{t('leaves.table.type')}</th>
                <th className="p-4 text-sm font-medium text-gray-500">{t('leaves.table.from')}</th>
                <th className="p-4 text-sm font-medium text-gray-500">{t('leaves.table.to')}</th>
                <th className="p-4 text-sm font-medium text-gray-500">{t('leaves.table.reason')}</th>
                <th className="p-4 text-sm font-medium text-gray-500">{t('leaves.table.status')}</th>
                <th className="p-4 text-sm font-medium text-gray-500 text-right">{t('leaves.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-center">{t('common.loading')}</td></tr>
              ) : leaves.map(leave => (
                <tr key={leave.id} className="border-b border-gray-50">
                  <td className="p-4 text-sm text-gray-900 font-medium capitalize">{t(`leaves.type.${leave.type}`)}</td>
                  <td className="p-4 text-sm text-gray-600">{new Date(leave.startDate).toLocaleDateString(lang === 'mg' ? 'mg-MG' : 'fr-FR')}</td>
                  <td className="p-4 text-sm text-gray-600">{new Date(leave.endDate).toLocaleDateString(lang === 'mg' ? 'mg-MG' : 'fr-FR')}</td>
                  <td className="p-4 text-sm text-gray-600">{leave.reason || '-'}</td>
                  <td className="p-4 text-sm">{getStatusBadge(leave.status)}</td>
                  <td className="p-4 text-sm text-right">
                    {leave.status === 'pending' && (
                      <button onClick={() => handleDelete(leave.id)} className="text-red-500 hover:text-red-700 transition-colors" title={t('leaves.cancelRequest')}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && leaves.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">{t('leaves.none')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{t('leaves.modalTitle')}</h3>
            {formError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('leaves.leaveType')}</label>
                <select required className="w-full border border-gray-300 rounded-lg p-2" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="annuel">{t('leaves.type.annuel')}</option>
                  <option value="maladie">{t('leaves.type.maladie')}</option>
                  <option value="maternite">{t('leaves.type.maternite')}</option>
                  <option value="paternite">{t('leaves.type.paternite')}</option>
                  <option value="sans_solde">{t('leaves.type.sans_solde')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('leaves.startDate')}</label>
                  <input required type="date" className="w-full border border-gray-300 rounded-lg p-2" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('leaves.endDate')}</label>
                  <input required type="date" className="w-full border border-gray-300 rounded-lg p-2" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('leaves.reasonOptional')}</label>
                <textarea className="w-full border border-gray-300 rounded-lg p-2" rows={3} value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-[#1B2A4A] text-white rounded-lg hover:bg-[#2A3F6C]">{t('leaves.submit')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
