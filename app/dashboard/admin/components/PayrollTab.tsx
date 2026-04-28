'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { useI18n } from '@/lib/i18n';
import { calculatePayroll } from '@/lib/payroll';
import jsPDF from 'jspdf';
import { FileText } from 'lucide-react';

export default function PayrollTab() {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snap = await getDocs(collection(db, 'employees'));
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEmployees(data);
      } catch (error) {
        console.error("Error fetching employees", error);
      }
      setLoading(false);
    };
    fetchEmployees();
  }, []);

  const generatePDF = async (emp: any) => {
    const result = calculatePayroll({ baseSalary: emp.baseSalary });
    
    // Save to Firestore
    try {
      await addDoc(collection(db, 'payrolls'), {
        employeeId: emp.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        baseSalary: result.grossSalary,
        cnapsEmployee: result.cnapsEmployee,
        cnapsEmployer: result.cnapsEmployer,
        osiemEmployee: result.osiemEmployee,
        osiemEmployer: result.osiemEmployer,
        irsa: result.irsa,
        netSalary: result.netSalary,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error saving payroll", error);
    }

    // Generate PDF
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("RISE HR - Fiche de Paie", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Employé: ${emp.firstName} ${emp.lastName}`, 20, 40);
    doc.text(`Poste: ${emp.position}`, 20, 50);
    doc.text(`Mois: ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`, 20, 60);
    
    doc.line(20, 65, 190, 65);
    
    let y = 80;
    doc.text("Désignation", 20, y);
    doc.text("Montant (Ar)", 150, y);
    y += 10;
    
    doc.text("Salaire de base", 20, y);
    doc.text(`${result.grossSalary.toLocaleString()}`, 150, y);
    y += 10;
    
    doc.text("Retenue CNaPS (1%)", 20, y);
    doc.text(`-${result.cnapsEmployee.toLocaleString()}`, 150, y);
    y += 10;
    
    doc.text("Retenue OSIEM (1%)", 20, y);
    doc.text(`-${result.osiemEmployee.toLocaleString()}`, 150, y);
    y += 10;
    
    doc.text("IRSA", 20, y);
    doc.text(`-${result.irsa.toLocaleString()}`, 150, y);
    y += 15;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("NET À PAYER", 20, y);
    doc.text(`${result.netSalary.toLocaleString()} Ar`, 150, y);
    
    doc.save(`Fiche_Paie_${emp.lastName}_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Traitement de la paie</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map(emp => {
          const payroll = calculatePayroll({ baseSalary: emp.baseSalary });
          return (
            <div key={emp.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{emp.firstName} {emp.lastName}</h3>
                  <p className="text-sm text-gray-500">{emp.position}</p>
                </div>
                <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded">
                  {emp.contractType}
                </span>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Base:</span>
                  <span className="font-medium">{payroll.grossSalary.toLocaleString()} Ar</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">CNaPS/OSIEM:</span>
                  <span className="text-red-500">-{ (payroll.cnapsEmployee + payroll.osiemEmployee).toLocaleString() } Ar</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IRSA:</span>
                  <span className="text-red-500">-{ payroll.irsa.toLocaleString() } Ar</span>
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-between">
                  <span className="font-semibold text-gray-900">Net:</span>
                  <span className="font-bold text-emerald-600">{payroll.netSalary.toLocaleString()} Ar</span>
                </div>
              </div>

              <button 
                onClick={() => generatePDF(emp)}
                className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 rounded-lg transition-colors text-sm font-medium border border-gray-200"
              >
                <FileText size={16} />
                {t('payroll.generate')}
              </button>
            </div>
          );
        })}
        {employees.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500">Aucun employé trouvé.</div>
        )}
      </div>
    </div>
  );
}
