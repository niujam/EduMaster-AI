// ===================================
// Export to DOCX - PROFESSIONAL VERSION
// ===================================
// Përdor: docx.js library për DOCX të vërtetë
// Mbështet: Tabela komplekse, Forma, Vizatime, UTF-8

// ===================================
// Export Button Handler
// ===================================
exportBtn.addEventListener('click', async () => {
    try {
        showLoading(true);
        
        // Priority: window.currentDiary (new variable), then window.lastTemplateData, then generatedContent
        const templateData = window.currentDiary || window.lastTemplateData;
        const content = generatedContent.innerHTML;
        
        console.log('Export attempt - templateData:', templateData, 'content length:', content?.length);
        
        if (templateData && templateData.tema_1) {
            console.log('✅ Using templateData for export');
            await exportTemplateDocx(templateData);
        } else if (!content || content.trim() === '') {
            console.error('❌ No content found - templateData:', templateData, 'content:', content);
            showToast('Nuk ka përmbajtje për të eksportuar. Gjenerojeni ditarin fillimisht.', 'error');
            return;
        } else {
            console.log('✅ Using HTML content for export');
            // Fallback: export HTML content as DOC
            await exportHTMLContentAsDocx(content);
        }
        
        // Inkrementoj shkarkimet (nëse Firebase është available)
        try {
            if (currentUser && db) {
                await db.collection('users').doc(currentUser.uid).update({
                    totalDownloads: firebase.firestore.FieldValue.increment(1)
                });
                console.log('✅ Download count updated');
            }
        } catch (e) {
            console.warn('Could not update download count:', e);
        }
        
        showToast('Dokumenti u shkarkua!', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showToast('Gabim gjatë eksportimit. Provoni përsëri.', 'error');
    } finally {
        showLoading(false);
    }
});

// ===================================
// Export DOCX by filling template
// ===================================
function normalizeWordList(value, splitOnComma = false) {
    if (!value) return '';
    const raw = String(value);
    const parts = raw.includes('\n')
        ? raw.split(/\r?\n/)
        : (splitOnComma ? raw.split(/[,;]+/) : [raw]);
    return parts.map(part => part.trim()).filter(Boolean).join('\n');
}

function normalizeArrowList(value) {
    if (!value) return '';
    const raw = String(value);
    const parts = raw.includes('\n') ? raw.split(/\r?\n/) : raw.split(/[•➢]/);
    return parts.map(part => part.trim())
        .filter(Boolean)
        .map(line => {
            const cleaned = line.replace(/^[-–—•➢]\s*/, '');
            return (line.startsWith('➢') || line.startsWith('•')) ? line : `➢ ${cleaned}`;
        })
        .join('\n');
}

function normalizeParagraphs(value) {
    if (!value) return '';
    const raw = String(value);
    const parts = raw.split(/\r?\n/).map(part => part.trim()).filter(Boolean);
    return parts.join('\n\n');
}

function normalizeShenime(value) {
    if (!value) return '';
    const normalized = String(value)
        .replace(/\s*(N3:)/g, '\n$1')
        .replace(/\s*(N4:)/g, '\n$1');
    return normalizeArrowList(normalized);
}

function normalizeTemplateData(templateData) {
    const payload = { ...templateData };

    payload.fjalet_kyce = payload.fjalet_kyce || payload.fjalet_kyçe || '';
    payload.lidhja_e_temes_me_njohurite_e_meparshme = payload.lidhja_e_temes_me_njohurite_e_meparshme || payload.lidhja || '';
    payload.ndertimi_i_njohurive = payload.ndertimi_i_njohurive || payload.ndertimi || '';
    payload.perforcimi_i_te_nxenit = payload.perforcimi_i_te_nxenit || payload.perforcimi || '';
    payload.lidhja = payload.lidhja || payload.lidhja_e_temes_me_njohurite_e_meparshme || '';
    payload.ndertimi = payload.ndertimi || payload.ndertimi_i_njohurive || '';
    payload.perforcimi = payload.perforcimi || payload.perforcimi_i_te_nxenit || '';

    payload.burimet = normalizeWordList(payload.burimet, true);
    payload.metodologjia = normalizeWordList(payload.metodologjia, true);
    payload.rezultatet = normalizeArrowList(payload.rezultatet);
    payload.shenime_vleresuese = normalizeShenime(payload.shenime_vleresuese);
    payload.detyra_shtepie = '';
    payload.ndertimi = normalizeParagraphs(payload.ndertimi);
    payload.ndertimi_i_njohurive = normalizeParagraphs(payload.ndertimi_i_njohurive);
    payload.lidhja_e_temes_me_njohurite_e_meparshme = normalizeParagraphs(payload.lidhja_e_temes_me_njohurite_e_meparshme);
    payload.perforcimi_i_te_nxenit = normalizeParagraphs(payload.perforcimi_i_te_nxenit);

    const requiredKeys = [
        'fusha', 'lenda', 'shkalla', 'klasa', 'tema_1', 'tema_2',
        'situata', 'lidhja', 'burimet', 'rezultatet', 'fjalet_kyce',
        'metodologjia', 'lidhja_e_temes_me_njohurite_e_meparshme',
        'ndertimi_i_njohurive', 'perforcimi_i_te_nxenit',
        'shenime_vleresuese', 'detyra_shtepie'
    ];

    requiredKeys.forEach((key) => {
        if (payload[key] === undefined || payload[key] === null) {
            payload[key] = '';
        }
    });

    const missingKeys = requiredKeys.filter((key) => payload[key] === '');
    if (missingKeys.length) {
        console.warn('⚠️ Template placeholders missing data:', missingKeys);
    }

    return payload;
}

async function exportTemplateDocx(templateData) {
    const subject = document.getElementById('lenda')?.value || document.getElementById('fusha')?.value || 'Plani i Mësimit';
    const date = new Date().toISOString().split('T')[0];
    const token = currentUser && typeof currentUser.getIdToken === 'function' ? await currentUser.getIdToken() : null;
    const normalizedData = normalizeTemplateData(templateData);

    const response = await fetch(window.CONFIG.docx.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({ data: normalizedData })
    });

    if (!response.ok) {
        let errText = 'Gabim në eksportimin e shabllonit';
        try {
            const errJson = await response.json();
            if (errJson?.error) errText = errJson.error;
        } catch (e) {}
        throw new Error(errText);
    }

    const blob = await response.blob();
    const filename = sanitizeFilename(`Ditar_${subject}_${date}.docx`);
    saveAs(blob, filename);
}

// ===================================
// Export HTML Content as DOCX (SIMPLIFIED)
// ===================================
async function exportHTMLContentAsDocx(htmlContent) {
    try {
        const subject = document.getElementById('lenda')?.value || document.getElementById('fusha')?.value || 'Plani i Mësimit';
        const date = new Date().toISOString().split('T')[0];
        
        // Create a complete HTML document that preserves all formatting
        const fullHtml = `<!DOCTYPE html>
<html lang="sq">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plani i Mësimit - ${subject} - ${date}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
            margin: 20px;
            background-color: white;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        td, th {
            border: 1px solid #000;
            padding: 8px;
            vertical-align: top;
        }
        h1 {
            text-align: center;
            font-size: 14pt;
            margin-bottom: 10px;
        }
        .metadata {
            text-align: right;
            font-style: italic;
            margin-bottom: 10px;
        }
        .section-title {
            font-weight: bold;
            font-style: italic;
            margin-top: 10px;
            margin-bottom: 5px;
        }
        p {
            margin: 5px 0;
        }
        ul {
            margin: 5px 0;
            padding-left: 15px;
        }
        li {
            margin: 3px 0;
        }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
        
        // Create blob and download (as .doc which Word opens and converts)
        const blob = new Blob([fullHtml], { type: 'application/msword;charset=utf-8' });
        const filename = sanitizeFilename(`Ditar_${subject}_${date}.doc`);
        saveAs(blob, filename);
        
        console.log('✅ Document exported (opens in Word):', filename);
        
    } catch (error) {
        console.error('❌ Export error:', error);
        // Fallback: save as plain HTML
        try {
            const subject = document.getElementById('subject')?.value || 'Plani i Mësimit';
            const date = document.getElementById('lessonDate')?.value || new Date().toISOString().split('T')[0];
            const div = document.createElement('div');
            div.innerHTML = htmlContent;
            
            const fullHtml = `<!DOCTYPE html>
<html lang="sq">
<head>
    <meta charset="UTF-8">
    <title>Plani i Mësimit - ${subject}</title>
    <style>
        body { font-family: 'Times New Roman', serif; font-size: 11pt; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        td, th { border: 1px solid #000; padding: 8px; }
    </style>
</head>
<body>
${div.innerHTML}
</body>
</html>`;
            
            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
            const filename = `Ditar_${subject}_${date}.html`;
            saveAs(blob, filename);
            console.log('⚠️ Downloaded as HTML (fallback)');
        } catch (e) {
            console.error('❌ Fallback failed:', e);
            throw error;
        }
    }
}

// ===================================
// Generate Professional DOCX
// ===================================
async function generateProfessionalDocx() {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, 
            TextRun, AlignmentType, WidthType, BorderStyle, 
            VerticalAlign, ShadingType } = docx;
    
    // Merr të dhënat nga formulari
    const subject = document.getElementById('subject').value || 'Matematikë';
    const grade = document.getElementById('grade').value || 'Klasa 5';
    const topic = document.getElementById('topic').value || 'Tema';
    const competences = document.getElementById('competences').value || '';
    const duration = document.getElementById('duration').value || '45';
    const lessonDate = document.getElementById('lessonDate').value || new Date().toISOString().split('T')[0];
    
    // Krijon dokumentin
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1134,      // 2cm
                        right: 1134,
                        bottom: 1134,
                        left: 1134,
                    },
                },
            },
            children: [
                // Titulli kryesor
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: 'PLANIFIKIMI I ORËVE TË MËSIMIT',
                            bold: true,
                            font: 'Times New Roman',
                            size: 28, // 14pt
                        }),
                    ],
                    spacing: { after: 240 },
                }),
                
                // Data në të djathtë
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({
                            text: `Data ${lessonDate}`,
                            italics: true,
                            font: 'Times New Roman',
                            size: 22, // 11pt
                        }),
                    ],
                    spacing: { after: 200 },
                }),
                
                // TABELA 1: Informacioni bazë
                createInfoTable(subject, grade),
                
                // TABELA 2: Përmbajtja kryesore
                createMainContentTable(topic, competences, duration),
                
                // Seksioni: Lidhja me njohuritë e mëparshme
                createBorderedSection(
                    'Lidhja e temës me njohuritë e mëparshme:',
                    [
                        'Shënoj në tabelë disa ushtrime: 3² + 5² = ___ √(4² + 2²) = ___',
                        'Nxënësit punojnë individualisht. Diskutim i menjëhershëm i zgjidhjeve.',
                        'Sqaroj gabimet më tipike në veprime me rrënjën katrore.'
                    ]
                ),
                
                // Seksioni: Mësimi i njohurive
                createBorderedSection(
                    'Mësimi i njohurive:',
                    [
                        'Prezantoj emërtimin e këndevë që formohen në drejtëza paralele që priten nga një e tretë si dhe vetitë e tyre, si dhe këndin e brendshëm dhe të jashtëm të trekëndëshit dhe vetinë e tij: Masa e këndit të jashtëm është sa shuma e masave të dy këndevë të brendshme jo të bashkëmbështetur me të.',
                        'Nxënësit punojnë individualisht me disa nga ushtrimi që përcaktohen nga teksti.',
                        'Diskutojmë mbi zgjidhjet.'
                    ]
                ),
                
                // Seksioni: Përforcimi
                createBorderedSection(
                    'Përforcimi i nxënit:',
                    [
                        'Ftoj nxënësit të punojnë në dyshe me ushtrime me gjetjen e masave të këndevë në drejtëza dhe në trekëndësha e katërkëndësha. Monitoroj ecurinë e punës duke bërë edhe udhëzime në përdorimin e vetive të këndevë.',
                        'Diskutojmë dhe arsyetojmë mënyra të ndryshme zgjidheje.',
                        'Përmbledhim njohuritë e marra.'
                    ]
                ),
                
                // TABELA 3: Vlerësimi dhe Detyra
                createAssessmentTable(),
            ],
        }],
    });
    
    // Gjenero dhe shkarkoje
    const blob = await Packer.toBlob(doc);
    const filename = sanitizeFilename(`Ditar_${subject}_${lessonDate}.docx`);
    saveAs(blob, filename);
}

// ===================================
// Create Info Table (Tabela 1)
// ===================================
function createInfoTable(subject, grade) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, 
            WidthType, BorderStyle, AlignmentType } = docx;
    
    const borders = {
        top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    };
    
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            insideVertical: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 22, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({
                            children: [
                                new TextRun({ text: 'Fusha: ', bold: true, font: 'Times New Roman', size: 22 }),
                                new TextRun({ text: subject, font: 'Times New Roman', size: 22 }),
                            ],
                        })],
                        borders,
                    }),
                    new TableCell({
                        width: { size: 28, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({
                            children: [
                                new TextRun({ text: 'Lënda: ', bold: true, font: 'Times New Roman', size: 22 }),
                                new TextRun({ text: subject, font: 'Times New Roman', size: 22 }),
                            ],
                        })],
                        borders,
                    }),
                    new TableCell({
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({
                            children: [
                                new TextRun({ text: 'Shkalla: ', bold: true, font: 'Times New Roman', size: 22 }),
                                new TextRun({ text: grade, font: 'Times New Roman', size: 22 }),
                            ],
                        })],
                        borders,
                    }),
                    new TableCell({
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({
                            children: [
                                new TextRun({ text: 'Klasa: ', bold: true, font: 'Times New Roman', size: 22 }),
                                new TextRun({ text: grade, font: 'Times New Roman', size: 22 }),
                            ],
                        })],
                        borders,
                    }),
                ],
            }),
        ],
    });
}

// ===================================
// Create Main Content Table (Tabela 2)
// ===================================
function createMainContentTable(topic, competences, duration) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, 
            WidthType, BorderStyle, VerticalAlign, AlignmentType } = docx;
    
    const borders = {
        top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    };
    
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            insideVertical: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        },
        rows: [
            // Rreshti 1: Tema & Rezultatet (fillimi)
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.TOP,
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Tema 1: ', bold: true, italics: true, font: 'Times New Roman', size: 22 }),
                                    new TextRun({ text: 'Kontrolli i Njohurive të Mëparshme', font: 'Times New Roman', size: 22 }),
                                ],
                                spacing: { after: 80 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Tema 2: ', bold: true, italics: true, font: 'Times New Roman', size: 22 }),
                                    new TextRun({ text: 'Vetitë e këndevë të trekëndëshave dhe katërkëndëshave', font: 'Times New Roman', size: 22 }),
                                ],
                            }),
                        ],
                        borders,
                    }),
                    new TableCell({
                        width: { size: 60, type: WidthType.PERCENTAGE },
                        rowSpan: 3,  // Rezultatet zënë vetëm 3 rreshta
                        verticalAlign: VerticalAlign.TOP,
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Rezultatet e të nxënit të kompetencave: ', bold: true, italics: true, font: 'Times New Roman', size: 22 }),
                                    new TextRun({ text: 'Nxënësi:', font: 'Times New Roman', size: 22 }),
                                ],
                                spacing: { after: 80 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: '➢ Gjen masat e këndevë në drejtëza paralele', font: 'Times New Roman', size: 22 }),
                                ],
                                spacing: { after: 60 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: '➢ Identifikon këndin e brendshëm dhe të jashtëm të trekëndëshit', font: 'Times New Roman', size: 22 }),
                                ],
                                spacing: { after: 60 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: '➢ Përdor vetinë e këndit të jashtëm në llogaritje', font: 'Times New Roman', size: 22 }),
                                ],
                            }),
                        ],
                        borders,
                    }),
                ],
            }),
            // Rreshti 2: Situata (rezultatet vazhdojnë djathtas)
            new TableRow({
                children: [
                    new TableCell({
                        verticalAlign: VerticalAlign.TOP,
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Situata e parashikuar e të nxënit: ', bold: true, italics: true, font: 'Times New Roman', size: 22 }),
                                    new TextRun({ text: '[Përshkruani situatën konkrete mësimore]', font: 'Times New Roman', size: 22 }),
                                ],
                            }),
                        ],
                        borders,
                    }),
                ],
            }),
            // Rreshti 3: Lidhja me fusha (rezultatet vazhdojnë djathtas)
            new TableRow({
                children: [
                    new TableCell({
                        verticalAlign: VerticalAlign.TOP,
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Lidhja me fushat e tjera:', bold: true, italics: true, font: 'Times New Roman', size: 22 }),
                                ],
                                spacing: { after: 60 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: '[Shkenca të Natyrës, Gjuhë dhe komunikimi, etj.]', font: 'Times New Roman', size: 22 }),
                                ],
                            }),
                        ],
                        borders,
                    }),
                ],
            }),
            // Rreshti 4: Burimet | Fjalët kyçe
            new TableRow({
                children: [
                    new TableCell({
                        verticalAlign: VerticalAlign.TOP,
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Burimet e informacionit dhe mjetet:', bold: true, italics: true, font: 'Times New Roman', size: 22 }),
                                ],
                                spacing: { after: 60 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: '[Libri i nxënësit, fletore pune, materiale vizuale]', font: 'Times New Roman', size: 22 }),
                                ],
                            }),
                        ],
                        borders,
                    }),
                    new TableCell({
                        verticalAlign: VerticalAlign.TOP,
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Fjalët kyçe:', bold: true, italics: true, font: 'Times New Roman', size: 22 }),
                                ],
                                spacing: { after: 60 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: '[drejtëza, trekëndësh, katërkëndësha, këndi i brendshëm, këndi i jashtëm, etj.]', font: 'Times New Roman', size: 22 }),
                                ],
                            }),
                        ],
                        borders,
                    }),
                ],
            }),
            // Rreshti 5: Metodologjia
            new TableRow({
                children: [
                    new TableCell({
                        columnSpan: 2,
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Metodologjia dhe veprimtaritë e nxënësve:', bold: true, italics: true, font: 'Times New Roman', size: 24 }),
                                ],
                                spacing: { after: 80 },
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ text: 'Pyetje-përgjigje, Punë individuale, Punë dyshe, Diskutim', font: 'Times New Roman', size: 22 }),
                                ],
                            }),
                        ],
                        borders,
                    }),
                ],
            }),
        ],
    });
}

// ===================================
// Create Bordered Section
// ===================================
function createBorderedSection(title, paragraphs) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, 
            WidthType, BorderStyle } = docx;
    
    const borders = {
        top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
    };
    
    const children = [
        new Paragraph({
            children: [
                new TextRun({ text: '— ', font: 'Times New Roman', size: 22 }),
                new TextRun({ text: title, bold: true, italics: true, font: 'Times New Roman', size: 24 }),
            ],
            spacing: { after: 120 },
        }),
    ];
    
    paragraphs.forEach(text => {
        children.push(new Paragraph({
            children: [
                new TextRun({ text, font: 'Times New Roman', size: 22 }),
            ],
            spacing: { after: 80 },
        }));
    });
    
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders,
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        children,
                        borders,
                    }),
                ],
            }),
        ],
    });
}

// ===================================
// Create Assessment Table (Tabela 3)
// ===================================
function createAssessmentTable() {
    const { Table, TableRow, TableCell, Paragraph, TextRun, 
            WidthType, BorderStyle, VerticalAlign } = docx;
    
    const borders = {
        top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    };
    
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            insideVertical: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 65, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.TOP,
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Vlerësimi vlerësuese:', bold: true, italics: true, font: 'Edwardian Script ITC', size: 28 }),
                                ],
                                spacing: { after: 120 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'N2: ', bold: true, font: 'Times New Roman', size: 22 }),
                                    new TextRun({ text: 'Nxënësi kryen veprime me fuqinë katrore dhe rrënjën katrore. Përcakton këndin e brendshëm dhe të jashtëm të një trekëndëshi dhe katërkëndëshi', font: 'Times New Roman', size: 22 }),
                                ],
                                spacing: { after: 120 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'N3: ', bold: true, font: 'Times New Roman', size: 22 }),
                                    new TextRun({ text: 'Nxënësi njehson masat e këndevë që formohen në drejtëza paralele që priten nga një e tretë dhe kënde në trekëndësha dhe katërkëndësha', font: 'Times New Roman', size: 22 }),
                                ],
                                spacing: { after: 120 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'N4: ', bold: true, font: 'Times New Roman', size: 22 }),
                                    new TextRun({ text: 'Nxënësi përdor vetinë e këndit të jashtëm të një trekëndëshi për të gjetur masat e këndevë dhe njehson masat e këndevë të një katërkëndëshi duke arsyetuar hapat.', font: 'Times New Roman', size: 22 }),
                                ],
                            }),
                        ],
                        borders,
                    }),
                    new TableCell({
                        width: { size: 35, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.TOP,
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Detyra shtëpie:', bold: true, italics: true, font: 'Edwardian Script ITC', size: 28 }),
                                ],
                                spacing: { after: 120 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Ushtrimi 7 fq.123', font: 'Times New Roman', size: 22 }),
                                ],
                                spacing: { after: 80 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Ushtrimi 11 fq. 125', font: 'Times New Roman', size: 22 }),
                                ],
                            }),
                        ],
                        borders,
                    }),
                ],
            }),
        ],
    });
}

// ===================================
// Sanitize Filename
// ===================================
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

// ===================================
// Export History Item
// ===================================
async function exportHistoryItem(id) {
    const item = userHistory.find(h => h.id === id);
    if (!item) return;
    
    try {
        showLoading(true);
        
        // Export the saved content directly
        if (item.content) {
            await exportHTMLContentAsDocx(item.content);
            showToast('Dokumenti u shkarkua me sukses!', 'success');
        } else {
            showToast('Nuk ka përmbajtje për të eksportuar.', 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showToast('Gabim gjatë eksportimit.', 'error');
    } finally {
        showLoading(false);
    }
}

// ===================================
// Copy Functions
// ===================================
function copyAsPlainText() {
    const content = generatedContent.innerText;
    navigator.clipboard.writeText(content)
        .then(() => showToast('U kopjua!', 'success'))
        .catch(() => showToast('Gabim.', 'error'));
}

// ===================================
// Console Info
// ===================================
console.log('%c📄 EduMaster AI - Professional DOCX Export', 
    'color: #10a37f; font-size: 16px; font-weight: bold;');
console.log('%cPowered by: docx.js library', 
    'color: #666; font-size: 12px;');
console.log('%cSupports: Tables, Borders, UTF-8, Shapes, Full Editing', 
    'color: #0a8; font-size: 12px;');