import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseExcelTimeline } from '../utils/parseExcelTimeline';

export const ImportExcelModal = ({ onImport, onClose }) => {
    const backdropRef = useRef(false);
    const fileInputRef = useRef(null);

    const [parsedData, setParsedData] = useState(null);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('replace');
    const [fileName, setFileName] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setParsedData(null);
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const result = parseExcelTimeline(workbook, XLSX);
                setParsedData(result);
            } catch (err) {
                console.error('Error parsing Excel:', err);
                setError('No se pudo leer el archivo. Asegúrate de que tiene el formato correcto.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImport = () => {
        if (!parsedData) return;
        onImport(parsedData.events, mode, parsedData.timelineName);
    };

    const total = parsedData
        ? parsedData.summary.epochs + parsedData.summary.stages + parsedData.summary.events + parsedData.summary.milestones
        : 0;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
        }} onMouseDown={() => { backdropRef.current = true; }} onClick={() => { if (backdropRef.current) onClose(); }}>
            <div
                className="glass-panel"
                style={{ width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}
                onMouseDown={(e) => { e.stopPropagation(); backdropRef.current = false; }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileSpreadsheet size={22} style={{ color: 'var(--accent-color)' }} />
                        Importar desde Excel
                    </h2>
                    <button onClick={onClose}><X size={24} color="var(--text-secondary)" /></button>
                </div>

                {/* File Input */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: '2px dashed var(--border-primary)',
                        borderRadius: '12px',
                        padding: '2rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: 'rgba(255,255,255,0.02)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                >
                    <Upload size={32} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {fileName || 'Haz clic para seleccionar un archivo .xlsx'}
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Summary */}
                {parsedData && (
                    <div style={{ marginTop: '1rem' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            Resumen ({total} elementos)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {[
                                { label: 'Épocas', count: parsedData.summary.epochs, color: '#6366f1' },
                                { label: 'Etapas', count: parsedData.summary.stages, color: '#8b5cf6' },
                                { label: 'Sucesos', count: parsedData.summary.events, color: '#06b6d4' },
                                { label: 'Hitos', count: parsedData.summary.milestones, color: '#f59e0b' },
                            ].map(item => (
                                <div key={item.label} style={{
                                    padding: '0.6rem 1rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-primary)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: item.color }}>{item.count}</span>
                                </div>
                            ))}
                        </div>

                        {/* Mode selector */}
                        <div style={{ marginTop: '1.25rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Modo de importación
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {[
                                    { value: 'replace', label: 'Reemplazar' },
                                    { value: 'merge', label: 'Fusionar' }
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setMode(opt.value)}
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            borderRadius: '8px',
                                            border: `1px solid ${mode === opt.value ? 'var(--accent-color)' : 'var(--border-primary)'}`,
                                            background: mode === opt.value ? 'var(--accent-color)' : 'rgba(255,255,255,0.03)',
                                            color: mode === opt.value ? 'white' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem', opacity: 0.7 }}>
                                {mode === 'replace'
                                    ? 'Se eliminarán todos los eventos actuales y se sustituirán por los del Excel.'
                                    : 'Los eventos del Excel se añadirán a los ya existentes.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button onClick={onClose} className="btn-secondary">
                        Cancelar
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!parsedData}
                        className="btn-primary"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            opacity: parsedData ? 1 : 0.5,
                            cursor: parsedData ? 'pointer' : 'not-allowed'
                        }}
                    >
                        <Upload size={16} />
                        Importar
                    </button>
                </div>
            </div>
        </div>
    );
};
