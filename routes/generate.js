const express = require('express');
const multer = require('multer');
const { generateStructuredDiary } = require('../services/openaiService');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 10,
        fileSize: 5 * 1024 * 1024,
        fieldSize: 12 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error(`Invalid file type for ${file.fieldname}. Only images are allowed.`));
        }
        cb(null, true);
    }
});

function parseBase64Photos(body) {
    const keys = ['photos', 'photos[]', 'contentPhotos'];
    const values = [];

    keys.forEach((key) => {
        const val = body[key];
        if (!val) return;
        if (Array.isArray(val)) {
            val.forEach((item) => {
                if (!item) return;
                if (typeof item === 'string') {
                    values.push(item);
                } else if (typeof item === 'object' && item.base64) {
                    values.push(item.base64);
                }
            });
            return;
        }
        if (typeof val === 'object' && val.base64) {
            values.push(val.base64);
            return;
        }
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((item) => {
                            if (!item) return;
                            if (typeof item === 'string') {
                                values.push(item);
                            } else if (typeof item === 'object' && item.base64) {
                                values.push(item.base64);
                            }
                        });
                    }
                    else values.push(trimmed);
                } catch (_) {
                    values.push(trimmed);
                }
            } else {
                values.push(trimmed);
            }
        }
    });

    return values.filter(Boolean);
}

function fileToDataUrl(file) {
    const mime = file.mimetype || 'image/jpeg';
    return `data:${mime};base64,${file.buffer.toString('base64')}`;
}

function buildPromptMinimal({ fusha, lenda, klasa, tema }) {
    return [
        'Gjenero VETEM JSON sipas skemes.',
        'Perdor vetem te dhenat nga fotot e librit.',
        `Kontekst form-data (mos i gjenero ne output): Fusha=${fusha || ''}, Lenda=${lenda || ''}, Klasa=${klasa || ''}`,
        `Tema: ${tema || ''}`,
        'Output duhet te kete vetem keto fusha: situata, rezultatet, fjalet_kyce, metodologjia, lidhja_etemes_me_njohurite_e_meparshme, ndertimi_i_njohurive, perforcimi_i_te_nxenit, shenime_vleresuese.',
        'metodologjia duhet te jete fiks: "Pyetje-pergjigje, Pune individuale, Pune dyshe, Diskutim".',
        'Kufij karakteresh: situata<=150, lidhja_etemes_me_njohurite_e_meparshme<=100, ndertimi_i_njohurive<=500, perforcimi_i_te_nxenit<=400, shenime_vleresuese<=150.',
        'Mos kthe asnje shpjegim. Vetem JSON.'
    ].join('\n');
}

const CHARACTER_LIMITS = {
    situata: 150,
    lidhja_etemes_me_njohurite_e_meparshme: 100,
    ndertimi_i_njohurive: 500,
    perforcimi_i_te_nxenit: 400,
    shenime_vleresuese: 150
};

const FIXED_METODOLOGJIA = 'Pyetje-pergjigje, Pune individuale, Pune dyshe, Diskutim';
const ALLOWED_AI_KEYS = [
    'situata',
    'rezultatet',
    'fjalet_kyce',
    'metodologjia',
    'lidhja_etemes_me_njohurite_e_meparshme',
    'ndertimi_i_njohurive',
    'perforcimi_i_te_nxenit',
    'shenime_vleresuese'
];

function clampText(value, max) {
    const text = String(value || '').trim();
    if (!max || text.length <= max) return text;
    return text.slice(0, max).trimEnd();
}

function applyCharacterLimits(aiData) {
    const output = {};
    ALLOWED_AI_KEYS.forEach((key) => {
        output[key] = String(aiData?.[key] || '');
    });
    output.metodologjia = FIXED_METODOLOGJIA;
    Object.entries(CHARACTER_LIMITS).forEach(([key, max]) => {
        output[key] = clampText(output[key], max);
    });
    return output;
}

function mergeWithFormData(aiData, req) {
    const formData = req.body?.formData && typeof req.body.formData === 'object'
        ? req.body.formData
        : req.body || {};

    const read = (name) => {
        const val = formData[name] ?? req.body?.[name];
        return typeof val === 'string' ? val.trim() : '';
    };

    const finalData = {
        ...aiData,
        fusha: read('fusha'),
        lenda: read('lenda'),
        shkalla: read('shkalla'),
        klasa: read('klasa'),
        tema1: read('tema_1') || read('tema') || read('topic'),
        tema2: read('tema_2') || '',
        detyra_shtepie: read('detyra_shtepie') || ''
    };

    finalData.metodologjia = FIXED_METODOLOGJIA;

    finalData.tema_1 = finalData.tema1;
    finalData.tema_2 = finalData.tema2;
    finalData.lidhja_e_temes_me_njohurite_e_meparshme = String(aiData.lidhja_etemes_me_njohurite_e_meparshme || '');
    finalData.fushat = String(read('fushat') || '');
    finalData.burimet = String(read('burimet') || '');

    return finalData;
}

function readField(req, key) {
    const direct = req.body?.[key];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();

    const nested = req.body?.formData?.[key];
    if (typeof nested === 'string' && nested.trim()) return nested.trim();

    return '';
}

function normalizeTema(req) {
    return readField(req, 'tema')
        || readField(req, 'topic')
        || readField(req, 'tema_1')
        || '';
}

function parseJsonPhotos(req) {
    const fromRoot = parseBase64Photos(req.body || {});
    const fromFormData = parseBase64Photos(req.body?.formData || {});
    return [...fromRoot, ...fromFormData];
}

function maybeMultipartUpload(req, res, next) {
    const contentType = req.headers['content-type'] || '';
    if (contentType.toLowerCase().includes('multipart/form-data')) {
        return upload.any()(req, res, next);
    }
    return next();
}

router.post('/', maybeMultipartUpload, async (req, res, next) => {
    try {
        const fusha = readField(req, 'fusha');
        const lenda = readField(req, 'lenda');
        const klasa = readField(req, 'klasa');
        const tema = normalizeTema(req);

        const uploadedImageUrls = (req.files || []).map(fileToDataUrl);
        const base64ImageUrls = parseJsonPhotos(req);
        const imageUrls = [...uploadedImageUrls, ...base64ImageUrls];

        if (!lenda || !tema) {
            return res.status(400).json({ error: 'Missing required fields: lenda, tema' });
        }

        if (imageUrls.length === 0) {
            return res.status(400).json({ error: 'At least one photo is required in photos[]' });
        }

        const prompt = (req.body?.prompt && String(req.body.prompt).trim())
            || buildPromptMinimal({ fusha, lenda, klasa, tema });

        const diaryJson = await generateStructuredDiary({
            prompt,
            imageUrls,
            temperature: 0.2
        });

        const limitedAiData = applyCharacterLimits(diaryJson);
        const mergedData = mergeWithFormData(limitedAiData, req);

        return res.status(200).json({
            content: mergedData,
            ai_content: limitedAiData
        });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
