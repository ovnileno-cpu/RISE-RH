'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { useI18n } from '@/lib/i18n';
import { calculatePayroll } from '@/lib/payroll';
import jsPDF from 'jspdf';
import { FileText } from 'lucide-react';

export default function PayrollTab() {
  const { t, lang } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [formData, setFormData] = useState({ employeeId: '', baseSalary: 0, overtime: 0, deductions: 0 });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const [empSnap, payrollSnap] = await Promise.all([
          getDocs(collection(db, 'employees')),
          getDocs(collection(db, 'payrolls'))
        ]);
        const data = empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEmployees(data);
        setHistory(payrollSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching employees", error);
      }
      setLoading(false);
    };
    fetchEmployees();
  }, []);

  const selectedEmployee = useMemo(() => employees.find(e => e.id === formData.employeeId), [employees, formData.employeeId]);
  const payrollInputAmount = useMemo(() => Number(formData.baseSalary) + Number(formData.overtime), [formData.baseSalary, formData.overtime]);
  const result = useMemo(() => {
    const computed = calculatePayroll({ baseSalary: payrollInputAmount });
    return {
      ...computed,
      netSalary: Math.max(0, computed.netSalary - Number(formData.deductions || 0))
    };
  }, [formData.deductions, payrollInputAmount]);
  const filteredHistory = useMemo(() => {
    if (!formData.employeeId) return [];
    return history
      .filter((row: any) => row.employeeId === formData.employeeId)
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [history, formData.employeeId]);

  const generatePDF = async () => {
    if (!selectedEmployee) return;
    const emp = selectedEmployee;
    
    // Save to Firestore
    try {
      await addDoc(collection(db, 'payrolls'), {
        employeeId: emp.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        baseSalary: Number(formData.baseSalary),
        overtime: Number(formData.overtime),
        deductions: Number(formData.deductions),
        grossSalary: result.grossSalary,
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

    setHistory(prev => ([{
      id: `local-${Date.now()}`,
      employeeId: emp.id,
      netSalary: result.netSalary,
      createdAt: new Date().toISOString()
    }, ...prev]));

    // Generate PDF
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(t('payroll.pdf.title'), 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`${t('payroll.pdf.employee')}: ${emp.firstName} ${emp.lastName}`, 20, 40);
    doc.text(`${t('payroll.pdf.position')}: ${emp.position}`, 20, 50);
    doc.text(`${t('payroll.pdf.month')}: ${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'mg-MG', { month: 'long', year: 'numeric' })}`, 20, 60);
    
    doc.line(20, 65, 190, 65);
    
    let y = 80;
    doc.text(t('payroll.pdf.designation'), 20, y);
    doc.text(t('payroll.pdf.amountAr'), 150, y);
    y += 10;
    
    doc.text(t('payroll.pdf.baseSalary'), 20, y);
    doc.text(`${Number(formData.baseSalary).toLocaleString()}`, 150, y);
    y += 10;

    doc.text(t('payroll.form.overtime'), 20, y);
    doc.text(`${Number(formData.overtime).toLocaleString()}`, 150, y);
    y += 10;
    
    doc.text(t('payroll.pdf.cnapsDeduction'), 20, y);
    doc.text(`-${result.cnapsEmployee.toLocaleString()}`, 150, y);
    y += 10;
    
    doc.text(t('payroll.pdf.osiemDeduction'), 20, y);
    doc.text(`-${result.osiemEmployee.toLocaleString()}`, 150, y);
    y += 10;
    
    doc.text("IRSA", 20, y);
    doc.text(`-${result.irsa.toLocaleString()}`, 150, y);
    y += 10;

    doc.text(t('payroll.form.deductions'), 20, y);
    doc.text(`-${Number(formData.deductions).toLocaleString()}`, 150, y);
    y += 15;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(t('payroll.pdf.netToPay'), 20, y);
    doc.text(`${result.netSalary.toLocaleString()} Ar`, 150, y);
    
    doc.save(`Fiche_Paie_${emp.lastName}_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
  };

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('payroll.title')}</h2>

      <div className="border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select className="w-full border rounded-lg p-2" value={formData.employeeId} onChange={e => {
            const employeeId = e.target.value;
            const emp = employees.find(em => em.id === employeeId);
            setFormData({ employeeId, baseSalary: Number(emp?.baseSalary || 0), overtime: 0, deductions: 0 });
          }}>
            <option value="">{t('payroll.form.employee')}</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
          </select>
          <input type="number" className="w-full border rounded-lg p-2" placeholder={t('payroll.form.baseSalary')} value={formData.baseSalary || ''} onChange={e => setFormData({ ...formData, baseSalary: Number(e.target.value) })} />
          <input type="number" className="w-full border rounded-lg p-2" placeholder={t('payroll.form.overtime')} value={formData.overtime || ''} onChange={e => setFormData({ ...formData, overtime: Number(e.target.value) })} />
          <input type="number" className="w-full border rounded-lg p-2" placeholder={t('payroll.form.deductions')} value={formData.deductions || ''} onChange={e => setFormData({ ...formData, deductions: Number(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900">{t('payroll.form.netCalculated')}: <span className="text-emerald-600">{result.netSalary.toLocaleString()} Ar</span></span>
          <button onClick={generatePDF} disabled={!selectedEmployee} className="flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium border border-gray-200 disabled:opacity-50">
            <FileText size={16} />
            {t('payroll.form.generatePdf')}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold text-gray-900 mb-3">{t('payroll.history')}</h3>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-3 text-sm font-medium text-gray-500">{t('payroll.form.employee')}</th>
                <th className="p-3 text-sm font-medium text-gray-500">{t('payroll.form.netCalculated')}</th>
                <th className="p-3 text-sm font-medium text-gray-500">{t('eval.table.date')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((row) => {
                const emp = employees.find(e => e.id === row.employeeId);
                return <tr key={row.id} className="border-b border-gray-50"><td className="p-3 text-sm">{emp ? `${emp.firstName} ${emp.lastName}` : t('eval.unknown')}</td><td className="p-3 text-sm">{Number(row.netSalary || 0).toLocaleString()} Ar</td><td className="p-3 text-sm">{row.createdAt ? new Date(row.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'mg-MG') : '-'}</td></tr>;
              })}
              {formData.employeeId === '' && <tr><td className="p-3 text-sm text-center text-gray-500" colSpan={3}>{t('payroll.selectEmployeeForHistory')}</td></tr>}
              {formData.employeeId !== '' && filteredHistory.length === 0 && <tr><td className="p-3 text-sm text-center text-gray-500" colSpan={3}>{t('payroll.noHistory')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
