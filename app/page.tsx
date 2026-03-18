'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { DataService } from '@/lib/dataService';
import { PDFExportService } from '@/lib/pdfExport';
import { saveCaseToDatabase } from '@/lib/caseService';
import { Menu, FileDown, Save, CheckCircle, ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';

// Components
import ClinicalNoteInput from '@/components/ClinicalNoteInput';
import ConditionSelection from '@/components/ConditionSelection';
import IcdCodeSelection from '@/components/IcdCodeSelection';
import DiagnosticBasket from '@/components/DiagnosticBasket';
import MedicationSelection from '@/components/MedicationSelection';
import ChronicRegistrationNote from '@/components/ChronicRegistrationNote';
import Sidebar from '@/components/Sidebar';
import AllCasesView from '@/components/AllCasesView';
import CaseActions from '@/components/CaseActions';
import OngoingManagement from '@/components/OngoingManagement';
import MedicationReport from '@/components/MedicationReport';
import Referral from '@/components/Referral';
import FinalClaimSummary from '@/components/FinalClaimSummary';
import PatientExportModal from '@/components/PatientExportModal';
import { MatchedCondition } from '@/types';
import type { PatientExportData } from '@/lib/patientExport';

type WorkflowMode = 'new' | 'ongoing' | 'medication' | 'referral';

const deduplicateMedications = (medications: any[]) => {
  return medications.reduce((acc: any[], current) => {
    const duplicate = acc.find(item =>
      item.medicineNameAndStrength === current.medicineNameAndStrength
    );
    if (!duplicate) {
      acc.push(current);
    }
    return acc;
  }, []);
};

export default function Home() {
  const store = useStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedConditions, setMatchedConditions] = useState<MatchedCondition[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowMode>('new');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCaseActions, setShowCaseActions] = useState(false);
  const [showAllCases, setShowAllCases] = useState(false);
  const [showPatientExport, setShowPatientExport] = useState(false);

  useEffect(() => {
    const init = async () => {
      await DataService.initialize();
      setIsInitialized(true);
    };
    init();
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinical_note: store.clinicalNote }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      store.setExtractedKeywords(data.extracted_keywords || []);

      const conditions = data.matched_conditions || [];
      const mappedConditions = conditions.map((condition: any) => ({
        condition: condition.condition,
        icdCode: condition.icd_code,
        icdDescription: condition.icd_description,
        similarityScore: condition.similarity_score || 0
      }));

      const deduplicatedConditions = mappedConditions.reduce((acc: MatchedCondition[], current: MatchedCondition) => {
        const existingIndex = acc.findIndex(item => item.condition === current.condition);
        if (existingIndex === -1) {
          acc.push(current);
        } else if (current.similarityScore > acc[existingIndex].similarityScore) {
          acc[existingIndex] = current;
        }
        return acc;
      }, []);

      setMatchedConditions(deduplicatedConditions);

      if (deduplicatedConditions.length > 0) {
        store.setCurrentStep(1);
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      const errorMessage = error.message || 'Failed to analyze note. Please try again.';
      alert(`Analysis Error: ${errorMessage}\n\nIf this persists, the backend may be initializing. Please wait a moment and try again.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectCondition = (condition: string, icdCode: string, description: string) => {
    store.setSelectedCondition(condition, icdCode, description);
  };

  const handleNextStep = () => {
    // Validation
    if (store.currentStep === 1 && !store.selectedCondition) {
      alert('Please select a condition');
      return;
    }
    if (store.currentStep === 2 && !store.selectedIcdCode) {
      alert('Please select an ICD-10 code');
      return;
    }
    
    // Handle medication substeps
    if (store.currentStep === 4) {
      if (store.medicationSubstep === 1) {
        // Moving from medication selection to registration note
        if (store.medications.length === 0) {
          alert('Please select at least one medication before proceeding');
          return;
        }
        store.setMedicationSubstep(2);
        return;
      } else if (store.medicationSubstep === 2) {
        // Moving from registration note to final claim
        // Optional validation for registration note
        if (!store.medicationNote && !store.medications.some(m => m.note)) {
          const proceed = confirm('No registration note has been entered. Do you want to proceed without a note?');
          if (!proceed) return;
        }
        store.setCurrentStep(5);
        return;
      }
    }
    
    const nextStep = store.currentStep + 1;
    store.setCurrentStep(nextStep);
  };

  const handlePreviousStep = () => {
    // Handle medication substeps
    if (store.currentStep === 4 && store.medicationSubstep === 2) {
      store.setMedicationSubstep(1);
      return;
    }
    
    store.setCurrentStep(Math.max(0, store.currentStep - 1));
  };

  const handleExportPDF = () => {
    if (!store.selectedCondition || !store.selectedIcdCode) {
      alert('Please complete the workflow first');
      return;
    }

    const pdfService = new PDFExportService();
    const patientCase = {
      id: Date.now().toString(),
      patientName: patientName || 'Patient',
      patientId: patientId || 'N/A',
      createdAt: new Date(),
      updatedAt: new Date(),
      clinicalNote: store.clinicalNote,
      condition: store.selectedCondition,
      icdCode: store.selectedIcdCode,
      icdDescription: store.selectedIcdDescription || '',
      diagnosticTreatments: store.diagnosticTreatments,
      ongoingTreatments: store.ongoingTreatments,
      medications: store.medications,
      medicationNote: store.medicationNote,
      plan: store.selectedPlan,
      status: 'diagnostic' as const,
    };

    pdfService.exportInitialClaim(patientCase);
  };

  const handleExportWithAttachments = async () => {
    if (!store.selectedCondition || !store.selectedIcdCode) {
      alert('Please complete the workflow first');
      return;
    }

    const pdfService = new PDFExportService();
    const patientCase = {
      id: Date.now().toString(),
      patientName: patientName || 'Patient',
      patientId: patientId || 'N/A',
      createdAt: new Date(),
      updatedAt: new Date(),
      clinicalNote: store.clinicalNote,
      condition: store.selectedCondition,
      icdCode: store.selectedIcdCode,
      icdDescription: store.selectedIcdDescription || '',
      diagnosticTreatments: store.diagnosticTreatments,
      ongoingTreatments: store.ongoingTreatments,
      medications: store.medications,
      medicationNote: store.medicationNote,
      plan: store.selectedPlan,
      status: 'diagnostic' as const,
    };

    await pdfService.exportInitialClaimWithAttachments(patientCase);
  };

  const handleSaveCaseOnly = async () => {
    if (!patientName || !patientId) {
      alert('Please enter patient name and ID');
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveCaseToDatabase({
        patientName,
        patientId,
        patientEmail,
        patientPhone,
        clinicalNote: store.clinicalNote,
        conditionName: store.selectedCondition || '',
        icdCode: store.selectedIcdCode || '',
        icdDescription: store.selectedIcdDescription || '',
        diagnosticTreatments: store.diagnosticTreatments,
        ongoingTreatments: store.ongoingTreatments,
        medications: store.medications,
        medicationNote: store.medicationNote,
        plan: store.selectedPlan,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save case');
      }

      store.saveCase(patientName, patientId);
      setShowSaveModal(false);
      setShowCaseActions(true);
      alert('Case saved successfully to database!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save case');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCase = async (includeAttachments: boolean = false) => {
    if (!patientName || !patientId) {
      alert('Please enter patient name and ID');
      return;
    }
    store.saveCase(patientName, patientId);
    setShowSaveModal(false);
    setShowCaseActions(false);

    if (includeAttachments) {
      await handleExportWithAttachments();
    } else {
      handleExportPDF();
    }
    alert('Case saved and exported successfully!');
  };

  const handleLoadCase = (caseId: string) => {
    store.loadCase(caseId);
    setCurrentWorkflow('new');
    setShowCaseActions(true);
    const loadedCase = store.cases.find(c => c.id === caseId);
    if (loadedCase) {
      setPatientName(loadedCase.patientName);
      setPatientId(loadedCase.patientId);
      store.setCurrentStep(5);
    }
  };

  const handleOngoingManagementSaveOnly = () => {
    if (store.currentCaseId) {
      store.updateCase(store.currentCaseId, {
        ongoingTreatments: store.ongoingTreatments,
        status: 'ongoing',
      });
    }
    alert('Ongoing management treatments saved successfully!');
    setCurrentWorkflow('new');
  };

  const handleExportSingleTreatment = async (treatmentIndex: number) => {
    if (store.currentCaseId) {
      const currentCase = store.cases.find(c => c.id === store.currentCaseId);
      if (currentCase) {
        const pdfService = new PDFExportService();
        await pdfService.exportSingleOngoingTreatment(currentCase, treatmentIndex);
        alert('Treatment exported successfully!');
      }
    }
  };

  const handleOngoingManagementSavePdfOnly = () => {
    if (store.currentCaseId) {
      const currentCase = store.cases.find(c => c.id === store.currentCaseId);
      if (currentCase) {
        const updatedCase = {
          ...currentCase,
          ongoingTreatments: store.ongoingTreatments,
          status: 'ongoing' as const,
          updatedAt: new Date(),
        };

        store.updateCase(store.currentCaseId, {
          ongoingTreatments: store.ongoingTreatments,
          status: 'ongoing',
        });

        const pdfService = new PDFExportService();
        pdfService.exportOngoingManagement(updatedCase);
      }
    }
    alert('Ongoing management saved and PDF exported!');
    setCurrentWorkflow('new');
  };

  const handleOngoingManagementSaveWithAttachments = async () => {
    if (store.currentCaseId) {
      const currentCase = store.cases.find(c => c.id === store.currentCaseId);
      if (currentCase) {
        const updatedCase = {
          ...currentCase,
          ongoingTreatments: store.ongoingTreatments,
          status: 'ongoing' as const,
          updatedAt: new Date(),
        };

        store.updateCase(store.currentCaseId, {
          ongoingTreatments: store.ongoingTreatments,
          status: 'ongoing',
        });

        const pdfService = new PDFExportService();
        await pdfService.exportOngoingManagementWithAttachments(updatedCase);
      }
    }
    alert('Ongoing management saved and exported with attachments!');
    setCurrentWorkflow('new');
  };

  const handleMedicationReportSavePdfOnly = (followUpNotes: string, newMeds?: any[], motivationLetter?: string, documentation?: { notes: string; images: string[] }) => {
    if (store.currentCaseId) {
      const currentCase = store.cases.find(c => c.id === store.currentCaseId);
      if (currentCase) {
        const combinedMedications = newMeds && newMeds.length > 0
          ? deduplicateMedications([...currentCase.medications, ...newMeds])
          : currentCase.medications;

        const newMedicationReport = {
          id: Date.now().toString(),
          caseId: store.currentCaseId,
          originalMedications: currentCase.medications,
          followUpNotes,
          newMedications: newMeds || [],
          motivationLetter: motivationLetter || '',
          documentation,
          createdAt: new Date(),
        };

        const updatedCase = {
          ...currentCase,
          medicationReports: [...(currentCase.medicationReports || []), newMedicationReport],
          medications: combinedMedications,
          updatedAt: new Date(),
        };

        store.addMedicationReport(store.currentCaseId, {
          caseId: store.currentCaseId,
          originalMedications: currentCase.medications,
          followUpNotes,
          newMedications: newMeds || [],
          motivationLetter: motivationLetter || '',
          documentation,
        });

        if (newMeds && newMeds.length > 0) {
          store.updateCase(store.currentCaseId, {
            medications: combinedMedications,
          });
        }

        const pdfService = new PDFExportService();
        pdfService.exportMedicationReport(updatedCase, followUpNotes, newMeds, motivationLetter);
      }
    }
    alert('Medication report saved and PDF exported!');
    setCurrentWorkflow('new');
  };

  const handleMedicationReportSaveWithAttachments = async (followUpNotes: string, newMeds?: any[], motivationLetter?: string, documentation?: { notes: string; images: string [] }) => {
    if (store.currentCaseId) {
      const currentCase = store.cases.find(c => c.id === store.currentCaseId);
      if (currentCase) {
        const combinedMedications = newMeds && newMeds.length > 0
          ? deduplicateMedications([...currentCase.medications, ...newMeds])
          : currentCase.medications;

        const newMedicationReport = {
          id: Date.now().toString(),
          caseId: store.currentCaseId,
          originalMedications: currentCase.medications,
          followUpNotes,
          newMedications: newMeds || [],
          motivationLetter: motivationLetter || '',
          documentation,
          createdAt: new Date(),
        };

        const updatedCase = {
          ...currentCase,
          medicationReports: [...(currentCase.medicationReports || []), newMedicationReport],
          medications: combinedMedications,
          updatedAt: new Date(),
        };

        store.addMedicationReport(store.currentCaseId, {
          caseId: store.currentCaseId,
          originalMedications: currentCase.medications,
          followUpNotes,
          newMedications: newMeds || [],
          motivationLetter: motivationLetter || '',
          documentation,
        });

        if (newMeds && newMeds.length > 0) {
          store.updateCase(store.currentCaseId, {
            medications: combinedMedications,
          });
        }

        const pdfService = new PDFExportService();
        await pdfService.exportMedicationReportWithAttachments(updatedCase, followUpNotes, newMeds, motivationLetter, documentation);
      }
    }
    alert('Medication report saved and exported with attachments!');
    setCurrentWorkflow('new');
  };

  const handleReferralSavePdfOnly = (urgency: 'routine' | 'urgent' | 'emergency', referralNote: string, specialistType: string) => {
    if (store.currentCaseId) {
      const currentCase = store.cases.find(c => c.id === store.currentCaseId);
      if (currentCase) {
        const newReferral = {
          id: Date.now().toString(),
          caseId: store.currentCaseId,
          urgency,
          referralNote,
          specialistType,
          createdAt: new Date(),
        };

        const updatedCase = {
          ...currentCase,
          referrals: [...(currentCase.referrals || []), newReferral],
          updatedAt: new Date(),
        };

        store.addReferral(store.currentCaseId, {
          caseId: store.currentCaseId,
          urgency,
          referralNote,
          specialistType,
        });

        const pdfService = new PDFExportService();
        pdfService.exportReferral(updatedCase, urgency, referralNote, specialistType);
      }
    }
    alert('Referral saved and PDF exported!');
    setCurrentWorkflow('new');
  };

  const handleReferralSaveWithAttachments = async (urgency: 'routine' | 'urgent' | 'emergency', referralNote: string, specialistType: string) => {
    if (store.currentCaseId) {
      const currentCase = store.cases.find(c => c.id === store.currentCaseId);
      if (currentCase) {
        const newReferral = {
          id: Date.now().toString(),
          caseId: store.currentCaseId,
          urgency,
          referralNote,
          specialistType,
          createdAt: new Date(),
        };

        const updatedCase = {
          ...currentCase,
          referrals: [...(currentCase.referrals || []), newReferral],
          updatedAt: new Date(),
        };

        store.addReferral(store.currentCaseId, {
          caseId: store.currentCaseId,
          urgency,
          referralNote,
          specialistType,
        });

        const pdfService = new PDFExportService();
        await pdfService.exportReferralWithAttachments(updatedCase, urgency, referralNote, specialistType);
      }
    }
    alert('Referral saved and exported with attachments!');
    setCurrentWorkflow('new');
  };

  const handleNewClaim = () => {
    store.resetWorkflow();
    setPatientName('');
    setPatientId('');
    setMatchedConditions([]);
    setCurrentWorkflow('new');
    setShowCaseActions(false);
  };

  const handleSendToPatient = () => {
    if (!store.currentCaseId) {
      alert('No case loaded. Please save the case first.');
      return;
    }
    setShowPatientExport(true);
  };

  const getPatientExportData = (): PatientExportData | null => {
    if (!store.currentCaseId) return null;

    const currentCase = store.cases.find(c => c.id === store.currentCaseId);
    if (!currentCase) return null;

    return {
      patientName: currentCase.patientName,
      patientId: currentCase.patientId,
      clinicalNote: currentCase.clinicalNote,
      registrationNote: currentCase.medicationNote || '',
      conditions: [{
        id: '1',
        name: currentCase.condition,
        icdCode: currentCase.icdCode,
        icdDescription: currentCase.icdDescription,
      }],
      medications: currentCase.medications.map((med, index) => ({
        id: index.toString(),
        name: med.medicineNameAndStrength,
        nappiCode: '',
        quantity: 1,
        dosage: med.note || med.cdaAmount || 'As prescribed',
      })),
    };
  };

  const steps = [
    { id: 0, title: 'Clinical Note' },
    { id: 1, title: 'Condition' },
    { id: 2, title: 'ICD Code' },
    { id: 3, title: 'Diagnostics' },
    { id: 4, title: 'Medication' },
    { id: 5, title: 'Final Claim' },
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07091a' }}>
        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="glow-dot-blue w-96 h-96 -top-20 -left-20 animate-glow-pulse" />
          <div className="glow-dot-purple w-80 h-80 bottom-10 right-10 animate-pulse-slow" />
        </div>
        <div className="text-center relative z-10">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <img
              src="/salulink-orb.png"
              alt="SaluLink"
              className="w-20 h-20 object-contain animate-float"
            />
            <div
              className="absolute inset-0 rounded-full animate-spin-slow"
              style={{
                background: 'conic-gradient(from 0deg, #38b6ff44, #7c3aed44, transparent)',
                filter: 'blur(8px)',
              }}
            />
          </div>
          <h2
            className="text-xl font-bold mb-2 text-gradient"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            SaluLink
          </h2>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            Initialising Chronic Treatment App…
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  background: '#38b6ff',
                  animationDelay: `${i * 0.15}s`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#07091a' }}>
      {/* Global background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="glow-dot-blue w-[500px] h-[500px] -top-32 -left-32 animate-glow-pulse" style={{ opacity: 0.6 }} />
        <div className="glow-dot-purple w-[400px] h-[400px] top-1/3 -right-20 animate-pulse-slow" style={{ opacity: 0.5 }} />
        <div
          className="absolute bottom-0 left-1/3 w-[600px] h-[300px]"
          style={{
            background: 'radial-gradient(ellipse, rgba(56,182,255,0.04) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {showAllCases && (
        <AllCasesView
          cases={store.cases}
          onLoadCase={handleLoadCase}
          onDeleteCase={store.deleteCase}
          onClose={() => setShowAllCases(false)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'rgba(7,9,26,0.85)',
          borderBottom: '1px solid rgba(30,39,72,0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo + wordmark */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/salulink-orb.png"
                  alt="SaluLink orb"
                  className="h-9 w-9 object-contain"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(56,182,255,0.5))' }}
                />
              </div>
              <img
                src="/3.svg"
                alt="SaluLink"
                className="h-7 w-auto"
                style={{ filter: 'brightness(0) invert(1) opacity(0.95)' }}
              />
              <div
                className="hidden sm:block h-5 w-px mx-1"
                style={{ background: 'rgba(30,39,72,0.9)' }}
              />
              <span
                className="hidden sm:block text-xs font-medium tracking-wide"
                style={{ color: '#475569' }}
              >
                Chronic Treatment App
              </span>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(16,217,160,0.1)',
                  border: '1px solid rgba(16,217,160,0.2)',
                  color: '#6ee7b7',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                />
                PMB Compliant
              </div>
              <button
                onClick={store.toggleSidebar}
                className="btn-ghost p-2"
                title="Patient Cases"
              >
                <Menu className="w-5 h-5" style={{ color: '#94a3b8' }} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <Sidebar
        isOpen={store.sidebarOpen}
        onClose={store.toggleSidebar}
        cases={store.cases}
        onLoadCase={handleLoadCase}
        onDeleteCase={store.deleteCase}
        onViewAll={() => setShowAllCases(true)}
      />

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentWorkflow === 'new' && (
          <>
            {/* ── Progress Steps ──────────────────────────────────────────── */}
            <div
              className="mb-8 rounded-2xl p-5"
              style={{
                background: 'rgba(13,16,37,0.7)',
                border: '1px solid rgba(30,39,72,0.9)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center w-full">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                          store.currentStep > step.id
                            ? 'step-completed'
                            : store.currentStep === step.id
                            ? 'step-active'
                            : 'step-pending'
                        }`}
                      >
                        {store.currentStep > step.id ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          step.id + 1
                        )}
                      </div>
                      <span
                        className="mt-2 text-xs font-semibold text-center leading-tight"
                        style={{
                          color: store.currentStep >= step.id ? '#f1f5f9' : '#475569',
                        }}
                      >
                        {step.title}
                        {step.id === 4 && store.currentStep === 4 && (
                          <span className="block text-xs mt-0.5" style={{ color: '#38b6ff' }}>
                            {store.medicationSubstep === 1 ? '(Selection)' : '(Reg. Note)'}
                          </span>
                        )}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="relative flex-1 mx-2 flex items-center">
                        <div
                          className="h-0.5 w-full rounded-full transition-all duration-500"
                          style={{
                            background: store.currentStep > step.id
                              ? 'linear-gradient(90deg, #10d9a0, #38b6ff)'
                              : 'rgba(30,39,72,0.8)',
                            boxShadow: store.currentStep > step.id
                              ? '0 0 8px rgba(56,182,255,0.3)'
                              : 'none',
                          }}
                        />
                        {store.currentStep === step.id + 1 && (
                          <div className="absolute inset-0 flex items-center">
                            <ChevronRight
                              className="w-5 h-5 animate-slide-arrow"
                              style={{ color: '#10d9a0', animation: 'slideArrow 0.8s ease-out' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="space-y-6">
              {store.currentStep === 0 && (
                <ClinicalNoteInput
                  value={store.clinicalNote}
                  onChange={store.setClinicalNote}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                />
              )}

              {store.currentStep === 1 && (
                <ConditionSelection
                  matchedConditions={matchedConditions}
                  onSelect={handleSelectCondition}
                  selectedCondition={store.selectedCondition}
                />
              )}

              {store.currentStep === 2 && store.selectedCondition && (
                <IcdCodeSelection
                  condition={store.selectedCondition}
                  selectedIcdCode={store.selectedIcdCode}
                  onSelect={(code, desc) => {
                    store.setSelectedCondition(store.selectedCondition!, code, desc);
                  }}
                />
              )}

              {store.currentStep === 3 && store.selectedCondition && (
                <DiagnosticBasket
                  condition={store.selectedCondition}
                  treatments={store.diagnosticTreatments}
                  onAddTreatment={store.addDiagnosticTreatment}
                  onUpdateTreatment={store.updateDiagnosticTreatment}
                  onRemoveTreatment={(index) => {
                    const newTreatments = store.diagnosticTreatments.filter((_, i) => i !== index);
                    useStore.setState({ diagnosticTreatments: newTreatments });
                  }}
                />
              )}

              {store.currentStep === 4 && store.selectedCondition && (
                <>
                  {store.medicationSubstep === 1 && (
                    <MedicationSelection
                      condition={store.selectedCondition}
                      selectedPlan={store.selectedPlan}
                      medications={store.medications}
                      onAddMedication={store.addMedication}
                      onRemoveMedication={store.removeMedication}
                      onSetPlan={store.setSelectedPlan}
                    />
                  )}
                  
                  {store.medicationSubstep === 2 && (
                    <ChronicRegistrationNote
                      medications={store.medications}
                      medicationNote={store.medicationNote}
                      onSetMedicationNote={store.setMedicationNote}
                      onUpdateMedicationNote={store.updateMedicationNote}
                    />
                  )}
                </>
              )}

              {store.currentStep === 5 && (
                <>
                  <FinalClaimSummary
                    clinicalNote={store.clinicalNote}
                    selectedCondition={store.selectedCondition!}
                    selectedIcdCode={store.selectedIcdCode!}
                    selectedIcdDescription={store.selectedIcdDescription!}
                    diagnosticTreatments={store.diagnosticTreatments}
                    ongoingTreatments={store.ongoingTreatments}
                    medications={store.medications}
                    medicationNote={store.medicationNote}
                    selectedPlan={store.selectedPlan}
                    onConfirm={() => setShowSaveModal(true)}
                    onBack={handlePreviousStep}
                    onNewClaim={handleNewClaim}
                  />

                  {showCaseActions && store.currentCaseId && (
                    <CaseActions
                      onOngoingManagement={() => setCurrentWorkflow('ongoing')}
                      onMedicationReport={() => setCurrentWorkflow('medication')}
                      onReferral={() => setCurrentWorkflow('referral')}
                      onSendToPatient={handleSendToPatient}
                    />
                  )}
                </>
              )}

              {/* ── Navigation Buttons ────────────────────────────────────── */}
              {store.currentStep > 0 && store.currentStep < 5 && (
                <div className="flex justify-between pt-2">
                  <button
                    onClick={handlePreviousStep}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {store.currentStep === 4 && store.medicationSubstep === 2 ? 'Back to Medications' : 'Previous'}
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="btn-primary flex items-center gap-2"
                  >
                    {store.currentStep === 4 && store.medicationSubstep === 1
                      ? 'Continue to Registration Note'
                      : store.currentStep === 4 && store.medicationSubstep === 2
                      ? 'Continue to Final Claim'
                      : 'Next'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {store.currentStep === 0 && matchedConditions.length > 0 && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNextStep}
                    className="btn-primary flex items-center gap-2"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {currentWorkflow === 'ongoing' && store.selectedCondition && (
          <>
            <button
              onClick={() => setCurrentWorkflow('new')}
              className="btn-secondary flex items-center gap-2 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Case
            </button>
            <OngoingManagement
              condition={store.selectedCondition}
              treatments={store.ongoingTreatments}
              onAddTreatment={store.addOngoingTreatment}
              onUpdateTreatment={store.updateOngoingTreatment}
              onRemoveTreatment={(index) => {
                const newTreatments = store.ongoingTreatments.filter((_, i) => i !== index);
                useStore.setState({ ongoingTreatments: newTreatments });
              }}
              onExportSingleTreatment={handleExportSingleTreatment}
              onSaveOnly={handleOngoingManagementSaveOnly}
              onSavePdfOnly={handleOngoingManagementSavePdfOnly}
              onSaveWithAttachments={handleOngoingManagementSaveWithAttachments}
            />
          </>
        )}

        {currentWorkflow === 'medication' && store.currentCaseId && (
          <>
            <button
              onClick={() => setCurrentWorkflow('new')}
              className="btn-secondary flex items-center gap-2 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Case
            </button>
            <MedicationReport
              currentMedications={store.medications}
              medicationNote={store.medicationNote}
              condition={store.selectedCondition!}
              selectedPlan={store.selectedPlan}
              onSavePdfOnly={handleMedicationReportSavePdfOnly}
              onSaveWithAttachments={handleMedicationReportSaveWithAttachments}
            />
          </>
        )}

        {currentWorkflow === 'referral' && store.currentCaseId && (
          <>
            <button
              onClick={() => setCurrentWorkflow('new')}
              className="btn-secondary flex items-center gap-2 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Case
            </button>
            {(() => {
              const currentCase = store.cases.find(c => c.id === store.currentCaseId);
              return currentCase ? (
                <Referral
                  patientCase={currentCase}
                  onSavePdfOnly={handleReferralSavePdfOnly}
                  onSaveWithAttachments={handleReferralSaveWithAttachments}
                />
              ) : null;
            })()}
          </>
        )}
      </main>

      {/* ── Save Modal ─────────────────────────────────────────────────────── */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-panel">
            {/* Modal header */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(56,182,255,0.15)', border: '1px solid rgba(56,182,255,0.25)' }}
              >
                <Save className="w-5 h-5" style={{ color: '#38b6ff' }} />
              </div>
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#f1f5f9' }}
                >
                  Finalise Patient Case
                </h3>
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  Enter patient details to save or export
                </p>
              </div>
            </div>

            <div className="divider" />

            <div className="space-y-4">
              <div>
                <label className="label">
                  Patient Name <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter patient name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="label">
                  Patient ID / MRN <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter patient ID or medical record number"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email (Optional)</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="patient@example.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="label">Phone (Optional)</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="+27 XX XXX XXXX"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            <div className="divider" />

            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>
              Save Options
            </p>
            <div className="space-y-2">
              <button
                onClick={handleSaveCaseOnly}
                disabled={isSaving}
                className="w-full py-3 px-4 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #10d9a0, #38b6ff)',
                  color: '#fff',
                  boxShadow: isSaving ? 'none' : '0 0 20px rgba(16,217,160,0.3)',
                }}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving…' : 'Save Patient Case'}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="divider flex-1 my-0" />
                <span className="text-xs" style={{ color: '#475569' }}>or export</span>
                <div className="divider flex-1 my-0" />
              </div>

              <button
                onClick={() => handleSaveCase(false)}
                disabled={isSaving}
                className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-4 h-4" />
                Export as PDF
              </button>
              <button
                onClick={() => handleSaveCase(true)}
                disabled={isSaving}
                className="w-full py-2.5 px-4 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  color: '#c4b5fd',
                }}
              >
                <FileDown className="w-4 h-4" />
                Export with Attachments (ZIP)
              </button>
            </div>

            <button
              onClick={() => setShowSaveModal(false)}
              disabled={isSaving}
              className="btn-secondary w-full justify-center mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Patient Export Modal */}
      {showPatientExport && getPatientExportData() && (
        <PatientExportModal
          isOpen={showPatientExport}
          onClose={() => setShowPatientExport(false)}
          data={getPatientExportData()!}
        />
      )}
    </div>
  );
}

