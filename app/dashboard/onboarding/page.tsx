'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { 
  CheckCircle2, 
  Circle, 
  BookOpen, 
  Monitor, 
  Shield, 
  Users, 
  Award, 
  Play, 
  ArrowRight, 
  ArrowLeft,
  GraduationCap,
  Sparkles,
  MousePointer2,
  FileText,
  CalendarCheck,
  ExternalLink,
  MessageSquare,
  Plus,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

interface TutorialStep {
  title: string;
  content: string;
  icon: React.ReactNode;
  highlightRef?: string; // ID of the element to highlight in the simulation
  targetX?: string; // Position for the tooltip
  targetY?: string;
  expectedAction?: 'click' | 'view';
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'base' | 'leaves' | 'payroll' | 'recruitment' | 'training' | 'performance';
  steps: TutorialStep[];
  mockUI?: 'dashboard' | 'leaves' | 'profile' | 'training' | 'recruitment' | 'performance';
}

const TUTORIALS: Tutorial[] = [
  {
    id: 'intro',
    title: 'Visite du Tableau de Bord',
    description: 'Découvrez les zones clés de votre espace de travail.',
    icon: <Sparkles className="text-blue-500" />,
    category: 'base',
    mockUI: 'dashboard',
    steps: [
      {
        title: 'Bienvenue sur RISE !',
        content: 'Ici, vous voyez votre tableau de bord. C\'est votre page d\'accueil quotidienne.',
        icon: <Users size={48} className="text-blue-500" />,
        targetX: '50%',
        targetY: '40%',
        expectedAction: 'view'
      },
      {
        title: 'Statistiques Rapides',
        content: 'Ces cartes vous montrent vos congés restants et vos formations en un coup d\'œil.',
        icon: <Monitor size={48} className="text-indigo-500" />,
        highlightRef: 'stats-grid',
        targetX: '50%',
        targetY: '25%',
        expectedAction: 'view'
      },
      {
        title: 'Alertes Importantes',
        content: 'Regardez ici ! Vos notifications urgentes (demandes validées, rappels) s\'affichent ici.',
        icon: <Sparkles size={48} className="text-amber-500" />,
        highlightRef: 'alerts-panel',
        targetX: '75%',
        targetY: '50%',
        expectedAction: 'view'
      }
    ]
  },
  {
    id: 'leaves',
    title: 'Tuto : Poser un Congé',
    description: 'Apprenez à remplir le formulaire de demande pas à pas.',
    icon: <CalendarCheck className="text-emerald-500" />,
    category: 'leaves',
    mockUI: 'leaves',
    steps: [
      {
        title: 'Nouvelle Demande',
        content: 'Tout commence par ce bouton. Cliquez dessus pour ouvrir le formulaire.',
        icon: <Plus size={48} className="text-blue-500" />,
        highlightRef: 'add-leave-btn',
        targetX: '80%',
        targetY: '18%',
        expectedAction: 'click'
      },
      {
        title: 'Le Formulaire',
        content: 'Sélectionnez "Congés Annuels" et choisissez vos dates.',
        icon: <CalendarCheck size={48} className="text-emerald-500" />,
        highlightRef: 'leave-form',
        targetX: '50%',
        targetY: '45%',
        expectedAction: 'view'
      },
      {
        title: 'Validation Finale',
        content: 'Cliquez sur "Envoyer" pour soumettre votre demande aux RH.',
        icon: <CheckCircle2 size={48} className="text-blue-500" />,
        highlightRef: 'submit-btn',
        targetX: '60%',
        targetY: '70%',
        expectedAction: 'click'
      }
    ]
  },
  {
    id: 'profile',
    title: 'Gérer son Profil',
    description: 'Maintenez vos informations à jour et consultez vos documents.',
    icon: <Users className="text-indigo-500" />,
    category: 'payroll',
    mockUI: 'profile',
    steps: [
      {
        title: 'Vos Informations',
        content: 'Modifiez vos coordonnées ici. Il est crucial d\'avoir une adresse à jour pour les courriers officiels.',
        icon: <Users size={48} className="text-indigo-500" />,
        highlightRef: 'profile-info',
        targetX: '30%',
        targetY: '40%',
        expectedAction: 'view'
      },
      {
        title: 'Documents RH',
        content: 'C\'est ici que sont archivés vos contrats et fiches de paie. Téléchargez-les en un clic.',
        icon: <FileText size={48} className="text-amber-500" />,
        highlightRef: 'profile-docs',
        targetX: '70%',
        targetY: '40%',
        expectedAction: 'view'
      }
    ]
  },
  {
    id: 'training',
    title: 'Parcours de Formation',
    description: 'Inscrivez-vous à des cours et suivez votre apprentissage.',
    icon: <GraduationCap className="text-purple-500" />,
    category: 'training',
    mockUI: 'training',
    steps: [
      {
        title: 'Catalogue des Cours',
        content: 'Explorez toutes les formations disponibles. Vous pouvez filtrer par catégorie.',
        icon: <BookOpen size={48} className="text-purple-500" />,
        highlightRef: 'training-catalog',
        targetX: '50%',
        targetY: '30%',
        expectedAction: 'view'
      },
      {
        title: 'S\'inscrire',
        content: 'Cliquez sur une formation qui vous intéresse pour voir les détails et vous inscrire.',
        icon: <Plus size={48} className="text-emerald-500" />,
        highlightRef: 'training-card',
        targetX: '25%',
        targetY: '55%',
        expectedAction: 'click'
      }
    ]
  },
  {
    id: 'performance',
    title: 'Évaluations Annuelles',
    description: 'Préparez vos entretiens et fixez vos objectifs.',
    icon: <Award className="text-amber-500" />,
    category: 'performance',
    mockUI: 'performance',
    steps: [
      {
        title: 'Mes Objectifs',
        content: 'Retrouvez les objectifs fixés avec votre manager pour l\'année en cours.',
        icon: <Award size={48} className="text-amber-500" />,
        highlightRef: 'perf-goals',
        targetX: '50%',
        targetY: '35%',
        expectedAction: 'view'
      },
      {
        title: 'Auto-évaluation',
        content: 'Avant l\'entretien, n\'oubliez pas de remplir votre auto-évaluation ici.',
        icon: <FileText size={48} className="text-blue-500" />,
        highlightRef: 'perf-self-eval',
        targetX: '50%',
        targetY: '65%',
        expectedAction: 'click'
      }
    ]
  },
  {
    id: 'recruitment',
    title: 'Suivi Recrutement',
    description: 'Créez des offres et suivez les candidats.',
    icon: <Users className="text-emerald-500" />,
    category: 'recruitment',
    mockUI: 'recruitment',
    steps: [
      {
        title: 'Vos Recrutements',
        content: 'Ici s\'affichent tous vos processus de recrutement en cours.',
        icon: <Users size={48} className="text-emerald-500" />,
        highlightRef: 'rec-list',
        targetX: '50%',
        targetY: '40%',
        expectedAction: 'view'
      },
      {
        title: 'Nouveau Poste',
        content: 'Utilisez ce bouton pour ouvrir une nouvelle fiche de poste.',
        icon: <Plus size={48} className="text-blue-500" />,
        highlightRef: 'rec-add-btn',
        targetX: '85%',
        targetY: '15%',
        expectedAction: 'click'
      }
    ]
  }
];

export default function OnboardingPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'userProgress', user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setCompletedTutorials(snap.data().completedTutorials || []);
      } else {
        await setDoc(docRef, { completedTutorials: [] });
      }
    } catch (error) {
      import('@/lib/firebase').then(({ handleFirestoreError, OperationType }) => {
        handleFirestoreError(error, OperationType.GET, `userProgress/${user?.uid}`);
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const startTutorial = (tutorial: Tutorial) => {
    setActiveTutorial(tutorial);
    setCurrentStep(0);
  };

  const nextStep = async () => {
    if (!activeTutorial) return;
    if (currentStep < activeTutorial.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Finish tutorial
      const newCompleted = [...completedTutorials];
      if (!newCompleted.includes(activeTutorial.id)) {
        newCompleted.push(activeTutorial.id);
        try {
          await updateDoc(doc(db, 'userProgress', user!.uid), {
            completedTutorials: newCompleted
          });
          setCompletedTutorials(newCompleted);
        } catch (error) {
          import('@/lib/firebase').then(({ handleFirestoreError, OperationType }) => {
            handleFirestoreError(error, OperationType.UPDATE, `userProgress/${user?.uid}`);
          });
        }
      }
      setActiveTutorial(null);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4 p-8 max-w-5xl mx-auto">
      <div className="h-10 bg-gray-200 rounded w-1/3"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>)}
      </div>
    </div>;
  }

  // --- TUTORIAL OVERLAY UI ---
  if (activeTutorial) {
    const step = activeTutorial.steps[currentStep];
    
    return (
      <div className="fixed inset-0 z-50 bg-[#1B2A4A]/40 backdrop-blur-md flex items-center justify-center p-2 md:p-6">
        {/* The Simulation Container */}
        <motion.div 
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="bg-gray-50 w-full h-full max-h-[92vh] max-w-[96vw] rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/50 relative flex flex-col overflow-hidden"
        >
          {/* Header of simulation */}
          <div className="bg-white border-b border-gray-100 p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white p-2 rounded-lg"><Monitor size={18} /></div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">RISE RH - Simulation Interactive</h4>
                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{t('onboarding.sim.learningMode')}</p>
              </div>
            </div>
            <button onClick={() => setActiveTutorial(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><Trash2 size={20} /></button>
          </div>

          {/* Body of simulation (The Mocked Interface) */}
          <div className="flex-1 p-6 md:p-10 relative bg-[#F8FAFC] overflow-y-auto overflow-x-hidden">
            {/* Visual simulation of Dashboard */}
            <div className="grid grid-cols-12 gap-6 opacity-70 pointer-events-none pb-20">
              <div id="stats-grid" className={`col-span-8 grid grid-cols-3 gap-4 ${step.highlightRef === 'stats-grid' ? 'opacity-100 scale-[1.02] ring-8 ring-blue-500/10 rounded-2xl' : ''} transition-all duration-500`}>
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white p-6 rounded-2xl h-32 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div className="w-1/2 h-3 bg-gray-100 rounded" />
                    <div className="w-3/4 h-6 bg-gray-50 rounded" />
                  </div>
                ))}
              </div>
              <div id="alerts-panel" className={`col-span-4 bg-white rounded-2xl p-6 border border-gray-100 ${step.highlightRef === 'alerts-panel' ? 'opacity-100 scale-[1.02] ring-8 ring-blue-500/10' : ''} transition-all duration-500`}>
                <div className="h-4 bg-blue-50 rounded w-1/2 mb-6" />
                <div className="space-y-4">
                  <div className="h-12 bg-gray-50 rounded-xl border border-gray-100" />
                  <div className="h-12 bg-gray-50 rounded-xl border border-gray-100" />
                </div>
              </div>
              <div className="col-span-12 bg-white rounded-3xl h-80 border border-gray-100 shadow-sm p-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="w-1/4 h-5 bg-gray-100 rounded" />
                  <div className="w-20 h-8 bg-blue-50 rounded-lg" />
                </div>
                <div className="space-y-6">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-50" />
                      <div className="flex-1 space-y-2">
                        <div className="w-1/3 h-3 bg-gray-100 rounded" />
                        <div className="w-1/4 h-2 bg-gray-50 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Special Highlights for specific tutorials */}
            {activeTutorial.mockUI === 'leaves' && (
              <div className="absolute inset-0 p-8 flex flex-col gap-6">
                <div className="flex justify-between items-center bg-white/80 p-4 rounded-xl backdrop-blur-md border border-white">
                  <div className="w-1/3 h-4 bg-gray-200 rounded" />
                  <button id="add-leave-btn" className={`bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${step.highlightRef === 'add-leave-btn' ? 'ring-4 ring-blue-400 ring-offset-4 scale-110 shadow-xl' : 'opacity-20'}`}>
                    <Plus size={18} /> Nouvelle demande
                  </button>
                </div>
                {step.highlightRef === 'leave-form' || step.highlightRef === 'submit-btn' ? (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    id="leave-form" 
                    className="max-w-md mx-auto bg-white rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] p-8 border border-blue-100 relative mt-12"
                  >
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                       <CalendarCheck className="text-blue-600" size={20} /> Nouvelle Demande de Congés
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-1/4" />
                        <div className="h-11 bg-gray-50 rounded-xl border border-gray-200 flex items-center px-4 text-gray-400 text-sm">Congés Annuels</div>
                      </div>
                      <div className="flex gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                          <div className="h-11 bg-gray-50 rounded-xl border border-gray-200" />
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                          <div className="h-11 bg-gray-50 rounded-xl border border-gray-200" />
                        </div>
                      </div>
                      <div className="space-y-2 pt-4">
                        <button id="submit-btn" className={`w-full py-4 rounded-2xl font-black transition-all ${step.highlightRef === 'submit-btn' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-105' : 'bg-gray-100 text-gray-400'}`}>
                          Soumettre aux RH
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </div>
            )}

            {activeTutorial.mockUI === 'profile' && (
              <div className="absolute inset-0 p-8 grid grid-cols-2 gap-8">
                <div id="profile-info" className={`bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl transition-all ${step.highlightRef === 'profile-info' ? 'ring-4 ring-blue-500 ring-offset-4 scale-105 opacity-100' : 'opacity-40'}`}>
                  <div className="w-1/3 h-5 bg-gray-100 rounded mb-8" />
                  <div className="space-y-6">
                    {[1,2,3].map(i => <div key={i} className="space-y-2"><div className="w-1/4 h-2 bg-gray-50 rounded"/><div className="h-10 bg-gray-50 rounded-lg"/></div>)}
                  </div>
                </div>
                <div id="profile-docs" className={`bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl transition-all ${step.highlightRef === 'profile-docs' ? 'ring-4 ring-blue-500 ring-offset-4 scale-105 opacity-100' : 'opacity-40'}`}>
                  <div className="w-1/3 h-5 bg-gray-100 rounded mb-8" />
                  <div className="space-y-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between px-4"><div className="w-1/2 h-3 bg-gray-100 rounded"/><FileText size={16} className="text-gray-300"/></div>)}
                  </div>
                </div>
              </div>
            )}

            {activeTutorial.mockUI === 'training' && (
              <div className="absolute inset-0 p-8 flex flex-col gap-10">
                <div id="training-catalog" className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all ${step.highlightRef === 'training-catalog' ? 'ring-4 ring-blue-500 ring-offset-4 scale-[1.02] opacity-100' : 'opacity-40'}`}>
                  <div className="w-1/4 h-6 bg-gray-100 rounded mb-6" />
                  <div className="grid grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <div key={i} id={i === 1 ? 'training-card' : undefined} className={`h-40 rounded-xl border p-4 flex flex-col justify-end transition-all ${i === 1 && step.highlightRef === 'training-card' ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-200' : 'bg-gray-50 border-gray-100'}`}><div className="h-4 bg-gray-200 rounded w-full mb-2"/><div className="h-3 bg-gray-200 rounded w-2/3"/></div>)}
                  </div>
                </div>
              </div>
            )}

            {activeTutorial.mockUI === 'performance' && (
              <div className="absolute inset-0 p-8 flex flex-col items-center">
                <div id="perf-goals" className={`bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl w-full max-w-2xl transition-all mb-8 ${step.highlightRef === 'perf-goals' ? 'ring-4 ring-blue-500 ring-offset-4 scale-105 opacity-100' : 'opacity-40'}`}>
                   <div className="w-1/4 h-5 bg-gray-100 rounded mb-8" />
                   <div className="space-y-4">
                    {[1,2].map(i => <div key={i} className="p-4 bg-gray-50 rounded-xl flex items-center gap-4"><div className="p-2 bg-white rounded-lg shadow-sm"><Award size={20} className="text-amber-500"/></div><div className="flex-1 h-4 bg-gray-200 rounded"/></div>)}
                   </div>
                </div>
                <button id="perf-self-eval" className={`px-10 py-5 rounded-2xl font-black transition-all ${step.highlightRef === 'perf-self-eval' ? 'bg-blue-600 text-white shadow-2xl scale-110 animate-bounce' : 'bg-gray-100 text-gray-400 opacity-40'}`}>
                  Démarrer mon auto-évaluation
                </button>
              </div>
            )}

            {activeTutorial.mockUI === 'recruitment' && (
              <div className="absolute inset-0 p-8 flex flex-col gap-6">
                <div className="flex justify-between items-center bg-white/80 p-4 rounded-xl backdrop-blur-md border border-white">
                  <div className="w-1/3 h-4 bg-gray-200 rounded" />
                  <button id="rec-add-btn" className={`bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${step.highlightRef === 'rec-add-btn' ? 'ring-4 ring-blue-400 ring-offset-4 scale-110 shadow-xl' : 'opacity-20'}`}>
                    <Plus size={18} /> Nouveau Poste
                  </button>
                </div>
                <div id="rec-list" className={`bg-white rounded-3xl p-6 border border-gray-100 transition-all ${step.highlightRef === 'rec-list' ? 'ring-4 ring-blue-500 scale-[1.01] opacity-100' : 'opacity-40'}`}>
                  <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"><div className="flex gap-4 items-center"><div className="w-10 h-10 rounded-full bg-gray-200"/><div className="space-y-1"><div className="h-3 bg-gray-200 rounded w-48"/><div className="h-2 bg-gray-100 rounded w-20"/></div></div><div className="w-24 h-8 bg-gray-200 rounded-lg"/></div>)}
                  </div>
                </div>
              </div>
            )}

            {/* THE TOOLTIP (The "Bulle") */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentStep}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{ 
                  left: step.targetX, 
                  top: step.targetY, 
                  transform: parseFloat(step.targetY || '0') < 50 ? 'translate(-50%, 20px)' : 'translate(-50%, calc(-100% - 20px))',
                  zIndex: 100 
                }}
                className="absolute w-80 pointer-events-auto"
              >
                {/* Arrow pointing to the element */}
                {parseFloat(step.targetY || '0') < 50 ? (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-l border-t border-blue-100"></div>
                ) : (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r border-b border-blue-100"></div>
                )}
                
                <div className="bg-white rounded-[2.5rem] shadow-[0_25px_60px_rgba(8,112,184,0.2)] border border-blue-100 p-8">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="p-3.5 bg-blue-50 rounded-[1.25rem] text-blue-600">
                      {step.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600">{t('onboarding.sim.step')} {currentStep+1}</h5>
                      </div>
                      <h4 className="font-bold text-gray-900 text-xl leading-tight">{step.title}</h4>
                    </div>
                  </div>
                  <p className="text-gray-600 text-base leading-relaxed mb-8 font-medium">
                    {step.content}
                  </p>
                  <button 
                    onClick={nextStep}
                    className="w-full bg-blue-600 text-white py-4.5 rounded-[1.25rem] font-black text-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-[0_12px_24px_-8px_rgba(37,99,235,0.4)] active:scale-[0.97]"
                  >
                    {currentStep === activeTutorial.steps.length - 1 ? t('onboarding.sim.done') : t('onboarding.sim.understood')} <ArrowRight size={20} />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer of modal */}
          <div className="bg-white border-t border-gray-100 p-5 px-10 flex justify-between items-center shrink-0">
            <p className="text-xs text-gray-400">{t('onboarding.sim.disclaimer')}</p>
            <div className="flex gap-2">
              {activeTutorial.steps.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- LEARNING CENTER DASHBOARD ---
  return (
    <div className="space-y-10 max-w-5xl mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3 border border-blue-100 uppercase tracking-wider">
            <GraduationCap size={14} /> {t('onboarding.header.center')}
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t('onboarding.header.title')}</h1>
          <p className="text-gray-500 mt-1 text-lg">{t('onboarding.header.subtitle')}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Award className="text-emerald-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium font-mono uppercase">{t('onboarding.status.label')}</p>
            <p className="text-sm font-bold text-gray-900">{completedTutorials.length} / {TUTORIALS.length} {t('onboarding.status.completed')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TUTORIALS.map((tutorial) => {
          const isCompleted = completedTutorials.includes(tutorial.id);
          return (
            <motion.div 
              key={tutorial.id}
              whileHover={{ y: -5 }}
              className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col h-full transition-all duration-300 ${
                isCompleted ? 'border-emerald-100 bg-emerald-50/10' : 'border-gray-100 hover:border-blue-200'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-gray-50 rounded-xl">
                  {tutorial.icon}
                </div>
                {isCompleted && (
                  <div className="bg-emerald-100 text-emerald-700 p-1 rounded-full">
                    <CheckCircle2 size={20} />
                  </div>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t(`onboarding.tutorial.${tutorial.id}.title`)}</h3>
              <p className="text-gray-500 text-sm mb-6 flex-grow leading-relaxed">
                {t(`onboarding.tutorial.${tutorial.id}.description`)}
              </p>
              
              <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <BookOpen size={14} /> {tutorial.steps.length} {t('onboarding.status.steps')}
                </span>
                <button 
                  onClick={() => startTutorial(tutorial)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                    isCompleted 
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                  }`}
                >
                  {isCompleted ? t('onboarding.actions.review') : t('onboarding.actions.start')} <Play size={14} fill="currentColor" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {completedTutorials.length === TUTORIALS.length && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Award size={200} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-6 backdrop-blur-sm">
              <Award size={48} />
            </div>
            <h2 className="text-3xl font-extrabold mb-4">{t('onboarding.banner.title')}</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              {t('onboarding.banner.subtitle')}
            </p>
            <button className="bg-white text-blue-700 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors">
              {t('onboarding.banner.cta')}
            </button>
          </div>
        </motion.div>
      )}

      {!completedTutorials.includes('intro') && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mt-1">
            <ArrowRight size={20} />
          </div>
          <div>
            <h4 className="font-bold text-amber-900">{t('onboarding.tip.title')}</h4>
            <p className="text-amber-800 text-sm">{t('onboarding.tip.subtitle')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
