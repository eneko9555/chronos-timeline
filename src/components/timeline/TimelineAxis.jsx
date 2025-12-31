import React from 'react';

export const TimelineAxis = ({ timeLabels }) => {
    return (
        <div style={{
            position: 'sticky',
            top: 0,
            height: '40px',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-primary)',
            zIndex: 40, // High z-index to stay above events (10-20) and potentially sidebar (30) depending on preference
            display: 'flex',
            alignItems: 'center'
        }}>
            {timeLabels.map((label, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: label.x + 8,
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap'
                }}>
                    {label.label}
                </div>
            ))}
        </div>
    );
};
