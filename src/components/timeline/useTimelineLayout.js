import { useMemo } from 'react';

export const useTimelineLayout = (events, zoom) => {
    // Derived constants
    const pixelsPerDay = zoom;
    const isCompact = pixelsPerDay < 0.5;

    // Layout Constants
    const EVENT_HEIGHT = isCompact ? 24 : 40;
    const ROW_GAP = 4;
    const BASE_TRACK_PADDING = 12;
    const TRACK_GAP = 12;

    // Define the tracks/lanes
    const tracks = [
        { id: 'epoch', label: 'Época', color: '#ff6b6b' },
        { id: 'stage', label: 'Etapa', color: '#4ecdc4' },
        { id: 'event', label: 'Suceso', color: '#45b7d1' },
        { id: 'milestone', label: 'Hito', color: '#96ceb4' }
    ];

    const getEventTrackId = (event) => {
        if (event.isParent) return 'epoch';
        if (event.isMilestone) return 'milestone';
        if (event.type === 'event') return 'event'; // Suceso
        if (event.type === 'stage') return 'stage'; // Etapa
        return 'stage'; // Default fallback
    };

    // Helper to calculate layout (stacking) per track
    const layout = useMemo(() => {
        const trackGroups = { epoch: [], stage: [], event: [], milestone: [] };

        // Group by track
        events.forEach(e => {
            const tId = getEventTrackId(e);
            if (trackGroups[tId]) trackGroups[tId].push(e);
        });

        const eventRows = {}; // eventId -> rowIndex
        const trackRows = {}; // trackId -> maxRows

        // Calculate stacking for each track
        Object.keys(trackGroups).forEach(trackId => {
            if (trackId === 'milestone') return; // Handle milestones last

            const sorted = [...trackGroups[trackId]].sort((a, b) => {
                if (a.start - b.start !== 0) return a.start - b.start;
                return (b.end - b.start) - (a.end - a.start);
            });

            const rows = [];
            const collides = (rowIndex, start, end) => {
                if (!rows[rowIndex]) return false;
                return rows[rowIndex].some(interval => Math.max(start, interval.start) < Math.min(end, interval.end));
            };
            const addToRow = (rowIndex, start, end) => {
                if (!rows[rowIndex]) rows[rowIndex] = [];
                rows[rowIndex].push({ start, end });
            };

            sorted.forEach(e => {
                const start = e.start.getTime();
                const end = e.end.getTime();
                let rowIndex;

                if (e.order !== undefined && e.order !== null && e.order >= 0) {
                    rowIndex = e.order;
                    addToRow(rowIndex, start, end);
                } else {
                    rowIndex = 0;
                    while (collides(rowIndex, start, end)) rowIndex++;
                    addToRow(rowIndex, start, end);
                }
                eventRows[e.id] = rowIndex;
            });
            trackRows[trackId] = Math.max(1, rows.length);
        });

        // Calculate stacking for milestones (Hitos) - inheriting parent row by default
        const milestoneGroup = trackGroups.milestone || [];
        const miloRows = [];
        const miloSorted = [...milestoneGroup].sort((a, b) => a.start - b.start);
        const MILO_COLLISION_BUFFER = 2 * 60 * 60 * 1000; // 2 hours buffer for layout

        miloSorted.forEach(m => {
            let rowIndex;

            // 1. Manual order (set by dragging)
            if (m.order !== undefined && m.order !== null && m.order >= 0) {
                rowIndex = m.order;
            }
            // 2. Default to first row (Row 0)
            else {
                rowIndex = 0;
            }

            eventRows[m.id] = rowIndex;
        });
        // maxRows for milestone track is now determined by the maximum order found
        const maxMiloRow = Math.max(-1, ...Object.values(milestoneGroup).map(m => eventRows[m.id] || 0));
        trackRows.milestone = maxMiloRow + 1;

        return { eventRows, trackRows };
    }, [events]);

    const getTrackHeight = (trackId) => {
        const rows = layout.trackRows[trackId] || 1;
        // For bar tracks: (Rows * BarHeight) + ((Rows-1) * Gap) + Padding
        const contentHeight = (rows * EVENT_HEIGHT) + ((rows - 1) * ROW_GAP);
        return Math.max(isCompact ? 40 : 60, contentHeight + BASE_TRACK_PADDING);
    };

    const getTrackY = (trackId) => {
        let y = 40; // Top offset (Time Axis)
        for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].id === trackId) break;
            y += getTrackHeight(tracks[i].id) + TRACK_GAP;
        }
        return y;
    };

    return {
        tracks,
        layout,
        getEventTrackId,
        getTrackHeight,
        getTrackY,
        EVENT_HEIGHT,
        ROW_GAP,
        TRACK_GAP,
        isCompact
    };
};
