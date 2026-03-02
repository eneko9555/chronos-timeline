import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const TimelineSidebar = ({ tracks, getTrackHeight, trackGap, collapsedTracks, onToggleTrack }) => {
    return (
        <div style={{
            width: '150px',
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-primary)',
            position: 'sticky',
            left: 0,
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            marginTop: '40px'
        }}>
            {tracks.map((track) => {
                const isCollapsed = collapsedTracks && collapsedTracks.has(track.id);
                return (
                    <div key={track.id} style={{
                        height: `${getTrackHeight(track.id)}px`,
                        marginBottom: `${trackGap}px`,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 8px',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        color: isCollapsed ? 'var(--text-secondary)' : 'var(--text-primary)',
                        borderBottom: '1px dashed var(--border-secondary)',
                        background: 'var(--bg-secondary)',
                        gap: '4px',
                        overflow: 'hidden',
                        transition: 'height 0.2s ease'
                    }}>
                        {onToggleTrack && (
                            <button
                                onClick={() => onToggleTrack(track.id)}
                                style={{
                                    all: 'unset',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '4px',
                                    color: isCollapsed ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    flexShrink: 0
                                }}
                                title={isCollapsed ? 'Mostrar' : 'Ocultar'}
                            >
                                {isCollapsed ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {track.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
