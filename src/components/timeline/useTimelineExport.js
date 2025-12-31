import { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export const useTimelineExport = (timelineRef) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const exportToPdf = useCallback(async (config = {}) => {
        const { range, zoom } = config;
        const timelineObj = timelineRef.current;
        if (!timelineObj) {
            console.error("Timeline object not found");
            return;
        }

        const container = timelineObj.container;
        const minDate = timelineObj.minDate;

        if (!container) {
            console.error("Timeline container not found");
            return;
        }

        const contentDiv = container.firstChild;
        if (!contentDiv) {
            console.error("Timeline content not found");
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        // Allow React to re-render with "renderAll={true}" (disable virtualization)
        // Wait 2 seconds for heavy render
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            // 1. Setup
            const totalWidth = contentDiv.scrollWidth;
            const clientWidth = container.clientWidth;
            const clientHeight = container.clientHeight;

            let startX = 0;
            let endX = totalWidth;

            if (range && minDate && zoom) {
                const getX = (date) => {
                    const msDiff = date.getTime() - minDate.getTime();
                    const days = msDiff / (1000 * 60 * 60 * 24);
                    return days * zoom;
                };

                // Add 1 day to end range to include the full end day
                const adjustedEnd = new Date(range.end);
                adjustedEnd.setDate(adjustedEnd.getDate() + 1);

                startX = Math.max(0, getX(range.start));
                endX = Math.min(totalWidth, getX(adjustedEnd));
            }

            const exportWidth = endX - startX;

            // Get theme colors from root (fallback if transparent)
            const rootStyles = getComputedStyle(document.documentElement);
            const bgColor = rootStyles.getPropertyValue('--bg-primary').trim() || '#0f172a';
            const txtColor = rootStyles.getPropertyValue('--text-primary').trim() || '#ffffff';

            // Pages
            const pages = Math.ceil(exportWidth / clientWidth);

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [clientWidth, clientHeight] // Initial format, will be adjusted per page
            });

            // 2. Loop through pages
            for (let i = 0; i < pages; i++) {
                const scrollX = startX + (i * clientWidth);
                const currentPageWidth = Math.min(clientWidth, exportWidth - (i * clientWidth));

                // Wait a bit just in case (rendering stability)
                await new Promise(resolve => setTimeout(resolve, 500));

                const dataUrl = await toPng(contentDiv, {
                    cacheBust: true,
                    pixelRatio: 2,
                    backgroundColor: bgColor,
                    width: currentPageWidth,   // Exact width for this page
                    height: clientHeight,
                    style: {
                        // Crucial: Shift the big content div left by scrollX
                        transform: `translateX(-${scrollX}px)`,
                        transformOrigin: 'top left',
                        // Ensure it behaves as a big box
                        width: `${totalWidth}px`,
                        height: `${clientHeight}px`,
                        overflow: 'visible',
                        margin: 0,
                        color: txtColor
                    },
                    filter: (node) => {
                        return true;
                    }
                });

                if (i === 0) {
                    // Resize first page if needed
                    pdf.deletePage(1);
                    pdf.addPage([currentPageWidth, clientHeight]);
                } else {
                    pdf.addPage([currentPageWidth, clientHeight]);
                }

                pdf.addImage(dataUrl, 'PNG', 0, 0, currentPageWidth, clientHeight);
                setExportProgress(Math.round(((i + 1) / pages) * 100));
            }

            pdf.save('timeline-export.pdf');

        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export PDF: " + error.message);
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }

    }, [timelineRef]);

    return {
        exportToPdf,
        isExporting,
        exportProgress
    };
};
