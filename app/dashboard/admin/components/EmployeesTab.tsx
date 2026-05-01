'use client';

import { useState, useEffect } from 'react';
import { db, secondaryAuth, createUserWithEmailAndPassword } from '@/lib/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { useI18n } from '@/lib/i18n';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function EmployeesTab() {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    cin: '',
    address: '',
    phone: '',
    department: '',
    position: '',
    contractType: 'CDI',
    baseSalary: 0,
    status: 'active'
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [employeeToDelete, setEmployeeToDelete] = useState<any | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'employees'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Also fetch users to get emails
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.reduce((acc: any, doc) => {
        acc[doc.id] = doc.data().email;
        return acc;
      }, {});

      const enrichedData = data.map(emp => ({
        ...emp,
        email: usersData[emp.id] || ''
      }));

      setEmployees(enrichedData);
    } catch (error) {
      console.error("Error fetching employees", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({
      firstName: '', lastName: '', email: '', password: '', cin: '', address: '', phone: '',
      department: '', position: '', contractType: 'CDI', baseSalary: 0, status: 'active'
    });
    setFormError('');
    setShowModal(true);
  };

  const handleEditClick = (emp: any) => {
    setEditingId(emp.id);
    setFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      password: '', // Don't populate password on edit
      cin: emp.cin || '',
      address: emp.address || '',
      phone: emp.phone || '',
      department: emp.department || '',
      position: emp.position || '',
      contractType: emp.contractType || 'CDI',
      baseSalary: emp.baseSalary || 0,
      status: emp.status || 'active'
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      if (editingId) {
        // Update existing employee
        await updateDoc(doc(db, 'employees', editingId), {
          firstName: formData.firstName,
          lastName: formData.lastName,
          cin: formData.cin,
          address: formData.address,
          phone: formData.phone,
          department: formData.department,
          position: formData.position,
          contractType: formData.contractType,
          baseSalary: Number(formData.baseSalary),
          status: formData.status
        });

        // Update user document (display name and department)
        await updateDoc(doc(db, 'users', editingId), {
          displayName: `${formData.firstName} ${formData.lastName}`,
          department: formData.department
        });

      } else {
        // 1. Create user in Firebase Auth using secondary app
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        const newUid = userCredential.user.uid;

        // 2. Create user document in 'users' collection
        await setDoc(doc(db, 'users', newUid), {
          uid: newUid,
          email: formData.email,
          displayName: `${formData.firstName} ${formData.lastName}`,
          role: 'employee',
          department: formData.department,
          createdAt: new Date().toISOString()
        });

        // 3. Create employee document in 'employees' collection
        await setDoc(doc(db, 'employees', newUid), {
          uid: newUid,
          firstName: formData.firstName,
          lastName: formData.lastName,
          cin: formData.cin,
          address: formData.address,
          phone: formData.phone,
          department: formData.department,
          position: formData.position,
          contractType: formData.contractType,
          baseSalary: Number(formData.baseSalary),
          status: formData.status,
          startDate: new Date().toISOString()
        });

        // 4. Create default onboarding tasks
        const defaultTasks = [
          { title: t('employees.tasks.profileTitle'), description: t('employees.tasks.profileDesc'), category: 'setup' },
          { title: t('employees.tasks.handbookTitle'), description: t('employees.tasks.handbookDesc'), category: 'reading' },
          { title: t('employees.tasks.itSetupTitle'), description: t('employees.tasks.itSetupDesc'), category: 'setup' },
          { title: t('employees.tasks.securityTitle'), description: t('employees.tasks.securityDesc'), category: 'training' },
          { title: t('employees.tasks.managerTitle'), description: t('employees.tasks.managerDesc'), category: 'meeting' }
        ];

        for (const task of defaultTasks) {
          await addDoc(collection(db, 'onboardingTasks'), {
            employeeId: newUid,
            title: task.title,
            description: task.description,
            category: task.category,
            isCompleted: false,
            completedAt: null,
            createdAt: new Date().toISOString()
          });
        }

        // Sign out secondary auth to clean up
        await secondaryAuth.signOut();
      }

      setShowModal(false);
      fetchEmployees();
    } catch (error: any) {
      console.error("Error saving employee", error);
      if (error.code === 'auth/operation-not-allowed') {
        setFormError(t('employees.errors.authNotEnabled'));
      } else if (error.code === 'auth/email-already-in-use') {
        setFormError(t('employees.errors.emailInUse'));
      } else if (error.code === 'auth/invalid-email') {
        setFormError(t('employees.errors.invalidEmail'));
      } else if (error.code === 'auth/weak-password') {
        setFormError(t('employees.errors.weakPassword'));
      } else {
        setFormError(error.message || t('employees.errors.saveFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'employees', id));
      setEmployeeToDelete(null);
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee", error);
    }
  };

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('employees.title')}</h2>
        <button 
          onClick={handleAddClick}
          className="bg-[#1B2A4A] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#2A3F6C] transition-colors"
        >
          <Plus size={16} />
          {t('common.add')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-sm font-medium text-gray-500">{t('employees.table.fullName')}</th>
              <th className="p-4 text-sm font-medium text-gray-500">{t('employees.table.department')}</th>
              <th className="p-4 text-sm font-medium text-gray-500">{t('employees.table.position')}</th>
              <th className="p-4 text-sm font-medium text-gray-500">{t('employees.table.contract')}</th>
              <th className="p-4 text-sm font-medium text-gray-500">{t('employees.table.status')}</th>
              <th className="p-4 text-sm font-medium text-gray-500 text-right">{t('employees.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50 group relative">
                <td className="p-4 text-sm text-gray-900 font-medium">
                  {emp.firstName} {emp.lastName}
                  {/* Tooltip */}
                  <div className="absolute left-4 top-10 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg whitespace-nowrap">
                    <p>{t('login.email')}: {emp.email || t('profile.notProvided')}</p>
                    <p>{t('profile.phone')}: {emp.phone || t('profile.notProvided')}</p>
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-600">{emp.department}</td>
                <td className="p-4 text-sm text-gray-600">{emp.position}</td>
                <td className="p-4 text-sm text-gray-600">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{emp.contractType}</span>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${emp.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                    {emp.status === 'active' ? t('employees.status.active') : t('employees.status.inactive')}
                  </span>
                </td>
                <td className="p-4 text-sm text-right space-x-2">
                  <button onClick={() => handleEditClick(emp)} className="text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => setEmployeeToDelete(emp)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">{t('employees.none')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-bold mb-4">{editingId ? t('employees.modal.edit') : t('employees.modal.add')}</h3>
            {formError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('recruit.firstName')}</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('recruit.lastName')}</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              
              {!editingId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('employees.form.loginEmail')}</label>
                    <input required type="email" className="w-full border border-gray-300 rounded-lg p-2" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('employees.form.tempPassword')}</label>
                    <input required type="text" minLength={6} className="w-full border border-gray-300 rounded-lg p-2" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employees.form.cin')}</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.cin} onChange={e => setFormData({...formData, cin: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.phone')}</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.address')}</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('recruit.department')}</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employees.form.position')}</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('recruit.contract')}</label>
                  <select className="w-full border border-gray-300 rounded-lg p-2" value={formData.contractType} onChange={e => setFormData({...formData, contractType: e.target.value})}>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Stage">Stage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('employees.form.baseSalary')}</label>
                  <input required type="number" className="w-full border border-gray-300 rounded-lg p-2" value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})} />
                </div>
              </div>
              {editingId && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('employees.table.status')}</label>
                    <select className="w-full border border-gray-300 rounded-lg p-2" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="active">{t('employees.status.active')}</option>
                      <option value="inactive">{t('employees.status.inactive')}</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t('common.cancel')}</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#1B2A4A] text-white rounded-lg hover:bg-[#2A3F6C] disabled:opacity-70">
                  {isSubmitting ? t('employees.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {employeeToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2 text-gray-900">{t('employees.deleteTitle')}</h3>
            <p className="text-gray-600 mb-6">
              {t('employees.deleteConfirm').replace('{name}', `${employeeToDelete.firstName} ${employeeToDelete.lastName}`)}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEmployeeToDelete(null)} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={() => confirmDelete(employeeToDelete.id)} 
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
