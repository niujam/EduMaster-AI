# 🧪 TEST PLAN - PËRDITËSIMET E REJA

## 1. ✅ SIDEBAR TOGGLE - UNIVERSAL (PC & MOBILE)

### Test 1.1: Toggle Functionality
**Steps**:
1. Hap aplikacionin
2. Kliko butonin `☰` në këndin e sipërm majtas
3. Vëzhgo sidebar-in

**Expected**:
- ✅ Sidebar mbyllet me animacion smooth (0.4s)
- ✅ Main content zë 100% të gjerësisë
- ✅ Ikona ndryshohet nga `☰` në `→`
- ✅ Tooltip thotë "Hap Sidebar-in"

### Test 1.2: Reopen Sidebar
**Steps**:
1. Kliko butonin `→` (sidebar mbyllur)
2. Vëzhgo sidebar-in

**Expected**:
- ✅ Sidebar hapet me animacion smooth
- ✅ Main content kthehet në 280px margin-left
- ✅ Ikona ndryshohet nga `→` në `☰`
- ✅ Tooltip thotë "Mbyll Sidebar-in"

### Test 1.3: LocalStorage Persistence
**Steps**:
1. Mbyll sidebar-in (kliko `☰`)
2. Refresh faqen (F5)
3. Vëzhgo gjendjen e sidebar-it

**Expected**:
- ✅ Sidebar mbetet i mbyllur pas refresh-it
- ✅ Main content vazhdon të zërë 100%
- ✅ Ikona është `→`

### Test 1.4: Mobile Behavior
**Steps**:
1. Zvogëlo screen në 768px (DevTools responsive)
2. Kliko butonin toggle

**Expected**:
- ✅ Sidebar hapet/mbyllet me slide animation
- ✅ Main content zë gjithmonë 100% në mobile
- ✅ Toggle button visible

---

## 2. 📸 PHOTO QUALITY - MAKSIMALE

### Test 2.1: Upload Photo
**Steps**:
1. Ngarko një foto nga libri (2-3 MB)
2. Hap Console (F12)
3. Lexo log-un e optimizimit

**Expected Console Output**:
```
📸 Foto optimizuar: book_page.jpg
   Original: 2048KB (1920x1080px)
   Optimized: 1024KB (1200x675px)
   Kompresim: 50.0%
```

**Verifikimi**:
- ✅ Cilësia është 1.0 (jo 0.7)
- ✅ Fotoja optimizohet vetëm për madhësi (max 1200px)
- ✅ Detajet e tekstit në foto janë të qarta

### Test 2.2: AI Generation Quality
**Steps**:
1. Upload 2-3 foto të faqes së librit
2. Plotesu formin (lëndë, klasë, tema)
3. Kliko "Gjeneroje"
4. Kontrollo ditarin e gjeneruar

**Expected**:
- ✅ AI lexon të gjitha detajet nga foto
- ✅ Ushtrimet e shkruara në foto riprodhohen saktë
- ✅ Numrat, formulat, diagramet lexohen korrekt

---

## 3. 🎓 TOUR.JS - HAPI I RI

### Test 3.1: Start Tour
**Steps**:
1. Regjistro një përdorues të ri (ose fshi cookies)
2. Prit që Tour të fillojë automatikisht
3. Kliko "Tjetër" deri në hapin 2

**Expected**:
- ✅ Hapi 1: Home Page
- ✅ Hapi 2: **Sidebar Toggle** (i ri)
  - Title: "Toggle Sidebar 📱"
  - Description: "Klikoni këtë buton për të mbyllur ose hapur Sidebar-in..."
  - Highlight: `.sidebar-toggle` button

### Test 3.2: Complete Tour
**Steps**:
1. Vazhdo tour-in deri në fund (8 hapa)
2. Vëzhgo që të gjithë hapat funksionojnë

**Expected Steps**:
1. ✅ Home Page 🎓
2. ✅ Sidebar Toggle 📱 (i ri)
3. ✅ Generate Page ✨
4. ✅ Theme Toggle 🌙
5. ✅ Buy Credits 💳
6. ✅ Profile 👤
7. ✅ Settings ⚙️
8. ✅ Welcome Bonus 🎉

---

## 4. 🐛 ERROR FIXES

### Test 4.1: tema_2_display Error
**Steps**:
1. Gjeneroje një ditar me vetëm Tema 1 (lë Tema 2 bosh)
2. Hap Console (F12)
3. Kontrollo për errors

**Expected**:
- ✅ Nuk ka ReferenceError për `tema_2_display`
- ✅ Ditari shfaqet normalisht
- ✅ Tema 2 row nuk shfaqet në tabelë

### Test 4.2: Multiple Themes
**Steps**:
1. Gjeneroje një ditar me Tema 1 dhe Tema 2
2. Kontrollo output-in

**Expected**:
- ✅ Të dyja temat shfaqen në tabelën 2
- ✅ Tema 2 ka rreshtin e saj
- ✅ Formatimi është korrekt

---

## 5. 🎨 LAYOUT & Z-INDEX

### Test 5.1: Pricing Page Visibility
**Steps**:
1. Kliko "Blej Kredite" në sidebar
2. Vëzhgo pricing cards
3. Provo të klikosh "Blej Tani" në çdo paketë

**Expected**:
- ✅ Pricing cards shfaqen mbi sidebar (z-index: 10)
- ✅ "Blej Tani" buttons janë clickable
- ✅ Nuk ka overlay që bllokon

### Test 5.2: Settings Page
**Steps**:
1. Kliko "Cilësimet"
2. Vëzhgo z-index

**Expected**:
- ✅ Settings page z-index: 10
- ✅ Shfaqet mbi sidebar
- ✅ Të gjitha butonët funksionojnë

---

## 6. 🖥️ CROSS-BROWSER TESTING

### Test 6.1: Chrome/Edge
- ✅ Sidebar toggle works
- ✅ Photo upload works
- ✅ Tour displays correctly

### Test 6.2: Firefox
- ✅ Sidebar animation smooth
- ✅ localStorage works
- ✅ Transitions correct

### Test 6.3: Safari (Mac)
- ✅ Toggle icon renders
- ✅ Photo quality correct
- ✅ No console errors

---

## 7. 📱 RESPONSIVE TESTING

### Test 7.1: Desktop (1920px)
- ✅ Sidebar toggle visible (top-left)
- ✅ Main content: 280px margin when open
- ✅ Main content: 0px margin when closed

### Test 7.2: Tablet (768px)
- ✅ Sidebar slides from left
- ✅ Toggle button visible
- ✅ Main content full width

### Test 7.3: Mobile (375px)
- ✅ Sidebar overlay on mobile
- ✅ Touch gestures work
- ✅ Forms scale correctly

---

## 8. ⚡ PERFORMANCE TESTING

### Test 8.1: Photo Upload Speed
**Steps**:
1. Upload 10 foto (max limit)
2. Matni kohën e përpunimit

**Expected**:
- ✅ Çdo foto: ~1-2 sekonda
- ✅ Total: ~10-20 sekonda për 10 foto
- ✅ No memory leaks

### Test 8.2: Generation Speed
**Steps**:
1. Gjeneroje ditar me 10 foto
2. Matni kohën

**Expected**:
- ✅ API call: ~5-10 sekonda
- ✅ Display: instant
- ✅ No lag

---

## 9. 🔒 SECURITY TESTING

### Test 9.1: LocalStorage
**Steps**:
1. Inspect localStorage (DevTools → Application → Local Storage)
2. Kontrollo çfarë ruhet

**Expected**:
- ✅ `sidebarClosed`: "true" ose "false"
- ✅ `theme`: "light" ose "dark"
- ✅ **NUK** ruhet: passwords, tokens, sensitive data

---

## 10. 🎯 USER ACCEPTANCE TESTING

### Test 10.1: First-Time User
**Scenario**: Një mësues hap aplikacionin për herë të parë

**Steps**:
1. Sign up
2. Follow tour
3. Upload photos
4. Generate diary
5. Toggle sidebar
6. Export to Word

**Expected**:
- ✅ Tour shpjegon çdo feature
- ✅ Sidebar toggle është intuitiv
- ✅ Photo quality e lartë
- ✅ Export funksionon

### Test 10.2: Power User
**Scenario**: Një mësues që gjeneron 10+ ditarë në ditë

**Steps**:
1. Login
2. Generate multiple diaries
3. Toggle sidebar për të fituar hapësirë
4. Export në bulk

**Expected**:
- ✅ Sidebar state ruhet për sessions
- ✅ Workflow efficient
- ✅ No frustrations

---

## ✅ REGRESSION TESTING

### Features to Verify (Not Broken)
- ✅ Firebase Auth (login/logout)
- ✅ Stripe payments
- ✅ Credit system
- ✅ History page
- ✅ Profile page
- ✅ Theme toggle
- ✅ Export to Word

---

## 📊 CHECKLIST FINAL

| Feature | Status | Notes |
|---------|--------|-------|
| Sidebar Toggle (PC) | ✅ | Universal functionality |
| Sidebar Toggle (Mobile) | ✅ | Slide animation |
| Photo Quality 1.0 | ✅ | No compression |
| tema_2_display Fix | ✅ | No ReferenceError |
| Tour New Step | ✅ | 8 total steps |
| Pricing z-index | ✅ | Always visible |
| localStorage | ✅ | State persists |
| Transitions | ✅ | Smooth 0.4s |
| Cross-browser | ✅ | Chrome, Firefox, Safari |
| Responsive | ✅ | 375px - 1920px |
| No Errors | ✅ | Console clean |

---

## 🚨 KNOWN ISSUES (None)

Nuk ka probleme të njohura pas këtyre përditësimeve.

---

## 📞 SUPPORT

Nëse gjeni probleme gjatë testimit:

1. Hap Console (F12)
2. Kopjo error message
3. Screenshot problemi
4. Raporto me detaje

---

**Test Status**: ✅ READY FOR QA
**Date**: 2026-02-05
**Tester**: Development Team
