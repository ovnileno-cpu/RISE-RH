'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { ClipboardCheck, Star, Plus, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

export default function EvaluationsPage() {
  const { user, role } = useAuth();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ employeeId: '', campaign: '', score: 0, comments: '' });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let evalQuery = collection(db, 'evaluations') as any;
      if (role === 'employee') {
        evalQuery = query(collection(db, 'evaluations'), where('employeeId', '==', user.uid));
      }

      const [empSnap, evalSnap] = await Promise.all([
        getDocs(collection(db, 'employees')),
        getDocs(evalQuery)
      ]);

      setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEvaluations(evalSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching evaluations", error);
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'evaluations'), { 
        ...formData, 
        score: Number(formData.score),
        date: new Date().toISOString() 
      });
      setShowModal(false);
      setFormData({ employeeId: '', campaign: '', score: 0, comments: '' });
      fetchData();
    } catch (error) {
      console.error("Error adding evaluation", error);
    }
  };

  const generatePDF = (ev: any, emp: any) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("RISE HR - Rapport d'Évaluation", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Employé: ${emp ? `${emp.firstName} ${emp.lastName}` : 'Inconnu'}`, 20, 40);
    doc.text(`Campagne: ${ev.campaign}`, 20, 50);
    doc.text(`Date: ${new Date(ev.date).toLocaleDateString('fr-FR')}`, 20, 60);
    
    doc.line(20, 65, 190, 65);
    
    doc.setFontSize(14);
    doc.text(`Score Global: ${ev.score} / 5`, 20, 80);
    
    doc.setFontSize(12);
    doc.text("Commentaires:", 20, 100);
    
    const splitComments = doc.splitTextToSize(ev.comments || 'Aucun commentaire.', 170);
    doc.text(splitComments, 20, 110);
    
    doc.save(`Evaluation_${emp?.lastName || 'Inconnu'}_${ev.campaign}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Évaluations</h1>
          <p className="text-gray-500 mt-1">Campagnes d&apos;entretiens et grilles d&apos;évaluation</p>
        </div>
        {role !== 'employee' && (
          <button onClick={() => setShowModal(true)} className="bg-[#1B2A4A] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#2A3F6C] transition-colors">
            <Plus size={16} /> Nouvelle évaluation
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Historique des évaluations</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-sm font-medium text-gray-500">Campagne</th>
                <th className="p-4 text-sm font-medium text-gray-500">Employé</th>
                <th className="p-4 text-sm font-medium text-gray-500">Score Global</th>
                <th className="p-4 text-sm font-medium text-gray-500">Date</th>
                <th className="p-4 text-sm font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center">Chargement...</td></tr>
              ) : evaluations.map(ev => {
                const emp = employees.find(e => e.id === ev.employeeId);
                return (
                  <tr key={ev.id} className="border-b border-gray-50">
                    <td className="p-4 text-sm text-gray-900 font-medium">{ev.campaign}</td>
                    <td className="p-4 text-sm text-gray-600">{emp ? `${emp.firstName} ${emp.lastName}` : 'Inconnu'}</td>
                    <td className="p-4 text-sm text-gray-600 flex items-center gap-1">
                      {ev.score} <Star size={14} className="text-amber-400 fill-amber-400" />
                    </td>
                    <td className="p-4 text-sm text-gray-600">{new Date(ev.date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 text-sm text-right">
                      <button onClick={() => generatePDF(ev, emp)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors inline-flex items-center gap-1" title="Exporter en PDF">
                        <FileText size={16} /> <span className="text-xs">PDF</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && evaluations.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Aucune évaluation trouvée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && role !== 'employee' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Nouvelle évaluation</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <select required className="w-full border rounded-lg p-2" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})}>
                <option value="">Sélectionner un employé...</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
              </select>
              <input required type="text" placeholder="Nom de la campagne (ex: Annuelle 2026)" className="w-full border rounded-lg p-2" value={formData.campaign} onChange={e => setFormData({...formData, campaign: e.target.value})} />
              <input required type="number" min="1" max="5" step="0.1" placeholder="Score (1 à 5)" className="w-full border rounded-lg p-2" value={formData.score || ''} onChange={e => setFormData({...formData, score: Number(e.target.value)})} />
              <textarea placeholder="Commentaires" className="w-full border rounded-lg p-2" value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} />
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
