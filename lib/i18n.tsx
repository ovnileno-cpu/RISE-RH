'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'mg';

const translations = {
  fr: {
    'app.title': 'RISE HR',
    'app.subtitle': 'Elevating Human Resources in Madagascar',
    'login.title': 'Connexion',
    'login.email': 'Email',
    'login.password': 'Mot de passe',
    'login.button': 'Se connecter avec Google',
    'login.offline': 'Mode hors-ligne actif',
    'nav.dashboard': 'Tableau de bord',
    'nav.recruitment': 'Recrutement',
    'nav.training': 'Formation',
    'nav.evaluation': 'Évaluation',
    'nav.admin': 'Administration RH',
    'nav.logout': 'Déconnexion',
    'dashboard.employees': 'Effectif total',
    'dashboard.leaves': 'Congés en cours',
    'dashboard.trainings': 'Formations planifiées',
    'dashboard.evaluations': 'Évaluations dues',
    'dashboard.alerts': 'Alertes RH',
    'admin.employees': 'Dossiers employés',
    'admin.payroll': 'Calcul de la paie',
    'admin.leaves': 'Gestion des congés',
    'payroll.generate': 'Générer Fiche de Paie',
    'payroll.base': 'Salaire de base',
    'payroll.net': 'Salaire net',
    'leave.request': 'Demander un congé',
    'leave.status.pending': 'En attente',
    'leave.status.approved': 'Approuvé',
    'leave.status.rejected': 'Refusé',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.add': 'Ajouter'
  },
  mg: {
    'app.title': 'RISE HR',
    'app.subtitle': 'Manandratra ny haren\'olombelona eto Madagasikara',
    'login.title': 'Fidirana',
    'login.email': 'Mailaka',
    'login.password': 'Teny miafina',
    'login.button': 'Hiditra amin\'ny Google',
    'login.offline': 'Tsy misy aterineto',
    'nav.dashboard': 'Tabilao fitantanana',
    'nav.recruitment': 'Fandraisana mpiasa',
    'nav.training': 'Fiofanana',
    'nav.evaluation': 'Tombana',
    'nav.admin': 'Fitantanana HR',
    'nav.logout': 'Hivoaka',
    'dashboard.employees': 'Isan\'ny mpiasa',
    'dashboard.leaves': 'Fialan-tsasatra',
    'dashboard.trainings': 'Fiofanana voalahatra',
    'dashboard.evaluations': 'Tombana miandry',
    'dashboard.alerts': 'Fampitandremana HR',
    'admin.employees': 'Antontan-taratasin\'ny mpiasa',
    'admin.payroll': 'Kajy karama',
    'admin.leaves': 'Fitantanana fialan-tsasatra',
    'payroll.generate': 'Hamoaka taratasy karama',
    'payroll.base': 'Karama fototra',
    'payroll.net': 'Karama raisina',
    'leave.request': 'Hangataka fialan-tsasatra',
    'leave.status.pending': 'Miandry',
    'leave.status.approved': 'Nekena',
    'leave.status.rejected': 'Nolavina',
    'common.save': 'Tahirizina',
    'common.cancel': 'Hanafoana',
    'common.delete': 'Fafana',
    'common.add': 'Hanampy'
  }
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations['fr']) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key
});

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>('fr');

  useEffect(() => {
    const savedLang = localStorage.getItem('rise_hr_lang') as Language;
    if (savedLang && (savedLang === 'fr' || savedLang === 'mg')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(savedLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('rise_hr_lang', newLang);
  };

  const t = (key: keyof typeof translations['fr']) => {
    return translations[lang][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
