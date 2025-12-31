'use client';

import { useState, useEffect } from 'react';
import { Pill, Check, X, AlertTriangle } from 'lucide-react';
import { MedicineItem, SelectedMedication, MedicalPlan } from '@/types';
import { DataService } from '@/lib/dataService';

interface MedicationSelectionProps {
  condition: string;
  selectedPlan: MedicalPlan;
  medications: SelectedMedication[];
  medicationNote: string;
  onAddMedication: (medication: SelectedMedication) => void;
  onRemoveMedication: (index: number) => void;
  onSetMedicationNote: (note: string) => void;
  onUpdateMedicationNote?: (index: number, note: string) => void;
  onSetPlan: (plan: MedicalPlan) => void;
  excludedMedications?: SelectedMedication[];
}

const MedicationSelection = ({
  condition,
  selectedPlan,
  medications,
  medicationNote,
  onAddMedication,
  onRemoveMedication,
  onSetMedicationNote,
  onUpdateMedicationNote,
  onSetPlan,
  excludedMedications = []
}: MedicationSelectionProps) => {
  const [availableMedications, setAvailableMedications] = useState<MedicineItem[]>([]);
  const [medicineClasses, setMedicineClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  
  const plans: MedicalPlan[] = ['Core', 'Priority', 'Saver', 'Executive', 'Comprehensive'];
  
  useEffect(() => {
    const medicines = DataService.getMedicinesForCondition(condition);
    setAvailableMedications(medicines);
    
    const classes = DataService.getUniqueMedicineClasses(condition);
    setMedicineClasses(classes);
  }, [condition]);
  
  const filteredMedications = selectedClass
    ? availableMedications.filter(m => m.medicineClass === selectedClass)
    : availableMedications;
  
  const getCdaForPlan = (medicine: MedicineItem): string => {
    if (['Core', 'Priority', 'Saver'].includes(selectedPlan)) {
      return medicine.cdaCore;
    }
    return medicine.cdaExecutive || medicine.cdaCore;
  };
  
  const handleSelectMedication = (medicine: MedicineItem) => {
    const isAlreadySelected = medications.some(
      m => m.medicineNameAndStrength === medicine.medicineNameAndStrength
    );

    const isExcluded = excludedMedications.some(
      m => m.medicineNameAndStrength === medicine.medicineNameAndStrength
    );

    if (isAlreadySelected || isExcluded) return;

    onAddMedication({
      medicineClass: medicine.medicineClass,
      activeIngredient: medicine.activeIngredient,
      medicineNameAndStrength: medicine.medicineNameAndStrength,
      cdaAmount: getCdaForPlan(medicine)
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Plan Filter */}
      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Medical Scheme Plan</h3>
        <div className="flex flex-wrap gap-2">
          {plans.map(plan => (
            <button
              key={plan}
              onClick={() => onSetPlan(plan)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                selectedPlan === plan
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
              }`}
            >
              {plan}
            </button>
          ))}
        </div>
      </div>
      
      {/* Medicine Selection */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Pill className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Medication Selection</h2>
            <p className="text-sm text-gray-500">Select medications for {condition}</p>
          </div>
        </div>
        
        {/* Medicine Class Filter */}
        <div className="mb-4">
          <label className="label">Filter by Medicine Class</label>
          <select
            className="input-field"
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value || null)}
          >
            <option value="">All Classes</option>
            {medicineClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
        
        {/* Medicine List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredMedications.map((medicine, index) => {
            const isSelected = medications.some(
              m => m.medicineNameAndStrength === medicine.medicineNameAndStrength
            );
            const isExcluded = excludedMedications.some(
              m => m.medicineNameAndStrength === medicine.medicineNameAndStrength
            );
            const cdaAmount = getCdaForPlan(medicine);

            return (
              <button
                key={index}
                onClick={() => handleSelectMedication(medicine)}
                disabled={isSelected || isExcluded}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected || isExcluded
                    ? 'border-green-500 bg-green-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-purple-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {medicine.medicineNameAndStrength}
                      </h4>
                      {isSelected && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
                          Selected
                        </span>
                      )}
                      {isExcluded && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                          Already Prescribed
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium">Class:</span> {medicine.medicineClass}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Active Ingredient:</span> {medicine.activeIngredient}
                      </p>
                      <p className="text-primary-600 font-medium">
                        CDA Amount: {cdaAmount}
                      </p>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="ml-4 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Selected Medications */}
      {medications.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Selected Medications</h3>
          <div className="space-y-4 mb-4">
            {medications.map((med, index) => (
              <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{med.medicineNameAndStrength}</p>
                    <p className="text-sm text-gray-600">{med.activeIngredient}</p>
                    <p className="text-sm text-primary-600 font-medium">CDA: {med.cdaAmount}</p>
                  </div>
                  <button
                    onClick={() => onRemoveMedication(index)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {medications.length > 1 && onUpdateMedicationNote && (
                  <div>
                    <label className="label text-sm">Chronic Registration Note for this medication</label>
                    <textarea
                      className="textarea-field text-sm"
                      rows={3}
                      placeholder={`Enter registration note for ${med.medicineNameAndStrength}...`}
                      value={med.note || ''}
                      onChange={(e) => onUpdateMedicationNote(index, e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* General Medication Registration Note (shown when 1 medication or as overall note) */}
          {medications.length === 1 && (
            <div>
              <label className="label">Chronic Medication Registration Note</label>
              <textarea
                className="textarea-field"
                rows={4}
                placeholder="Enter medication registration note explaining the prescription rationale..."
                value={medicationNote}
                onChange={(e) => onSetMedicationNote(e.target.value)}
              />
            </div>
          )}

          {medications.length > 1 && (
            <div>
              <label className="label">Overall Registration Note (Optional)</label>
              <textarea
                className="textarea-field"
                rows={3}
                placeholder="Enter any overall notes for all medications..."
                value={medicationNote}
                onChange={(e) => onSetMedicationNote(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MedicationSelection;

