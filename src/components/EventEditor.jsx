import React, { useState } from 'react';
import { X, Calendar, Type, Trash2, Check, Map as MapIcon, Search, Plus } from 'lucide-react';
import { formatDate } from '../utils';
import { LocationPicker } from './LocationPicker';

export const EventEditor = ({ event, onSave, onClose, onDelete }) => {
    const [formData, setFormData] = useState({
        ...event,
        start: formatDate(event.start),
        end: formatDate(event.end),
        geo: event.geo || { lat: '', lng: '', name: '' }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            start: new Date(formData.start),
            end: new Date(formData.end)
        });
    };

    const searchLocation = async () => {
        if (!formData.geo?.name) return;

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.geo.name)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setFormData({
                    ...formData,
                    geo: {
                        ...formData.geo,
                        lat: lat,
                        lng: lon
                    }
                });
            }
        } catch (error) {
            console.error("Geocoding error:", error);
        }
    };

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
        }} onClick={onClose}>
            <div
                className="glass-panel"
                style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                        {event.isParent ? 'Editar Época' : (event.isMilestone ? 'Editar Hito' : (event.type === 'stage' ? 'Editar Etapa' : 'Editar Suceso'))}
                    </h2>
                    <button onClick={onClose}><X size={24} color="var(--text-secondary)" /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Título</label>
                        <div style={{ position: 'relative' }}>
                            <Type size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
                            <input
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                style={{ width: '100%', paddingLeft: '36px' }}
                                autoFocus
                            />
                        </div>
                    </div>

                    {formData.isMilestone ? (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Fecha</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="date"
                                    name="start"
                                    value={formData.start}
                                    onChange={(e) => {
                                        const date = e.target.value;
                                        setFormData({ ...formData, start: date, end: date });
                                    }}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Inicio</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="date"
                                        name="start"
                                        value={formData.start}
                                        onChange={handleChange}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Fin</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="date"
                                        name="end"
                                        value={formData.end}
                                        onChange={handleChange}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>URL Multimedia (Imagen/Video)</label>
                        <input
                            name="mediaUrl"
                            value={formData.mediaUrl || ''}
                            onChange={handleChange}
                            placeholder="https://..."
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Descripción</label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            rows={4}
                            style={{
                                width: '100%',
                                resize: 'vertical',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                                padding: '0.5rem'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tags</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                                id="tag-input"
                                placeholder="Añadir tag (ej: importante)"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const tag = e.target.value.trim();
                                        if (tag) {
                                            if (!(formData.tags || []).includes(tag)) {
                                                setFormData({ ...formData, tags: [...(formData.tags || []), tag] });
                                            }
                                            e.target.value = '';
                                        }
                                    }
                                }}
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => {
                                    const input = document.getElementById('tag-input');
                                    const tag = input.value.trim();
                                    if (tag) {
                                        if (!(formData.tags || []).includes(tag)) {
                                            setFormData({ ...formData, tags: [...(formData.tags || []), tag] });
                                        }
                                        input.value = '';
                                    }
                                }}
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {(formData.tags || []).map(tag => (
                                <span key={tag} style={{
                                    background: 'var(--accent-color)',
                                    color: 'white',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem'
                                }}>
                                    #{tag}
                                    <X
                                        size={14}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setFormData({
                                            ...formData,
                                            tags: formData.tags.filter(t => t !== tag)
                                        })}
                                    />
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>
                            <MapIcon size={18} />
                            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Ubicación Geográfica</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    placeholder="Nombre del lugar (ej: París, Francia)"
                                    value={formData.geo?.name || ''}
                                    onChange={(e) => setFormData({ ...formData, geo: { ...formData.geo, name: e.target.value } })}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            searchLocation();
                                        }
                                    }}
                                    style={{ width: '100%', fontSize: '0.85rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={searchLocation}
                                    className="btn-secondary"
                                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Buscar en el mapa"
                                >
                                    <Search size={18} />
                                </button>
                            </div>
                            <LocationPicker
                                lat={formData.geo?.lat}
                                lng={formData.geo?.lng}
                                onChange={(lat, lng) => setFormData({ ...formData, geo: { ...formData.geo, lat, lng } })}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Latitud"
                                    value={formData.geo?.lat || ''}
                                    onChange={(e) => setFormData({ ...formData, geo: { ...formData.geo, lat: e.target.value } })}
                                    style={{ width: '100%', fontSize: '0.85rem' }}
                                />
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Longitud"
                                    value={formData.geo?.lng || ''}
                                    onChange={(e) => setFormData({ ...formData, geo: { ...formData.geo, lng: e.target.value } })}
                                    style={{ width: '100%', fontSize: '0.85rem' }}
                                />
                            </div>
                        </div>
                    </div>



                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <button
                            type="button"
                            onClick={onDelete}
                            className="btn-secondary"
                            style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Trash2 size={16} /> Eliminar
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Check size={16} /> Guardar
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};
