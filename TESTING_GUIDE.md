# Testing Guide - Photo Integration with GPT-4o Vision

## ✅ Pre-Implementation Checklist

Before deploying, ensure:
- [ ] OpenAI API key supports gpt-4o model
- [ ] Firebase Firestore is running
- [ ] Node.js server is running on port 3000
- [ ] All frontend files are loaded (index10.html, app.js, style10.css)
- [ ] Browser console has no errors

## 🧪 Step-by-Step Testing

### Phase 1: UI Validation

#### Test 1.1: Upload Button Appears
```
Action: Navigate to "Gjeneroni Ditar të Ri"
Expected: See "Ngarko Fotot nga Libri" button with icon
Status: [ ] Pass [ ] Fail
```

#### Test 1.2: File Input Works
```
Action: Click "Ngarko Fotot" button
Expected: File browser dialog opens
Status: [ ] Pass [ ] Fail
```

#### Test 1.3: Single Photo Upload
```
Action: Select 1 photo from device
Expected: 
- Preview appears in grid
- Counter shows "1/3 foto të ngarkuara"
- Photo can be hovered
Status: [ ] Pass [ ] Fail
```

#### Test 1.4: Multiple Photo Upload
```
Action: Select 2 more photos (total 3)
Expected:
- All 3 previews appear
- Counter shows "3/3 foto të ngarkuara"
- Upload button is still visible
Status: [ ] Pass [ ] Fail
```

#### Test 1.5: Photo Limit Enforced
```
Action: Try to upload 4th photo
Expected: Toast warning "Mund të ngarkohet maksimalisht 3 foto"
Status: [ ] Pass [ ] Fail
```

#### Test 1.6: Photo Removal
```
Action: Hover over photo → Click X button
Expected:
- Photo disappears from preview
- Counter decrements
Status: [ ] Pass [ ] Fail
```

### Phase 2: Form Validation

#### Test 2.1: Button Disabled (Empty Form)
```
Action: Empty form, no photos
Expected: "Gjenero" button is disabled
Status: [ ] Pass [ ] Fail
```

#### Test 2.2: Button Enabled (With Photos)
```
Action: Empty form, upload 1 photo
Expected: "Gjenero" button becomes enabled
Status: [ ] Pass [ ] Fail
```

#### Test 2.3: Button Enabled (Form Filled)
```
Action: Fill Lënda, Klasa, Tema (remove photos)
Expected: "Gjenero" button becomes enabled
Status: [ ] Pass [ ] Fail
```

#### Test 2.4: Button Enabled (Both)
```
Action: Fill form AND upload photos
Expected: "Gjenero" button is enabled
Status: [ ] Pass [ ] Fail
```

### Phase 3: Generation Without Photos

#### Test 3.1: Generate Without Photos
```
Pre-condition: User has ≥ 1 credit
Action: 
- Fill Lënda, Klasa, Tema (e.g., "Matematikë", "Klasa 5", "Thyesat")
- NO photos
- Click "Gjenero"

Expected:
- Loading indicator appears
- API processes quickly
- Result displays
- 1 credit deducted
- History saved
Status: [ ] Pass [ ] Fail
Notes: ________________
```

### Phase 4: Generation With Photos

#### Test 4.1: Generate With 1 Photo
```
Pre-condition: User has ≥ 1 credit
Action:
- Fill Lënda, Klasa, Tema
- Upload 1 photo from math textbook
- Click "Gjenero"

Expected:
- Loading indicator shows "📸 Processing photos..."
- API processes (may take longer due to vision)
- Result displays
- Photo content is referenced in output
- 1 credit deducted (not 2)
- History saved

Status: [ ] Pass [ ] Fail
Notes: ________________
```

#### Test 4.2: Generate With 3 Photos
```
Pre-condition: User has ≥ 1 credit
Action:
- Fill Lënda, Klasa, Tema
- Upload 3 photos
- Click "Gjenero"

Expected:
- All 3 photos processed
- Result incorporates info from all photos
- 1 credit deducted (not 3)
- No errors in console

Status: [ ] Pass [ ] Fail
Notes: ________________
```

### Phase 5: Credit System

#### Test 5.1: Credit Deduction (No Photos)
```
Pre-condition: User has 5 credits
Action: Generate 1 diary without photos
Expected: 
- Credits shown as 4 after generation
- Firestore user document shows credits: 4
- No errors in server logs

Status: [ ] Pass [ ] Fail
```

#### Test 5.2: Credit Deduction (With Photos)
```
Pre-condition: User has 5 credits
Action: Generate 1 diary with 3 photos
Expected:
- Credits shown as 4 after generation
- NOT 2, NOT 1 (only 1 deduction)
- Firestore user document shows credits: 4

Status: [ ] Pass [ ] Fail
```

#### Test 5.3: Insufficient Credits
```
Pre-condition: User has 0 credits
Action: Try to generate (with or without photos)
Expected:
- Generation fails
- Toast: "Kredite të pamjaftueshme"
- Redirects to "Blej Kredite" page

Status: [ ] Pass [ ] Fail
```

### Phase 6: Data Quality

#### Test 6.1: Output Quality Without Photos
```
Action: Generate for "Matematikë, Klasa 5, Thyesat"
Expected:
- Proper Albanian formatting
- All required sections present
- No broken placeholders
- Valid HTML structure

Status: [ ] Pass [ ] Fail
```

#### Test 6.2: Output Quality With Photos
```
Action: 
- Upload screenshot of textbook page with fractions
- Generate for "Matematikë, Klasa 5, Thyesat"

Expected:
- Specific info from photo appears in output
- E.g., if photo shows "1/2 + 1/3", this concept mentioned
- Natural Albanian language
- Coherent with photo content

Status: [ ] Pass [ ] Fail
Example from output: ________________
```

### Phase 7: Cross-Browser Testing

#### Test 7.1: Chrome/Edge
```
Browser: Chrome/Chromium-based
Action: Run tests 1.1-6.2
Expected: All pass
Status: [ ] Pass [ ] Fail
```

#### Test 7.2: Firefox
```
Browser: Firefox
Action: Run critical tests (1.3, 3.1, 4.1)
Expected: All pass
Status: [ ] Pass [ ] Fail
```

#### Test 7.3: Mobile (if applicable)
```
Browser: Mobile Chrome/Safari
Action: Run tests 1.1-1.6, 3.1, 4.1
Expected: 
- Touch-friendly
- No layout issues
- File upload works

Status: [ ] Pass [ ] Fail
```

### Phase 8: Error Scenarios

#### Test 8.1: Large Photos
```
Action: Upload 5MB+ image
Expected:
- Either compresses or shows error
- No browser crash
- Clear error message if fails

Status: [ ] Pass [ ] Fail
```

#### Test 8.2: Network Error During Generation
```
Action: 
- Start generation
- Disconnect internet (simulate)
Expected:
- Graceful error handling
- Toast with retry option
- No orphaned credits

Status: [ ] Pass [ ] Fail
```

#### Test 8.3: API Rate Limit
```
Action: Generate 10 items rapidly (with photos)
Expected:
- Rate limiting respected
- Clear error messages
- No doubled credits deduction

Status: [ ] Pass [ ] Fail
```

## 📋 Regression Testing

Run these after each code change:

```
[ ] Form submission works
[ ] Photos can be uploaded
[ ] Photos can be removed
[ ] Generation works without photos
[ ] Generation works with photos
[ ] Credits deduct correctly
[ ] History saves
[ ] Export to Word works
[ ] Dark/Light mode works
[ ] Responsive design maintained
```

## 🐛 Known Issues & Workarounds

### Issue: Photos not sending
**Symptom:** Generation starts but photo info not used  
**Cause:** Base64 not properly formatted  
**Workaround:** Check browser console → look for "📸 Processing" message

### Issue: Slow processing
**Symptom:** Generation takes >30 seconds with photos  
**Cause:** gpt-4o vision is slower than text-only  
**Workaround:** Expected behavior, show loading message

### Issue: Format mismatch
**Symptom:** Output doesn't match template  
**Cause:** Photo info conflicts with prompt  
**Workaround:** Improve system prompt in server.js

## 📊 Performance Metrics

Expected performance:
- Photo upload: < 1 second
- Preview rendering: Instant
- Generation without photos: 5-15 seconds
- Generation with 1 photo: 10-25 seconds
- Generation with 3 photos: 15-35 seconds

## 🔐 Security Checks

- [ ] Base64 conversion doesn't expose data
- [ ] Photos deleted from memory after generation
- [ ] No photos stored in logs
- [ ] Firestore security rules updated
- [ ] No API keys in client code
- [ ] ID tokens validated on backend

## 📝 Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | ________ | ________ | [ ] Approved |
| QA | ________ | ________ | [ ] Approved |
| PM | ________ | ________ | [ ] Approved |

## 🎉 Deployment Checklist

- [ ] All tests pass (Phase 1-8)
- [ ] No console errors
- [ ] Server logs clean
- [ ] Firestore quota sufficient
- [ ] OpenAI API healthy
- [ ] Backup created
- [ ] Users notified
- [ ] Documentation updated
