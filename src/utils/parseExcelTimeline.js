import { v4 as uuidv4 } from 'uuid';
import { createDateFromParts, generateRandomColor } from '../utils';

const cleanYear = (value) => {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return Math.round(value);
    const str = String(value).trim();
    const match = str.match(/-?\d+/);
    return match ? parseInt(match[0], 10) : null;
};

const cleanMonthDay = (value, defaultVal = 1) => {
    if (value == null || value === '') return defaultVal;
    const n = typeof value === 'number' ? Math.round(value) : parseInt(String(value).trim(), 10);
    return isNaN(n) ? defaultVal : n;
};

const parseTags = (...tagValues) => {
    const tags = [];
    for (const val of tagValues) {
        if (val == null || val === '') continue;
        const str = String(val).trim();
        const parenMatches = str.match(/\(([^)]+)\)/g);
        if (parenMatches) {
            for (const m of parenMatches) {
                const inner = m.slice(1, -1).trim();
                if (inner) tags.push(inner);
            }
        } else if (str) {
            tags.push(str);
        }
    }
    return tags;
};

/**
 * Parse an Excel workbook and return structured timeline events.
 * @param {object} workbook - XLSX workbook object (from XLSX.read)
 * @param {object} XLSX - The XLSX library module
 * @returns {{ timelineName: string, events: object[], summary: object }}
 */
export const parseExcelTimeline = (workbook, XLSX) => {
    const sheetNames = workbook.SheetNames;

    const findSheet = (keyword) => {
        const name = sheetNames.find(n => n.toUpperCase().includes(keyword.toUpperCase()));
        if (!name) return [];
        const sheet = workbook.Sheets[name];
        return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    };

    const areasRows = findSheet('AREAS');
    const epochRows = findSheet('EPOCA');
    const stageRows = findSheet('ETAPA');
    const eventRows = findSheet('SUCESOS');
    const milestoneRows = findSheet('HITOS');

    let timelineName = 'Timeline Importado';
    // Find the first data row (skip empty rows and header row)
    for (let i = 0; i < areasRows.length; i++) {
        const row = areasRows[i];
        const cellA = row[0] ? String(row[0]).trim().toUpperCase() : '';
        // Skip empty rows and the header row (contains "TEMAS" or "AREA")
        if (!cellA || cellA === 'TEMAS' || cellA.includes('AREA')) continue;
        if (row[1]) {
            timelineName = String(row[1]).trim();
        }
        break;
    }

    const events = [];
    const epochNameToId = {};
    const stageNameToId = {};
    const eventNameToId = {};

    // --- EPOCHS ---
    for (let i = 1; i < epochRows.length; i++) {
        const row = epochRows[i];
        const title = row[3] ? String(row[3]).trim() : '';
        if (!title) continue;

        const startYear = cleanYear(row[5]);
        if (startYear == null) continue;

        const startMonth = cleanMonthDay(row[6]);
        const startDay = cleanMonthDay(row[7]);
        const endYear = cleanYear(row[8]) ?? startYear;
        const endMonth = cleanMonthDay(row[9]);
        const endDay = cleanMonthDay(row[10]);

        const colorRaw = row[4] ? String(row[4]).trim() : '';
        const color = (colorRaw && colorRaw.toLowerCase() !== 'pendiente')
            ? colorRaw : generateRandomColor();

        const id = uuidv4();
        epochNameToId[title] = id;

        events.push({
            id,
            title,
            start: createDateFromParts(startYear, startMonth, startDay),
            end: createDateFromParts(endYear, endMonth, endDay),
            color,
            parentId: null,
            isParent: true,
            type: 'epoch',
            order: i - 1,
            isMilestone: false,
            description: row[15] ? String(row[15]).trim() : '',
            mediaUrls: row[11] ? String(row[11]).split(';').map(s => s.trim()).filter(Boolean) : [],
            tags: []
        });
    }

    // --- STAGES ---
    for (let i = 1; i < stageRows.length; i++) {
        const row = stageRows[i];
        const parentName = row[0] ? String(row[0]).trim() : '';
        const title = row[1] ? String(row[1]).trim() : '';
        if (!title) continue;

        const startYear = cleanYear(row[6]);
        if (startYear == null) continue;

        const startMonth = cleanMonthDay(row[7]);
        const startDay = cleanMonthDay(row[8]);
        const endYear = cleanYear(row[9]) ?? startYear;
        const endMonth = cleanMonthDay(row[10]);
        const endDay = cleanMonthDay(row[11]);

        const colorRaw = row[5] ? String(row[5]).trim() : '';
        const color = (colorRaw && colorRaw.toLowerCase() !== 'pendiente')
            ? colorRaw : undefined;

        const id = uuidv4();
        stageNameToId[title] = id;

        events.push({
            id,
            title,
            start: createDateFromParts(startYear, startMonth, startDay),
            end: createDateFromParts(endYear, endMonth, endDay),
            color,
            parentId: epochNameToId[parentName] || null,
            isParent: false,
            type: 'stage',
            order: i - 1,
            isMilestone: false,
            description: row[16] ? String(row[16]).trim() : '',
            mediaUrls: row[12] ? String(row[12]).split(';').map(s => s.trim()).filter(Boolean) : [],
            tags: parseTags(row[3], row[4])
        });
    }

    // --- EVENTS/SUCESOS ---
    for (let i = 1; i < eventRows.length; i++) {
        const row = eventRows[i];
        const parentName = row[0] ? String(row[0]).trim() : '';
        const title = row[1] ? String(row[1]).trim() : '';
        if (!title) continue;

        const startYear = cleanYear(row[7]);
        if (startYear == null) continue;

        const startMonth = cleanMonthDay(row[8]);
        const startDay = cleanMonthDay(row[9]);
        const endYear = cleanYear(row[10]) ?? startYear;
        const endMonth = cleanMonthDay(row[11]);
        const endDay = cleanMonthDay(row[12]);

        const colorRaw = row[5] ? String(row[5]).trim() : '';
        const color = (colorRaw && colorRaw.toLowerCase() !== 'pendiente')
            ? colorRaw : undefined;

        const locationName = row[6] ? String(row[6]).trim() : '';

        const id = uuidv4();
        eventNameToId[title] = id;

        const evt = {
            id,
            title,
            start: createDateFromParts(startYear, startMonth, startDay),
            end: createDateFromParts(endYear, endMonth, endDay),
            color,
            parentId: stageNameToId[parentName] || null,
            isParent: false,
            type: 'event',
            order: i - 1,
            isMilestone: false,
            description: row[17] ? String(row[17]).trim() : '',
            mediaUrls: row[13] ? String(row[13]).split(';').map(s => s.trim()).filter(Boolean) : [],
            tags: parseTags(row[3], row[4])
        };

        if (locationName) {
            evt.geo = { name: locationName, lat: '', lng: '' };
        }

        events.push(evt);
    }

    // --- MILESTONES/HITOS ---
    for (let i = 1; i < milestoneRows.length; i++) {
        const row = milestoneRows[i];
        const parentName = row[0] ? String(row[0]).trim() : '';
        const title = row[1] ? String(row[1]).trim() : '';
        if (!title) continue;

        const year = cleanYear(row[7]);
        if (year == null) continue;

        const month = cleanMonthDay(row[8]);
        const day = cleanMonthDay(row[9]);
        const date = createDateFromParts(year, month, day);

        const locationName = row[6] ? String(row[6]).trim() : '';

        const id = uuidv4();

        const evt = {
            id,
            title,
            start: date,
            end: date,
            color: undefined,
            parentId: eventNameToId[parentName] || null,
            isParent: false,
            type: 'milestone',
            order: i - 1,
            isMilestone: true,
            description: row[14] ? String(row[14]).trim() : '',
            mediaUrls: row[10] ? String(row[10]).split(';').map(s => s.trim()).filter(Boolean) : [],
            tags: parseTags(row[3], row[4])
        };

        if (locationName) {
            evt.geo = { name: locationName, lat: '', lng: '' };
        }

        events.push(evt);
    }

    const summary = {
        epochs: events.filter(e => e.type === 'epoch').length,
        stages: events.filter(e => e.type === 'stage').length,
        events: events.filter(e => e.type === 'event').length,
        milestones: events.filter(e => e.type === 'milestone').length
    };

    return { timelineName, events, summary };
};
