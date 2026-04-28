'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import EmployeesTab from './components/EmployeesTab';
import PayrollTab from './components/PayrollTab';

export default function AdminPage() {
  const { t } = useI18n();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('employees');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.admin')}</h1>
        <p className="text-gray-500 mt-1">Gestion des dossiers employés et de la paie</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'employees' 
                ? 'border-b-2 border-[#1B2A4A] text-[#1B2A4A]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('admin.employees')}
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'payroll' 
                ? 'border-b-2 border-[#1B2A4A] text-[#1B2A4A]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('admin.payroll')}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'employees' && <EmployeesTab />}
          {activeTab === 'payroll' && <PayrollTab />}
        </div>
      </div>
    </div>
  );
}
