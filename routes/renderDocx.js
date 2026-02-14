const express = require('express');
const { renderDocxBuffer, TEMPLATE_PLACEHOLDERS } = require('../services/docxService');

const router = express.Router();

function buildFilename(lenda = 'ditar') {
    const safe = String(lenda)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'ditar';

    return `${safe}_${new Date().toISOString().split('T')[0]}.docx`;
}

router.post('/', async (req, res, next) => {
    try {
        const payload = req.body && typeof req.body === 'object'
            ? (req.body.data && typeof req.body.data === 'object'
                ? req.body.data
                : (req.body.content && typeof req.body.content === 'object' ? req.body.content : req.body))
            : null;

        if (!payload) {
            return res.status(400).json({
                error: 'Invalid payload. Send JSON object or { data: {...} }',
                template_placeholders: TEMPLATE_PLACEHOLDERS
            });
        }

        const docxBuffer = renderDocxBuffer(payload);
        const filename = buildFilename(payload.lenda || payload.fusha || 'ditar');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', docxBuffer.length);

        return res.status(200).send(docxBuffer);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
