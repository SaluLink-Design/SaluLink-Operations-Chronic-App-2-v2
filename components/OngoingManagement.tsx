'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, Repeat, X, FileText } from 'lucide-react';
import { TreatmentBasketItem, TreatmentItem } from '@/types';
import { DataService } from '@/lib/dataService';

interface OngoingManagementProps {
  condition: string;
  treatments: TreatmentItem[];
  onAddTreatment: (treatment: TreatmentItem) => void;
  onUpdateTreatment: (index: number, treatment: Partial<TreatmentItem>) => void;
  onRemoveTreatment: (index: number) => void;
  onSavePdfOnly: () => void;
  onSaveWithAttachments: () => void;
}

const OngoingManagement = ({
  condition,
  treatments,
  onAddTreatment,
  onUpdateTreatment,
  onRemoveTreatment,
  onSavePdfOnly,
  onSaveWithAttachments
}: OngoingManagementProps) => {
  const [basketItems, setBasketItems] = useState<TreatmentBasketItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  useEffect(() => {
    const items = DataService.getTreatmentBasketForCondition(condition);
    setBasketItems(items);
  }, [condition]);
  
  const handleAddTreatment = () => {
    if (!selectedItem) return;

    const [selectedDesc, selectedCode] = selectedItem.split('|||');
    const item = basketItems.find(b =>
      b.ongoingManagementBasket.description.trim() === selectedDesc &&
      b.ongoingManagementBasket.code.trim() === selectedCode
    );
    if (!item) return;

    const existingTreatment = treatments.find(t =>
      t.description.trim() === item.ongoingManagementBasket.description.trim() &&
      t.code.trim() === item.ongoingManagementBasket.code.trim()
    );
    if (existingTreatment) {
      alert('This treatment has already been added.');
      setSelectedItem(null);
      return;
    }

    const coverageValue = item.ongoingManagementBasket.covered?.trim();
    const maxCovered = coverageValue && !isNaN(parseInt(coverageValue)) ? parseInt(coverageValue) : 1;

    const newTreatment: TreatmentItem = {
      description: item.ongoingManagementBasket.description.trim(),
      code: item.ongoingManagementBasket.code.trim(),
      maxCovered: maxCovered,
      timesCompleted: 1,
      documentation: {
        notes: '',
        images: []
      }
    };

    onAddTreatment(newTreatment);
    setSelectedItem(null);
  };
  
  const availableItems = basketItems.filter(item => {
    const description = item.ongoingManagementBasket.description?.trim();
    const code = item.ongoingManagementBasket.code?.trim();
    return description && code && !treatments.some(t =>
      t.description.trim() === description && t.code.trim() === code
    );
  });
  
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Repeat className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ongoing Management Basket</h2>
            <p className="text-sm text-gray-500">Add ongoing monitoring and management protocols</p>
          </div>
        </div>
        
        {/* Add Treatment */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="label">Add Ongoing Treatment</label>
          <div className="flex gap-2">
            <select
              className="input-field flex-1"
              value={selectedItem || ''}
              onChange={(e) => setSelectedItem(e.target.value)}
            >
              <option value="">Select an ongoing treatment...</option>
              {availableItems.map((item, index) => {
                const description = item.ongoingManagementBasket.description?.trim();
                const code = item.ongoingManagementBasket.code?.trim();
                const coverageValue = item.ongoingManagementBasket.covered?.trim();
                const maxCovered = coverageValue && !isNaN(parseInt(coverageValue)) ? parseInt(coverageValue) : 1;
                const optionValue = `${description}|||${code}`;

                return (
                  <option key={index} value={optionValue}>
                    {description} ({code}) - Max: {maxCovered} per year
                  </option>
                );
              })}
            </select>
            <button
              className="btn-primary"
              onClick={handleAddTreatment}
              disabled={!selectedItem}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Treatment List */}
        <div className="space-y-4">
          {treatments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Repeat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No ongoing treatments added yet</p>
            </div>
          ) : (
            treatments.map((treatment, index) => (
              <div key={index} className="border-2 border-gray-200 rounded-lg p-4">
                {/* Treatment Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {treatment.description}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Code: <span className="font-mono">{treatment.code}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveTreatment(index)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Times Completed */}
                <div className="mb-4">
                  <label className="label">Times Completed (Per Year)</label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onUpdateTreatment(index, {
                            timesCompleted: Math.max(1, treatment.timesCompleted - 1)
                          })
                        }
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-bold"
                        disabled={treatment.timesCompleted <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={treatment.maxCovered}
                        value={treatment.timesCompleted}
                        onChange={(e) =>
                          onUpdateTreatment(index, {
                            timesCompleted: Math.max(
                              1,
                              Math.min(
                                parseInt(e.target.value) || 1,
                                treatment.maxCovered
                              )
                            )
                          })
                        }
                        className="input-field w-20 text-center"
                      />
                      <button
                        onClick={() =>
                          onUpdateTreatment(index, {
                            timesCompleted: Math.min(treatment.maxCovered, treatment.timesCompleted + 1)
                          })
                        }
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-bold"
                        disabled={treatment.timesCompleted >= treatment.maxCovered}
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        of <span className="font-semibold text-primary-600">{treatment.maxCovered}</span> covered per year
                      </span>
                      {treatment.timesCompleted === treatment.maxCovered && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Max reached
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Documentation */}
                <div className="space-y-3">
                  <label className="label">Documentation</label>

                  <textarea
                    className="textarea-field"
                    rows={3}
                    placeholder="Enter findings and results..."
                    value={treatment.documentation.notes}
                    onChange={(e) =>
                      onUpdateTreatment(index, {
                        documentation: {
                          ...treatment.documentation,
                          notes: e.target.value
                        }
                      })
                    }
                  />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id={`ongoing-file-upload-${index}`}
                        accept="image/*,.pdf,.doc,.docx"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (files) {
                            const filePromises = Array.from(files).map(file => {
                              return new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const result = reader.result as string;
                                  const fileData = JSON.stringify({
                                    name: file.name,
                                    type: file.type,
                                    data: result
                                  });
                                  resolve(fileData);
                                };
                                reader.readAsDataURL(file);
                              });
                            });
                            const fileDataList = await Promise.all(filePromises);
                            onUpdateTreatment(index, {
                              documentation: {
                                ...treatment.documentation,
                                images: [...treatment.documentation.images, ...fileDataList]
                              }
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`ongoing-file-upload-${index}`}
                        className="btn-secondary text-sm flex items-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Files
                      </label>
                      {treatment.documentation.images.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {treatment.documentation.images.length} file(s) uploaded
                        </span>
                      )}
                    </div>

                    {treatment.documentation.images.length > 0 && (
                      <div className="space-y-2">
                        {treatment.documentation.images.map((fileData, fileIndex) => {
                          try {
                            const parsed = JSON.parse(fileData);
                            return (
                              <div
                                key={fileIndex}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-gray-600" />
                                  <span className="text-sm text-gray-700">{parsed.name}</span>
                                </div>
                                <button
                                  onClick={() => {
                                    const newImages = treatment.documentation.images.filter((_, i) => i !== fileIndex);
                                    onUpdateTreatment(index, {
                                      documentation: {
                                        ...treatment.documentation,
                                        images: newImages
                                      }
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-700 p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          } catch {
                            return null;
                          }
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Save Buttons */}
        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onSavePdfOnly} className="btn-secondary flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Save & Export PDF Only
          </button>
          <button onClick={onSaveWithAttachments} className="btn-primary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Save & Export with Attachments (ZIP)
          </button>
        </div>
      </div>
    </div>
  );
};

export default OngoingManagement;

