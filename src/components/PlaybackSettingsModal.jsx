import React, { useState } from 'react';
import { X, Play } from 'lucide-react';
import { format } from 'date-fns';

export const PlaybackSettingsModal = ({ onClose, onStart, minDate, maxDate }) => {
    const [startDate, setStartDate] = useState(format(minDate, 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(maxDate, 'yyyy-MM-dd'));

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000
        }} onClick={onClose}>
            <div className="glass-panel" style={{ width: '400px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Configura tu Presentación</h2>
                    <button onClick={onClose} className="btn-secondary" style={{ padding: '0.5rem' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Desde:</label>
                        <input
                            type="date"
                            className="input-field"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Hasta:</label>
                        <input
                            type="date"
                            className="input-field"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                    💡 La presentación entrará en pantalla completa automáticamente y mostrará los detalles de cada evento.
                </div>

                <button
                    className="btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => onStart(new Date(startDate), new Date(endDate))}
                >
                    <Play size={18} /> Iniciar Presentación
                </button>
            </div>
        </div>
    );
};
