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
        `Fusha: ${fusha || ''}`,
        `Lenda: ${lenda || ''}`,
        `Klasa: ${klasa || ''}`,
        `Tema: ${tema || ''}`,
        'Kompetencat dhe shenime_vleresuese me simbolin ➢ per çdo rresht.',
        'detyra_shtepie duhet te jete "".'
    ].join('\n');
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

        return res.status(200).json({ content: diaryJson });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
