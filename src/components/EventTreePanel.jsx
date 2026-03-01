import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, X, ListTree } from 'lucide-react';

const getDescendantIds = (parentId, allEvents) => {
    const children = allEvents.filter(e => e.parentId === parentId);
    let ids = children.map(c => c.id);
    children.forEach(child => {
        ids = [...ids, ...getDescendantIds(child.id, allEvents)];
    });
    return ids;
};

const getEventTypeLabel = (event) => {
    if (event.isParent) return 'epoch';
    if (event.isMilestone) return 'milestone';
    if (event.type === 'event') return 'event';
    return 'stage';
};

const TYPE_COLORS = {
    epoch: '#ff6b6b',
    stage: '#4ecdc4',
    event: '#45b7d1',
    milestone: '#96ceb4'
};

const TreeNode = ({ event, allEvents, hiddenEventIds, onToggleVisibility, depth = 0 }) => {
    const [expanded, setExpanded] = useState(false);

    const children = useMemo(() =>
        allEvents
            .filter(e => e.parentId === event.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0)),
        [allEvents, event.id]
    );

    const hasChildren = children.length > 0;
    const isHidden = hiddenEventIds.has(event.id);
    const type = getEventTypeLabel(event);
    const dotColor = event.color || TYPE_COLORS[type];

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 8px',
                    paddingLeft: `${8 + depth * 18}px`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    opacity: isHidden ? 0.4 : 1,
                    userSelect: 'none'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                {/* Expand/Collapse arrow */}
                <div
                    onClick={() => hasChildren && setExpanded(!expanded)}
                    style={{
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'var(--text-secondary)',
                        cursor: hasChildren ? 'pointer' : 'default'
                    }}
                >
                    {hasChildren ? (
                        expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : (
                        <span style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: 'var(--text-secondary)',
                            opacity: 0.4
                        }} />
                    )}
                </div>

                {/* Visibility toggle */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(event.id);
                    }}
                    style={{
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: isHidden ? 'var(--text-secondary)' : 'var(--accent-color)',
                        borderRadius: '4px',
                        transition: 'color 0.15s ease'
                    }}
                    title={isHidden ? 'Mostrar en timeline' : 'Ocultar del timeline'}
                >
                    {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </div>

                {/* Color dot + title */}
                <div
                    onClick={() => hasChildren && setExpanded(!expanded)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flex: 1,
                        minWidth: 0
                    }}
                >
                    <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: dotColor,
                        flexShrink: 0
                    }} />
                    <span style={{
                        fontSize: '0.82rem',
                        fontWeight: type === 'epoch' ? '600' : '400',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {event.title || 'Sin título'}
                    </span>
                </div>
            </div>

            {/* Children */}
            {hasChildren && expanded && (
                <div>
                    {children.map(child => (
                        <TreeNode
                            key={child.id}
                            event={child}
                            allEvents={allEvents}
                            hiddenEventIds={hiddenEventIds}
                            onToggleVisibility={onToggleVisibility}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const EventTreePanel = ({ events, hiddenEventIds, onToggleVisibility, isOpen, onToggle }) => {
    const rootEvents = useMemo(() =>
        events
            .filter(e => !e.parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0)),
        [events]
    );

    return (
        <>
            {/* Floating toggle button */}
            <button
                onClick={onToggle}
                title="Árbol de eventos"
                style={{
                    position: 'fixed',
                    right: isOpen ? '328px' : '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 2500,
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isOpen ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    border: `1px solid ${isOpen ? 'var(--accent-color)' : 'var(--border-primary)'}`,
                    color: isOpen ? 'white' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)',
                    transition: 'right 0.3s ease, background 0.2s ease, color 0.2s ease, border-color 0.2s ease'
                }}
            >
                <ListTree size={20} />
            </button>

            {/* Panel */}
            <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '320px',
                background: 'var(--bg-secondary)',
                borderLeft: '1px solid var(--border-primary)',
                backdropFilter: 'blur(20px)',
                zIndex: 2400,
                display: 'flex',
                flexDirection: 'column',
                transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s ease',
                boxShadow: isOpen ? '-8px 0 30px rgba(0,0,0,0.3)' : 'none'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ListTree size={18} style={{ color: 'var(--accent-color)' }} />
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                            Árbol de Eventos
                        </h3>
                    </div>
                    <button
                        onClick={onToggle}
                        style={{
                            all: 'unset',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px',
                            borderRadius: '6px',
                            transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Counter */}
                {hiddenEventIds.size > 0 && (
                    <div style={{
                        padding: '8px 1.25rem',
                        borderBottom: '1px solid var(--border-primary)',
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        background: 'rgba(255,255,255,0.02)',
                        flexShrink: 0
                    }}>
                        {hiddenEventIds.size} evento{hiddenEventIds.size !== 1 ? 's' : ''} oculto{hiddenEventIds.size !== 1 ? 's' : ''}
                    </div>
                )}

                {/* Tree content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '8px 6px'
                }}>
                    {rootEvents.length === 0 ? (
                        <div style={{
                            padding: '2rem 1rem',
                            textAlign: 'center',
                            color: 'var(--text-secondary)',
                            fontSize: '0.85rem',
                            fontStyle: 'italic'
                        }}>
                            No hay eventos en este timeline.
                        </div>
                    ) : (
                        rootEvents.map(event => (
                            <TreeNode
                                key={event.id}
                                event={event}
                                allEvents={events}
                                hiddenEventIds={hiddenEventIds}
                                onToggleVisibility={onToggleVisibility}
                                depth={0}
                            />
                        ))
                    )}
                </div>
            </div>
        </>
    );
};
