const { OpenAI } = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing in environment variables.');
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const DIARY_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'situata',
        'rezultatet',
        'fjalet_kyce',
        'metodologjia',
        'ndertimi_i_njohurive',
        'perforcimi_i_te_nxenit',
        'shenime_vleresuese'
    ],
    properties: {
        situata: { type: 'string' },
        rezultatet: { type: 'string' },
        fjalet_kyce: { type: 'string' },
        metodologjia: { type: 'string' },
        ndertimi_i_njohurive: { type: 'string' },
        perforcimi_i_te_nxenit: { type: 'string' },
        shenime_vleresuese: { type: 'string' }
    }
};

const SYSTEM_INSTRUCTION = [
    'Ti je mësues profesionist që gjeneron vetëm JSON sipas skemës.',
    'Nuk lejohet asnjë tekst jashtë JSON.',
    'Analizo fotot e librit dhe përdor vetëm informacionin që shihet aty.',
    'Mos gjenero: fusha, lenda, shkalla, klasa, tema_1, tema_2, detyra_shtepie.',
    'Kompetencat dhe shënimet vlerësuese shkruaji me simbolin ➢ për çdo rresht.'
].join(' ');

function normalizeDataUrl(image) {
    if (!image || typeof image !== 'string') return null;
    const trimmed = image.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:image/')) return trimmed;
    return `data:image/jpeg;base64,${trimmed}`;
}

function buildInput(prompt, imageUrls) {
    const imageParts = imageUrls
        .map(normalizeDataUrl)
        .filter(Boolean)
        .map((url) => ({ type: 'input_image', image_url: url }));

    return [
        {
            role: 'system',
            content: [{ type: 'input_text', text: SYSTEM_INSTRUCTION }]
        },
        {
            role: 'user',
            content: [
                { type: 'input_text', text: prompt },
                ...imageParts
            ]
        }
    ];
}

function normalizeOutput(parsed) {
    const output = { ...parsed };
    Object.keys(DIARY_SCHEMA.properties).forEach((key) => {
        if (typeof output[key] !== 'string') {
            output[key] = output[key] == null ? '' : String(output[key]);
        }
    });
    return output;
}

function extractParsedJson(response) {
    if (response?.output_parsed && typeof response.output_parsed === 'object') {
        return response.output_parsed;
    }

    const outputItems = Array.isArray(response?.output) ? response.output : [];
    for (const item of outputItems) {
        const contentItems = Array.isArray(item?.content) ? item.content : [];
        for (const content of contentItems) {
            if (content?.parsed && typeof content.parsed === 'object') {
                return content.parsed;
            }

            if (typeof content?.text === 'string' && content.text.trim()) {
                try {
                    const parsedFromText = JSON.parse(content.text);
                    if (parsedFromText && typeof parsedFromText === 'object') {
                        return parsedFromText;
                    }
                } catch (_) {
                }
            }
        }
    }

    return null;
}

async function generateStructuredDiary({ prompt, imageUrls, temperature = 0.2 }) {
    const response = await client.responses.create({
        model: 'gpt-4.1',
        temperature,
        input: buildInput(prompt, imageUrls),
        text: {
            format: {
                type: 'json_schema',
                name: 'ditar_mesuesi',
                schema: DIARY_SCHEMA,
                strict: true
            }
        }
    });

    const parsed = extractParsedJson(response);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('OpenAI returned no structured JSON in output_parsed.');
    }

    return normalizeOutput(parsed);
}

module.exports = {
    generateStructuredDiary,
    DIARY_SCHEMA
};
