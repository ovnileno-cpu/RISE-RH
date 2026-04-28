/**
 * Madagascar Payroll Calculation Logic (Code du Travail 2003-044 & Loi de Finances 2026)
 */

export interface PayrollInput {
  baseSalary: number;
  bonuses?: number;
  overtimeHours?: number;
  overtimeRate?: number;
}

export interface PayrollResult {
  grossSalary: number;
  cnapsEmployee: number; // 1%
  cnapsEmployer: number; // 13%
  osiemEmployee: number; // 1%
  osiemEmployer: number; // 5%
  taxableSalary: number;
  irsa: number;
  netSalary: number;
}

// 2026 IRSA Brackets (Example, adjust to actual 2026 law if different)
// Up to 350,000 Ar: 0%
// 350,001 - 400,000 Ar: 5%
// 400,001 - 500,000 Ar: 10%
// 500,001 - 600,000 Ar: 15%
// Over 600,000 Ar: 20%
// Minimum IRSA: 3,000 Ar

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const bonuses = input.bonuses || 0;
  const overtime = (input.overtimeHours || 0) * (input.overtimeRate || 0);
  
  const grossSalary = input.baseSalary + bonuses + overtime;
  
  // CNaPS (capped at 8x minimum wage, assuming min wage is ~250,000 Ar -> cap 2,000,000 Ar)
  const CNAPS_CAP = 2000000;
  const cnapsBase = Math.min(grossSalary, CNAPS_CAP);
  const cnapsEmployee = cnapsBase * 0.01;
  const cnapsEmployer = cnapsBase * 0.13;
  
  // OSIEM (Health)
  const osiemEmployee = grossSalary * 0.01;
  const osiemEmployer = grossSalary * 0.05;
  
  // IRSA Calculation
  const taxableSalary = grossSalary - cnapsEmployee - osiemEmployee;
  let irsa = 0;
  
  if (taxableSalary > 600000) {
    irsa += (taxableSalary - 600000) * 0.20;
    irsa += 100000 * 0.15;
    irsa += 100000 * 0.10;
    irsa += 50000 * 0.05;
  } else if (taxableSalary > 500000) {
    irsa += (taxableSalary - 500000) * 0.15;
    irsa += 100000 * 0.10;
    irsa += 50000 * 0.05;
  } else if (taxableSalary > 400000) {
    irsa += (taxableSalary - 400000) * 0.10;
    irsa += 50000 * 0.05;
  } else if (taxableSalary > 350000) {
    irsa += (taxableSalary - 350000) * 0.05;
  }
  
  // Minimum IRSA
  if (irsa < 3000 && taxableSalary > 350000) {
    irsa = 3000;
  } else if (taxableSalary <= 350000) {
    irsa = 0;
  }
  
  const netSalary = taxableSalary - irsa;
  
  return {
    grossSalary,
    cnapsEmployee,
    cnapsEmployer,
    osiemEmployee,
    osiemEmployer,
    taxableSalary,
    irsa,
    netSalary
  };
}
