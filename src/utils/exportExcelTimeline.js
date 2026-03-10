import * as XLSX from 'xlsx';
import { getDateParts } from '../utils';

/**
 * Export timeline events to an Excel file with the same format used by the importer.
 * Sheets: AREAS, EPOCA, ETAPA, SUCESOS, HITOS
 */
export const exportTimelineToExcel = (events, timelineName) => {
    const wb = XLSX.utils.book_new();

    // Build lookup: id -> event for resolving parent names
    const byId = {};
    for (const e of events) {
        byId[e.id] = e;
    }

    const parentName = (evt) => {
        if (!evt.parentId || !byId[evt.parentId]) return '';
        return byId[evt.parentId].title || '';
    };

    // --- AREAS sheet ---
    const areasData = [
        ['TEMAS', 'AREA'],
        ['', timelineName]
    ];
    const wsAreas = XLSX.utils.aoa_to_sheet(areasData);
    XLSX.utils.book_append_sheet(wb, wsAreas, 'AREAS');

    // --- EPOCA sheet ---
    // Columns: [0-2 reserved] [3] Título [4] Color [5-7] Inicio [8-10] Fin [11] Media [15] Descripción
    const epochs = events.filter(e => e.type === 'epoch');
    const epochHeaders = [
        '', '', '', 'Título', 'Color',
        'Año Inicio', 'Mes Inicio', 'Día Inicio',
        'Año Fin', 'Mes Fin', 'Día Fin',
        'Media URL', '', '', '', 'Descripción', 'Orden'
    ];
    const epochRows = [epochHeaders];
    for (const e of epochs) {
        const s = getDateParts(e.start);
        const end = getDateParts(e.end);
        const row = [];
        row[3] = e.title || '';
        row[4] = e.color || '';
        row[5] = s.year;
        row[6] = s.month;
        row[7] = s.day;
        row[8] = end.year;
        row[9] = end.month;
        row[10] = end.day;
        row[11] = e.mediaUrls?.join(';') || '';
        row[15] = e.description || '';
        row[16] = e.order != null ? e.order : '';
        epochRows.push(row);
    }
    const wsEpochs = XLSX.utils.aoa_to_sheet(epochRows);
    XLSX.utils.book_append_sheet(wb, wsEpochs, 'EPOCA');

    // --- ETAPA sheet ---
    // Columns: [0] Época Padre [1] Título [3] Tag1 [4] Tag2 [5] Color [6-8] Inicio [9-11] Fin [12] Media [16] Descripción
    const stages = events.filter(e => e.type === 'stage');
    const stageHeaders = [
        'Época Padre', 'Título', '', 'Tag 1', 'Tag 2', 'Color',
        'Año Inicio', 'Mes Inicio', 'Día Inicio',
        'Año Fin', 'Mes Fin', 'Día Fin',
        'Media URL', '', '', '', 'Descripción', 'Orden'
    ];
    const stageRows = [stageHeaders];
    for (const e of stages) {
        const s = getDateParts(e.start);
        const end = getDateParts(e.end);
        const tags = e.tags || [];
        const row = [];
        row[0] = parentName(e);
        row[1] = e.title || '';
        row[3] = tags[0] || '';
        row[4] = tags[1] || '';
        row[5] = e.color || '';
        row[6] = s.year;
        row[7] = s.month;
        row[8] = s.day;
        row[9] = end.year;
        row[10] = end.month;
        row[11] = end.day;
        row[12] = e.mediaUrls?.join(';') || '';
        row[16] = e.description || '';
        row[17] = e.order != null ? e.order : '';
        stageRows.push(row);
    }
    const wsStages = XLSX.utils.aoa_to_sheet(stageRows);
    XLSX.utils.book_append_sheet(wb, wsStages, 'ETAPA');

    // --- SUCESOS sheet ---
    // Columns: [0] Etapa Padre [1] Título [3] Tag1 [4] Tag2 [5] Color [6] Ubicación [7-9] Inicio [10-12] Fin [13] Media [17] Descripción
    const evts = events.filter(e => e.type === 'event');
    const eventHeaders = [
        'Etapa Padre', 'Título', '', 'Tag 1', 'Tag 2', 'Color',
        'Ubicación',
        'Año Inicio', 'Mes Inicio', 'Día Inicio',
        'Año Fin', 'Mes Fin', 'Día Fin',
        'Media URL', '', '', '', 'Descripción', 'Orden'
    ];
    const eventRows = [eventHeaders];
    for (const e of evts) {
        const s = getDateParts(e.start);
        const end = getDateParts(e.end);
        const tags = e.tags || [];
        const row = [];
        row[0] = parentName(e);
        row[1] = e.title || '';
        row[3] = tags[0] || '';
        row[4] = tags[1] || '';
        row[5] = e.color || '';
        row[6] = e.geo?.name || '';
        row[7] = s.year;
        row[8] = s.month;
        row[9] = s.day;
        row[10] = end.year;
        row[11] = end.month;
        row[12] = end.day;
        row[13] = e.mediaUrls?.join(';') || '';
        row[17] = e.description || '';
        row[18] = e.order != null ? e.order : '';
        eventRows.push(row);
    }
    const wsEvents = XLSX.utils.aoa_to_sheet(eventRows);
    XLSX.utils.book_append_sheet(wb, wsEvents, 'SUCESOS');

    // --- HITOS sheet ---
    // Columns: [0] Padre [1] Título [3] Tag1 [4] Tag2 [6] Ubicación [7-9] Fecha [10] Media [14] Descripción
    const milestones = events.filter(e => e.type === 'milestone');
    const milestoneHeaders = [
        'Padre', 'Título', '', 'Tag 1', 'Tag 2', '',
        'Ubicación',
        'Año', 'Mes', 'Día',
        'Media URL', '', '', '', 'Descripción', 'Orden'
    ];
    const milestoneRows = [milestoneHeaders];
    for (const e of milestones) {
        const s = getDateParts(e.start);
        const tags = e.tags || [];
        const row = [];
        row[0] = parentName(e);
        row[1] = e.title || '';
        row[3] = tags[0] || '';
        row[4] = tags[1] || '';
        row[6] = e.geo?.name || '';
        row[7] = s.year;
        row[8] = s.month;
        row[9] = s.day;
        row[10] = e.mediaUrls?.join(';') || '';
        row[14] = e.description || '';
        row[15] = e.order != null ? e.order : '';
        milestoneRows.push(row);
    }
    const wsMilestones = XLSX.utils.aoa_to_sheet(milestoneRows);
    XLSX.utils.book_append_sheet(wb, wsMilestones, 'HITOS');

    // Generate and download
    const fileName = `${timelineName || 'timeline'}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
