'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Plus, Briefcase, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function RecruitmentPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'offers' | 'pipeline'>('offers');
  const [offers, setOffers] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  
  const [offerForm, setOfferForm] = useState({ title: '', department: '', location: '', contractType: 'CDI', description: '', status: 'ouvert' });
  const [candidateForm, setCandidateForm] = useState({ jobOfferId: '', firstName: '', lastName: '', email: '', status: 'Reçu', notes: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [offersSnap, candSnap] = await Promise.all([
        getDocs(collection(db, 'jobOffers')),
        getDocs(collection(db, 'candidates'))
      ]);

      setOffers(offersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCandidates(candSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching recruitment data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'jobOffers'), { ...offerForm, createdAt: new Date().toISOString() });
      setShowOfferModal(false);
      setOfferForm({ title: '', department: '', location: '', contractType: 'CDI', description: '', status: 'ouvert' });
      fetchData();
    } catch (error) {
      console.error("Error adding offer", error);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'candidates'), { ...candidateForm, createdAt: new Date().toISOString() });
      setShowCandidateModal(false);
      setCandidateForm({ jobOfferId: '', firstName: '', lastName: '', email: '', status: 'Reçu', notes: '' });
      fetchData();
    } catch (error) {
      console.error("Error adding candidate", error);
    }
  };

  const updateCandidateStatus = async (candidateId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'candidates', candidateId), { status: newStatus });
      fetchData();
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  const pipelineStatuses = ['Reçu', 'Présélectionné', 'Entretien', 'Décision', 'Retenu', 'Refusé'];
  const statusLabels: Record<string, string> = {
    'Reçu': t('recruit.status.received'),
    'Présélectionné': t('recruit.status.shortlisted'),
    'Entretien': t('recruit.status.interview'),
    'Décision': t('recruit.status.decision'),
    'Retenu': t('recruit.status.selected'),
    'Refusé': t('recruit.status.rejected')
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('recruit.title')}</h1>
          <p className="text-gray-500 mt-1">{t('recruit.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCandidateModal(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <Plus size={16} /> Candidat
          </button>
          <button onClick={() => setShowOfferModal(true)} className="bg-[#1B2A4A] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#2A3F6C] transition-colors">
            <Plus size={16} /> Nouvelle offre
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('offers')}
            className={`px-6 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'offers' ? 'border-b-2 border-[#1B2A4A] text-[#1B2A4A]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <Briefcase size={18} /> {t('recruit.tab.offers')}
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-6 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'pipeline' ? 'border-b-2 border-[#1B2A4A] text-[#1B2A4A]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <Users size={18} /> {t('recruit.tab.pipeline')}
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div>{t('common.loading')}</div>
          ) : activeTab === 'offers' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {offers.map(offer => (
                <div key={offer.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-gray-900">{offer.title}</h3>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${offer.status === 'ouvert' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                      {offer.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 mb-6">
                    <p>{t('recruit.department')}: {offer.department}</p>
                    <p>{t('recruit.location')}: {offer.location}</p>
                    <p>{t('recruit.contract')}: {offer.contractType}</p>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-900">
                      {candidates.filter(c => c.jobOfferId === offer.id).length} {t('recruit.candidates')}
                    </span>
                    <button onClick={() => setActiveTab('pipeline')} className="text-blue-600 hover:text-blue-700 text-sm font-medium">{t('recruit.viewPipeline')}</button>
                  </div>
                </div>
              ))}
              {offers.length === 0 && <p className="text-gray-500 col-span-full">{t('recruit.noneOffers')}</p>}
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-4">
              {pipelineStatuses.map((status) => {
                const colCandidates = candidates.filter(c => c.status === status);
                return (
                  <div key={statusLabels[status] ?? status} className="min-w-[280px] bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-4 flex justify-between">
                      {statusLabels[status] ?? status}
                      <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">{colCandidates.length}</span>
                    </h4>
                    <div className="space-y-3">
                      {colCandidates.map(candidate => {
                        const offer = offers.find(o => o.id === candidate.jobOfferId);
                        return (
                          <div key={candidate.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <h5 className="font-medium text-gray-900">{candidate.firstName} {candidate.lastName}</h5>
                            <p className="text-xs text-gray-500 mt-1">{offer?.title || t('recruit.spontaneous')}</p>
                            <select 
                              className="mt-3 text-xs border border-gray-200 rounded p-1 w-full"
                              value={candidate.status}
                              onChange={(e) => updateCandidateStatus(candidate.id, e.target.value)}
                            >
                              {pipelineStatuses.map(s => <option key={s} value={s}>{statusLabels[s] ?? s}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{t('recruit.newOfferModal')}</h3>
            <form onSubmit={handleAddOffer} className="space-y-4">
              <input required type="text" placeholder="{t('recruit.positionTitle')}" className="w-full border rounded-lg p-2" value={offerForm.title} onChange={e => setOfferForm({...offerForm, title: e.target.value})} />
              <input required type="text" placeholder="Département" className="w-full border rounded-lg p-2" value={offerForm.department} onChange={e => setOfferForm({...offerForm, department: e.target.value})} />
              <input required type="text" placeholder="Lieu" className="w-full border rounded-lg p-2" value={offerForm.location} onChange={e => setOfferForm({...offerForm, location: e.target.value})} />
              <select className="w-full border rounded-lg p-2" value={offerForm.contractType} onChange={e => setOfferForm({...offerForm, contractType: e.target.value})}>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="Stage">Stage</option>
              </select>
              <textarea placeholder="{t('recruit.description')}" className="w-full border rounded-lg p-2" value={offerForm.description} onChange={e => setOfferForm({...offerForm, description: e.target.value})} />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowOfferModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-[#1B2A4A] text-white rounded-lg hover:bg-[#2A3F6C]">{t('recruit.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{t('recruit.newCandidate')}</h3>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <select required className="w-full border rounded-lg p-2" value={candidateForm.jobOfferId} onChange={e => setCandidateForm({...candidateForm, jobOfferId: e.target.value})}>
                <option value="">{t('recruit.selectOffer')}</option>
                {offers.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input required type="text" placeholder="{t('recruit.firstName')}" className="w-full border rounded-lg p-2" value={candidateForm.firstName} onChange={e => setCandidateForm({...candidateForm, firstName: e.target.value})} />
                <input required type="text" placeholder="{t('recruit.lastName')}" className="w-full border rounded-lg p-2" value={candidateForm.lastName} onChange={e => setCandidateForm({...candidateForm, lastName: e.target.value})} />
              </div>
              <input required type="email" placeholder="Email" className="w-full border rounded-lg p-2" value={candidateForm.email} onChange={e => setCandidateForm({...candidateForm, email: e.target.value})} />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCandidateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-[#1B2A4A] text-white rounded-lg hover:bg-[#2A3F6C]">{t('recruit.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
