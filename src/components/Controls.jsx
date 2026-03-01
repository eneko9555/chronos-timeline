import React from 'react';
import { ZoomIn, ZoomOut, Download, Loader2 } from 'lucide-react';
import { MIN_ZOOM, MAX_ZOOM, formatZoomLabel } from '../utils';

// Logarithmic mapping: slider 0-100 <-> MIN_ZOOM..MAX_ZOOM exponentially
const logMin = Math.log(MIN_ZOOM);
const logMax = Math.log(MAX_ZOOM);

const zoomToSlider = (zoom) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    return ((Math.log(clamped) - logMin) / (logMax - logMin)) * 100;
};

const sliderToZoom = (val) => {
    return Math.exp(logMin + (val / 100) * (logMax - logMin));
};

export const Controls = ({ zoom, setZoom, onExport, isExporting, exportProgress }) => {
    const handleZoomChange = (newZoom) => {
        const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
        setZoom(clampedZoom);
    };

    return (
        <div className="controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
            <button onClick={() => handleZoomChange(zoom / 1.5)} className="btn-secondary" style={{ padding: '0.25rem' }}>
                <ZoomOut size={16} />
            </button>
            <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={zoomToSlider(zoom)}
                onChange={(e) => handleZoomChange(sliderToZoom(Number(e.target.value)))}
                style={{ width: '120px' }}
            />
            <span style={{ fontSize: '0.75rem', minWidth: '80px', textAlign: 'center' }}>
                {formatZoomLabel(zoom)}
            </span>
            <button onClick={() => handleZoomChange(zoom * 1.5)} className="btn-secondary" style={{ padding: '0.25rem' }}>
                <ZoomIn size={16} />
            </button>

            {onExport && (
                <>
                    <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 8px' }} />
                    <button
                        onClick={onExport}
                        disabled={isExporting}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px', minWidth: '100px', justifyContent: 'center' }}
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
                </>
            )}
        </div>
    );
};
