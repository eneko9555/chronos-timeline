import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
    const map = useMap();

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position ? <Marker position={position}></Marker> : null;
};

export const LocationPicker = ({ lat, lng, onChange }) => {
    const [position, setPosition] = useState(null);

    useEffect(() => {
        if (lat && lng) {
            setPosition({ lat: parseFloat(lat), lng: parseFloat(lng) });
        }
    }, [lat, lng]);

    const handleSetPosition = (pos) => {
        setPosition(pos);
        onChange(pos.lat, pos.lng);
    };

    const defaultCenter = [20, 0]; // World view roughly
    const center = position || defaultCenter;

    return (
        <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', zIndex: 0 }}>
            <MapContainer center={center} zoom={2} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker position={position} setPosition={handleSetPosition} />
            </MapContainer>
        </div>
    );
};
