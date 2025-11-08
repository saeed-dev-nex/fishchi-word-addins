# Persian Localization Implementation Guide

## Overview

This document describes the implementation of Persian localization for the Fishchi citation system, enabling proper formatting of citations and bibliographies in Persian academic style with appropriate terminology and connectors.

## Features Implemented

### 1. Language-Aware Citation Formatting
- Automatic detection of source language from database
- Persian terminology for academic connectors
- Proper handling of mixed-language bibliographies
- Source-level language detection and application

### 2. Persian Academic Terminology

#### Author Connectors
- **English**: "Author1 & Author2" → **Persian**: "Author1 و Author2"
- **English**: "Smith et al." → **Persian**: "Smith و همکاران"
- **English**: "Author1, Author2, and Author3" → **Persian**: "Author1، Author2، و Author3"

#### Academic Terms
- **English**: "pp. 123-145" → **Persian**: "صص. ۱۲۳-۱۴۵"
- **English**: "p. 25" → **Persian**: "ص. ۲۵"
- **English**: "Vol. 12, No. 3" → **Persian**: "جلد ۱۲، شماره ۳"
- **English**: "eds." → **Persian**: "ویراستاران"
- **English**: "ed." → **Persian**: "ویراستار"
- **English**: "n.d." → **Persian**: "بی‌تا"

#### Directional Terms
- **English**: "In" → **Persian**: "در"
- **English**: "Retrieved from" → **Persian**: "بازیابی از"
- **English**: "Available at" → **Persian**: "دسترس در"

### 3. Month Names
Complete Persian month name localization:
- January → ژانویه
- February → فوریه
- March → مارس
- April → آوریل
- May → می
- June → ژوئن
- July → ژوئیه
- August → اوت
- September → سپتامبر
- October → اکتبر
- November → نوامبر
- December → دسامبر

## Technical Implementation

### Server-Side (API)

#### Enhanced Citation Engine (`citationEngine.js`)

```javascript
// Persian localization mappings
const PERSIAN_LOCALIZATIONS = {
  and: "و",
  "et al.": "و همکاران",
  "et al": "و همکاران",
  "eds.": "ویراستاران",
  "ed.": "ویراستار",
  "pp.": "صص.",
  "p.": "ص.",
  "vol.": "جلد",
  "no.": "شماره",
  "n.d.": "بی‌تا",
  // ... more mappings
};

function localizeToPersian(text) {
  let localizedText = text;
  
  // Apply Persian localizations
  for (const [english, persian] of Object.entries(PERSIAN_LOCALIZATIONS)) {
    const regex = new RegExp(
      `\\b${english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi"
    );
    localizedText = localizedText.replace(regex, persian);
  }
  
  // Handle specific patterns
  localizedText = localizedText.replace(/\s+&\s+/g, " و ");
  localizedText = localizedText.replace(/,?\s*et\s+al\.?/gi, " و همکاران");
  
  return localizedText;
}
```

#### Language Detection Logic

```javascript
// In export.controller.js
let lang = "en-US";
if (
  source.language === "persian" ||
  source.language === "fa" ||
  source.language === "fa-IR"
) {
  lang = "fa-IR";
}
```

#### Auto Language Detection for Mixed Sources

```javascript
// If lang is auto, detect from sources
if (lang === "auto") {
  const persianSources = sources.filter(
    (s) => s.language === "persian" || 
           s.language === "fa" || 
           s.language === "fa-IR"
  );
  finalLang = persianSources.length > sources.length / 2 ? "fa-IR" : "en-US";
}
```

### Client-Side (Word Add-in)

#### Language-Aware Bibliography Updates

```typescript
// MainWorkspace.tsx
const updateBibliography = React.useCallback(async () => {
  if (!autoUpdateBib || citedSourceIds.size === 0) return;

  try {
    // Detect Persian sources
    const citedSources = sources.filter((s) => citedSourceIds.has(s._id));
    const hasPersianSources = citedSources.some(
      (s) => s.language === "persian" || 
             s.language === "fa" || 
             s.language === "fa-IR"
    );

    // Use appropriate language
    const finalLang =
      hasPersianSources && bibLanguage === "fa-IR"
        ? "fa-IR"
        : !hasPersianSources && bibLanguage === "en-US"
          ? "en-US"
          : "auto";

    const bibHtml = await apiFormatBibliography(
      Array.from(citedSourceIds),
      selectedStyle,
      finalLang
    );
    
    await insertOrReplaceBibliography(
      bibHtml, 
      Array.from(citedSourceIds), 
      selectedStyle
    );
  } catch (err: any) {
    console.warn("Auto bibliography update failed:", err.message);
  }
}, [citedSourceIds, selectedStyle, bibLanguage, autoUpdateBib, sources]);
```

#### Enhanced Source Interface

```typescript
// types/fishchi.ts
export interface Source {
  _id: string;
  project: string;
  user: string;
  type: string;
  title: string;
  authors: { firstname?: string; lastname: string }[];
  year?: string;
  publisher?: string;
  language?: string; // Added for localization support
  createdAt: string;
  updatedAt: string;
}
```

## Usage Examples

### 1. Persian Source Citation

**Input Source**:
```json
{
  "title": "مقاله آزمایشی فارسی",
  "authors": [
    {"firstname": "محمد", "lastname": "احمدی"},
    {"firstname": "علی", "lastname": "محمدی"}
  ],
  "year": "1402",
  "language": "persian"
}
```

**APA Citation Output**:
```
In-text: (احمدی و محمدی، 1402)
Bibliography: احمدی، محمد و محمدی، علی. (1402). مقاله آزمایشی فارسی.
```

### 2. English Source with Persian Localization

**Input Source**:
```json
{
  "title": "Research Methods in Social Sciences",
  "authors": [
    {"firstname": "John", "lastname": "Smith"},
    {"firstname": "Jane", "lastname": "Doe"},
    {"firstname": "Bob", "lastname": "Johnson"}
  ],
  "year": "2023",
  "language": "english"
}
```

**Persian Localized Citation**:
```
In-text: (Smith و همکاران، 2023)
Bibliography: Smith، John، Doe، Jane، و Johnson، Bob. (2023). Research Methods in Social Sciences.
```

### 3. Mixed Language Bibliography

**Sources**: 2 Persian + 1 English
**Language Setting**: Auto-detect
**Result**: Persian localization applied to all entries

## Configuration Options

### 1. Bibliography Language Settings

```typescript
type BibLanguage = "fa-IR" | "en-US" | "auto";

// User can select:
// - "fa-IR": Force Persian localization
// - "en-US": Force English formatting
// - "auto": Auto-detect based on source languages
```

### 2. Numeral Conversion (Optional)

```javascript
// Can be configured to convert English numerals to Persian
function shouldConvertToPersianNumerals() {
  // Currently disabled for international compatibility
  return false;
}
```

## Testing

### Test Persian Localization

```bash
# Run Persian localization tests
node test-persian-localization.js
```

### Test Cases Covered

1. **Single Persian Source**: Proper Persian terminology
2. **Single English Source**: Standard English formatting
3. **Mixed Sources with Persian Locale**: Persian localization applied
4. **Mixed Sources with English Locale**: English formatting maintained
5. **Auto-detection**: Majority language determines formatting
6. **Vancouver Numbering**: Persian localization with sequential numbering

## Error Handling

### 1. Language Detection Fallback

```javascript
// If source language is undefined or unrecognized
if (!source.language || !["persian", "fa", "fa-IR", "english", "en", "en-US"].includes(source.language)) {
  // Fallback to English
  lang = "en-US";
}
```

### 2. Localization Failure Recovery

```javascript
try {
  localizedText = localizeToPersian(originalText);
} catch (error) {
  console.warn("Persian localization failed, using original text:", error);
  localizedText = originalText;
}
```

### 3. CSL Mapping Protection

```javascript
try {
  const cslItem = mapSourceToCSL(source);
  cslItem.language = source.language === "persian" ? "fa-IR" : "en-US";
} catch (mappingError) {
  console.error(`CSL mapping failed for source ${source._id}:`, mappingError);
  // Continue with next source instead of failing entire bibliography
}
```

## Performance Considerations

### 1. Localization Caching

```javascript
// Cache localized strings to avoid repeated processing
const localizationCache = new Map();

function cachedLocalizeToPersian(text) {
  if (localizationCache.has(text)) {
    return localizationCache.get(text);
  }
  
  const localized = localizeToPersian(text);
  localizationCache.set(text, localized);
  return localized;
}
```

### 2. Language Detection Optimization

```javascript
// Pre-compute language statistics for bibliographies
function analyzeSourceLanguages(sources) {
  const languageCount = sources.reduce((acc, source) => {
    const lang = detectSourceLanguage(source);
    acc[lang] = (acc[lang] || 0) + 1;
    return acc;
  }, {});
  
  return {
    majorityLanguage: Object.keys(languageCount).reduce((a, b) => 
      languageCount[a] > languageCount[b] ? a : b
    ),
    distribution: languageCount
  };
}
```

## Future Enhancements

### 1. Additional Persian Academic Terms
- Research methodology terms
- Statistical terms
- Field-specific terminology

### 2. Persian Calendar Support
- Hijri Shamsi date formatting
- Persian month names in citations

### 3. RTL Text Direction
- Proper RTL formatting for Persian text
- Mixed LTR/RTL handling

### 4. Advanced Persian Typography
- Persian punctuation rules
- Proper Persian number formatting
- Persian quotation marks

## Troubleshooting

### Common Issues

1. **Persian Terms Not Appearing**
   - Check source `language` field
   - Verify API language parameter
   - Check localization function calls

2. **Mixed Language Bibliography Incorrect**
   - Verify auto-detection logic
   - Check source language distribution
   - Test with explicit language setting

3. **Citation Format Not Persian**
   - Ensure source language is set to "persian", "fa", or "fa-IR"
   - Check citation engine Persian flag
   - Verify localization mappings

### Debug Information

```javascript
// Enable detailed logging
console.log("Source language:", source.language);
console.log("Detected API language:", lang);
console.log("Final bibliography language:", finalLang);
console.log("Persian localization applied:", isPersian);
```

This implementation provides comprehensive Persian localization support for the Fishchi citation system, ensuring proper academic formatting for Persian sources while maintaining compatibility with international citation standards.