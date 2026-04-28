'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useI18n } from '@/lib/i18n';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function LeaveManagementPage() {
  const { t } = useI18n();
  const { role } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empSnap, leavesSnap] = await Promise.all([
        getDocs(collection(db, 'employees')),
        getDocs(collection(db, 'leaves'))
      ]);
      
      setEmployees(empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const fetchedLeaves: any[] = leavesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort leaves by date descending
      fetchedLeaves.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setLeaves(fetchedLeaves);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'leaves', id), { status: newStatus });
      fetchData();
    } catch (error) {
      console.error("Error updating leave", error);
    }
  };

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des congés</h1>
        <p className="text-gray-500 mt-1">Gérez les demandes de congés de l&apos;équipe</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-sm font-medium text-gray-500">Employé</th>
                <th className="p-4 text-sm font-medium text-gray-500">Type</th>
                <th className="p-4 text-sm font-medium text-gray-500">Du</th>
                <th className="p-4 text-sm font-medium text-gray-500">Au</th>
                <th className="p-4 text-sm font-medium text-gray-500">Statut</th>
                <th className="p-4 text-sm font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(leave => {
                const emp = employees.find(e => e.id === leave.employeeId);
                return (
                  <tr key={leave.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4 text-sm text-gray-900 font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : 'Inconnu'}</td>
                    <td className="p-4 text-sm text-gray-600 capitalize">{leave.type.replace('_', ' ')}</td>
                    <td className="p-4 text-sm text-gray-600">{new Date(leave.startDate).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 text-sm text-gray-600">{new Date(leave.endDate).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        leave.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        leave.status === 'approved_manager' ? 'bg-blue-50 text-blue-700' :
                        leave.status === 'approved_rh' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {leave.status === 'pending' ? 'En attente' : 
                         leave.status === 'approved_manager' ? 'Validé Manager' : 
                         leave.status === 'approved_rh' ? 'Approuvé RH' : 'Refusé'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-right space-x-2">
                      {leave.status === 'pending' && role === 'manager' && (
                        <>
                          <button onClick={() => handleStatusUpdate(leave.id, 'approved_manager')} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors" title="Valider (Manager)"><Check size={18} /></button>
                          <button onClick={() => handleStatusUpdate(leave.id, 'rejected')} className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors" title="Refuser"><X size={18} /></button>
                        </>
                      )}
                      {(leave.status === 'pending' || leave.status === 'approved_manager') && role === 'admin' && (
                        <>
                          <button onClick={() => handleStatusUpdate(leave.id, 'approved_rh')} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors" title="Approuver (RH)"><Check size={18} /></button>
                          <button onClick={() => handleStatusUpdate(leave.id, 'rejected')} className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors" title="Refuser"><X size={18} /></button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Aucune demande de congé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}