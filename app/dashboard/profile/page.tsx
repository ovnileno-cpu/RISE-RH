'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { User, Mail, Phone, MapPin, Briefcase, FileText, Download, Building2, Edit2, Check, X } from 'lucide-react';
import jsPDF from 'jspdf';

export default function ProfilePage() {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'employees', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile({ id: docSnap.id, ...docSnap.data() });
        } else {
          // Fallback for admins/managers who might not have an employee record
          setProfile({
            firstName: user.displayName?.split(' ')[0] || 'Utilisateur',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            email: user.email,
            position: role === 'admin' ? 'Administrateur' : role === 'manager' ? 'Manager' : 'Employé',
            department: 'Direction',
            contractType: 'N/A'
          });
        }

        const q = query(collection(db, 'payrolls'), where('employeeId', '==', user.uid));
        const pSnap = await getDocs(q);
        // Sort payrolls by year and month descending
        const sortedPayrolls = pSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          });
        setPayrolls(sortedPayrolls);
      } catch (error) {
        console.error("Error fetching profile data", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, role]);

  const handleSaveField = async (field: string) => {
    if (!user || !profile?.id) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'employees', profile.id), {
        [field]: editValue
      });
      setProfile({ ...profile, [field]: editValue });
      setEditingField(null);
    } catch (error) {
      console.error("Error updating profile", error);
    }
    setIsSaving(false);
  };

  const renderEditableField = (field: string, label: string, icon: any, value: string) => {
    const isEmpty = !value || value.trim() === '';
    // Employee can edit if empty. Admin/Manager can edit anytime.
    const canEdit = role === 'admin' || role === 'manager' || isEmpty;
    const isEditing = editingField === field;

    return (
      <div className="flex items-center justify-between group min-h-[28px]">
        <div className="flex items-center gap-3 text-gray-600 flex-1">
          {icon}
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-[#1B2A4A] focus:border-[#1B2A4A] outline-none"
                placeholder={`Saisir ${label.toLowerCase()}`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveField(field);
                  if (e.key === 'Escape') setEditingField(null);
                }}
              />
              <button 
                onClick={() => handleSaveField(field)} 
                disabled={isSaving} 
                className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"
              >
                <Check size={16} />
              </button>
              <button 
                onClick={() => setEditingField(null)} 
                disabled={isSaving} 
                className="text-gray-400 hover:bg-gray-100 p-1 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <span className={isEmpty ? 'text-gray-400 italic text-sm' : ''}>
              {isEmpty ? 'Non renseigné' : value}
            </span>
          )}
        </div>
        {!isEditing && canEdit && (
          <button 
            onClick={() => { setEditingField(field); setEditValue(value || ''); }}
            className="opacity-0 group-hover:opacity-100 text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-all"
            title={isEmpty ? "Ajouter" : "Modifier"}
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>
    );
  };

  const downloadPayslip = (payroll: any) => {
    if (!profile) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("RISE HR - Fiche de Paie", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Employé: ${profile.firstName} ${profile.lastName}`, 20, 40);
    doc.text(`Poste: ${profile.position}`, 20, 50);
    
    const monthName = new Date(payroll.year, payroll.month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    doc.text(`Période: ${monthName}`, 20, 60);
    
    doc.line(20, 65, 190, 65);
    
    let y = 80;
    doc.text("Désignation", 20, y);
    doc.text("Montant (Ar)", 150, y);
    y += 10;
    
    doc.text("Salaire de base", 20, y);
    doc.text(`${payroll.baseSalary.toLocaleString()}`, 150, y);
    y += 10;
    
    doc.text("Retenue CNaPS (1%)", 20, y);
    doc.text(`-${payroll.cnapsEmployee.toLocaleString()}`, 150, y);
    y += 10;
    
    doc.text("Retenue OSIEM (1%)", 20, y);
    doc.text(`-${payroll.osiemEmployee.toLocaleString()}`, 150, y);
    y += 10;
    
    doc.text("IRSA", 20, y);
    doc.text(`-${payroll.irsa.toLocaleString()}`, 150, y);
    y += 15;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("NET À PAYER", 20, y);
    doc.text(`${payroll.netSalary.toLocaleString()} Ar`, 150, y);
    
    doc.save(`Fiche_Paie_${monthName.replace(' ', '_')}.pdf`);
  };

  if (loading) return <div>Chargement...</div>;
  if (!profile) return <div>Profil non trouvé. Veuillez contacter les RH.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon Dossier RH</h1>
        <p className="text-gray-500 mt-1">Consultez vos informations personnelles et vos fiches de paie</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations Personnelles */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-[#1B2A4A] to-[#2A3F6C]"></div>
            <div className="px-6 pb-6 relative">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center text-[#1B2A4A] absolute -top-12 left-6">
                <User size={48} />
              </div>
              <div className="pt-14">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900">{profile.firstName} {profile.lastName}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize whitespace-nowrap">
                    {role === 'admin' ? 'Administrateur' : role === 'manager' ? 'Manager' : 'Employé'}
                  </span>
                </div>
                <p className="text-gray-500 font-medium mt-1">{profile.position}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Contact</h3>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail size={18} className="text-gray-400" />
                    <span>{user?.email}</span>
                  </div>
                  {renderEditableField('phone', 'Téléphone', <Phone size={18} className="text-gray-400" />, profile.phone)}
                  {renderEditableField('address', 'Adresse', <MapPin size={18} className="text-gray-400" />, profile.address)}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Professionnel</h3>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Building2 size={18} className="text-gray-400" />
                    <span>Département: {profile.department}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Briefcase size={18} className="text-gray-400" />
                    <span>Contrat: {profile.contractType}</span>
                  </div>
                  {renderEditableField('cin', 'CIN', <FileText size={18} className="text-gray-400" />, profile.cin)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fiches de paie */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              Mes Fiches de Paie
            </h3>
            
            <div className="space-y-3">
              {payrolls.length > 0 ? (
                payrolls.map(payroll => {
                  const monthName = new Date(payroll.year, payroll.month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                  return (
                    <div key={payroll.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{monthName}</p>
                        <p className="text-xs text-gray-500">Net: {payroll.netSalary.toLocaleString()} Ar</p>
                      </div>
                      <button 
                        onClick={() => downloadPayslip(payroll)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Télécharger PDF"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Aucune fiche de paie disponible.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
