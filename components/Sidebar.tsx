'use client';

import { X, FolderOpen, Clock, CheckCircle, LayoutGrid, Trash2 } from 'lucide-react';
import { PatientCase } from '@/types';
import { format } from 'date-fns';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cases: PatientCase[];
  onLoadCase: (caseId: string) => void;
  onDeleteCase: (caseId: string) => void;
  onViewAll: () => void;
}

const Sidebar = ({ isOpen, onClose, cases, onLoadCase, onDeleteCase, onViewAll }: SidebarProps) => {
  const getStatusStyle = (status: PatientCase['status']): { bg: string; color: string; border: string } => {
    switch (status) {
      case 'completed':
        return {
          bg: 'rgba(16,217,160,0.12)',
          color: '#6ee7b7',
          border: 'rgba(16,217,160,0.2)',
        };
      case 'ongoing':
        return {
          bg: 'rgba(56,182,255,0.12)',
          color: '#7dd3fc',
          border: 'rgba(56,182,255,0.2)',
        };
      case 'diagnostic':
        return {
          bg: 'rgba(245,158,11,0.12)',
          color: '#fcd34d',
          border: 'rgba(245,158,11,0.2)',
        };
      default:
        return {
          bg: 'rgba(148,163,184,0.1)',
          color: '#94a3b8',
          border: 'rgba(148,163,184,0.15)',
        };
    }
  };

  const getStatusIcon = (status: PatientCase['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'ongoing':
        return <Clock className="w-3 h-3" />;
      default:
        return <FolderOpen className="w-3 h-3" />;
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(4,6,17,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'rgba(9,12,28,0.97)',
          borderLeft: '1px solid rgba(30,39,72,0.9)',
          backdropFilter: 'blur(20px)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5), -1px 0 0 rgba(56,182,255,0.08)',
        }}
      >
        {/* Header */}
        <div
          className="p-5"
          style={{ borderBottom: '1px solid rgba(30,39,72,0.8)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(56,182,255,0.12)', border: '1px solid rgba(56,182,255,0.2)' }}
              >
                <FolderOpen className="w-4 h-4" style={{ color: '#38b6ff' }} />
              </div>
              <div>
                <h2
                  className="text-base font-bold"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#f1f5f9' }}
                >
                  Patient Cases
                </h2>
                <p className="text-xs" style={{ color: '#475569' }}>
                  {cases.length} {cases.length === 1 ? 'case' : 'cases'} saved
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(30,39,72,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,182,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30,39,72,0.6)')}
            >
              <X className="w-4 h-4" style={{ color: '#94a3b8' }} />
            </button>
          </div>

          <button
            onClick={() => { onViewAll(); onClose(); }}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 text-white"
            style={{
              background: 'linear-gradient(135deg, #38b6ff 0%, #7c3aed 100%)',
              boxShadow: '0 0 20px rgba(56,182,255,0.2)',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 28px rgba(56,182,255,0.35)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(56,182,255,0.2)')}
          >
            <LayoutGrid className="w-4 h-4" />
            View All Cases
          </button>
        </div>

        {/* Cases list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(30,39,72,0.6)', border: '1px solid rgba(30,39,72,0.9)' }}
              >
                <FolderOpen className="w-7 h-7" style={{ color: '#475569' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>No saved cases yet</p>
              <p className="text-xs mt-1" style={{ color: '#475569' }}>
                Complete a workflow to save patient cases
              </p>
            </div>
          ) : (
            cases.map(patientCase => {
              const statusStyle = getStatusStyle(patientCase.status);
              return (
                <div
                  key={patientCase.id}
                  className="rounded-xl p-4 cursor-pointer transition-all duration-200"
                  style={{
                    background: 'rgba(13,16,37,0.7)',
                    border: '1px solid rgba(30,39,72,0.8)',
                  }}
                  onClick={() => { onLoadCase(patientCase.id); onClose(); }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(56,182,255,0.3)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(56,182,255,0.05)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(30,39,72,0.8)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(13,16,37,0.7)';
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold text-sm truncate" style={{ color: '#f1f5f9' }}>
                        {patientCase.patientName}
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                        ID: {patientCase.patientId}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                      style={{
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        border: `1px solid ${statusStyle.border}`,
                      }}
                    >
                      {getStatusIcon(patientCase.status)}
                      <span className="capitalize">{patientCase.status}</span>
                    </span>
                  </div>

                  {/* Card details */}
                  <div className="space-y-1 mb-3">
                    <p className="text-xs" style={{ color: '#94a3b8' }}>
                      <span style={{ color: '#475569' }}>Condition:</span>{' '}
                      <span className="font-medium">{patientCase.condition}</span>
                    </p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>
                      <span style={{ color: '#475569' }}>ICD-10:</span>{' '}
                      <span
                        className="font-mono font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(56,182,255,0.1)', color: '#7dd3fc' }}
                      >
                        {patientCase.icdCode}
                      </span>
                    </p>
                    <p className="text-xs" style={{ color: '#475569' }}>
                      Updated {format(new Date(patientCase.updatedAt), 'MMM dd, yyyy')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); onLoadCase(patientCase.id); onClose(); }}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-150"
                      style={{
                        background: 'rgba(56,182,255,0.1)',
                        border: '1px solid rgba(56,182,255,0.2)',
                        color: '#7dd3fc',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,182,255,0.2)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,182,255,0.1)';
                      }}
                    >
                      Open Case
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm('Delete this case?')) onDeleteCase(patientCase.id);
                      }}
                      className="py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1"
                      style={{
                        background: 'rgba(244,63,94,0.08)',
                        border: '1px solid rgba(244,63,94,0.15)',
                        color: '#fda4af',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.18)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(244,63,94,0.3)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.08)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(244,63,94,0.15)';
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer branding */}
        <div
          className="p-4 flex items-center gap-2"
          style={{ borderTop: '1px solid rgba(30,39,72,0.8)' }}
        >
          <img
            src="/salulink-orb.png"
            alt=""
            className="w-5 h-5 object-contain opacity-60"
          />
          <span className="text-xs" style={{ color: '#475569' }}>
            SaluLink · Chronic Treatment App
          </span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
