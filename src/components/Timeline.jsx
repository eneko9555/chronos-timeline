import { useMemo, useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { RadialMenu } from './RadialMenu';
import { EventEditor } from './EventEditor';
import { EventViewer } from './EventViewer';
import { useTimelineLayout } from './timeline/useTimelineLayout';
import { useTimelineInteractions } from './timeline/useTimelineInteractions';
import { TimelineSidebar } from './timeline/TimelineSidebar';
import { TimelineAxis } from './timeline/TimelineAxis';
import { TimelineGrid } from './timeline/TimelineGrid';
import { formatYearLabel, createDateFromParts, getDateParts } from '../utils';

export const Timeline = forwardRef(({ events, zoom, viewDate, onUpdateEvent, onDeleteEvent, onAddSubEvent, onAddMilestone, onZoomChange, onScroll, minDateOverride, totalDaysOverride, editingEvent, setEditingEvent, onSaveEditingEvent, focusedEventId, setViewingEvent, renderAll = false }, ref) => {
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);

    // Virtualization State
    const [scrollLeft, setScrollLeft] = useState(0);
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
    const BUFFER_PX = 1000; // Extra pixels to render off-screen

    // Update viewport width on resize
    useEffect(() => {
        const handleResize = () => setViewportWidth(containerRef.current ? containerRef.current.offsetWidth : window.innerWidth);
        window.addEventListener('resize', handleResize);
        // Initial set
        if (containerRef.current) setViewportWidth(containerRef.current.offsetWidth);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleScroll = (e) => {
        setScrollLeft(e.target.scrollLeft);
        if (onScroll) onScroll(e.target.scrollLeft);
    };

    // 1. Layout Hook
    const {
        tracks,
        layout,
        getEventTrackId,
        getTrackHeight,
        getTrackY,
        EVENT_HEIGHT,
        ROW_GAP,
        TRACK_GAP,
        isCompact
    } = useTimelineLayout(events, zoom);

    // 2. Timeline Bounds and Axis Logic
    // Keep this here as it drives the `getX` which is needed for interactions
    const { minDate, maxDate, totalDays } = useMemo(() => {
        if (minDateOverride && totalDaysOverride) {
            const max = new Date(minDateOverride.getTime() + totalDaysOverride * 24 * 60 * 60 * 1000);
            return {
                minDate: minDateOverride,
                maxDate: max,
                totalDays: totalDaysOverride
            };
        }

        const anchor = viewDate ? new Date(viewDate) : new Date();
        anchor.setHours(0, 0, 0, 0);

        let minT = anchor.getTime();
        let maxT = anchor.getTime();

        if (events.length > 0) {
            const starts = events.map(e => e.start.getTime());
            const ends = events.map(e => e.end.getTime());
            minT = Math.min(minT, ...starts);
            maxT = Math.max(maxT, ...ends);
        }

        // Ensure total width covers at least the screen width
        const eventDays = (maxT - minT) / (1000 * 60 * 60 * 24);
        const screenDays = window.innerWidth / zoom;
        const missingDays = Math.max(0, screenDays - eventDays);

        // Use missingDays/2 as padding, but keep a minimum of 2 days for comfort
        const paddingDays = Math.max(2, Math.ceil(missingDays / 2) + 2);

        const min = new Date(minT);
        min.setDate(min.getDate() - paddingDays);

        const max = new Date(maxT);
        max.setDate(max.getDate() + paddingDays);

        const total = Math.max(differenceInDays(max, min), 30);
        // Recalculate max based on stabilized totalDays to be safe
        const finalMax = new Date(min.getTime() + total * 24 * 60 * 60 * 1000);

        return {
            minDate: min,
            maxDate: finalMax,
            totalDays: total
        };
    }, [events, viewDate, zoom, minDateOverride, totalDaysOverride]);

    const totalWidth = totalDays * zoom;

    const getX = (date) => {
        const msDiff = date.getTime() - minDate.getTime();
        const days = msDiff / (1000 * 60 * 60 * 24);
        return days * zoom; // zoom is pixelsPerDay
    };

    // Calculate Related IDs for Highlighting
    const relatedIds = useMemo(() => {
        if (!selectedEventId) return null;

        const ids = new Set();
        ids.add(selectedEventId);

        // Find ancestors
        let current = events.find(e => e.id === selectedEventId);
        while (current && current.parentId) {
            ids.add(current.parentId);
            current = events.find(e => e.id === current.parentId);
        }

        // Find descendants (recursive)
        const addDescendants = (parentId) => {
            const children = events.filter(e => e.parentId === parentId);
            children.forEach(child => {
                ids.add(child.id);
                addDescendants(child.id);
            });
        };
        addDescendants(selectedEventId);

        return ids;
    }, [selectedEventId, events]);

    // 3. Interactions Hook
    const {
        containerRef,
        interaction,
        tempEventState,
        hoveredMilestoneId,
        handlePointerDown,
        handleTimelinePan,
        handleMilestoneMouseEnter,
        handleMilestoneMouseLeave,
        isValidDrop
    } = useTimelineInteractions(events, minDate, zoom, onUpdateEvent, onZoomChange, getX, (id) => {
        if (id) {
            const ev = events.find(e => e.id === id);
            if (ev) setViewingEvent(ev);
        } else {
            setSelectedEventId(null);
        }
    }, setScrollLeft, layout); // Pass layout for collision detection

    // Expose DOM and internal values to parent
    useImperativeHandle(ref, () => ({
        container: containerRef.current,
        minDate: minDate
    }));

    // 4. Generate Time Labels (Shared by Grid and Axis)
    // Manual generators that support negative years and extreme zoom ranges
    const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const timeLabels = useMemo(() => {
        const labels = [];
        const pixelsPerDay = zoom;

        // VIRTUALIZACIÓN DEL GRID: Calcular rango visible de fechas
        let visibleMinDate, visibleMaxDate;

        if (renderAll) {
            visibleMinDate = minDate;
            visibleMaxDate = maxDate;
        } else {
            const PADDING_PX = 1000;
            const startPx = Math.max(0, scrollLeft - PADDING_PX);
            const endPx = scrollLeft + viewportWidth + PADDING_PX;

            const startDays = startPx / pixelsPerDay;
            const endDays = endPx / pixelsPerDay;

            visibleMinDate = new Date(Math.min(maxDate.getTime(), Math.max(minDate.getTime(), minDate.getTime() + startDays * 86400000)));
            visibleMaxDate = new Date(Math.max(minDate.getTime(), Math.min(maxDate.getTime(), minDate.getTime() + endDays * 86400000)));
        }

        if (visibleMinDate >= visibleMaxDate) return [];

        if (pixelsPerDay >= 80) {
            // Day-level labels
            const d = new Date(visibleMinDate);
            d.setHours(0, 0, 0, 0);
            const step = Math.max(1, Math.floor(80 / pixelsPerDay));
            let count = 0;
            while (d <= visibleMaxDate) {
                if (count % step === 0) {
                    const label = `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`;
                    labels.push({ date: new Date(d), x: getX(d), label, type: 'day' });
                }
                d.setDate(d.getDate() + 1);
                count++;
                if (labels.length > 2000) break;
            }
        } else if (pixelsPerDay >= 2) {
            // Month-level labels
            const parts = getDateParts(visibleMinDate);
            const d = createDateFromParts(parts.year, parts.month, 1);
            while (d <= visibleMaxDate) {
                const yr = d.getFullYear();
                const label = `${MONTH_NAMES_SHORT[d.getMonth()]} ${formatYearLabel(yr)}`;
                labels.push({ date: new Date(d), x: getX(d), label, type: 'month' });
                // Advance one month
                const m = d.getMonth();
                if (m === 11) {
                    d.setFullYear(d.getFullYear() + 1);
                    d.setMonth(0);
                } else {
                    d.setMonth(m + 1);
                }
                if (labels.length > 2000) break;
            }
        } else {
            // Year-level labels — pick interval based on density
            const yearWidthPx = pixelsPerDay * 365.25;
            let interval = 1;
            if (yearWidthPx < 0.5) interval = 1000;
            else if (yearWidthPx < 1) interval = 500;
            else if (yearWidthPx < 2) interval = 250;
            else if (yearWidthPx < 5) interval = 100;
            else if (yearWidthPx < 10) interval = 50;
            else if (yearWidthPx < 20) interval = 25;
            else if (yearWidthPx < 40) interval = 10;
            else if (yearWidthPx < 80) interval = 5;
            else if (yearWidthPx < 160) interval = 2;

            const startYear = visibleMinDate.getFullYear();
            const endYear = visibleMaxDate.getFullYear();
            // Align to interval
            let yr = Math.floor(startYear / interval) * interval;

            while (yr <= endYear + interval) {
                const d = createDateFromParts(yr, 1, 1);
                if (d >= visibleMinDate && d <= visibleMaxDate) {
                    labels.push({ date: d, x: getX(d), label: formatYearLabel(yr), type: 'year' });
                }
                yr += interval;
                if (labels.length > 2000) break;
            }
        }
        return labels;
    }, [minDate, maxDate, zoom, scrollLeft, viewportWidth, renderAll]);

    // Helper for rendering
    const getEventDisplay = (event) => {
        if (tempEventState && tempEventState.id === event.id) {
            return tempEventState;
        }
        return event;
    };

    // Helper to check opacity
    const getOpacity = (id) => {
        if (!relatedIds) return 1;
        return relatedIds.has(id) ? 1 : 0.2; // Dim unrelated items
    };

    // Total content height (sum of all tracks + gaps + axis offset)
    const totalHeight = useMemo(() => {
        const lastTrack = tracks[tracks.length - 1];
        return getTrackY(lastTrack.id) + getTrackHeight(lastTrack.id);
    }, [tracks, getTrackY, getTrackHeight]);

    // VIRTUALIZATION: Filter events that are visible
    const visibleEvents = useMemo(() => {
        if (events.length === 0) return [];

        // Optimización: Si hay pocos eventos (<100), no vale la pena la sobrecarga de filtrar
        // Aunque para ser consistentes con la petición del usuario, aplicaremos la lógica siempre o si la lista es grande.
        // Aplicamos siempre para cumplir el requerimiento.

        if (renderAll) return events; // Bypass virtualization for export

        const minVisibleX = scrollLeft - BUFFER_PX;
        const maxVisibleX = scrollLeft + viewportWidth + BUFFER_PX;

        return events.filter(e => {
            const startX = getX(e.start);
            const endX = getX(e.end);

            // Check intersection: event end > min && event start < max
            return endX > minVisibleX && startX < maxVisibleX;
        });
    }, [events, scrollLeft, viewportWidth, getX]);

    // Parent Event Auto-Scroll (Keep effect here or move to interactions? Leaving here as it is UI specific)
    const parentEvents = events.filter(e => e.isParent).sort((a, b) => (a.order || 0) - (b.order || 0));
    // Track previous parent count to detect additions
    const prevParentCount = useRef(parentEvents.length);

    useEffect(() => {
        if (parentEvents.length > prevParentCount.current) {
            // New parent added
            const newEvent = parentEvents[parentEvents.length - 1]; // Assuming new ones are at end or we can find by creation time if needed. 
            // In App.jsx order is 0, so it might be at the beginning or sorted differently.
            // Let's rely on the fact that if user clicked "New", they expect to see the *last created* or *just inserted*.
            // Since App.jsx inserts with order 0, but we sort by order...

            // Actually, if App.jsx inserts at order 0, it might be the first one.
            // Let's find the event that is NOT in the previous set if possible? 
            // Or simpler: scroll to the one with the latest creation time?
            // The events don't have createdAt.

            // App.jsx: setEvents([...events, createEvent(...)]); 
            // It appends to the array. 
            // BUT: sort((a, b) => (a.order || 0) - (b.order || 0));
            // New event has order 0. 

            // If checking the array "parentEvents" which is sorted:
            // If existing events have order 0 (default), then stabilizing sort might keep order.

            // Let's just scroll to the start date of the LATEST ADDED event in the props list (last in `events` array that is parent).
            const latestCreated = events.filter(e => e.isParent).pop();

            if (latestCreated && containerRef.current) {
                const targetX = getX(latestCreated.start);
                containerRef.current.scrollTo({ left: targetX - 50, behavior: 'smooth' });
            }
        }
        prevParentCount.current = parentEvents.length;
    }, [parentEvents.length, events, getX]);

    // Cinematic Focus Scroll
    useEffect(() => {
        if (focusedEventId && containerRef.current) {
            const event = events.find(e => e.id === focusedEventId);
            if (event) {
                const targetX = getX(event.start);
                const containerWidth = containerRef.current.offsetWidth;
                containerRef.current.scrollTo({
                    left: targetX - (containerWidth / 2),
                    behavior: 'smooth'
                });
            }
        }
    }, [focusedEventId, events, getX]);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* SCROLLABLE AREA (Handles X and Y) */}
                <div
                    ref={containerRef}
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        position: 'relative',
                        outline: 'none'
                    }}
                    onPointerDown={handleTimelinePan}
                    onScroll={handleScroll}
                >
                    <div style={{ display: 'flex', minWidth: '100%', width: 'max-content', position: 'relative' }}>

                        {/* SIDEBAR (Sticky Left — scrolls vertically, fixed horizontally) */}
                        <TimelineSidebar tracks={tracks} getTrackHeight={getTrackHeight} trackGap={TRACK_GAP} />

                        <div style={{ width: totalWidth, height: totalHeight, minHeight: '100%', position: 'relative' }}>

                            {/* 3. GRID */}
                            <TimelineGrid
                                timeLabels={timeLabels}
                                tracks={tracks}
                                getTrackY={getTrackY}
                                getTrackHeight={getTrackHeight}
                            />

                            {/* 4. AXIS */}
                            <TimelineAxis timeLabels={timeLabels} />

                            {/* 5. BACKGROUND ZONES (EPOCHs) */}
                            {visibleEvents.filter(e => e.isParent).map((parent) => {
                                const display = getEventDisplay(parent);
                                const left = getX(display.start);
                                const width = Math.max(getX(display.end) - getX(display.start), 2);
                                const opacity = getOpacity(parent.id);

                                return (
                                    <div
                                        key={`bg-${parent.id}`}
                                        style={{
                                            position: 'absolute',
                                            left: left,
                                            width: width,
                                            top: 0,
                                            bottom: 0,
                                            background: display.color ? display.color.replace('hsl(', 'hsla(').replace(')', ', 0.15)') : 'rgba(255,255,255,0.05)',
                                            borderLeft: `2px solid ${display.color || '#ccc'}`,
                                            borderRight: `2px solid ${display.color || '#ccc'}`,
                                            pointerEvents: 'none',
                                            zIndex: 0,
                                            opacity: opacity,
                                            transition: 'opacity 0.3s ease'
                                        }} />
                                );
                            })}

                            {/* 6. CONNECTORS */}
                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5, overflow: 'visible' }}>
                                {visibleEvents.map(event => {
                                    if (!event.parentId) return null;
                                    const parent = events.find(p => p.id === event.parentId);
                                    if (!parent) return null;

                                    const display = getEventDisplay(event);
                                    const trackId = getEventTrackId(event);
                                    const parentTrackId = getEventTrackId(parent);
                                    const startX = getX(display.start);

                                    const childTrackY = getTrackY(trackId);
                                    const childRowIndex = layout.eventRows[event.id] || 0;
                                    const topOffset = 5;
                                    const isChildMilestone = trackId === 'milestone';

                                    // Calculate Child Top Y
                                    const childY = childTrackY + topOffset + (childRowIndex * (EVENT_HEIGHT + ROW_GAP)) + (EVENT_HEIGHT / 2);

                                    const parentRowIndex = layout.eventRows[parent.id] || 0;
                                    const parentTrackY = getTrackY(parentTrackId);
                                    const parentBottomY = parentTrackY + topOffset + (parentRowIndex * (EVENT_HEIGHT + ROW_GAP)) + EVENT_HEIGHT;

                                    if (childY <= parentBottomY) return null;

                                    const isRelated = relatedIds ? (relatedIds.has(event.id) && relatedIds.has(parent.id)) : true;
                                    const opacity = relatedIds ? (isRelated ? 0.6 : 0.1) : 0.6;


                                    const childX = startX + (event.isMilestone ? 0 : 1);

                                    return (
                                        <g
                                            key={`conn-${event.id}`}
                                            style={{ transition: 'opacity 0.3s ease', opacity, cursor: 'pointer', pointerEvents: 'auto' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEventId(selectedEventId === event.id ? null : event.id);
                                            }}
                                        >
                                            <line
                                                x1={childX}
                                                y1={childY}
                                                x2={childX}
                                                y2={parentBottomY}
                                                stroke={parent.color || '#ccc'}
                                                strokeWidth="1.5"
                                                strokeDasharray="4 3"
                                            />
                                            <line
                                                x1={childX}
                                                y1={childY}
                                                x2={childX}
                                                y2={parentBottomY}
                                                stroke="transparent"
                                                strokeWidth="10"
                                            />
                                            <circle cx={childX} cy={parentBottomY} r="2" fill={parent.color || '#ccc'} />
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* 7. EVENTS RENDER LOOP */}
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                                {visibleEvents.map((event) => {
                                    const display = getEventDisplay(event);
                                    const isDragging = interaction.eventId === event.id;
                                    const trackId = getEventTrackId(event);
                                    const trackY = getTrackY(trackId);

                                    // FORCE ROW INDEX IF DRAGGING
                                    let rowIndex = layout.eventRows[event.id] || 0;
                                    if (isDragging && display.order !== undefined) {
                                        rowIndex = display.order;
                                    }

                                    const topOffset = 5;
                                    const eventY = trackY + topOffset + (rowIndex * (EVENT_HEIGHT + ROW_GAP));

                                    const isEpoch = trackId === 'epoch';
                                    const isMilestone = trackId === 'milestone';
                                    const opacity = isDragging ? 0.8 : getOpacity(event.id);

                                    // Drag Feedback Style
                                    const dragStyle = isDragging ? {
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
                                        zIndex: 1000,
                                        cursor: 'grabbing'
                                    } : {};

                                    return (
                                        <div
                                            key={event.id}
                                            data-event-element="true"
                                            onPointerDown={(e) => handlePointerDown(e, event, 'move')}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setContextMenu({ x: e.clientX, y: e.clientY, event });
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: `${eventY}px`,
                                                left: isMilestone ? getX(display.start) - 10 : getX(display.start),
                                                width: isMilestone ? '20px' : Math.max(getX(display.end) - getX(display.start), 2),
                                                height: `${EVENT_HEIGHT}px`,
                                                zIndex: isDragging ? 999 : 10,
                                                opacity: opacity,
                                                pointerEvents: 'auto',
                                                filter: focusedEventId === event.id ? 'drop-shadow(0 0 15px rgba(96, 165, 250, 0.6))' : 'none',
                                                scaleY: focusedEventId === event.id ? 1.02 : 1,
                                                transition: (isDragging || focusedEventId !== event.id) ? 'none' : 'all 0.3s ease-out',
                                                ...dragStyle
                                            }}
                                        >
                                            {isMilestone ? (
                                                <div
                                                    onMouseEnter={() => handleMilestoneMouseEnter(event.id)}
                                                    onMouseLeave={handleMilestoneMouseLeave}
                                                    style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
                                                >
                                                    <motion.div
                                                        whileHover={{ scale: 1.05 }}
                                                        style={{
                                                            width: isCompact ? '16px' : '28px',
                                                            height: isCompact ? '16px' : '28px',
                                                            borderRadius: '50%',
                                                            background: event.color || '#666',
                                                            border: focusedEventId === event.id ? '3px solid #60a5fa' : '2px solid white',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                            zIndex: 2,
                                                            position: 'relative',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontWeight: 'bold',
                                                            fontSize: isCompact ? '8px' : '12px',
                                                            userSelect: 'none'
                                                        }}
                                                    >
                                                        {event.mediaUrl ? (
                                                            <img
                                                                src={event.mediaUrl}
                                                                alt=""
                                                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            event.title ? event.title.charAt(0).toUpperCase() : ''
                                                        )}
                                                    </motion.div>
                                                </div>
                                            ) : (
                                                <motion.div
                                                    style={{
                                                        width: '100%',
                                                        height: isCompact ? '70%' : '80%',
                                                        background: isDragging
                                                            ? (isValidDrop ? 'rgba(74, 222, 128, 0.7)' : 'rgba(239, 68, 68, 0.7)')
                                                            : (isEpoch
                                                                ? `linear-gradient(135deg, ${display.color.replace('hsl(', 'hsla(').replace(')', ', 0.6)')} 0%, ${display.color.replace('hsl(', 'hsla(').replace(')', ', 0.3)')} 100%)`
                                                                : 'rgba(255, 255, 255, 0.04)'),
                                                        backdropFilter: 'blur(12px) saturate(180%)',
                                                        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                                                        borderRadius: '8px',
                                                        border: focusedEventId === event.id ? '2px solid var(--accent-color)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderLeft: `4px solid ${display.color}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '0 12px',
                                                        color: isEpoch ? 'white' : 'var(--text-primary)',
                                                        fontSize: isCompact ? '0.7rem' : '0.85rem',
                                                        fontWeight: '600',
                                                        overflow: 'hidden',
                                                        whiteSpace: 'nowrap',
                                                        cursor: 'grab',
                                                        boxShadow: `0 4px 12px ${display.color ? display.color.replace('hsl(', 'hsla(').replace(')', ', 0.15)') : 'rgba(0,0,0,0.2)'}`,
                                                        position: 'relative',
                                                        zIndex: focusedEventId === event.id ? 20 : 1,
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }}
                                                    animate={focusedEventId === event.id ? {
                                                        boxShadow: [
                                                            '0 0 0px rgba(96, 165, 250, 0)',
                                                            '0 0 30px rgba(96, 165, 250, 0.5)',
                                                            '0 0 0px rgba(96, 165, 250, 0)'
                                                        ]
                                                    } : {}}
                                                    transition={focusedEventId === event.id ? {
                                                        duration: 2,
                                                        repeat: Infinity,
                                                        ease: "easeInOut"
                                                    } : {}}
                                                >
                                                    {Math.max(getX(display.end) - getX(display.start), 2) > 30 && (
                                                        <span style={{
                                                            flex: 1,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            lineHeight: 1,
                                                            textShadow: isEpoch ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                                                        }}>
                                                            {display.title}
                                                        </span>
                                                    )}


                                                </motion.div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {editingEvent && (
                    <EventEditor
                        event={editingEvent}
                        onSave={(e) => { onSaveEditingEvent(e); setEditingEvent(null); }}
                        onClose={() => setEditingEvent(null)}
                        onDelete={() => {
                            const exists = events.some(ev => ev.id === editingEvent.id);
                            if (exists) onDeleteEvent(editingEvent.id);
                            setEditingEvent(null);
                        }}
                    />
                )}

                <AnimatePresence>
                    {contextMenu && (
                        <RadialMenu
                            x={contextMenu.x}
                            y={contextMenu.y}
                            event={contextMenu.event}
                            onClose={() => setContextMenu(null)}
                            actions={{
                                onEdit: (ev) => setEditingEvent(ev),
                                onViewInfo: (ev) => setViewingEvent(ev),
                                onAddSubEvent: (parentId, type) => onAddSubEvent(parentId, type),
                                onAddMilestone: (parentId) => onAddMilestone(parentId),
                                onDelete: (ev) => onDeleteEvent(ev.id)
                            }}
                        />
                    )}
                </AnimatePresence>

            </div>
        </div >
    );
});
