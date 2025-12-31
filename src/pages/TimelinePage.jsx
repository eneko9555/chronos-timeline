import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { Timeline } from '../components/Timeline';
import { Controls } from '../components/Controls';
import { EventViewer } from '../components/EventViewer';
import { createEvent } from '../utils';
import { Plus, ArrowLeft, Save, GitCompare, X, Maximize, Minimize, Play, Pause, Clock, SlidersHorizontal, Map as MapIcon } from 'lucide-react';
import { ComparisonModal } from '../components/ComparisonModal';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import debounce from 'lodash.debounce';
import { PlaybackSettingsModal } from '../components/PlaybackSettingsModal';
import { FilterModal } from '../components/FilterModal';
import { MapViewer } from '../components/MapViewer';
import { THEMES } from '../constants/themes';
import { useTimelineExport } from '../components/timeline/useTimelineExport';
import { ExportPDFModal } from '../components/ExportPDFModal';

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
    const [showPlaybackModal, setShowPlaybackModal] = useState(false);
    const [comparisonTimeline, setComparisonTimeline] = useState(null); // { id, name, description, coverImage, themeId, events }
    const [lastSavedComparisonRef, setLastSavedComparisonRef] = useState(null);
    const [isComparing, setIsComparing] = useState(false);
    const [comparisonZoom, setComparisonZoom] = useState(100);
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedTags, setSelectedTags] = useState(new Set());
    const [selectedLocations, setSelectedLocations] = useState(new Set());

    // Filtered Events helper
    const getFilteredList = (list) => {
        return list.filter(e => {
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

    const filteredEvents = useMemo(() => getFilteredList(events), [events, activeFilters, selectedTags, selectedLocations]);
    const filteredComparisonEvents = useMemo(() => getFilteredList(comparisonTimeline?.events || []), [comparisonTimeline, activeFilters, selectedTags, selectedLocations]);

    const allTags = useMemo(() => {
        const tags = new Set();
        events.forEach(e => (e.tags || []).forEach(t => tags.add(t)));
        if (comparisonTimeline?.events) {
            comparisonTimeline.events.forEach(e => (e.tags || []).forEach(t => tags.add(t)));
        }
        return Array.from(tags).sort();
    }, [events, comparisonTimeline]);

    const allLocations = useMemo(() => {
        const locations = new Set();
        events.forEach(e => { if (e.geo?.name) locations.add(e.geo.name); });
        if (comparisonTimeline?.events) {
            comparisonTimeline.events.forEach(e => { if (e.geo?.name) locations.add(e.geo.name); });
        }
        return Array.from(locations).sort();
    }, [events, comparisonTimeline]);

    // Calculate common bounds for synchronization
    const commonBounds = useMemo(() => {
        if (!isComparing || !comparisonTimeline) return null;

        const allEvs = [...events, ...comparisonTimeline.events];
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
    }, [events, comparisonTimeline, isComparing]);

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
                if (comparisonContainerRef.current) comparisonContainerRef.current.container.scrollLeft = scrollPos;
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isComparing, commonBounds, zoom]);

    // Cinematic playback
    const [isPlaying, setIsPlaying] = useState(false);
    const [focusedEventId, setFocusedEventId] = useState(null);
    const [playbackRange, setPlaybackRange] = useState(null); // { start, end }

    // To prevent saving right after load when nothing changed
    const lastSavedRef = useRef(null);
    const pageRef = useRef(null);
    const timelineContainerRef = useRef(null);
    const comparisonContainerRef = useRef(null);

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

                            // Initialize lastSavedRef with loaded data
                            const initialState = JSON.stringify({
                                events: loadedEvents,
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

    // Cinematic Playback Logic
    useEffect(() => {
        if (!isPlaying || events.length === 0) {
            setFocusedEventId(null);
            setViewingEvent(null);
            return;
        }

        // Filter events by range if specified
        let playbackEvents = [...events];
        if (playbackRange) {
            playbackEvents = playbackEvents.filter(e =>
                e.start >= playbackRange.start && e.start <= playbackRange.end
            );
        }

        if (playbackEvents.length === 0) {
            setIsPlaying(false);
            return;
        }

        // Sort events chronologically
        const sortedEvents = playbackEvents.sort((a, b) => a.start - b.start);
        let currentIndex = 0;

        const updateSequence = (index) => {
            const ev = sortedEvents[index];
            setFocusedEventId(ev.id);
            setViewingEvent(ev);
        };

        // Set first event immediately
        updateSequence(0);

        const interval = setInterval(() => {
            currentIndex = (currentIndex + 1) % sortedEvents.length;
            updateSequence(currentIndex);
        }, 5000); // 5 seconds per event for reading

        return () => clearInterval(interval);
    }, [isPlaying, events, playbackRange]);

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
        debounce((currentEvents, token, timelineId, name, description, coverImage, themeId) => {
            if (!token) return;
            setIsSaving(true);
            const startTime = Date.now();

            // We can send everything to saveTimeline if we update the API and backend
            apiClient.saveTimeline(token, timelineId, currentEvents, {
                identifier: name,
                description: description,
                coverImage: coverImage,
                themeId: themeId
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

    // Trigger save when events change
    useEffect(() => {
        if (!isLoaded || !token || !id) return;

        const currentState = JSON.stringify({
            events,
            name: timelineName,
            description: timelineDescription,
            coverImage: timelineCoverImage,
            themeId: themeId
        });

        if (currentState !== lastSavedRef.current) {
            debouncedSave(events, token, id, timelineName, timelineDescription, timelineCoverImage, themeId);
            lastSavedRef.current = currentState;
        }
    }, [events, token, id, timelineName, timelineDescription, timelineCoverImage, themeId, debouncedSave, isLoaded]);

    // Trigger save for comparison timeline
    useEffect(() => {
        if (!isComparing || !comparisonTimeline || !token) return;

        const currentState = JSON.stringify({
            events: comparisonTimeline.events,
            name: comparisonTimeline.name,
            description: comparisonTimeline.description,
            coverImage: comparisonTimeline.coverImage,
            themeId: comparisonTimeline.themeId
        });

        if (currentState !== lastSavedComparisonRef) {
            debouncedSaveComparison(
                comparisonTimeline.id,
                comparisonTimeline.events,
                comparisonTimeline.name,
                comparisonTimeline.description,
                comparisonTimeline.coverImage,
                comparisonTimeline.themeId,
                token
            );
            setLastSavedComparisonRef(currentState);
        }
    }, [comparisonTimeline, token, isComparing, debouncedSaveComparison, lastSavedComparisonRef]);

    const addParentEvent = () => {
        const newEvent = createEvent(true, null, 0, false, 'epoch');
        setEvents([...events, newEvent]);
        setEditingEvent(newEvent);
    };

    const addSubEvent = (parentId, type = 'stage') => {
        const parent = events.find(e => e.id === parentId);
        if (!parent) return;

        const siblingSubEvents = events.filter(e => e.parentId === parentId && !e.isMilestone && e.type === type);
        const newOrder = Math.max(...siblingSubEvents.map(e => e.order || 0), -1) + 1;

        const sub = createEvent(false, parentId, newOrder, false, type);
        sub.start = new Date(parent.start);
        sub.end = new Date(parent.end);

        setEvents([...events, sub]);
    };

    const addMilestone = (subEventId) => {
        const subEvent = events.find(e => e.id === subEventId);
        if (!subEvent || subEvent.isParent) return;

        const siblingMilestones = events.filter(e => e.parentId === subEventId && e.isMilestone);
        const newOrder = 0; // Default to first level

        const milestone = createEvent(false, subEventId, newOrder, true);
        milestone.start = new Date(subEvent.start);
        milestone.end = new Date(subEvent.start);

        setEvents([...events, milestone]);
    };

    // --- Comparison Handlers ---
    const updateComparisonEvent = (updatedEvent, options = {}, batchEvents = null) => {
        if (!comparisonTimeline) return;
        const { cascade = false } = options;
        const oldEvent = comparisonTimeline.events.find(e => e.id === updatedEvent.id);

        let newEvents;
        if (batchEvents) {
            newEvents = batchEvents;
        } else {
            newEvents = comparisonTimeline.events.map(e => e.id === updatedEvent.id ? updatedEvent : e);

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
        }

        setComparisonTimeline({ ...comparisonTimeline, events: newEvents });
    };

    const deleteComparisonEvent = (id) => {
        if (!comparisonTimeline) return;
        const getDescendantIds = (parentId, allEvents) => {
            const children = allEvents.filter(e => e.parentId === parentId);
            let ids = children.map(c => c.id);
            children.forEach(child => {
                ids = [...ids, ...getDescendantIds(child.id, allEvents)];
            });
            return ids;
        };

        const idsToDelete = [id, ...getDescendantIds(id, comparisonTimeline.events)];
        const idsSet = new Set(idsToDelete);

        setComparisonTimeline({
            ...comparisonTimeline,
            events: comparisonTimeline.events.filter(e => !idsSet.has(e.id))
        });
    };

    const addComparisonSubEvent = (parentId, type = 'stage') => {
        if (!comparisonTimeline) return;
        const parent = comparisonTimeline.events.find(e => e.id === parentId);
        if (!parent) return;

        const siblingSubEvents = comparisonTimeline.events.filter(e => e.parentId === parentId && !e.isMilestone && e.type === type);
        const newOrder = Math.max(...siblingSubEvents.map(e => e.order || 0), -1) + 1;

        const sub = createEvent(false, parentId, newOrder, false, type);
        sub.start = new Date(parent.start);
        sub.end = new Date(parent.end);

        setComparisonTimeline({
            ...comparisonTimeline,
            events: [...comparisonTimeline.events, sub]
        });
    };

    const addComparisonMilestone = (subEventId) => {
        if (!comparisonTimeline) return;
        const subEvent = comparisonTimeline.events.find(e => e.id === subEventId);
        if (!subEvent || subEvent.isParent) return;

        const siblingMilestones = comparisonTimeline.events.filter(e => e.parentId === subEventId && e.isMilestone);
        const newOrder = 0; // Default to first level

        const milestone = createEvent(false, subEventId, newOrder, true);
        milestone.start = new Date(subEvent.start);
        milestone.end = new Date(subEvent.start);

        setComparisonTimeline({
            ...comparisonTimeline,
            events: [...comparisonTimeline.events, milestone]
        });
    };

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

    const togglePlayback = () => {
        if (!isPlaying) {
            setShowPlaybackModal(true);
        } else {
            setIsPlaying(false);
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        };
    }

    const startPlayback = (start, end) => {
        setPlaybackRange({ start, end });
        setShowPlaybackModal(false);
        if (isComparing) removeComparison();
        setIsPlaying(true);

        // Auto-Fullscreen with delay and safety check
        setTimeout(() => {
            if (!document.fullscreenElement && pageRef.current) {
                if (pageRef.current.isConnected) {
                    pageRef.current.requestFullscreen().catch(err => console.error('Fullscreen error:', err));
                }
            }
        }, 100);
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
                    setComparisonTimeline(compData);
                    setLastSavedComparisonRef(JSON.stringify({
                        events: loadedEvents,
                        name: compData.name,
                        description: compData.description,
                        coverImage: compData.coverImage,
                        themeId: compData.themeId
                    }));
                    setIsComparing(true);
                    setShowComparisonModal(false);
                }
            })
            .catch(err => console.error("Failed to load comparison timeline", err));
    };

    const removeComparison = () => {
        setComparisonTimeline(null);
        setIsComparing(false);
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
                    <button
                        onClick={togglePlayback}
                        className="btn-secondary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: isPlaying ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
                            borderColor: isPlaying ? 'var(--accent-color)' : 'var(--border-primary)',
                            color: isPlaying ? 'var(--accent-color)' : 'var(--text-primary)'
                        }}
                    >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                        {isPlaying ? 'Pausar Presentación' : 'Reproducir'}
                    </button>
                    {isComparing ? (
                        <button onClick={removeComparison} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#ef4444', color: '#ef4444' }}>
                            <X size={18} /> Cerrar Comparación
                        </button>
                    ) : (
                        <button onClick={() => setShowComparisonModal(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <GitCompare size={18} /> Comparar
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
                    <Controls
                        zoom={zoom}
                        setZoom={setZoom}
                        onExport={() => setShowExportModal(true)}
                        isExporting={isExporting}
                        exportProgress={exportProgress}
                    />
                    <button
                        onClick={() => setShowFilterModal(true)}
                        style={{
                            all: 'unset',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1rem',
                            borderRadius: '10px',
                            background: activeFilters.size < 4 ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                            color: activeFilters.size < 4 ? 'white' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease',
                            border: `1px solid ${activeFilters.size < 4 ? 'var(--accent-color)' : 'var(--border-primary)'}`
                        }}
                    >
                        <SlidersHorizontal size={18} />
                        <span>Filtros</span>
                        {activeFilters.size < 4 && (
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
                                {activeFilters.size}
                            </span>
                        )}
                    </button>
                    <button onClick={addParentEvent} className="btn-primary" style={{ alignItems: 'center', gap: '0.5rem', display: isComparing || isPlaying ? 'none' : 'flex' }}>
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
                            if (isSyncingScroll.current || !isComparing || !comparisonContainerRef.current) return;
                            isSyncingScroll.current = true;
                            comparisonContainerRef.current.container.scrollLeft = sl;
                            // Also sync Y scroll if preferred, but usually X is the priority for time alignment
                            isSyncingScroll.current = false;
                        }}
                        editingEvent={editingEvent}
                        setEditingEvent={setEditingEvent}
                        focusedEventId={focusedEventId}
                        setViewingEvent={setViewingEvent}
                        renderAll={isExporting}
                    />
                </div>

                {isComparing && comparisonTimeline && (
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100, background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {comparisonTimeline.name} (Comparación)
                        </div>
                        <Timeline
                            ref={comparisonContainerRef}
                            events={filteredComparisonEvents}
                            zoom={comparisonZoom}
                            viewDate={viewDate}
                            onUpdateEvent={updateComparisonEvent}
                            onDeleteEvent={deleteComparisonEvent}
                            onAddSubEvent={addComparisonSubEvent}
                            onAddMilestone={addComparisonMilestone}
                            minDateOverride={commonBounds?.minDate}
                            totalDaysOverride={commonBounds?.totalDays}
                            onZoomChange={(newZoom) => {
                                setComparisonZoom(newZoom);
                                if (isComparing) setZoom(newZoom);
                            }}
                            onScroll={(sl) => {
                                if (isSyncingScroll.current || !isComparing || !timelineContainerRef.current) return;
                                isSyncingScroll.current = true;
                                timelineContainerRef.current.container.scrollLeft = sl;
                                isSyncingScroll.current = false;
                            }}
                            editingEvent={editingEvent} // Use common editing state
                            setEditingEvent={setEditingEvent}
                            setViewingEvent={setViewingEvent}
                        />
                    </div>
                )}
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
                    activeFilters={activeFilters}
                    onToggle={setActiveFilters}
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
                    currentTimelineId={id}
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

            {showPlaybackModal && (
                <PlaybackSettingsModal
                    minDate={new Date(Math.min(...events.map(e => e.start.getTime())))}
                    maxDate={new Date(Math.max(...events.map(e => e.end.getTime())))}
                    onClose={() => setShowPlaybackModal(false)}
                    onStart={startPlayback}
                />
            )}


            {viewingEvent && (
                <EventViewer
                    event={viewingEvent}
                    isPresentationMode={isPlaying}
                    onClose={() => setViewingEvent(null)}
                />
            )}
        </div>
    );
};
