import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { MIN_ZOOM, MAX_ZOOM } from '../../utils';

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
        if (e.button !== 0) return; // Only handle left-click
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
        document.body.style.cursor = 'grabbing';
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
            const containerWidth = rect.width;
            const centerX = containerWidth / 2;
            const scrollLeft = container.scrollLeft;

            const x = scrollLeft + offsetX;
            const msFromStart = (x / zoom) * (1000 * 60 * 60 * 24);
            const dateUnderCursor = new Date(minDate.getTime() + msFromStart);

            // Lerp cursor toward center: each zoom step moves the anchor 20% closer to center
            const lerpedOffsetX = offsetX + (centerX - offsetX) * 0.2;

            zoomFocusRef.current = {
                date: dateUnderCursor,
                offsetX: lerpedOffsetX
            };

            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta));
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

            // Move — vertical only (reorder rows, no date changes)
            if (interaction.type === 'move') {
                let newOrder;
                let currentValid = true;
                const newStart = new Date(interaction.originalStart);
                const newEnd = new Date(interaction.originalEnd);

                // Calculate Order (Row Index) from vertical drag
                const ROW_HEIGHT = (event.isParent ? 44 : (isCompact ? 28 : 44));
                const orderDelta = Math.round(deltaY / ROW_HEIGHT);
                newOrder = Math.max(0, (interaction.originalOrder || 0) + orderDelta);

                // COLLISION CHECK (non-milestone, non-epoch)
                if (!event.isMilestone && !event.isParent && layout && layout.eventRows) {
                    const getTrackId = (ev) => {
                        if (ev.isParent) return 'epoch';
                        if (ev.isMilestone) return 'milestone';
                        if (ev.type === 'event') return 'event';
                        if (ev.type === 'stage') return 'stage';
                        return 'stage';
                    };
                    const myTrack = getTrackId(event);

                    const overlapping = events.some(e => {
                        if (e.id === event.id) return false;
                        if (e.isMilestone || e.isParent) return false;
                        if (getTrackId(e) !== myTrack) return false;
                        const eRow = layout.eventRows[e.id];
                        if (eRow !== newOrder) return false;
                        return (Math.max(newStart.getTime(), e.start.getTime()) < Math.min(newEnd.getTime(), e.end.getTime()));
                    });

                    if (overlapping) currentValid = false;
                }

                setIsValidDrop(currentValid);
                setTempEventState({
                    ...event,
                    start: newStart,
                    end: newEnd,
                    order: newOrder
                });
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

                // COMMIT if Valid (vertical reorder only, no date changes)
                if (isValidDrop) {
                    onUpdateEvent(tempEventState, { cascade: false });
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
