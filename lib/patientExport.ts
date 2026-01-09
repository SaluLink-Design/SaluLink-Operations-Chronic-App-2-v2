import JSZip from 'jszip';
import jsPDF from 'jspdf';

export interface PatientExportSelection {
  includeClinicalNote: boolean;
  includePatientInfo: boolean;
  includeRegistrationNote: boolean;
  selectedConditions: string[];
  selectedMedications: string[];
}

export interface PatientExportData {
  patientName: string;
  patientId: string;
  clinicalNote: string;
  registrationNote: string;
  conditions: Array<{
    id: string;
    name: string;
    icdCode: string;
    icdDescription: string;
  }>;
  medications: Array<{
    id: string;
    name: string;
    nappiCode: string;
    quantity: number;
    dosage: string;
  }>;
}

export async function generatePatientExportZip(
  data: PatientExportData,
  selection: PatientExportSelection
): Promise<Blob> {
  const zip = new JSZip();

  if (selection.includePatientInfo) {
    const patientInfoContent = generatePatientInfo(data);
    zip.file('Patient_Information.txt', patientInfoContent);
  }

  if (selection.includeClinicalNote && data.clinicalNote) {
    zip.file('Clinical_Note.txt', data.clinicalNote);
  }

  if (selection.includeRegistrationNote && data.registrationNote) {
    zip.file('Chronic_Registration_Note.txt', data.registrationNote);
  }

  if (selection.selectedConditions.length > 0) {
    const conditionsContent = generateConditionsDocument(data, selection.selectedConditions);
    zip.file('Diagnosis_ICD_Codes.txt', conditionsContent);

    const conditionsPdf = await generateConditionsPDF(data, selection.selectedConditions);
    zip.file('Diagnosis_ICD_Codes.pdf', conditionsPdf);
  }

  if (selection.selectedMedications.length > 0) {
    const medicationsContent = generateMedicationsDocument(data, selection.selectedMedications);
    zip.file('Prescription_Medications.txt', medicationsContent);

    const medicationsPdf = await generateMedicationsPDF(data, selection.selectedMedications);
    zip.file('Prescription_Medications.pdf', medicationsPdf);
  }

  const claimSummaryContent = generateClaimSummary(data, selection);
  zip.file('Claim_Summary.txt', claimSummaryContent);

  const claimSummaryPdf = await generateClaimSummaryPDF(data, selection);
  zip.file('Claim_Summary.pdf', claimSummaryPdf);

  return await zip.generateAsync({ type: 'blob' });
}

function generatePatientInfo(data: PatientExportData): string {
  return `PATIENT INFORMATION
${'='.repeat(50)}

Patient Name: ${data.patientName}
Patient ID: ${data.patientId}
Date Generated: ${new Date().toLocaleDateString()}

${'='.repeat(50)}

This package contains medical information for claim submission purposes.
`;
}

function generateConditionsDocument(
  data: PatientExportData,
  selectedIds: string[]
): string {
  const selectedConditions = data.conditions.filter(c => selectedIds.includes(c.id));

  let content = `DIAGNOSIS AND ICD-10 CODES
${'='.repeat(50)}

Patient: ${data.patientName}
Patient ID: ${data.patientId}
Date: ${new Date().toLocaleDateString()}

${'='.repeat(50)}

DIAGNOSED CONDITIONS:

`;

  selectedConditions.forEach((condition, index) => {
    content += `${index + 1}. ${condition.name}
   ICD-10 Code: ${condition.icdCode}
   Description: ${condition.icdDescription}

`;
  });

  content += `
${'='.repeat(50)}

Total Conditions: ${selectedConditions.length}

This document is for claim submission purposes only.
`;

  return content;
}

function generateMedicationsDocument(
  data: PatientExportData,
  selectedIds: string[]
): string {
  const selectedMedications = data.medications.filter(m => selectedIds.includes(m.id));

  let content = `PRESCRIPTION MEDICATIONS
${'='.repeat(50)}

Patient: ${data.patientName}
Patient ID: ${data.patientId}
Date: ${new Date().toLocaleDateString()}

${'='.repeat(50)}

PRESCRIBED MEDICATIONS:

`;

  selectedMedications.forEach((med, index) => {
    content += `${index + 1}. ${med.name}
   NAPPI Code: ${med.nappiCode}
   Dosage: ${med.dosage || 'As prescribed'}
   Quantity: ${med.quantity}

`;
  });

  content += `
${'='.repeat(50)}

Total Medications: ${selectedMedications.length}

This prescription is for claim submission purposes only.
`;

  return content;
}

function generateClaimSummary(
  data: PatientExportData,
  selection: PatientExportSelection
): string {
  const selectedConditions = data.conditions.filter(c => selection.selectedConditions.includes(c.id));
  const selectedMedications = data.medications.filter(m => selection.selectedMedications.includes(m.id));

  let content = `MEDICAL CLAIM SUMMARY
${'='.repeat(50)}

Patient: ${data.patientName}
Patient ID: ${data.patientId}
Date Generated: ${new Date().toLocaleDateString()}

${'='.repeat(50)}

CLAIM INFORMATION:

`;

  if (selection.includeClinicalNote) {
    content += `CLINICAL NOTE:
${data.clinicalNote}

`;
  }

  if (selection.includeRegistrationNote) {
    content += `CHRONIC REGISTRATION NOTE:
${data.registrationNote}

`;
  }

  if (selectedConditions.length > 0) {
    content += `DIAGNOSED CONDITIONS (${selectedConditions.length}):
`;
    selectedConditions.forEach((condition, index) => {
      content += `  ${index + 1}. ${condition.name} (${condition.icdCode})
`;
    });
    content += '\n';
  }

  if (selectedMedications.length > 0) {
    content += `PRESCRIBED MEDICATIONS (${selectedMedications.length}):
`;
    selectedMedications.forEach((med, index) => {
      content += `  ${index + 1}. ${med.name} - ${med.quantity} units
`;
    });
    content += '\n';
  }

  content += `
${'='.repeat(50)}

This summary contains all selected information for claim submission.
Please submit this documentation to your medical aid for claim processing.
`;

  return content;
}

async function generateConditionsPDF(
  data: PatientExportData,
  selectedIds: string[]
): Promise<Blob> {
  const selectedConditions = data.conditions.filter(c => selectedIds.includes(c.id));
  const pdf = new jsPDF();

  pdf.setFontSize(18);
  pdf.text('Diagnosis and ICD-10 Codes', 20, 20);

  pdf.setFontSize(10);
  pdf.text(`Patient: ${data.patientName}`, 20, 35);
  pdf.text(`Patient ID: ${data.patientId}`, 20, 42);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 49);

  pdf.setLineWidth(0.5);
  pdf.line(20, 55, 190, 55);

  let yPos = 65;
  pdf.setFontSize(12);

  selectedConditions.forEach((condition, index) => {
    if (yPos > 270) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}. ${condition.name}`, 20, yPos);
    yPos += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`ICD-10 Code: ${condition.icdCode}`, 25, yPos);
    yPos += 7;

    const descLines = pdf.splitTextToSize(`Description: ${condition.icdDescription}`, 160);
    pdf.text(descLines, 25, yPos);
    yPos += descLines.length * 7 + 5;
  });

  return pdf.output('blob');
}

async function generateMedicationsPDF(
  data: PatientExportData,
  selectedIds: string[]
): Promise<Blob> {
  const selectedMedications = data.medications.filter(m => selectedIds.includes(m.id));
  const pdf = new jsPDF();

  pdf.setFontSize(18);
  pdf.text('Prescription Medications', 20, 20);

  pdf.setFontSize(10);
  pdf.text(`Patient: ${data.patientName}`, 20, 35);
  pdf.text(`Patient ID: ${data.patientId}`, 20, 42);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 49);

  pdf.setLineWidth(0.5);
  pdf.line(20, 55, 190, 55);

  let yPos = 65;
  pdf.setFontSize(12);

  selectedMedications.forEach((med, index) => {
    if (yPos > 270) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}. ${med.name}`, 20, yPos);
    yPos += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`NAPPI Code: ${med.nappiCode}`, 25, yPos);
    yPos += 7;
    pdf.text(`Dosage: ${med.dosage || 'As prescribed'}`, 25, yPos);
    yPos += 7;
    pdf.text(`Quantity: ${med.quantity}`, 25, yPos);
    yPos += 10;
  });

  return pdf.output('blob');
}

async function generateClaimSummaryPDF(
  data: PatientExportData,
  selection: PatientExportSelection
): Promise<Blob> {
  const selectedConditions = data.conditions.filter(c => selection.selectedConditions.includes(c.id));
  const selectedMedications = data.medications.filter(m => selection.selectedMedications.includes(m.id));
  const pdf = new jsPDF();

  pdf.setFontSize(18);
  pdf.text('Medical Claim Summary', 20, 20);

  pdf.setFontSize(10);
  pdf.text(`Patient: ${data.patientName}`, 20, 35);
  pdf.text(`Patient ID: ${data.patientId}`, 20, 42);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 49);

  pdf.setLineWidth(0.5);
  pdf.line(20, 55, 190, 55);

  let yPos = 65;

  if (selection.includeClinicalNote && data.clinicalNote) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Clinical Note:', 20, yPos);
    yPos += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const noteLines = pdf.splitTextToSize(data.clinicalNote, 170);
    pdf.text(noteLines, 20, yPos);
    yPos += noteLines.length * 5 + 10;
  }

  if (selection.includeRegistrationNote && data.registrationNote) {
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Chronic Registration Note:', 20, yPos);
    yPos += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const regNoteLines = pdf.splitTextToSize(data.registrationNote, 170);
    pdf.text(regNoteLines, 20, yPos);
    yPos += regNoteLines.length * 5 + 10;
  }

  if (selectedConditions.length > 0) {
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Diagnosed Conditions (${selectedConditions.length}):`, 20, yPos);
    yPos += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    selectedConditions.forEach((condition, index) => {
      if (yPos > 280) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text(`${index + 1}. ${condition.name} (${condition.icdCode})`, 25, yPos);
      yPos += 6;
    });
    yPos += 5;
  }

  if (selectedMedications.length > 0) {
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Prescribed Medications (${selectedMedications.length}):`, 20, yPos);
    yPos += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    selectedMedications.forEach((med, index) => {
      if (yPos > 280) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text(`${index + 1}. ${med.name} - ${med.quantity} units`, 25, yPos);
      yPos += 6;
    });
  }

  return pdf.output('blob');
}

export function downloadZipFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
