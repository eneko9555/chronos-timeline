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
    const epochs = events.filter(e => e.type === 'epoch');
    const epochHeaders = [
        '', '', '', 'Título', 'Color',
        'Año Inicio', 'Mes Inicio', 'Día Inicio',
        'Año Fin', 'Mes Fin', 'Día Fin',
        'Media URL', '', '', '', 'Descripción'
    ];
    const epochRows = [epochHeaders];
    for (const e of epochs) {
        const s = getDateParts(e.start);
        const end = getDateParts(e.end);
        const row = [];
        row[0] = '';
        row[1] = '';
        row[2] = '';
        row[3] = e.title || '';
        row[4] = e.color || '';
        row[5] = s.year;
        row[6] = s.month;
        row[7] = s.day;
        row[8] = end.year;
        row[9] = end.month;
        row[10] = end.day;
        row[11] = e.mediaUrl || '';
        row[12] = '';
        row[13] = '';
        row[14] = '';
        row[15] = e.description || '';
        epochRows.push(row);
    }
    const wsEpochs = XLSX.utils.aoa_to_sheet(epochRows);
    XLSX.utils.book_append_sheet(wb, wsEpochs, 'EPOCA');

    // --- ETAPA sheet ---
    const stages = events.filter(e => e.type === 'stage');
    const stageHeaders = [
        'Época Padre', 'Título', '', 'Tag 1', 'Tag 2', 'Color',
        'Año Inicio', 'Mes Inicio', 'Día Inicio',
        'Año Fin', 'Mes Fin', 'Día Fin',
        'Media URL', '', '', '', 'Descripción'
    ];
    const stageRows = [stageHeaders];
    for (const e of stages) {
        const s = getDateParts(e.start);
        const end = getDateParts(e.end);
        const tags = e.tags || [];
        const row = [];
        row[0] = parentName(e);
        row[1] = e.title || '';
        row[2] = '';
        row[3] = tags[0] || '';
        row[4] = tags[1] || '';
        row[5] = e.color || '';
        row[6] = s.year;
        row[7] = s.month;
        row[8] = s.day;
        row[9] = end.year;
        row[10] = end.month;
        row[11] = end.day;
        row[12] = e.mediaUrl || '';
        row[13] = '';
        row[14] = '';
        row[15] = '';
        row[16] = e.description || '';
        stageRows.push(row);
    }
    const wsStages = XLSX.utils.aoa_to_sheet(stageRows);
    XLSX.utils.book_append_sheet(wb, wsStages, 'ETAPA');

    // --- SUCESOS sheet ---
    const evts = events.filter(e => e.type === 'event');
    const eventHeaders = [
        'Etapa Padre', 'Título', '', 'Tag 1', 'Tag 2', 'Color',
        'Ubicación',
        'Año Inicio', 'Mes Inicio', 'Día Inicio',
        'Año Fin', 'Mes Fin', 'Día Fin',
        'Media URL', '', '', '', 'Descripción'
    ];
    const eventRows = [eventHeaders];
    for (const e of evts) {
        const s = getDateParts(e.start);
        const end = getDateParts(e.end);
        const tags = e.tags || [];
        const row = [];
        row[0] = parentName(e);
        row[1] = e.title || '';
        row[2] = '';
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
        row[13] = e.mediaUrl || '';
        row[14] = '';
        row[15] = '';
        row[16] = '';
        row[17] = e.description || '';
        eventRows.push(row);
    }
    const wsEvents = XLSX.utils.aoa_to_sheet(eventRows);
    XLSX.utils.book_append_sheet(wb, wsEvents, 'SUCESOS');

    // --- HITOS sheet ---
    const milestones = events.filter(e => e.type === 'milestone');
    const milestoneHeaders = [
        'Suceso Padre', 'Título', '', 'Tag 1', 'Tag 2', '',
        'Ubicación',
        'Año', 'Mes', 'Día',
        'Media URL', '', '', '', 'Descripción'
    ];
    const milestoneRows = [milestoneHeaders];
    for (const e of milestones) {
        const s = getDateParts(e.start);
        const tags = e.tags || [];
        const row = [];
        row[0] = parentName(e);
        row[1] = e.title || '';
        row[2] = '';
        row[3] = tags[0] || '';
        row[4] = tags[1] || '';
        row[5] = '';
        row[6] = e.geo?.name || '';
        row[7] = s.year;
        row[8] = s.month;
        row[9] = s.day;
        row[10] = e.mediaUrl || '';
        row[11] = '';
        row[12] = '';
        row[13] = '';
        row[14] = e.description || '';
        milestoneRows.push(row);
    }
    const wsMilestones = XLSX.utils.aoa_to_sheet(milestoneRows);
    XLSX.utils.book_append_sheet(wb, wsMilestones, 'HITOS');

    // Generate and download
    const fileName = `${timelineName || 'timeline'}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
