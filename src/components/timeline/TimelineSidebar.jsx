import React from 'react';

export const TimelineSidebar = ({ tracks, getTrackHeight, trackGap }) => {
    return (
        <div style={{
            width: '150px',
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-primary)',
            position: 'sticky', // STICKY!
            left: 0,
            zIndex: 30, // Above everything
            display: 'flex',
            flexDirection: 'column',
            marginTop: '40px' // Offset for the top axis (which is 40px height usually)
        }}>
            {tracks.map((track) => (
                <div key={track.id} style={{
                    height: `${getTrackHeight(track.id)}px`,
                    marginBottom: `${trackGap}px`,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 15px',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    borderBottom: '1px dashed var(--border-secondary)',
                    background: 'var(--bg-secondary)' // Ensure non-transparent to hide content behind
                }}>
                    {track.label}
                </div>
            ))}
        </div>
    );
};
