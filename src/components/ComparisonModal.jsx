import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const ComparisonModal = ({ onClose, onSelect, currentTimelineId }) => {
    const { token } = useAuth();
    const [timelines, setTimelines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (token) {
            apiClient.getTimelines(token)
                .then(data => {
                    // Filter out the current timeline
                    setTimelines(data.filter(t => t.id !== currentTimelineId));
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch timelines for comparison", err);
                    setLoading(false);
                });
        }
    }, [token, currentTimelineId]);

    const filteredTimelines = timelines.filter(t =>
        t.identifier.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
        }} onClick={onClose}>
            <div className="glass-panel" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Comparar Línea de Tiempo</h2>
                    <button onClick={onClose} className="btn-secondary" style={{ padding: '0.5rem' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Buscar cronología..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field"
                        style={{ paddingLeft: '3rem' }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {loading ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando cronologías...</p>
                    ) : filteredTimelines.length > 0 ? (
                        filteredTimelines.map(t => (
                            <button
                                key={t.id}
                                className="btn-secondary"
                                style={{ textAlign: 'left', padding: '1rem', display: 'block' }}
                                onClick={() => onSelect(t.id)}
                            >
                                <div style={{ fontWeight: 'bold' }}>{t.identifier || 'Sin título'}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{t.description || 'Sin descripción'}</div>
                            </button>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No se encontraron otras cronologías.</p>
                    )}
                </div>

                <button
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '1.5rem' }}
                    onClick={onClose}
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};
