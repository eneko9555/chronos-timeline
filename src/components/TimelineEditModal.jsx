import React, { useState } from 'react';
import { X, Type, FileText, Image, Palette } from 'lucide-react';
import { THEMES } from '../constants/themes';

export const TimelineEditModal = ({ timeline, onClose, onUpdate }) => {
    console.log('TimelineEditModal received timeline:', timeline);
    const [formData, setFormData] = useState({
        name: timeline.identifier || '',
        description: timeline.description || '',
        coverImage: timeline.coverImage || '',
        themeId: timeline.themeId || 'chronos'
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('El nombre es obligatorio');
            return;
        }
        onUpdate(timeline.id, formData.name, formData.description, formData.coverImage, formData.themeId);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
        }} onClick={onClose}>
            <div
                className="glass-panel"
                style={{
                    width: '500px',
                    maxWidth: '90vw',
                    padding: '2rem',
                    background: 'var(--bg-secondary)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Editar Línea de Tiempo</h2>
                    <button onClick={onClose} style={{ padding: '0.5rem' }}>
                        <X size={24} color="var(--text-secondary)" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Nombre *
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Type size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Mi línea de tiempo"
                                style={{ width: '100%', paddingLeft: '40px' }}
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }}>
                            URL de Imagen de Portada
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Image size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                            <input
                                name="coverImage"
                                value={formData.coverImage}
                                onChange={handleChange}
                                placeholder="https://..."
                                style={{ width: '100%', paddingLeft: '40px' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Descripción
                        </label>
                        <div style={{ position: 'relative' }}>
                            <FileText size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)', zIndex: 1 }} />
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Describe tu línea de tiempo..."
                                style={{
                                    width: '100%',
                                    paddingLeft: '40px',
                                    resize: 'vertical',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: 'var(--text-primary)',
                                    padding: '0.75rem 0.75rem 0.75rem 40px'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: '500' }}>
                            Estilo Visual (Tema)
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
                            {Object.values(THEMES).map(theme => (
                                <div
                                    key={theme.id}
                                    onClick={() => setFormData({ ...formData, themeId: theme.id })}
                                    style={{
                                        cursor: 'pointer',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: formData.themeId === theme.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                                        border: `2px solid ${formData.themeId === theme.id ? 'var(--accent-color)' : 'transparent'}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: theme.vars['--accent-color'],
                                        boxShadow: `0 0 10px ${theme.vars['--accent-glow']}`
                                    }} />
                                    <span style={{ fontSize: '0.75rem', textAlign: 'center', color: formData.themeId === theme.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                        {theme.name.split(' ')[0]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
