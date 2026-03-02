import { X } from 'lucide-react';

export const FilterModal = ({ selectedTags, onToggleTag, allTags, selectedLocations, onToggleLocation, allLocations, onClose }) => {
    const hasActiveFilters = selectedTags.size > 0 || selectedLocations.size > 0;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3000,
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '450px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)',
                    flexShrink: 0
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                        Filtrar Contenido
                    </h2>
                    <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Filtrar por Tags
                        </h3>
                        {allTags && allTags.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {allTags.map(tag => {
                                    const isSelected = selectedTags.has(tag);
                                    return (
                                        <button
                                            key={tag}
                                            onClick={() => onToggleTag(tag)}
                                            style={{
                                                all: 'unset',
                                                cursor: 'pointer',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '20px',
                                                fontSize: '0.85rem',
                                                fontWeight: '500',
                                                background: isSelected ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                                                color: isSelected ? 'white' : 'var(--text-secondary)',
                                                border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-primary)'}`,
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            #{tag}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                No hay tags disponibles.
                            </p>
                        )}
                    </div>

                    <div style={{ padding: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Filtrar por Ubicación
                        </h3>
                        {allLocations && allLocations.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {allLocations.map(loc => {
                                    const isSelected = selectedLocations.has(loc);
                                    return (
                                        <button
                                            key={loc}
                                            onClick={() => onToggleLocation(loc)}
                                            style={{
                                                all: 'unset',
                                                cursor: 'pointer',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '20px',
                                                fontSize: '0.85rem',
                                                fontWeight: '500',
                                                background: isSelected ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                                                color: isSelected ? 'white' : 'var(--text-secondary)',
                                                border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-primary)'}`,
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSelected ? 'white' : 'var(--accent-color)' }} />
                                            {loc}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                No hay ubicaciones disponibles.
                            </p>
                        )}
                    </div>
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', textAlign: 'right', flexShrink: 0 }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 2rem',
                            borderRadius: '10px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(96, 165, 250, 0.3)'
                        }}
                    >
                        Hecho
                    </button>
                </div>
            </div>
        </div>
    );
};
