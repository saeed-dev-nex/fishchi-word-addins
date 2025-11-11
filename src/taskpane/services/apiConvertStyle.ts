// server/src/controllers/styleConversion.controller.js
import asyncHandler from 'express-async-handler';
import Source from '../models/Source.model.js';
import ApiResponse from '../utils/apiResponse.js';
import { mapSourceToCSL } from '../utils/cslMapper.js';
import {
  formatCitations,
  formatBibliography,
  resetVancouverNumbering,
} from '../utils/citationEngine.js';

/**
 * @desc    Convert all citations in document to a new style
 * @route   POST /api/v1/export/convert-style
 * @access  Private
 */
export const convertCitationStyle = asyncHandler(async (req, res) => {
  try {
    console.log('=== CONVERT CITATION STYLE REQUEST ===');
    const { sourceIds, currentStyle, newStyle, lang = 'fa-IR' } = req.body;
    const userId = req.user._id;

    // Validation
    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, 'Source IDs array is required'));
    }

    if (!currentStyle || !newStyle) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, 'Current and new styles are required'));
    }

    if (currentStyle === newStyle) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, 'Current and new styles are the same'));
    }

    console.log(`Converting from ${currentStyle} to ${newStyle} for ${sourceIds.length} sources`);

    // Step 1: Fetch all sources
    const sources = await Source.find({
      _id: { $in: sourceIds },
      user: userId,
    });

    if (sources.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, 'No matching sources found'));
    }

    console.log(`Found ${sources.length} sources`);

    // Step 2: Map to CSL format
    const cslItems = sources.map((source) => {
      const cslItem = mapSourceToCSL(source);
      cslItem.id = source._id.toString();
      
      // Add language info
      if (
        source.language === 'persian' ||
        source.language === 'fa' ||
        source.language === 'fa-IR'
      ) {
        cslItem.language = 'fa-IR';
      } else {
        cslItem.language = 'en-US';
      }
      
      return cslItem;
    });

    // Step 3: Reset Vancouver numbering if converting TO Vancouver
    if (newStyle.toLowerCase() === 'vancouver') {
      resetVancouverNumbering();
      console.log('✅ Vancouver numbering reset for conversion');
    }

    // Step 4: Generate all citations in new style
    const convertedCitations = [];
    
    for (const sourceId of sourceIds) {
      try {
        const result = formatCitations(
          cslItems,
          newStyle,
          [sourceId],
          lang,
          { resetNumbering: false } // Don't reset between citations
        );
        
        convertedCitations.push({
          sourceId: sourceId,
          inText: result.inText,
        });
        
        console.log(`✅ Converted citation for ${sourceId}: ${result.inText}`);
      } catch (error) {
        console.error(`❌ Error converting source ${sourceId}:`, error);
        convertedCitations.push({
          sourceId: sourceId,
          inText: '[Error]',
          error: error.message,
        });
      }
    }

    // Step 5: Generate bibliography in new style
    const finalLang = lang === 'auto' ? detectLanguage(sources) : lang;
    
    const bibliographyHtml = formatBibliography(
      cslItems,
      newStyle,
      finalLang,
      { citationOrder: sourceIds }
    );

    console.log('✅ Bibliography generated successfully');

    // Step 6: Return conversion data
    const responseData = {
      convertedCitations: convertedCitations,
      bibliography: bibliographyHtml,
      newStyle: newStyle,
      totalConverted: convertedCitations.length,
      successCount: convertedCitations.filter(c => !c.error).length,
      errorCount: convertedCitations.filter(c => c.error).length,
    };

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          responseData,
          `Successfully converted ${responseData.successCount} citations to ${newStyle.toUpperCase()}`
        )
      );
  } catch (error) {
    console.error('❌ Unexpected error in convertCitationStyle:', error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, `Server error: ${error.message}`));
  }
});

/**
 * Helper: Detect primary language from sources
 */
function detectLanguage(sources) {
  const persianCount = sources.filter(
    (s) =>
      s.language === 'persian' ||
      s.language === 'fa' ||
      s.language === 'fa-IR'
  ).length;
  
  return persianCount > sources.length / 2 ? 'fa-IR' : 'en-US';
}

export default {
  convertCitationStyle,
};