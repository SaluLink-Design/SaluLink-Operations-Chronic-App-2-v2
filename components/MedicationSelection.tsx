'use client';

import { useState, useEffect } from 'react';
import { Pill, Check, X, AlertTriangle } from 'lucide-react';
import { MedicineItem, SelectedMedication, MedicalPlan } from '@/types';
import { DataService } from '@/lib/dataService';

interface MedicationSelectionProps {
  condition: string;
  selectedPlan: MedicalPlan;
  medications: SelectedMedication[];
  onAddMedication: (medication: SelectedMedication) => void;
  onRemoveMedication: (index: number) => void;
  onSetPlan: (plan: MedicalPlan) => void;
  excludedMedications?: SelectedMedication[];
}

const MedicationSelection = ({
  condition,
  selectedPlan,
  medications,
  onAddMedication,
  onRemoveMedication,
  onSetPlan,
  excludedMedications = []
}: MedicationSelectionProps) => {
  const [availableMedications, setAvailableMedications] = useState<MedicineItem[]>([]);
  const [medicineClasses, setMedicineClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const plans: MedicalPlan[] = ['Core', 'Priority', 'Saver', 'Executive', 'Comprehensive'];

  const isDiabetesCondition = condition === 'Diabetes mellitus Type 1' || condition === 'Diabetes mellitus Type 2';

  const insulinClasses = [
    'Anti-diabetic agents: Fast-acting Insulins',
    'Anti-diabetic agents: Intermediate-acting or long-acting combined with fast-acting Insulins (Biphasic)',
    'Anti-diabetic agents: Long-acting Insulins'
  ];

  const getInsulinLimit = () => {
    if (['Executive', 'Comprehensive'].includes(selectedPlan)) {
      return 720;
    }
    return 700;
  };

  const parseAmount = (cdaString: string): number => {
    const match = cdaString.match(/R\s*([\d,]+(?:\.\d{2})?)/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
  };

  const calculateInsulinTotal = (medsToInclude: SelectedMedication[] = medications): number => {
    const allMeds = [...medsToInclude, ...excludedMedications];
    return allMeds
      .filter(med => insulinClasses.includes(med.medicineClass))
      .reduce((sum, med) => sum + parseAmount(med.cdaAmount), 0);
  };

  const isWarningEntry = (medicine: MedicineItem): boolean => {
    return medicine.medicineClass?.includes('***') ||
           medicine.medicineClass?.includes('Please note') ||
           medicine.activeIngredient?.includes('***') ||
           (!medicine.medicineNameAndStrength || medicine.medicineNameAndStrength.trim() === '');
  };

  useEffect(() => {
    const medicines = DataService.getMedicinesForCondition(condition);
    const filteredMedicines = medicines.filter(m => !isWarningEntry(m));
    setAvailableMedications(filteredMedicines);

    const classes = DataService.getUniqueMedicineClasses(condition);
    const filteredClasses = classes.filter(cls => !cls.includes('***') && !cls.includes('Please note'));
    setMedicineClasses(filteredClasses);
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

    // Check plan restrictions
    const isAllowed = DataService.isMedicationAllowedForPlan(medicine, selectedPlan);
    if (!isAllowed && medicine.planRestriction) {
      const { type, plans, originalText } = medicine.planRestriction;
      let message = '';
      
      if (type === 'only') {
        message = `⚠️ Plan Coverage Alert\n\nThis medication is not covered by the ${selectedPlan} plan.\n\n${originalText}\n\nThis medication is only available on: ${plans.join(', ')} plans.\n\nPlease either:\n• Select a different medication, OR\n• Change the patient's plan to one of the allowed plans`;
      } else if (type === 'not_available') {
        message = `⚠️ Plan Coverage Alert\n\nThis medication is not available on the ${selectedPlan} plan.\n\n${originalText}\n\nPlease either:\n• Select a different medication, OR\n• Change the patient's plan to access this medication`;
      }
      
      alert(message);
      return;
    }

    const newMedication: SelectedMedication = {
      medicineClass: medicine.medicineClass,
      activeIngredient: medicine.activeIngredient,
      medicineNameAndStrength: medicine.medicineNameAndStrength,
      cdaAmount: getCdaForPlan(medicine)
    };

    if (isDiabetesCondition && insulinClasses.includes(medicine.medicineClass)) {
      const currentInsulinTotal = calculateInsulinTotal();
      const medicationCost = parseAmount(newMedication.cdaAmount);
      const newTotal = currentInsulinTotal + medicationCost;
      const limit = getInsulinLimit();

      if (newTotal > limit) {
        alert(`Cannot add this insulin medication. It would exceed the monthly insulin limit of R${limit}. Current total: R${currentInsulinTotal.toFixed(2)}, This medication: R${medicationCost.toFixed(2)}, New total would be: R${newTotal.toFixed(2)}`);
        return;
      }
    }

    onAddMedication(newMedication);
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

      {/* Insulin Limit Warning for Diabetes */}
      {isDiabetesCondition && (
        <div className="card bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Insulin Monthly Limit</h3>
              <p className="text-sm text-blue-800 mb-3">
                Please note that an overall monthly limit applies to Insulins across the different Insulin classes.
                The overall monthly limit for KeyCare, Smart, Priority, Core and Saver plans is <strong>R700</strong>.
                The overall monthly limit for Executive and Comprehensive plans is <strong>R720</strong>.
              </p>
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Current Insulin Total:</span>
                  <span className="text-lg font-bold text-blue-700">R{calculateInsulinTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Plan Limit ({selectedPlan}):</span>
                  <span className="text-lg font-bold text-gray-900">R{getInsulinLimit().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-blue-100">
                  <span className="text-sm font-medium text-gray-700">Remaining:</span>
                  <span className={`text-lg font-bold ${
                    (getInsulinLimit() - calculateInsulinTotal()) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    R{(getInsulinLimit() - calculateInsulinTotal()).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

        {/* Plan Coverage Summary */}
        {(() => {
          const restrictedCount = filteredMedications.filter(
            m => !DataService.isMedicationAllowedForPlan(m, selectedPlan)
          ).length;
          const totalCount = filteredMedications.length;
          const availableCount = totalCount - restrictedCount;

          if (restrictedCount > 0) {
            return (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900">
                      Plan Coverage Notice
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      <strong>{restrictedCount}</strong> of <strong>{totalCount}</strong> medications are not covered by the <strong>{selectedPlan}</strong> plan.
                      {' '}<strong>{availableCount}</strong> medications are available for selection.
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

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

            const isInsulin = isDiabetesCondition && insulinClasses.includes(medicine.medicineClass);
            const medicationCost = parseAmount(cdaAmount);
            const currentInsulinTotal = calculateInsulinTotal();
            const wouldExceedLimit = isInsulin && (currentInsulinTotal + medicationCost > getInsulinLimit());
            
            // Check plan restrictions
            const isAllowedForPlan = DataService.isMedicationAllowedForPlan(medicine, selectedPlan);
            const isRestricted = !isAllowedForPlan;
            
            const isDisabled = isSelected || isExcluded || wouldExceedLimit || isRestricted;

            return (
              <button
                key={index}
                onClick={() => handleSelectMedication(medicine)}
                disabled={isDisabled}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isRestricted
                    ? 'border-orange-300 bg-orange-50 cursor-not-allowed opacity-75'
                    : wouldExceedLimit
                    ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-60'
                    : isSelected || isExcluded
                    ? 'border-green-500 bg-green-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-purple-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                      {isRestricted && medicine.planRestriction && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Not Covered by {selectedPlan} Plan
                        </span>
                      )}
                      {wouldExceedLimit && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium">
                          Exceeds Insulin Limit
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
                      {isRestricted && medicine.planRestriction && (
                        <div className="mt-2 pt-2 border-t border-orange-200">
                          <p className="text-orange-700 font-medium text-xs">
                            {medicine.planRestriction.type === 'only' 
                              ? `✓ Available on: ${medicine.planRestriction.plans.join(', ')} plans only`
                              : `✗ Not available on: ${medicine.planRestriction.plans.join(', ')} plan(s)`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="ml-4 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {isRestricted && !isSelected && (
                    <div className="ml-4 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <X className="w-4 h-4 text-white" />
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
          <h3 className="font-semibold text-lg mb-4">Selected Medications ({medications.length})</h3>
          <div className="space-y-3">
            {medications.map((med, index) => (
              <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start justify-between">
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationSelection;
