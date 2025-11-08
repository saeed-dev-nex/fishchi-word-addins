# Enhanced Citation System Documentation

## Overview

This document describes the enhanced citation system implemented in the Fishchi Word Add-in and API. The system provides comprehensive citation management with automatic bibliography updates, Vancouver numbering support, and intelligent citation tracking.

## Key Features

### 1. Automatic Bibliography Management
- **Auto-Update**: Bibliography automatically updates when citations are added or removed
- **Smart Tracking**: Citations are tracked using Word Content Controls
- **Persistent Storage**: Citation information persists in the document

### 2. Vancouver Style Numbering
- **Sequential Numbering**: Citations are numbered in order of appearance
- **Automatic Renumbering**: When citations are added/removed, numbers update automatically
- **Click Navigation**: Click on citations to navigate to bibliography

### 3. Citation Tracking
- **Document Scanning**: Automatically detects existing citations when opening documents
- **Real-time Updates**: UI reflects current citation state
- **Cross-session Persistence**: Citations tracked across Word sessions

### 4. Enhanced User Experience
- **One-click Citation**: Insert citations with a single button click
- **Visual Feedback**: Loading states and progress indicators
- **Error Handling**: Comprehensive error messages and recovery

## Technical Implementation

### Word Add-in (Client Side)

#### Enhanced Word Service (`wordService.ts`)

```typescript
// Key Functions:
- insertCitationWithTracking(): Inserts citations with automatic tracking
- removeCitation(): Removes citations and updates bibliography
- scanDocumentForCitations(): Scans document for existing citations
- renumberVancouverCitations(): Renumbers Vancouver style citations
- insertOrReplaceBibliography(): Enhanced bibliography insertion
```

#### Citation Tracking System

**Content Control Tags:**
- Citations: `FISHCHI_CITATION_<sourceId>`
- Bibliography: `FISHCHI_BIBLIOGRAPHY_8991`

**Data Structure:**
```typescript
interface CitationInfo {
  sourceId: string;
  style: string;
  inText: string;
  insertionOrder: number;
}
```

### API Server (Backend)

#### Enhanced Citation Engine (`citationEngine.js`)

**New Features:**
- Vancouver numbering with global state management
- Citation ordering support
- Enhanced error handling and fallback formatting

**Key Functions:**
```javascript
formatCitations(cslItems, styleName, itemIdsToCite, lang, options)
formatBibliography(cslItems, styleName, lang, options)
resetVancouverNumbering()
getVancouverOrder()
setVancouverOrder(orderMap)
```

#### API Endpoints

**Citation Formatting:**
```
POST /api/v1/export/format-citation
Body: {
  sourceId: string,
  style: string,
  citationOrder?: string[],
  resetVancouverOrder?: boolean
}
```

**Bibliography Formatting:**
```
POST /api/v1/export/format-bibliography
Body: {
  sourceIds: string[],
  style: string,
  lang: string,
  citationOrder?: string[]
}
```

**Vancouver Numbering Management:**
```
POST /api/v1/export/manage-vancouver-numbering
Body: {
  action: 'reset' | 'get' | 'set',
  orderMap?: Record<string, number>
}
```

## Citation Workflows

### 1. Inserting Citations

**Process:**
1. User selects source and clicks "درج استناد"
2. System calls `apiFormatCitation()` to get formatted citation
3. `insertCitationWithTracking()` inserts citation with Content Control
4. Citation is tracked in `documentCitations` map
5. Bibliography automatically updates (if enabled)
6. For Vancouver style: citation gets sequential number

**Code Flow:**
```typescript
handleInsertCitation(sourceId) →
  apiFormatCitation({sourceId, style}) →
  insertCitationWithTracking(sourceId, style, inText, updateBibliography) →
  Word Content Control creation →
  Bibliography auto-update
```

### 2. Vancouver Numbering

**Numbering Logic:**
- Citations numbered sequentially (1, 2, 3...)
- Numbers assigned in order of insertion, not alphabetical
- When citation removed, all subsequent numbers shift down
- Bibliography entries numbered to match in-text citations

**Renumbering Process:**
1. Scan document for all citation Content Controls
2. Sort by document position
3. Assign new sequential numbers
4. Update both Content Control display and stored data
5. Regenerate bibliography with matching numbers

### 3. Bibliography Management

**Auto-Update Trigger:**
- Citation inserted → Bibliography updates
- Citation removed → Bibliography updates
- Citation style changed → Bibliography regenerates
- Language changed → Bibliography regenerates

**Manual Controls:**
- "درج کتاب‌نامه" - Insert/update bibliography manually
- "شماره‌گذاری مجدد" - Renumber Vancouver citations
- "پاک کردن همه" - Clear all citations from document
- Toggle: "به‌روزرسانی خودکار کتاب‌نامه"

### 4. Document Scanning

**On Document Load:**
1. `scanDocumentForCitations()` searches for existing citation Content Controls
2. Extracts citation information from Content Control context
3. Rebuilds `documentCitations` tracking map
4. Updates UI to show current citation count
5. Restores citation counter for new insertions

## Supported Citation Styles

### Currently Implemented:
- **APA**: American Psychological Association
- **MLA**: Modern Language Association
- **Vancouver**: Numbered citation system
- **Chicago**: Chicago Manual of Style
- **Harvard**: Harvard referencing system

### Style-Specific Features:

**Vancouver:**
- Sequential numbering [1], [2], [3]
- Automatic renumbering on insertion/removal
- Bibliography numbered to match
- Click-to-navigate functionality

**APA/MLA/Chicago/Harvard:**
- Author-date format: (Author, Year)
- Alphabetical bibliography sorting
- Standard academic formatting

## User Interface

### Citation Management Panel

**Controls:**
1. **درج کتاب‌نامه** (Insert Bibliography)
   - Inserts/updates bibliography at document end
   - Shows spinner during processing
   - Disabled when no citations present

2. **شماره‌گذاری مجدد** (Renumber - Vancouver only)
   - Renumbers Vancouver citations in document order
   - Only visible for Vancouver style
   - Updates both in-text and bibliography

3. **پاک کردن همه** (Clear All)
   - Removes all citations from document
   - Clears tracking data
   - Updates bibliography

4. **به‌روزرسانی خودکار کتاب‌نامه** (Auto-update Bibliography)
   - Toggle for automatic bibliography updates
   - Enabled by default
   - Provides manual control option

**Status Display:**
- Shows count of cited sources
- Loading indicators for all operations
- Error messages with specific details

### Source List Integration

**Per-Source Controls:**
- "درج استناد" button for each source
- Loading spinner during insertion
- Visual feedback for insertion state
- Tooltip explanations

## Error Handling

### Client-Side Errors:
- Network connectivity issues
- Word API failures
- Invalid citation data
- Document access problems

### Server-Side Errors:
- Source not found
- Authentication failures
- CSL mapping errors
- Citation formatting failures

### Fallback Mechanisms:
- Default citation format when formatting fails
- Manual bibliography generation option
- Graceful degradation for unsupported features

## Performance Optimizations

### Caching:
- Citation formatting results cached temporarily
- Document scanning results cached
- Bibliography regeneration debounced

### Batching:
- Multiple citation operations batched when possible
- Bibliography updates debounced to prevent excessive calls
- Vancouver renumbering optimized for bulk operations

### Memory Management:
- Citation tracking maps cleared on document close
- Content Control cleanup on citation removal
- Periodic garbage collection of unused data

## Testing Guidelines

### Unit Tests:
- Citation formatting with various styles
- Vancouver numbering logic
- Document scanning accuracy
- Error handling scenarios

### Integration Tests:
- End-to-end citation workflow
- Bibliography auto-update functionality
- Cross-browser compatibility
- Word version compatibility

### User Testing:
- Citation insertion workflow
- Vancouver renumbering accuracy
- Bibliography formatting quality
- Performance with large documents

## Troubleshooting

### Common Issues:

**Citations not updating:**
- Check auto-update toggle
- Verify Content Control integrity
- Scan document for corrupted citations

**Vancouver numbering incorrect:**
- Use "شماره‌گذاری مجدد" button
- Check citation order in document
- Verify no orphaned Content Controls

**Bibliography not appearing:**
- Check for existing bibliography Content Control
- Verify citation tracking data
- Try manual bibliography insertion

**Performance issues:**
- Reduce frequency of auto-updates
- Clear citation tracking periodically
- Check for large number of citations

### Debug Information:
- Browser console logs for client errors
- Server logs for API issues
- Word add-in logs for Content Control problems
- Network tab for API communication issues

## Future Enhancements

### Planned Features:
1. **Citation Editing**: Edit existing citations in-place
2. **Bulk Operations**: Multi-select citation management
3. **Style Customization**: User-defined citation styles
4. **Export Options**: Multiple bibliography formats
5. **Collaboration**: Multi-user citation tracking
6. **Advanced Search**: Citation-aware document search

### Technical Improvements:
1. **Performance**: Better caching and lazy loading
2. **Reliability**: Enhanced error recovery
3. **Accessibility**: Screen reader support
4. **Mobile**: Touch-friendly interface
5. **Offline**: Limited offline functionality

## Conclusion

The enhanced citation system provides a robust, user-friendly solution for academic writing in Word. With automatic bibliography management, intelligent Vancouver numbering, and comprehensive error handling, it significantly improves the research and writing workflow for users of the Fishchi platform.

For technical support or feature requests, please refer to the project's issue tracker or contact the development team.