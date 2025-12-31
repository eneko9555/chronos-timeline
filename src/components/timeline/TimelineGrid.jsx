import React from 'react';

export const TimelineGrid = ({ timeLabels, tracks, getTrackY, getTrackHeight }) => {
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
            {/* Vertical Time Lines */}
            {timeLabels.map((label, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: label.x,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    background: 'var(--border-primary)',
                    opacity: 0.2
                }} />
            ))}

            {/* Horizontal Track Guidelines */}
            {tracks.map((track, i) => (
                <div key={`guide-${i}`} style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    top: getTrackY(track.id),
                    height: `${getTrackHeight(track.id)}px`,
                    borderBottom: '1px dashed var(--border-secondary)',
                    background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
                    pointerEvents: 'none'
                }} />
            ))}
        </div>
    );
};
