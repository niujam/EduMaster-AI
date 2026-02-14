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
    const keys = ['photos', 'photos[]'];
    const values = [];

    keys.forEach((key) => {
        const val = body[key];
        if (!val) return;
        if (Array.isArray(val)) {
            values.push(...val);
            return;
        }
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) values.push(...parsed);
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

router.post('/', upload.any(), async (req, res, next) => {
    try {
        const fusha = (req.body.fusha || '').trim();
        const lenda = (req.body.lenda || '').trim();
        const klasa = (req.body.klasa || '').trim();
        const tema = (req.body.tema || '').trim();

        const uploadedImageUrls = (req.files || []).map(fileToDataUrl);
        const base64ImageUrls = parseBase64Photos(req.body);
        const imageUrls = [...uploadedImageUrls, ...base64ImageUrls];

        if (!lenda || !tema) {
            return res.status(400).json({ error: 'Missing required fields: lenda, tema' });
        }

        if (imageUrls.length === 0) {
            return res.status(400).json({ error: 'At least one photo is required in photos[]' });
        }

        const prompt = buildPromptMinimal({ fusha, lenda, klasa, tema });
        const diaryJson = await generateStructuredDiary({
            prompt,
            imageUrls,
            temperature: 0.2
        });

        return res.status(200).json(diaryJson);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
