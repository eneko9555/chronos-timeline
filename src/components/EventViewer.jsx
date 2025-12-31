import React from 'react';
import { X, Calendar, MapPin } from 'lucide-react';
import { MapViewer } from './MapViewer';

export const EventViewer = ({ event, onClose, isPresentationMode = false }) => {
    const isVideo = event.mediaUrl?.match(/\.(mp4|webm|ogg)$/i);

    const containerStyle = isPresentationMode ? {
        position: 'fixed',
        bottom: '2rem',
        left: '2rem',
        width: '400px',
        maxHeight: 'calc(100vh - 120px)',
        zIndex: 100,
        pointerEvents: 'auto'
    } : {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
    };

    return (
        <div style={containerStyle} onClick={isPresentationMode ? undefined : onClose}>
            <div
                className="glass-panel"
                style={{
                    width: isPresentationMode ? '100%' : '600px',
                    maxWidth: isPresentationMode ? '400px' : '90vw',
                    maxHeight: isPresentationMode ? '100%' : '90vh',
                    padding: '0',
                    background: 'var(--bg-secondary)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header Image/Video Region */}
                {event.mediaUrl && (
                    <div style={{ width: '100%', maxHeight: '300px', overflow: 'hidden', background: '#000', display: 'flex', justifyContent: 'center' }}>
                        {isVideo ? (
                            <video src={event.mediaUrl} controls style={{ maxWidth: '100%', maxHeight: '300px' }} />
                        ) : (
                            <img src={event.mediaUrl} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                    </div>
                )}

                <div style={{ padding: '2rem', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 12px',
                                borderRadius: '100px',
                                background: event.color ? `linear-gradient(135deg, ${event.color} 0%, ${event.color.replace('hsl(', 'hsla(').replace(')', ', 0.8)')} 100%)` : 'var(--accent-color)',
                                color: 'white',
                                fontSize: '0.7rem',
                                fontWeight: '800',
                                marginBottom: '0.75rem',
                                boxShadow: event.color ? `0 4px 12px ${event.color.replace('hsl(', 'hsla(').replace(')', ', 0.3)')}` : 'none',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}>
                                {event.isParent ? 'Época' : (event.isMilestone ? 'Hito' : (event.type === 'stage' ? 'Etapa' : 'Suceso'))}
                            </span>
                            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', lineHeight: 1.2 }}>{event.title}</h1>
                        </div>
                        <button onClick={onClose} style={{ padding: '0.5rem' }}><X size={24} color="var(--text-secondary)" /></button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        <Calendar size={16} />
                        <span>
                            {new Date(event.start).toLocaleDateString()}
                            {!event.isMilestone && ` - ${new Date(event.end).toLocaleDateString()}`}
                        </span>
                    </div>

                    {event.geo?.lat && event.geo?.lng && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                <MapPin size={16} color="var(--accent-color)" />
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{event.geo.name || 'Ubicación'}</span>
                            </div>
                            <div style={{ width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden' }}>
                                <MapViewer events={[event]} focusedEventId={event.id} />
                            </div>
                        </div>
                    )}

                    {event.tags && event.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
                            {event.tags.map(tag => (
                                <span key={tag} style={{
                                    background: event.color ? event.color.replace('hsl(', 'hsla(').replace(')', ', 0.15)') : 'rgba(255,255,255,0.1)',
                                    color: event.color || 'var(--text-secondary)',
                                    padding: '2px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    border: `1px solid ${event.color ? event.color.replace('hsl(', 'hsla(').replace(')', ', 0.3)') : 'rgba(255,255,255,0.1)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {event.description ? (
                        <div style={{ lineHeight: '1.6', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                            {event.description}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin descripción.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
