'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { ClipboardCheck, Star, Plus, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { useI18n } from '@/lib/i18n';

export default function EvaluationsPage() {
  const { user, role } = useAuth();
  const { t, lang } = useI18n();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({ employeeId: '', campaign: '', score: 0, comments: '' });

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
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
    if (formData.score < 1 || formData.score > 5) {
      setNotice({ type: 'error', text: t('eval.notice.invalidScore') });
      return;
    }
    try {
      await addDoc(collection(db, 'evaluations'), { 
        ...formData, 
        score: Number(formData.score),
        date: new Date().toISOString() 
      });
      setShowModal(false);
      setFormData({ employeeId: '', campaign: '', score: 0, comments: '' });
      fetchData();
      setNotice({ type: 'success', text: t('eval.notice.created') });
    } catch (error) {
      console.error("Error adding evaluation", error);
      setNotice({ type: 'error', text: t('eval.notice.createError') });
    }
  };

  const generatePDF = (ev: any, emp: any) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(t('eval.pdf.title'), 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`${t('eval.table.employee')}: ${emp ? `${emp.firstName} ${emp.lastName}` : t('eval.unknown')}`, 20, 40);
    doc.text(`${t('eval.table.campaign')}: ${ev.campaign}`, 20, 50);
    doc.text(`${t('eval.table.date')}: ${new Date(ev.date).toLocaleDateString(lang === 'mg' ? 'mg-MG' : 'fr-FR')}`, 20, 60);
    
    doc.line(20, 65, 190, 65);
    
    doc.setFontSize(14);
    doc.text(`${t('eval.table.score')}: ${ev.score} / 5`, 20, 80);
    
    doc.setFontSize(12);
    doc.text(`${t('eval.comments')}:`, 20, 100);
    
    const splitComments = doc.splitTextToSize(ev.comments || t('eval.noComments'), 170);
    doc.text(splitComments, 20, 110);
    
    doc.save(`Evaluation_${emp?.lastName || t('eval.unknown')}_${ev.campaign}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('eval.title')}</h1>
          <p className="text-gray-500 mt-1">{t('eval.subtitle')}</p>
        </div>
        {role !== 'employee' && (
          <button onClick={() => setShowModal(true)} className="bg-[#1B2A4A] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#2A3F6C] transition-colors">
            <Plus size={16} /> {t('eval.new')}
          </button>
        )}
      </div>

      {notice && (
        <div className={`rounded-lg p-3 text-sm border ${notice.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
          {notice.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('eval.history')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-sm font-medium text-gray-500">{t('eval.table.campaign')}</th>
                <th className="p-4 text-sm font-medium text-gray-500">{t('eval.table.employee')}</th>
                <th className="p-4 text-sm font-medium text-gray-500">{t('eval.table.score')}</th>
                <th className="p-4 text-sm font-medium text-gray-500">{t('eval.table.date')}</th>
                <th className="p-4 text-sm font-medium text-gray-500 text-right">{t('eval.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center">{t('common.loading')}</td></tr>
              ) : evaluations.map(ev => {
                const emp = employees.find(e => e.id === ev.employeeId);
                return (
                  <tr key={ev.id} className="border-b border-gray-50">
                    <td className="p-4 text-sm text-gray-900 font-medium">{ev.campaign}</td>
                    <td className="p-4 text-sm text-gray-600">{emp ? `${emp.firstName} ${emp.lastName}` : t('eval.unknown')}</td>
                    <td className="p-4 text-sm text-gray-600 flex items-center gap-1">
                      {ev.score} <Star size={14} className="text-amber-400 fill-amber-400" />
                    </td>
                    <td className="p-4 text-sm text-gray-600">{new Date(ev.date).toLocaleDateString(lang === 'mg' ? 'mg-MG' : 'fr-FR')}</td>
                    <td className="p-4 text-sm text-right">
                      <button onClick={() => generatePDF(ev, emp)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors inline-flex items-center gap-1" title={t('eval.exportPdf')}>
                        <FileText size={16} /> <span className="text-xs">PDF</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && evaluations.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">{t('eval.none')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && role !== 'employee' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{t('eval.new')}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <select required className="w-full border rounded-lg p-2" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})}>
                <option value="">{t('eval.selectEmployee')}</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
              </select>
              <input required type="text" placeholder={t('eval.campaignPlaceholder')} className="w-full border rounded-lg p-2" value={formData.campaign} onChange={e => setFormData({...formData, campaign: e.target.value})} />
              <input required type="number" min="1" max="5" step="0.1" placeholder={t('eval.scorePlaceholder')} className="w-full border rounded-lg p-2" value={formData.score || ''} onChange={e => setFormData({...formData, score: Number(e.target.value)})} />
              <textarea placeholder={t('eval.comments')} className="w-full border rounded-lg p-2" value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-[#1B2A4A] text-white rounded-lg hover:bg-[#2A3F6C]">{t('recruit.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
