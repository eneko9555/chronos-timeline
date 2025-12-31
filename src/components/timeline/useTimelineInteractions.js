import { useState, useRef, useEffect, useLayoutEffect } from 'react';

export const useTimelineInteractions = (events, minDate, zoom, onUpdateEvent, onZoomChange, getX, onEventClick, setScrollLeft, layout) => {
    const containerRef = useRef(null);
    const hoverTimeoutRef = useRef(null);
    const zoomFocusRef = useRef(null);

    // Interactive state
    const [interaction, setInteraction] = useState({ type: null, eventId: null });
    const [tempEventState, setTempEventState] = useState(null);
    const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
    const [hoveredMilestoneId, setHoveredMilestoneId] = useState(null);
    const [isValidDrop, setIsValidDrop] = useState(true);

    const pixelsPerDay = zoom;
    const isCompact = pixelsPerDay < 0.5;

    // Pointer Handlers
    const handlePointerDown = (e, event, type) => {
        e.stopPropagation();
        e.preventDefault();

        setInteraction({
            type,
            eventId: event.id,
            startX: e.clientX,
            startY: e.clientY,
            originalStart: new Date(event.start),
            originalEnd: new Date(event.end),
            originalOrder: (layout && layout.eventRows && layout.eventRows[event.id] !== undefined)
                ? layout.eventRows[event.id]
                : (event.order || 0)
        });
        setTempEventState({ ...event });
        setIsValidDrop(true); // Assume valid initially
        document.body.style.cursor = type === 'move' ? 'grabbing' : 'ew-resize';
    };

    const handleTimelinePan = (e) => {
        if (e.target.closest('[data-event-element="true"]')) return;

        setInteraction({
            type: 'pan',
            startX: e.clientX,
            startY: e.clientY
        });
        setPanStart({
            x: e.clientX,
            y: e.clientY,
            scrollLeft: containerRef.current.scrollLeft,
            scrollTop: containerRef.current.scrollTop
        });
        document.body.style.cursor = 'grabbing';
    };

    const handleMilestoneMouseEnter = (id) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setHoveredMilestoneId(id);
    };

    const handleMilestoneMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredMilestoneId(null);
        }, 300);
    };

    // Zoom with mouse wheel
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            e.preventDefault();

            // Calculate cursor position relative to container
            const rect = container.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const scrollLeft = container.scrollLeft;

            const x = scrollLeft + offsetX;
            const msFromStart = (x / zoom) * (1000 * 60 * 60 * 24);
            const dateUnderCursor = new Date(minDate.getTime() + msFromStart);

            zoomFocusRef.current = {
                date: dateUnderCursor,
                offsetX: offsetX
            };

            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.05, Math.min(500, zoom * delta));
            onZoomChange(newZoom);
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [zoom, onZoomChange, minDate]);

    // Restore scroll position after zoom
    useLayoutEffect(() => {
        if (zoomFocusRef.current && containerRef.current) {
            const { date, offsetX } = zoomFocusRef.current;
            const newX = getX(date);
            const newScrollLeft = Math.max(0, newX - offsetX);

            containerRef.current.scrollLeft = newScrollLeft;
            if (setScrollLeft) {
                setScrollLeft(newScrollLeft);
            }
            zoomFocusRef.current = null;
        }
    }, [zoom, minDate, getX, setScrollLeft]);

    // Global pointer events for Move/Resize
    useEffect(() => {
        const handlePointerMove = (e) => {
            // Pan logic
            if (interaction.type === 'pan') {
                const deltaX = e.clientX - panStart.x;
                const deltaY = e.clientY - panStart.y;
                containerRef.current.scrollLeft = panStart.scrollLeft - deltaX;
                containerRef.current.scrollTop = panStart.scrollTop - deltaY;
                return;
            }

            if (!interaction.type || !interaction.eventId) return;

            const deltaX = e.clientX - interaction.startX;
            const deltaY = e.clientY - interaction.startY;

            const event = events.find(ev => ev.id === interaction.eventId);
            if (!event) return;

            // Move / Vertical Drag logic
            if (interaction.type === 'move') {
                const daysDelta = deltaX / pixelsPerDay;
                const msDelta = daysDelta * 24 * 60 * 60 * 1000;
                let newOrder;
                let newStart = new Date(interaction.originalStart.getTime() + msDelta);
                let newEnd = new Date(interaction.originalEnd.getTime() + msDelta);
                let currentValid = true;

                // Clamping for Children logic (Constraint)
                if (!event.isMilestone && event.parentId) {
                    const parent = events.find(e => e.id === event.parentId);
                    if (parent) {
                        const duration = newEnd.getTime() - newStart.getTime();
                        if (newStart < parent.start) {
                            newStart = new Date(parent.start);
                            newEnd = new Date(parent.start.getTime() + duration);
                        }
                        if (newEnd > parent.end) {
                            newEnd = new Date(parent.end);
                            newStart = new Date(parent.end.getTime() - duration);
                        }
                    }
                }

                // Calculate Order (Row Index)
                if (event.isMilestone) {
                    const ROW_HEIGHT = isCompact ? 28 : 44;
                    const orderDelta = Math.round(deltaY / ROW_HEIGHT);
                    newOrder = Math.max(0, (interaction.originalOrder || 0) + orderDelta);

                    // Horizontal constraints
                    const parentSub = events.find(e => e.id === event.parentId);
                    if (parentSub) {
                        if (newStart < parentSub.start) { newStart = new Date(parentSub.start); newEnd = new Date(parentSub.start); }
                        if (newStart > parentSub.end) { newStart = new Date(parentSub.end); newEnd = new Date(parentSub.end); }
                    }
                } else {
                    // Manual Vertical Drag
                    if (event.isParent) {
                        const ROW_HEIGHT = 44;
                        const orderDelta = Math.round(deltaY / ROW_HEIGHT);
                        newOrder = Math.max(0, (interaction.originalOrder || 0) + orderDelta);
                    } else {
                        const ROW_HEIGHT = isCompact ? 28 : 44;
                        const orderDelta = Math.round(deltaY / ROW_HEIGHT);
                        newOrder = Math.max(0, (interaction.originalOrder || 0) + orderDelta);
                    }

                    // COLLISION CHECK
                    if (layout && layout.eventRows) {
                        // Helper to check track ID
                        const getTrackId = (ev) => {
                            if (ev.isParent) return 'epoch';
                            if (ev.isMilestone) return 'milestone';
                            if (ev.type === 'event') return 'event';
                            if (ev.type === 'stage') return 'stage';
                            return 'stage';
                        };
                        const myTrack = getTrackId(event);

                        // Check against other events in the target 'newOrder' row
                        const overlapping = events.some(e => {
                            if (e.id === event.id) return false;
                            if (e.isMilestone || e.isParent) return false;

                            // 0. Same Track?
                            if (getTrackId(e) !== myTrack) return false;

                            // 1. Same Row?
                            const eRow = layout.eventRows[e.id];
                            if (eRow !== newOrder) return false;

                            // 2. Overlap Time?
                            const overlap = (Math.max(newStart.getTime(), e.start.getTime()) < Math.min(newEnd.getTime(), e.end.getTime()));
                            return overlap;
                        });

                        if (overlapping) {
                            currentValid = false;
                        }
                    }
                }

                setIsValidDrop(currentValid);
                setTempEventState({
                    ...event,
                    start: newStart,
                    end: newEnd,
                    order: newOrder
                });

            } else if (interaction.type === 'resize-end') {
                // Resize logic ...
                const daysDelta = deltaX / pixelsPerDay;
                const msDelta = daysDelta * 24 * 60 * 60 * 1000;
                let newEnd = new Date(interaction.originalEnd.getTime() + msDelta);

                // Constraints
                if (event.parentId) {
                    const parent = events.find(e => e.id === event.parentId);
                    if (parent && newEnd > parent.end) newEnd = new Date(parent.end);
                }
                if (newEnd > interaction.originalStart) {
                    setTempEventState({ ...event, end: newEnd });
                }

            } else if (interaction.type === 'resize-start') {
                const daysDelta = deltaX / pixelsPerDay;
                const msDelta = daysDelta * 24 * 60 * 60 * 1000;
                let newStart = new Date(interaction.originalStart.getTime() + msDelta);

                if (event.parentId) {
                    const parent = events.find(e => e.id === event.parentId);
                    if (parent && newStart < parent.start) newStart = new Date(parent.start);
                }
                if (newStart < interaction.originalEnd) {
                    setTempEventState({ ...event, start: newStart });
                }
            }
        };

        const handlePointerUp = (e) => {
            const deltaX = Math.abs(e.clientX - (interaction.startX || 0));
            const deltaY = Math.abs(e.clientY - (interaction.startY || 0));
            const isClick = deltaX < 5 && deltaY < 5;

            if (interaction.type === 'pan') {
                setInteraction({ type: null });
                document.body.style.cursor = '';
                if (isClick && onEventClick) onEventClick(null);
                return;
            }

            if (tempEventState && interaction.eventId) {
                if (isClick && onEventClick) {
                    onEventClick(interaction.eventId);
                    setInteraction({ type: null });
                    setTempEventState(null);
                    setIsValidDrop(true);
                    document.body.style.cursor = '';
                    return;
                }

                // COMMIT if Valid
                if (isValidDrop) {
                    const originalEvent = events.find(e => e.id === tempEventState.id);

                    // Check if it was a move operation (start changed)
                    if (originalEvent && originalEvent.start.getTime() !== tempEventState.start.getTime()) {
                        const timeDiff = tempEventState.start.getTime() - originalEvent.start.getTime();

                        // Recursive function to find all descendants
                        const getAllDescendants = (parentId) => {
                            const directChildren = events.filter(e => e.parentId === parentId);
                            let allDescendants = [...directChildren];
                            directChildren.forEach(child => {
                                allDescendants = [...allDescendants, ...getAllDescendants(child.id)];
                            });
                            return allDescendants;
                        };

                        const descendants = getAllDescendants(tempEventState.id);

                        if (descendants.length > 0) {
                            const descendantIds = new Set(descendants.map(d => d.id));

                            const finalEvents = events.map(e => {
                                // Update the moved event itself
                                if (e.id === tempEventState.id) return tempEventState;

                                // Update descendants (including milestones)
                                if (descendantIds.has(e.id)) {
                                    const newStart = new Date(e.start.getTime() + timeDiff);
                                    const newEnd = new Date(e.end.getTime() + timeDiff);
                                    return { ...e, start: newStart, end: newEnd };
                                }
                                return e;
                            });

                            onUpdateEvent(tempEventState, { cascade: false }, finalEvents);
                        } else {
                            onUpdateEvent(tempEventState, { cascade: false });
                        }
                    } else {
                        onUpdateEvent(tempEventState, { cascade: false });
                    }
                } else {
                    // Not valid -> Snap back / Cancel
                    // We just don't call onUpdateEvent, state resets to original
                    console.log("Invalid drop - Collision detected");
                }
            }

            setInteraction({ type: null });
            setTempEventState(null);
            setIsValidDrop(true);
            document.body.style.cursor = '';
        };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
        };
    }, [interaction, tempEventState, events, pixelsPerDay, panStart, onUpdateEvent, onEventClick, layout, isValidDrop]);

    return {
        containerRef,
        interaction,
        tempEventState,
        hoveredMilestoneId,
        handlePointerDown,
        handleTimelinePan,
        handleMilestoneMouseEnter,
        handleMilestoneMouseLeave,
        isValidDrop // EXPORT THIS
    };
};
