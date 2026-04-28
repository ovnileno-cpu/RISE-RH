'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { GraduationCap, BookOpen, Award, Plus } from 'lucide-react';

export default function TrainingPage() {
  const { role } = useAuth();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', department: '', budget: 0, hours: 0, status: 'planned' });

  const fetchTrainings = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'trainings'));
      setTrainings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching trainings", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'trainings'), { 
        ...formData, 
        budget: Number(formData.budget),
        hours: Number(formData.hours)
      });
      setShowModal(false);
      setFormData({ title: '', department: '', budget: 0, hours: 0, status: 'planned' });
      fetchTrainings();
    } catch (error) {
      console.error("Error adding training", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Formation & Compétences</h1>
          <p className="text-gray-500 mt-1">Catalogue de formations et suivi des compétences</p>
        </div>
        {role !== 'employee' && (
          <button onClick={() => setShowModal(true)} className="bg-[#1B2A4A] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#2A3F6C] transition-colors">
            <Plus size={16} /> Nouvelle formation
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Catalogue</h3>
              <p className="text-sm text-gray-500">{trainings.length} formations dispo.</p>
            </div>
          </div>
          <button className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            Parcourir
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <GraduationCap size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Mes Formations</h3>
              <p className="text-sm text-gray-500">0 en cours</p>
            </div>
          </div>
          <button className="w-full py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
            Voir le suivi
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <Award size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Compétences</h3>
              <p className="text-sm text-gray-500">Cartographie</p>
            </div>
          </div>
          <button className="w-full py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            Évaluer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Plan de formation annuel</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-sm font-medium text-gray-500">Formation</th>
                <th className="p-4 text-sm font-medium text-gray-500">Département</th>
                <th className="p-4 text-sm font-medium text-gray-500">Durée (h)</th>
                {role !== 'employee' && <th className="p-4 text-sm font-medium text-gray-500">Budget</th>}
                <th className="p-4 text-sm font-medium text-gray-500">Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={role !== 'employee' ? 5 : 4} className="p-4 text-center">Chargement...</td></tr>
              ) : trainings.map(t => (
                <tr key={t.id} className="border-b border-gray-50">
                  <td className="p-4 text-sm text-gray-900 font-medium">{t.title}</td>
                  <td className="p-4 text-sm text-gray-600">{t.department}</td>
                  <td className="p-4 text-sm text-gray-600">{t.hours || 0}h</td>
                  {role !== 'employee' && <td className="p-4 text-sm text-gray-600">{t.budget.toLocaleString()} Ar</td>}
                  <td className="p-4 text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${t.status === 'planned' ? 'bg-amber-50 text-amber-700' : t.status === 'active' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {t.status === 'planned' ? 'Planifié' : t.status === 'active' ? 'En cours' : 'Terminé'}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && trainings.length === 0 && (
                <tr><td colSpan={role !== 'employee' ? 5 : 4} className="p-4 text-center text-gray-500">Aucune formation planifiée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && role !== 'employee' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Nouvelle formation</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required type="text" placeholder="Titre de la formation" className="w-full border rounded-lg p-2" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input required type="text" placeholder="Département ciblé" className="w-full border rounded-lg p-2" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" placeholder="Budget (Ar)" className="w-full border rounded-lg p-2" value={formData.budget || ''} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
                <input required type="number" placeholder="Durée (heures)" className="w-full border rounded-lg p-2" value={formData.hours || ''} onChange={e => setFormData({...formData, hours: Number(e.target.value)})} />
              </div>
              <select className="w-full border rounded-lg p-2" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="planned">Planifié</option>
                <option value="active">En cours</option>
                <option value="completed">Terminé</option>
              </select>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-[#1B2A4A] text-white rounded-lg hover:bg-[#2A3F6C]">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
