import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { Timeline } from '../components/Timeline';
import { EventViewer } from '../components/EventViewer';
import { createEvent, MIN_ZOOM, MAX_ZOOM } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { Plus, ArrowLeft, Save, GitCompare, X, Maximize, Minimize, Clock, SlidersHorizontal, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { ComparisonModal } from '../components/ComparisonModal';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import debounce from 'lodash.debounce';
import { FilterModal } from '../components/FilterModal';
import { EventTreePanel } from '../components/EventTreePanel';
import { MapViewer } from '../components/MapViewer';
import { THEMES } from '../constants/themes';
import { useTimelineExport } from '../components/timeline/useTimelineExport';
import { ExportPDFModal } from '../components/ExportPDFModal';
import { exportTimelineToExcel } from '../utils/exportExcelTimeline';

export const TimelinePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [events, setEvents] = useState([]);
    const [zoom, setZoom] = useState(100);
    const [viewDate, setViewDate] = useState(new Date());
    const [isSaving, setIsSaving] = useState(false);

    const [timelineName, setTimelineName] = useState('Timeline');
    const [timelineDescription, setTimelineDescription] = useState('');
    const [timelineCoverImage, setTimelineCoverImage] = useState('');
    const [themeId, setThemeId] = useState('chronos');
    const [editingEvent, setEditingEvent] = useState(null);
    const [viewingEvent, setViewingEvent] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Comparison State
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    const [activeFilters, setActiveFilters] = useState(new Set(['epoch', 'stage', 'event', 'milestone']));
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [comparisonTimelines, setComparisonTimelines] = useState([]); // Array of { id, name, description, coverImage, themeId, events }
    const [comparisonZoom, setComparisonZoom] = useState(100);
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedTags, setSelectedTags] = useState(new Set());
    const [selectedLocations, setSelectedLocations] = useState(new Set());
    const [hiddenEventIds, setHiddenEventIds] = useState(new Set());
    const [showTreePanel, setShowTreePanel] = useState(false);
    const [collapsedTracks, setCollapsedTracks] = useState(new Set());

    const [notes, setNotes] = useState([]);

    const isComparing = comparisonTimelines.length > 0;

    const handleToggleTrack = useCallback((trackId) => {
        setCollapsedTracks(prev => {
            const next = new Set(prev);
            if (next.has(trackId)) {
                next.delete(trackId);
            } else {
                next.add(trackId);
            }
            // Sync with activeFilters
            const allTypes = ['epoch', 'stage', 'event', 'milestone'];
            const newActive = new Set(allTypes.filter(t => !next.has(t)));
            setActiveFilters(newActive);
            return next;
        });
    }, []);

    // Filtered Events helper
    const getFilteredList = (list) => {
        return list.filter(e => {
            if (hiddenEventIds.has(e.id)) return false;

            let type = 'stage';
            if (e.isParent) type = 'epoch';
            else if (e.isMilestone) type = 'milestone';
            else if (e.type === 'event') type = 'event';

            const matchesType = activeFilters.has(type);
            const matchesTags = selectedTags.size === 0 || (e.tags && e.tags.some(tag => selectedTags.has(tag)));
            const matchesLocations = selectedLocations.size === 0 || (e.geo?.name && selectedLocations.has(e.geo.name));

            return matchesType && matchesTags && matchesLocations;
        });
    };

    const filteredEvents = useMemo(() => getFilteredList(events), [events, activeFilters, selectedTags, selectedLocations, hiddenEventIds]);

    // Toggle visibility for tree panel
    const handleToggleEventVisibility = useCallback((eventId) => {
        setHiddenEventIds(prev => {
            const next = new Set(prev);
            const descendants = getDescendantIdsHelper(eventId, events);
            const allIds = [eventId, ...descendants];

            if (next.has(eventId)) {
                allIds.forEach(id => next.delete(id));
            } else {
                allIds.forEach(id => next.add(id));
            }
            return next;
        });
    }, [events]);

    // Helper for descendant lookup (used by tree panel toggle)
    const getDescendantIdsHelper = (parentId, allEvents) => {
        const children = allEvents.filter(e => e.parentId === parentId);
        let ids = children.map(c => c.id);
        children.forEach(child => {
            ids = [...ids, ...getDescendantIdsHelper(child.id, allEvents)];
        });
        return ids;
    };

    const allTags = useMemo(() => {
        const tags = new Set();
        events.forEach(e => (e.tags || []).forEach(t => tags.add(t)));
        comparisonTimelines.forEach(ct => {
            ct.events.forEach(e => (e.tags || []).forEach(t => tags.add(t)));
        });
        return Array.from(tags).sort();
    }, [events, comparisonTimelines]);

    const allLocations = useMemo(() => {
        const locations = new Set();
        events.forEach(e => { if (e.geo?.name) locations.add(e.geo.name); });
        comparisonTimelines.forEach(ct => {
            ct.events.forEach(e => { if (e.geo?.name) locations.add(e.geo.name); });
        });
        return Array.from(locations).sort();
    }, [events, comparisonTimelines]);

    // Calculate common bounds for synchronization
    const commonBounds = useMemo(() => {
        if (!isComparing) return null;

        const allEvs = [...events, ...comparisonTimelines.flatMap(ct => ct.events)];
        if (allEvs.length === 0) return null;

        const starts = allEvs.map(e => new Date(e.start).getTime());
        const ends = allEvs.map(e => new Date(e.end).getTime());

        const minT = Math.min(...starts);
        const maxT = Math.max(...ends);

        // Add padding
        const min = new Date(minT);
        min.setDate(min.getDate() - 7);
        const max = new Date(maxT);
        max.setDate(max.getDate() + 7);

        return {
            minDate: min,
            maxDate: max,
            totalDays: Math.max(differenceInDays(max, min), 30)
        };
    }, [events, comparisonTimelines, isComparing]);

    // Initial scroll alignment when comparison starts
    useEffect(() => {
        if (isComparing && events.length > 0 && commonBounds && timelineContainerRef.current) {
            const mainStarts = events.map(e => new Date(e.start).getTime());
            const minT = Math.min(...mainStarts);

            const msDiff = minT - commonBounds.minDate.getTime();
            const days = msDiff / (1000 * 60 * 60 * 24);
            const targetX = days * zoom;

            // Small delay to ensure render completion
            const timer = setTimeout(() => {
                const scrollPos = Math.max(0, targetX - 50);
                if (timelineContainerRef.current) timelineContainerRef.current.container.scrollLeft = scrollPos;
                Object.values(comparisonRefsMap.current).forEach(ref => {
                    if (ref?.container) ref.container.scrollLeft = scrollPos;
                });
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isComparing, commonBounds, zoom]);

    // To prevent saving right after load when nothing changed
    const lastSavedRef = useRef(null);
    const pageRef = useRef(null);
    const timelineContainerRef = useRef(null);
    const comparisonRefsMap = useRef({}); // { timelineId: ref }
    const lastSavedComparisonMap = useRef({}); // { timelineId: jsonString }

    const isSyncingScroll = useRef(false);

    const { exportToPdf, isExporting, exportProgress } = useTimelineExport(timelineContainerRef);

    // Load events
    useEffect(() => {
        if (token && id) {
            apiClient.getTimeline(token, id)
                .then(data => {
                    if (data) {
                        setTimelineName(data.identifier || 'Timeline');
                        setTimelineDescription(data.description || '');
                        setTimelineCoverImage(data.coverImage || '');
                        setThemeId(data.themeId || 'chronos');
                        if (data.events) {
                            const loadedEvents = data.events.map(e => ({
                                ...e,
                                start: new Date(e.start),
                                end: new Date(e.end),
                                tags: e.tags || []
                            }));
                            setEvents(loadedEvents);
                            if (data.notes) setNotes(data.notes);

                            // Fit-to-viewport: calculate ideal zoom from event span
                            if (loadedEvents.length > 0) {
                                const starts = loadedEvents.map(e => e.start.getTime());
                                const ends = loadedEvents.map(e => e.end.getTime());
                                const minT = Math.min(...starts);
                                const maxT = Math.max(...ends);
                                const spanDays = (maxT - minT) / 86400000;

                                if (spanDays > 0) {
                                    const vw = window.innerWidth * 0.85; // leave padding
                                    const idealZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vw / spanDays));
                                    setZoom(idealZoom);
                                }
                            }

                            // Initialize lastSavedRef with loaded data
                            const initialState = JSON.stringify({
                                events: loadedEvents,
                                notes: data.notes || [],
                                name: data.identifier || 'Timeline',
                                description: data.description || '',
                                coverImage: data.coverImage || '',
                                themeId: data.themeId || 'chronos'
                            });
                            lastSavedRef.current = initialState;
                        }
                        setIsLoaded(true);
                    }
                })
                .catch(err => console.error("Failed to load timeline", err));
        }
    }, [token, id]);

    // Center scroll on events after initial load
    const hasScrolledToFit = useRef(false);
    useEffect(() => {
        if (isLoaded && events.length > 0 && !hasScrolledToFit.current && timelineContainerRef.current) {
            hasScrolledToFit.current = true;
            // Small delay to ensure the Timeline has rendered with new zoom
            const timer = setTimeout(() => {
                const container = timelineContainerRef.current?.container;
                if (container) {
                    // Scroll so events start near left edge with some padding
                    const starts = events.map(e => e.start.getTime());
                    const minT = Math.min(...starts);
                    const minDate = timelineContainerRef.current?.minDate;
                    if (minDate) {
                        const dayOffset = (minT - minDate.getTime()) / 86400000;
                        const targetX = dayOffset * zoom;
                        container.scrollLeft = Math.max(0, targetX - container.offsetWidth * 0.07);
                    }
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isLoaded, events, zoom]);

    // Protect against leaving while saving
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isSaving) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isSaving]);

    // Track fullscreen changes (e.g. from ESC key)
    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    // Scroll Synchronization removed as per user request for individual control
    /*
    useEffect(() => {
        if (!isComparing || !timelineContainerRef.current || !comparisonContainerRef.current) return;
        ...
    }, [isComparing, comparisonTimeline]);
    */

    // Apply Theme
    useEffect(() => {
        const theme = THEMES[themeId] || THEMES.chronos;
        Object.entries(theme.vars).forEach(([key, value]) => {
            document.documentElement.style.setProperty(key, value);
        });

        return () => {
            // Revert to default when leaving
            Object.entries(THEMES.chronos.vars).forEach(([key, value]) => {
                document.documentElement.style.setProperty(key, value);
            });
        };
    }, [themeId]);

    // Debounced save
    const debouncedSave = useCallback(
        debounce((currentEvents, token, timelineId, name, description, coverImage, themeId, currentNotes) => {
            if (!token) return;
            setIsSaving(true);
            const startTime = Date.now();

            apiClient.saveTimeline(token, timelineId, currentEvents, {
                identifier: name,
                description: description,
                coverImage: coverImage,
                themeId: themeId,
                notes: currentNotes
            })
                .then(() => {
                    // Ensure indicator shows for at least 800ms
                    const elapsed = Date.now() - startTime;
                    const minDelay = Math.max(0, 800 - elapsed);
                    setTimeout(() => setIsSaving(false), minDelay);
                })
                .catch(err => {
                    console.error("Failed to save", err);
                    setIsSaving(false);
                });
        }, 1000),
        []
    );

    const debouncedSaveComparison = useCallback(
        debounce((id, events, name, description, coverImage, themeId, token) => {
            if (!token || !id) return;
            // No specific isSaving for comparison to keep UI clean, or we could add isSavingComparison
            apiClient.saveTimeline(token, id, events, {
                identifier: name,
                description: description,
                coverImage: coverImage,
                themeId: themeId
            }).catch(err => console.error("Failed to save comparison timeline", err));
        }, 1000),
        []
    );

    // Trigger save when events or notes change
    useEffect(() => {
        if (!isLoaded || !token || !id) return;

        const currentState = JSON.stringify({
            events,
            notes,
            name: timelineName,
            description: timelineDescription,
            coverImage: timelineCoverImage,
            themeId: themeId
        });

        if (currentState !== lastSavedRef.current) {
            debouncedSave(events, token, id, timelineName, timelineDescription, timelineCoverImage, themeId, notes);
            lastSavedRef.current = currentState;
        }
    }, [events, notes, token, id, timelineName, timelineDescription, timelineCoverImage, themeId, debouncedSave, isLoaded]);

    // Trigger save for comparison timelines
    useEffect(() => {
        if (!isComparing || !token) return;

        comparisonTimelines.forEach(ct => {
            const currentState = JSON.stringify({
                events: ct.events,
                name: ct.name,
                description: ct.description,
                coverImage: ct.coverImage,
                themeId: ct.themeId
            });

            if (currentState !== lastSavedComparisonMap.current[ct.id]) {
                debouncedSaveComparison(
                    ct.id, ct.events, ct.name, ct.description, ct.coverImage, ct.themeId, token
                );
                lastSavedComparisonMap.current[ct.id] = currentState;
            }
        });
    }, [comparisonTimelines, token, isComparing, debouncedSaveComparison]);

    const addParentEvent = () => {
        const newEvent = createEvent(true, null, 0, false, 'epoch');
        setEditingEvent(newEvent);
    };


    const addSubEvent = (parentId, type = 'stage') => {
        const parent = events.find(e => e.id === parentId);
        if (!parent) return;

        const siblingSubEvents = events.filter(e => e.parentId === parentId && !e.isMilestone && e.type === type);
        const newOrder = Math.max(...siblingSubEvents.map(e => e.order || 0), -1) + 1;

        const sub = createEvent(false, parentId, newOrder, false, type);
        sub.start = new Date(parent.start);
        sub.end = new Date(parent.start);

        setEditingEvent(sub);
    };

    const addMilestone = (subEventId) => {
        const subEvent = events.find(e => e.id === subEventId);
        if (!subEvent) return;

        const siblingMilestones = events.filter(e => e.parentId === subEventId && e.isMilestone);
        const newOrder = 0; // Default to first level

        const milestone = createEvent(false, subEventId, newOrder, true);
        milestone.start = new Date(subEvent.start);
        milestone.end = new Date(subEvent.start);

        setEditingEvent(milestone);
    };

    // --- Notes Handlers ---
    const addNote = useCallback((x, y) => {
        const newNote = { id: uuidv4(), text: '', x, y, color: '#fbbf24' };
        setNotes(prev => [...prev, newNote]);
    }, []);

    const updateNote = useCallback((noteId, updates) => {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates } : n));
    }, []);

    const deleteNote = useCallback((noteId) => {
        setNotes(prev => prev.filter(n => n.id !== noteId));
    }, []);

    const saveEditingEvent = (updatedEvent) => {
        const exists = events.some(e => e.id === updatedEvent.id);
        if (exists) {
            updateEvent(updatedEvent, { cascade: false });
        } else {
            setEvents(prev => [...prev, updatedEvent]);
        }
    };

    // --- Comparison Handlers (parametrized by timeline ID) ---
    const updateComparisonTimelineById = (timelineId, updaterFn) => {
        setComparisonTimelines(prev => prev.map(ct =>
            ct.id === timelineId ? updaterFn(ct) : ct
        ));
    };

    const createComparisonHandlers = (timelineId) => ({
        updateEvent: (updatedEvent, options = {}, batchEvents = null) => {
            updateComparisonTimelineById(timelineId, (ct) => {
                const { cascade = false } = options;
                const oldEvent = ct.events.find(e => e.id === updatedEvent.id);
                let newEvents;
                if (batchEvents) {
                    newEvents = batchEvents;
                } else {
                    newEvents = ct.events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
                    if (cascade && oldEvent && updatedEvent.isParent) {
                        const timeDiff = updatedEvent.start.getTime() - oldEvent.start.getTime();
                        if (timeDiff !== 0) {
                            newEvents = newEvents.map(e => {
                                if (e.parentId === updatedEvent.id) {
                                    return { ...e, start: new Date(e.start.getTime() + timeDiff), end: new Date(e.end.getTime() + timeDiff) };
                                }
                                return e;
                            });
                        }
                    }
                }
                return { ...ct, events: newEvents };
            });
        },
        deleteEvent: (eventId) => {
            updateComparisonTimelineById(timelineId, (ct) => {
                const getDescendantIds = (parentId, allEvents) => {
                    const children = allEvents.filter(e => e.parentId === parentId);
                    let ids = children.map(c => c.id);
                    children.forEach(child => { ids = [...ids, ...getDescendantIds(child.id, allEvents)]; });
                    return ids;
                };
                const idsToDelete = [eventId, ...getDescendantIds(eventId, ct.events)];
                const idsSet = new Set(idsToDelete);
                return { ...ct, events: ct.events.filter(e => !idsSet.has(e.id)) };
            });
        },
        addSubEvent: (parentId, type = 'stage') => {
            updateComparisonTimelineById(timelineId, (ct) => {
                const parent = ct.events.find(e => e.id === parentId);
                if (!parent) return ct;
                const siblingSubEvents = ct.events.filter(e => e.parentId === parentId && !e.isMilestone && e.type === type);
                const newOrder = Math.max(...siblingSubEvents.map(e => e.order || 0), -1) + 1;
                const sub = createEvent(false, parentId, newOrder, false, type);
                sub.start = new Date(parent.start);
                sub.end = new Date(parent.end);
                return { ...ct, events: [...ct.events, sub] };
            });
        },
        addMilestone: (subEventId) => {
            updateComparisonTimelineById(timelineId, (ct) => {
                const subEvent = ct.events.find(e => e.id === subEventId);
                if (!subEvent) return ct;
                const milestone = createEvent(false, subEventId, 0, true);
                milestone.start = new Date(subEvent.start);
                milestone.end = new Date(subEvent.start);
                return { ...ct, events: [...ct.events, milestone] };
            });
        }
    });

    const updateEvent = (updatedEvent, options = {}, batchEvents = null) => {
        const { cascade = false } = options;
        const oldEvent = events.find(e => e.id === updatedEvent.id);

        if (batchEvents) {
            setEvents(batchEvents);
            return;
        }

        let newEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);

        if (cascade && oldEvent && updatedEvent.isParent) {
            const timeDiff = updatedEvent.start.getTime() - oldEvent.start.getTime();
            if (timeDiff !== 0) {
                newEvents = newEvents.map(e => {
                    if (e.parentId === updatedEvent.id) {
                        return {
                            ...e,
                            start: new Date(e.start.getTime() + timeDiff),
                            end: new Date(e.end.getTime() + timeDiff)
                        };
                    }
                    return e;
                });
            }
        }

        setEvents(newEvents);
    };

    const deleteEvent = (id) => {
        // Recursive function to find all descendant IDs
        const getDescendantIds = (parentId, allEvents) => {
            const children = allEvents.filter(e => e.parentId === parentId);
            let ids = children.map(c => c.id);
            children.forEach(child => {
                ids = [...ids, ...getDescendantIds(child.id, allEvents)];
            });
            return ids;
        };

        const idsToDelete = [id, ...getDescendantIds(id, events)];
        const idsSet = new Set(idsToDelete);

        setEvents(events.filter(e => !idsSet.has(e.id)));
    };



    const handleFullscreenToggle = () => {
        if (!pageRef.current) return;

        if (!document.fullscreenElement) {
            pageRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const handleCompareSelect = (targetId) => {
        if (!token) return;
        apiClient.getTimeline(token, targetId)
            .then(data => {
                if (data) {
                    const loadedEvents = data.events.map(e => ({
                        ...e,
                        start: new Date(e.start),
                        end: new Date(e.end),
                        tags: e.tags || []
                    }));
                    const compData = {
                        id: targetId,
                        name: data.identifier || 'Timeline',
                        description: data.description || '',
                        coverImage: data.coverImage || '',
                        themeId: data.themeId || 'chronos',
                        events: loadedEvents
                    };
                    lastSavedComparisonMap.current[targetId] = JSON.stringify({
                        events: loadedEvents,
                        name: compData.name,
                        description: compData.description,
                        coverImage: compData.coverImage,
                        themeId: compData.themeId
                    });
                    setComparisonTimelines(prev => [...prev, compData]);
                    setShowComparisonModal(false);
                }
            })
            .catch(err => console.error("Failed to load comparison timeline", err));
    };

    const removeComparison = (targetId) => {
        setComparisonTimelines(prev => prev.filter(ct => ct.id !== targetId));
        delete comparisonRefsMap.current[targetId];
        delete lastSavedComparisonMap.current[targetId];
    };

    const removeAllComparisons = () => {
        setComparisonTimelines([]);
        comparisonRefsMap.current = {};
        lastSavedComparisonMap.current = {};
    };

    if (!id) return null;

    if (!isLoaded) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a', // Neutral dark for loading
                color: 'white'
            }}>
                <div className="animate-spin" style={{ marginBottom: '1rem' }}>
                    <Clock size={48} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '500' }}>Cargando tu timeline...</h2>
            </div>
        );
    }

    return (
        <div ref={pageRef} className="app-container" style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            padding: 0,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            transition: 'background-color 0.5s ease'
        }}>
            <header className="glass-panel" style={{
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '0.5rem',
                zIndex: 10,
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/dashboard')} className="btn-secondary" title="Volver al Dashboard">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {timelineName}
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button onClick={() => setShowComparisonModal(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <GitCompare size={18} /> Comparar
                    </button>
                    {isComparing && (
                        <button onClick={removeAllComparisons} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#ef4444', color: '#ef4444' }}>
                            <X size={18} /> Cerrar Todo
                        </button>
                    )}
                    <button
                        onClick={handleFullscreenToggle}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        {isFullscreen ? 'Salir Fullscreen' : 'Ventana Completa'}
                    </button>
                    <button
                        onClick={() => setShowExportModal(true)}
                        disabled={isExporting}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>{exportProgress}%</span>
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                <span>PDF</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => exportTimelineToExcel(events, timelineName)}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <FileSpreadsheet size={16} />
                        <span>Excel</span>
                    </button>
                    <button
                        onClick={() => setShowFilterModal(true)}
                        style={{
                            all: 'unset',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1rem',
                            borderRadius: '10px',
                            background: (selectedTags.size > 0 || selectedLocations.size > 0) ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                            color: (selectedTags.size > 0 || selectedLocations.size > 0) ? 'white' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease',
                            border: `1px solid ${(selectedTags.size > 0 || selectedLocations.size > 0) ? 'var(--accent-color)' : 'var(--border-primary)'}`
                        }}
                    >
                        <SlidersHorizontal size={18} />
                        <span>Filtros</span>
                        {(selectedTags.size > 0 || selectedLocations.size > 0) && (
                            <span style={{
                                background: 'white',
                                color: 'var(--accent-color)',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem'
                            }}>
                                {selectedTags.size + selectedLocations.size}
                            </span>
                        )}
                    </button>
                    <button onClick={addParentEvent} className="btn-primary" style={{ alignItems: 'center', gap: '0.5rem', display: isComparing ? 'none' : 'flex' }}>
                        <Plus size={18} /> Nueva Época
                    </button>
                </div>
            </header>

            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', margin: '0 0.5rem 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: isComparing ? '1rem' : '0' }}>
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {isComparing && (
                        <div style={{ position: 'absolute', top: '10px', left: '20px', zIndex: 100, background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {timelineName} (Principal)
                        </div>
                    )}
                    <Timeline
                        ref={timelineContainerRef}
                        events={filteredEvents}
                        zoom={zoom}
                        viewDate={viewDate}
                        onUpdateEvent={updateEvent}
                        onDeleteEvent={deleteEvent}
                        onAddSubEvent={addSubEvent}
                        onAddMilestone={addMilestone}
                        minDateOverride={commonBounds?.minDate}
                        totalDaysOverride={commonBounds?.totalDays}
                        onZoomChange={(newZoom) => {
                            setZoom(newZoom);
                            if (isComparing) setComparisonZoom(newZoom);
                        }}
                        onScroll={(sl) => {
                            if (isSyncingScroll.current || !isComparing) return;
                            isSyncingScroll.current = true;
                            Object.values(comparisonRefsMap.current).forEach(ref => {
                                if (ref?.container) ref.container.scrollLeft = sl;
                            });
                            isSyncingScroll.current = false;
                        }}
                        editingEvent={editingEvent}
                        setEditingEvent={setEditingEvent}
                        onSaveEditingEvent={saveEditingEvent}
                        setViewingEvent={setViewingEvent}
                        renderAll={isExporting}
                        collapsedTracks={collapsedTracks}
                        onToggleTrack={handleToggleTrack}
                        notes={notes}
                        onAddNote={addNote}
                        onUpdateNote={updateNote}
                        onDeleteNote={deleteNote}
                    />
                </div>

                {comparisonTimelines.map(ct => {
                    const handlers = createComparisonHandlers(ct.id);
                    const filteredCtEvents = getFilteredList(ct.events);
                    return (
                        <div key={ct.id} style={{ flex: 1, overflow: 'hidden', position: 'relative', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                            <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {ct.name} (Comparación)
                                </span>
                                <button
                                    onClick={() => removeComparison(ct.id)}
                                    style={{ all: 'unset', cursor: 'pointer', background: 'rgba(239,68,68,0.3)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.5)' }}
                                    title="Quitar esta comparación"
                                >
                                    <X size={12} color="#ef4444" />
                                </button>
                            </div>
                            <Timeline
                                ref={(el) => { comparisonRefsMap.current[ct.id] = el; }}
                                events={filteredCtEvents}
                                zoom={comparisonZoom}
                                viewDate={viewDate}
                                onUpdateEvent={handlers.updateEvent}
                                onDeleteEvent={handlers.deleteEvent}
                                onAddSubEvent={handlers.addSubEvent}
                                onAddMilestone={handlers.addMilestone}
                                minDateOverride={commonBounds?.minDate}
                                totalDaysOverride={commonBounds?.totalDays}
                                onZoomChange={(newZoom) => {
                                    setComparisonZoom(newZoom);
                                    setZoom(newZoom);
                                }}
                                onScroll={(sl) => {
                                    if (isSyncingScroll.current || !timelineContainerRef.current) return;
                                    isSyncingScroll.current = true;
                                    timelineContainerRef.current.container.scrollLeft = sl;
                                    // Sync other comparison timelines
                                    Object.entries(comparisonRefsMap.current).forEach(([refId, ref]) => {
                                        if (refId !== ct.id && ref?.container) ref.container.scrollLeft = sl;
                                    });
                                    isSyncingScroll.current = false;
                                }}
                                editingEvent={editingEvent}
                                setEditingEvent={setEditingEvent}
                                onSaveEditingEvent={saveEditingEvent}
                                setViewingEvent={setViewingEvent}
                                collapsedTracks={collapsedTracks}
                                onToggleTrack={handleToggleTrack}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Toast notification for saving */}
            {isSaving && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    background: 'var(--bg-secondary)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000,
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <Save size={18} className="animate-spin" style={{ color: 'var(--accent-color)' }} />
                    <span>Guardando cambios...</span>
                </div>
            )}

            {/* Modals */}
            {showFilterModal && (
                <FilterModal
                    selectedTags={selectedTags}
                    onToggleTag={(tag) => {
                        const newTags = new Set(selectedTags);
                        if (newTags.has(tag)) newTags.delete(tag);
                        else newTags.add(tag);
                        setSelectedTags(newTags);
                    }}
                    allTags={allTags}
                    selectedLocations={selectedLocations}
                    onToggleLocation={(loc) => {
                        const newLocs = new Set(selectedLocations);
                        if (newLocs.has(loc)) newLocs.delete(loc);
                        else newLocs.add(loc);
                        setSelectedLocations(newLocs);
                    }}
                    allLocations={allLocations}
                    onClose={() => setShowFilterModal(false)}
                />
            )}

            {showComparisonModal && (
                <ComparisonModal
                    excludeIds={[id, ...comparisonTimelines.map(ct => ct.id)]}
                    onClose={() => setShowComparisonModal(false)}
                    onSelect={handleCompareSelect}
                />
            )}

            {showExportModal && (
                <ExportPDFModal
                    minDate={new Date(Math.min(...events.map(e => e.start.getTime())))}
                    maxDate={new Date(Math.max(...events.map(e => e.end.getTime())))}
                    onClose={() => setShowExportModal(false)}
                    onExport={(range) => {
                        setShowExportModal(false);
                        exportToPdf({
                            range,
                            zoom: zoom
                        });
                    }}
                />
            )}

            {viewingEvent && (
                <EventViewer
                    event={viewingEvent}
                    onClose={() => setViewingEvent(null)}
                />
            )}

            <EventTreePanel
                events={events}
                hiddenEventIds={hiddenEventIds}
                onToggleVisibility={handleToggleEventVisibility}
                isOpen={showTreePanel}
                onToggle={() => setShowTreePanel(prev => !prev)}
            />
        </div>
    );
};
