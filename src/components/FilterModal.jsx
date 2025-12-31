import { X, Check, Square, CheckSquare } from 'lucide-react';

export const FilterModal = ({ activeFilters, onToggle, selectedTags, onToggleTag, allTags, selectedLocations, onToggleLocation, allLocations, onClose }) => {
    const filterTypes = [
        { id: 'epoch', label: 'Épocas', color: '#ff6b6b', description: 'Zonas de fondo y barras principales' },
        { id: 'stage', label: 'Etapas', color: '#4ecdc4', description: 'Periodos de tiempo secundarios' },
        { id: 'event', label: 'Sucesos', color: '#45b7d1', description: 'Eventos puntuales o cortos' },
        { id: 'milestone', label: 'Hitos', color: '#96ceb4', description: 'Puntos clave circulares' }
    ];

    const allSelected = activeFilters.size === filterTypes.length;

    const handleSelectAll = () => {
        if (allSelected) {
            onToggle(new Set());
        } else {
            onToggle(new Set(filterTypes.map(f => f.id)));
        }
    };

    const handleToggle = (id) => {
        const newFilters = new Set(activeFilters);
        if (newFilters.has(id)) {
            newFilters.delete(id);
        } else {
            newFilters.add(id);
        }
        onToggle(newFilters);
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
            zIndex: 3000,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '450px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                        Filtrar Contenido
                    </h2>
                    <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '1.5rem',
                        padding: '0 4px'
                    }}>
                        <button
                            onClick={handleSelectAll}
                            style={{
                                all: 'unset',
                                cursor: 'pointer',
                                color: 'var(--accent-color)',
                                fontSize: '0.9rem',
                                fontWeight: '500'
                            }}
                        >
                            {allSelected ? 'Desmarcar todo' : 'Marcar todo'}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: '12px' }}>
                        {filterTypes.map(type => {
                            const isActive = activeFilters.has(type.id);
                            return (
                                <div
                                    key={type.id}
                                    onClick={() => handleToggle(type.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '1rem',
                                        background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                                        border: `1px solid ${isActive ? 'var(--accent-color)' : 'var(--border-primary)'}`,
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{
                                        color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        {isActive ? <CheckSquare size={24} /> : <Square size={24} />}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: type.color }} />
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{type.label}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            {type.description}
                                        </div>
                                    </div>

                                    {isActive && <Check size={20} style={{ color: 'var(--accent-color)' }} />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-primary)', maxHeight: '300px', overflowY: 'auto' }}>
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

                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', textAlign: 'right' }}>
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
