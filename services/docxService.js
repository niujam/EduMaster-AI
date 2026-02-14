const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const TEMPLATE_PATH = process.env.DOCX_TEMPLATE_PATH || path.join(__dirname, '..', 'shabllon.docx');

const TEMPLATE_PLACEHOLDERS = [
    '{{fusha}}',
    '{{lenda}}',
    '{{shkalla}}',
    '{{klasa}}',
    '{{tema1}}',
    '{{tema2}}',
    '{{tema_1}}',
    '{{tema_2}}',
    '{{situata}}',
    '{{fushat}}',
    '{{burimet}}',
    '{{rezultatet}}',
    '{{fjalet_kyce}}',
    '{{metodologjia}}',
    '{{lidhja_e_temes_me_njohurite_e_meparshme}}',
    '{{ndertimi_i_njohurive}}',
    '{{perforcimi_i_te_nxenit}}',
    '{{shenime_vleresuese}}',
    '{{detyra_shtepie}}'
];

function assertTemplateExists() {
    if (!fs.existsSync(TEMPLATE_PATH)) {
        throw new Error(`DOCX template not found at: ${TEMPLATE_PATH}`);
    }
}

function normalizeDocxData(payload) {
    const tema1 = payload.tema1 || payload.tema_1 || '';
    const tema2 = payload.tema2 || payload.tema_2 || '';
    const lidhja = payload.lidhja_e_temes_me_njohurite_e_meparshme
        || payload.lidhja_etemes_me_njohurite_e_meparshme
        || '';

    return {
        fusha: String(payload.fusha || ''),
        lenda: String(payload.lenda || ''),
        shkalla: String(payload.shkalla || ''),
        klasa: String(payload.klasa || ''),
        tema1: String(tema1),
        tema2: String(tema2),
        tema_1: String(tema1),
        tema_2: String(tema2),
        situata: String(payload.situata || ''),
        fushat: String(payload.fushat || ''),
        burimet: String(payload.burimet || ''),
        rezultatet: String(payload.rezultatet || ''),
        fjalet_kyce: String(payload.fjalet_kyce || ''),
        metodologjia: String(payload.metodologjia || ''),
        lidhja_e_temes_me_njohurite_e_meparshme: String(lidhja),
        lidhja_etemes_me_njohurite_e_meparshme: String(lidhja),
        ndertimi_i_njohurive: String(payload.ndertimi_i_njohurive || ''),
        perforcimi_i_te_nxenit: String(payload.perforcimi_i_te_nxenit || ''),
        shenime_vleresuese: String(payload.shenime_vleresuese || ''),
        detyra_shtepie: String(payload.detyra_shtepie || '')
    };
}

function renderDocxBuffer(diaryData) {
    assertTemplateExists();

    const content = fs.readFileSync(TEMPLATE_PATH, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
            start: '{{',
            end: '}}'
        },
        nullGetter: () => ''
    });

    const normalized = normalizeDocxData(diaryData);
    doc.render(normalized);

    return doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
    });
}

module.exports = {
    renderDocxBuffer,
    TEMPLATE_PLACEHOLDERS
};
