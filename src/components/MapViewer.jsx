import React, { useEffect, useRef, useState } from 'react';

export const MapViewer = ({ events, onMarkerClick, focusedEventId }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersRef = useRef({}); // Changed to object for easier lookup
    const polylineRef = useRef(null);
    const [leafletLoaded, setLeafletLoaded] = useState(false);

    useEffect(() => {
        // Load Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // Load Leaflet JS
        if (!window.L) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.async = true;
            script.onload = () => setLeafletLoaded(true);
            document.head.appendChild(script);
        } else {
            setLeafletLoaded(true);
        }
    }, []);

    // Effect to pan to focused event
    useEffect(() => {
        if (!leafletLoaded || !mapInstance.current || !focusedEventId) return;

        const event = events.find(e => e.id === focusedEventId);
        if (event?.geo?.lat && event?.geo?.lng) {
            mapInstance.current.setView([event.geo.lat, event.geo.lng], 10, {
                animate: true,
                duration: 1
            });
            markersRef.current[event.id]?.openPopup();
        }
    }, [leafletLoaded, focusedEventId, events]);

    useEffect(() => {
        if (!leafletLoaded || !mapRef.current) return;

        if (!mapInstance.current) {
            mapInstance.current = window.L.map(mapRef.current).setView([20, 0], 2);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                className: 'map-tiles'
            }).addTo(mapInstance.current);

            // Dark mode hack for tiles if preferred
            // document.querySelector('.map-tiles')?.style.filter = 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';
        }

        const L = window.L;

        // Clear existing markers
        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};
        if (polylineRef.current) polylineRef.current.remove();

        const geoEvents = events
            .filter(e => e.geo?.lat && e.geo?.lng)
            .sort((a, b) => new Date(a.start) - new Date(b.start));

        const coords = [];

        geoEvents.forEach(event => {
            const marker = L.marker([event.geo.lat, event.geo.lng])
                .addTo(mapInstance.current)
                .bindPopup(`<b>${event.title}</b><br>${event.geo.name || ''}`)
                .on('click', () => onMarkerClick?.(event));

            markersRef.current[event.id] = marker;
            coords.push([event.geo.lat, event.geo.lng]);
        });

        if (coords.length > 1) {
            polylineRef.current = L.polyline(coords, { color: '#60a5fa', weight: 3, opacity: 0.6, dashArray: '5, 10' }).addTo(mapInstance.current);
        }

        if (coords.length > 0) {
            const bounds = L.latLngBounds(coords);
            mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }

    }, [leafletLoaded, events, onMarkerClick]);

    return (
        <div
            ref={mapRef}
            style={{
                width: '100%',
                height: '100%',
                background: '#1a1a1b',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--border-primary)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
        />
    );
};
