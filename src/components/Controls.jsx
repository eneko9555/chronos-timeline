import React from 'react';
import { ZoomIn, ZoomOut, Download, Loader2 } from 'lucide-react';

export const Controls = ({ zoom, setZoom, onExport, isExporting, exportProgress }) => {
    const handleZoomChange = (newZoom) => {
        const clampedZoom = Math.max(0.1, Math.min(1000, newZoom));
        setZoom(clampedZoom);
    };

    return (
        <div className="controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
            <button onClick={() => handleZoomChange(zoom / 1.2)} className="btn-secondary" style={{ padding: '0.25rem' }}>
                <ZoomOut size={16} />
            </button>
            <input
                type="range"
                min="0.1"
                max="1000"
                step="0.1"
                value={zoom}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                style={{ width: '120px' }}
            />
            <span style={{ fontSize: '0.75rem', minWidth: '60px', textAlign: 'center' }}>
                {zoom.toFixed(1)}px/día
            </span>
            <button onClick={() => handleZoomChange(zoom * 1.2)} className="btn-secondary" style={{ padding: '0.25rem' }}>
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
