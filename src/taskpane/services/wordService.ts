/* global Word */
const BIBLIOGRAPHY_CONTENT_CONTROL_TAG = "FISHCHI_BIBLIOGRAPHY_8991";
const CITATION_CONTENT_CONTROL_TAG = "FISHCHI_CITATION";

// Interface for citation tracking
interface CitationInfo {
  sourceId: string;
  style: string;
  inText: string;
  insertionOrder: number;
}

// Global citation tracking
let documentCitations: Map<string, CitationInfo> = new Map();
let citationCounter = 0;
let currentDocumentUrl: string | null = null;

/**
 * Inserts plain text at the user's current selection.
 * @param {string} text The text to insert.
 */
export const insertTextAtSelection = async (text: string) => {
  try {
    await Word.run(async (context) => {
      const range = context.document.getSelection();
      range.insertText(text, Word.InsertLocation.replace);
      await context.sync();
    });
  } catch (error) {
    console.error("Error inserting text into document:", error);
  }
};
/**
 * Inserts a footnote at the current selection.
 * Used for adding original author names on first translation.
 */
export const insertFootnote = async (text: string) => {
  try {
    await Word.run(async (context) => {
      const range = context.document.getSelection();
      const footnote = range.insertFootnote();
      footnote.body.insertText(text, Word.InsertLocation.start);
      await context.sync();
      console.log("✅ Footnote inserted successfully.");
    });
  } catch (error) {
    console.error("Error inserting footnote:", error);
    // Non-critical error, we can continue.
  }
};

/**
 * Checks if the document has changed and resets citation tracking if needed.
 * Call this on component mount to prevent citation tracking across documents.
 */
export const checkAndResetIfNewDocument = async (): Promise<void> => {
  try {
    await Word.run(async (context) => {
      const doc = context.document;
      // Note: document.url may not be available in all Office contexts
      // Using a workaround to get document identity
      const docProps = context.document.properties;
      context.load(docProps, "title");
      await context.sync();

      const docUrl = docProps.title || "unknown";

      if (currentDocumentUrl === null) {
        currentDocumentUrl = docUrl;
        console.log("Document URL initialized:", docUrl);
      } else if (currentDocumentUrl !== docUrl) {
        // Document changed - reset tracking
        console.log("Document changed, resetting citation tracking");
        clearCitationTracking();
        currentDocumentUrl = docUrl;
      }
    });
  } catch (error) {
    console.warn("Could not check document URL:", error);
  }
};

/**
 * Inserts HTML content at the user's current selection.
 * @param {string} html The HTML string to insert.
 */
export const insertHtmlAtSelection = async (html: string) => {
  try {
    await Word.run(async (context) => {
      const range = context.document.getSelection();
      range.insertHtml(html, Word.InsertLocation.replace);
      await context.sync();
    });
  } catch (error) {
    console.error("Error inserting HTML into document:", error);
  }
};

/**
 * Clears all citation tracking data
 */
export const clearCitationTracking = () => {
  documentCitations.clear();
  citationCounter = 0;
  currentDocumentUrl = null;
};

/**
 * Enhanced citation insertion with tracking and automatic bibliography update
 * @param sourceId - ID of the source to cite
 * @param style - Citation style (apa, vancouver, etc.)
 * @param inText - Formatted in-text citation
 * @param onBibliographyUpdate - Callback to update bibliography
 */
export const insertCitationWithTracking = async (
  sourceId: string,
  style: string,
  inText: string,
  onBibliographyUpdate: () => Promise<void>
) => {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();

      // Create citation info (used internally, but less critical now)
      citationCounter++;
      const citationInfo: CitationInfo = {
        sourceId,
        style,
        inText,
        insertionOrder: citationCounter,
      };

      // Insert the citation as a content control for tracking
      const citationRange = selection.insertText(inText, Word.InsertLocation.replace);
      const citationControl = citationRange.insertContentControl();
      // [FIX] We only rely on the tag to store the source ID.
      citationControl.tag = `${CITATION_CONTENT_CONTROL_TAG}_${sourceId}`;
      citationControl.title = `Citation: ${sourceId}`; // Title is helpful for debugging

      await context.sync();

      // Track the citation locally
      documentCitations.set(sourceId, citationInfo);
    });

    // [FIX for Problem 1]
    // ONLY after Word.run() is successful, call the update callback.
    // This callback (defined in MainWorkspace) will now have the *correct*,
    // *updated* list of citedSourceIds and will trigger the bibliography sync.
    await onBibliographyUpdate();
  } catch (error) {
    console.error("Error inserting citation with tracking:", error);
    throw error;
  }
};

/**
 * Removes a citation and updates the bibliography
 * @param sourceId - ID of the source to remove
 * @param onBibliographyUpdate - Callback to update bibliography
 */
export const removeCitation = async (
  sourceId: string,
  onBibliographyUpdate: () => Promise<void>
) => {
  try {
    await Word.run(async (context) => {
      // Find and remove the citation content control
      const controls = context.document.contentControls.getByTag(
        `${CITATION_CONTENT_CONTROL_TAG}_${sourceId}`
      );
      context.load(controls, "items");
      await context.sync();

      if (controls.items.length > 0) {
        // [FIX for Problem 4] Batch highlight paragraphs
        const parasToHighlight: Word.Paragraph[] = [];
        for (let i = 0; i < controls.items.length; i++) {
          const control = controls.items[i];
          const paraCollection = control.getRange("Content").paragraphs;
          // [FIX] Load 'items' AND 'font' for each item in the collection
          paraCollection.load("items/font");
          await context.sync(); // Load items AND fonts for this collection

          for (let j = 0; j < paraCollection.items.length; j++) {
            parasToHighlight.push(paraCollection.items[j]);
          }
        }

        // Now apply changes
        for (const para of parasToHighlight) {
          para.font.color = "Red";
        }

        // And delete all controls
        for (let i = 0; i < controls.items.length; i++) {
          controls.items[i].delete(false);
        }

        await context.sync();
        console.log(`✅ Removed all citations for source: ${sourceId} and highlighted paragraphs.`);
      } else {
        console.log(`⚠️ Citation control not found for source: ${sourceId}`);
      }

      // Remove from tracking
      documentCitations.delete(sourceId);
    });

    // Auto-update bibliography *after* Word.run()
    await onBibliographyUpdate();
  } catch (error) {
    console.error("Error removing citation:", error);
    throw error;
  }
};

/**
 * Renumbers Vancouver style citations in order of appearance
 */
const renumberVancouverCitations = async () => {
  try {
    await Word.run(async (context) => {
      // Find all citation content controls that match our pattern
      const allControls = context.document.contentControls;
      context.load(allControls, "items");
      await context.sync();

      const citationControls = [];
      for (const control of allControls.items) {
        context.load(control, ["tag", "text"]);
        await context.sync();

        if (control.tag && control.tag.startsWith(CITATION_CONTENT_CONTROL_TAG)) {
          citationControls.push(control);
        }
      }

      // Renumber citations sequentially
      for (let i = 0; i < citationControls.length; i++) {
        const newNumber = i + 1;
        const citation = citationControls[i];

        // Update the display text
        citation.clear();
        citation.insertText(`[${newNumber}]`, Word.InsertLocation.start);
      }

      await context.sync();
    });
  } catch (error) {
    console.error("Error renumbering Vancouver citations:", error);
  }
};

/**
 * Scans the document for existing citations and rebuilds tracking
 */
export const scanDocumentForCitations = async (): Promise<string[]> => {
  const foundSourceIds: string[] = [];

  try {
    await Word.run(async (context) => {
      // Find all citation content controls
      const allControls = context.document.contentControls;
      context.load(allControls, "items");
      await context.sync();

      documentCitations.clear();
      citationCounter = 0;

      for (const control of allControls.items) {
        // [FIX] Load only tag, title, and text.
        context.load(control, ["tag", "title", "text"]);
      }
      await context.sync();

      for (const control of allControls.items) {
        if (control.tag && control.tag.startsWith(CITATION_CONTENT_CONTROL_TAG)) {
          try {
            // [FIX] Reliably get source ID from tag.
            const sourceId = control.tag.replace(`${CITATION_CONTENT_CONTROL_TAG}_`, "");
            const inText = control.text;
            const style = "apa"; // Default, as we can't store it reliably

            const citationInfo: CitationInfo = {
              sourceId: sourceId,
              style: style,
              inText: inText || control.title || "",
              insertionOrder: citationCounter + 1,
            };

            // Use set to ensure we only have one entry per sourceId
            documentCitations.set(sourceId, citationInfo);
            foundSourceIds.push(sourceId);
            citationCounter++; // This counter is less critical now
          } catch (parseError) {
            console.warn("Could not parse citation context:", parseError);
          }
        }
      }
    });
  } catch (error) {
    console.error("Error scanning document for citations:", error);
  }

  // [FIX] Return unique IDs
  return Array.from(new Set(foundSourceIds));
};

/**
 * Gets all currently cited source IDs
 */
export const getCitedSourceIds = (): string[] => {
  return Array.from(documentCitations.keys());
};

/**
 * Scrolls to the bibliography section
 */
const scrollToBibliography = async () => {
  try {
    await Word.run(async (context) => {
      const controls = context.document.contentControls.getByTag(BIBLIOGRAPHY_CONTENT_CONTROL_TAG);
      context.load(controls, "items");
      await context.sync();

      if (controls.items.length > 0) {
        const bibControl = controls.items[0];
        context.load(bibControl, ["range"]);
        await context.sync();
        bibControl.select();
        await context.sync();
      }
    });
  } catch (error) {
    console.error("Error scrolling to bibliography:", error);
  }
};

/**
 * Inserts HTML and text after, with citation tracking
 * @param html - HTML content to insert
 * @param sourceId - Source ID for citation tracking
 * @param style - Citation style
 * @param inText - In-text citation
 * @param onBibliographyUpdate - Callback to update bibliography
 */
export const insertHtmlAndCitationAfter = async (
  html: string,
  sourceId: string,
  style: string,
  inText: string,
  onBibliographyUpdate: () => Promise<void>
) => {
  try {
    let citationControl: Word.ContentControl;
    await Word.run(async (context) => {
      const selection = context.document.getSelection();

      // Insert the HTML content first
      selection.insertHtml(html, Word.InsertLocation.replace);

      // Move to after the inserted content
      const rangeAfter = selection.getRange(Word.RangeLocation.after);

      // Add space and prepare for citation
      rangeAfter.insertText(" ", Word.InsertLocation.after);
      const citationRange = rangeAfter.getRange(Word.RangeLocation.after);

      // Insert citation text
      citationRange.insertText(inText, Word.InsertLocation.replace);

      // Wrap in content control
      citationControl = citationRange.insertContentControl();
      // [FIX] Only use tag and title
      citationControl.tag = `${CITATION_CONTENT_CONTROL_TAG}_${sourceId}`;
      citationControl.title = `Citation: ${sourceId}`;

      await context.sync();

      // Track the citation
      citationCounter++;
      documentCitations.set(sourceId, {
        sourceId,
        style,
        inText,
        insertionOrder: citationCounter,
      });
    });

    // [FIX for Problem 1] Call callback *after* Word.run()
    await onBibliographyUpdate();
  } catch (error) {
    console.error("Error inserting HTML and citation:", error);
    throw error;
  }
};

/**
 * Enhanced bibliography insertion with proper formatting and click handlers
 * @param html - Bibliography HTML content
 * @param citedSourceIds - Array of cited source IDs for ordering
 * @param style - Citation style for proper formatting
 */
export const insertOrReplaceBibliography = async (
  html: string,
  citedSourceIds: string[] = [],
  style: string = "apa"
) => {
  try {
    await Word.run(async (context) => {
      console.log("📚 [insertOrReplaceBibliography] Starting bibliography insertion");

      // Try to find existing bibliography
      const controls = context.document.contentControls.getByTag(BIBLIOGRAPHY_CONTENT_CONTROL_TAG);
      context.load(controls, "items");
      await context.sync();

      let bibliographyHtml = html;

      // For Vancouver style, ensure proper numbering matches in-text citations
      // if (style.toLowerCase() === "vancouver" && citedSourceIds.length > 0) {
      //   bibliographyHtml = await formatVancouverBibliography(html);
      // }

      if (controls.items.length > 0) {
        console.log("✅ [insertOrReplaceBibliography] Updating existing bibliography");
        // Update existing bibliography in place
        const bibControl = controls.items[0];
        bibControl.clear();
        bibControl.insertHtml(bibliographyHtml, Word.InsertLocation.start);
        await context.sync();
      } else {
        console.log("✅ [insertOrReplaceBibliography] Creating new bibliography at document end");

        // ALWAYS insert at the absolute end of the document
        // Get the end of the document body
        const endRange = context.document.body.getRange(Word.RangeLocation.end);

        // Insert a paragraph break first to ensure we're on a new line
        endRange.insertParagraph("", Word.InsertLocation.after);

        // Get the new end position after the paragraph
        const bibInsertPoint = context.document.body.getRange(Word.RangeLocation.end);

        // AdInsert hidden marker text for identification (not visible to user)
        const hiddenMarkerRange = bibInsertPoint.insertText(
          "فهرست منابع فیش چی",
          Word.InsertLocation.end
        );
        hiddenMarkerRange.font.hidden = true; // Make it hidden
        hiddenMarkerRange.font.size = 1; // Make it very small as backup

        // Add bibliography header (localized based on style)
        const headerText = style.toLowerCase() === "vancouver" ? "منابع" : "فهرست منابع";
        const headerRange = bibInsertPoint.insertText("\n" + headerText, Word.InsertLocation.end);
        headerRange.font.bold = true;
        headerRange.font.size = 14;

        // Insert another paragraph break after header
        headerRange.insertParagraph("", Word.InsertLocation.after);

        // Insert bibliography content at the very end
        const finalInsertPoint = context.document.body.getRange(Word.RangeLocation.end);
        const bibRange = finalInsertPoint.insertHtml(bibliographyHtml, Word.InsertLocation.end);

        // Wrap in content control for tracking and future updates
        const bibControl = bibRange.insertContentControl();
        bibControl.tag = BIBLIOGRAPHY_CONTENT_CONTROL_TAG;
        bibControl.title = "فهرست منابع فیشچی";
        // bibControl.appearance = "Tags"; // Show as tags, not bounding box
        bibControl.cannotDelete = false; // Allow manual deletion
        bibControl.cannotEdit = false; // Allow manual editing

        await context.sync();
        console.log("✅ [insertOrReplaceBibliography] Bibliography inserted successfully");
      }
    });

    // Sync citations with bibliography - remove citations for sources not in bibliography
    console.log("🔄 [insertOrReplaceBibliography] Syncing citations with bibliography");
    // const removedSourceIds = await syncCitationsWithBibliography(citedSourceIds);
    // if (removedSourceIds.length > 0) {
    //   console.log(
    //     `✅ [insertOrReplaceBibliography] Removed ${removedSourceIds.length} orphaned citations`
    //   );
    // }
  } catch (error) {
    console.error("❌ [insertOrReplaceBibliography] Error inserting bibliography:", error);
    throw error;
  }
};

/**
 * Safely removes only the bibliography without affecting citations
 */
export const removeBibliography = async (): Promise<void> => {
  try {
    await Word.run(async (context) => {
      console.log("🗑️ [removeBibliography] Removing bibliography");

      const controls = context.document.contentControls.getByTag(BIBLIOGRAPHY_CONTENT_CONTROL_TAG);
      context.load(controls, "items");
      await context.sync();

      if (controls.items.length > 0) {
        controls.items[0].delete(false);
        await context.sync();
        console.log("✅ [removeBibliography] Bibliography removed successfully");
      } else {
        console.log("⚠️ [removeBibliography] No bibliography found to remove");
      }
    });
  } catch (error) {
    console.error("❌ [removeBibliography] Error removing bibliography:", error);
    throw error;
  }
};

/**
 * Removes citations for sources that are not in the provided source IDs list
 * This is used to sync citations with bibliography when sources are removed
 * @param keepSourceIds - Array of source IDs that should be kept
 */
export const syncCitationsWithBibliography = async (keepSourceIds: string[]): Promise<string[]> => {
  const removedSourceIds: string[] = [];

  try {
    await Word.run(async (context) => {
      console.log("🔄 [syncCitationsWithBibliography] Syncing citations with bibliography");
      console.log("Keep sources:", keepSourceIds);

      const allControls = context.document.contentControls;
      context.load(allControls, "items");
      await context.sync();

      // [FIX for Problem 4] Efficiently batch load/modify
      const controlsToDelete: Word.ContentControl[] = [];
      const paraCollectionsToHighlight: Word.ParagraphCollection[] = [];

      // 1. Load all tags
      for (const control of allControls.items) {
        // [FIX] Load only the tag
        context.load(control, ["tag"]);
      }
      await context.sync();

      // 2. Identify controls to delete and *queue* their paragraphs for loading
      for (const control of allControls.items) {
        if (control.tag && control.tag.startsWith(CITATION_CONTENT_CONTROL_TAG)) {
          const sourceId = control.tag.replace(`${CITATION_CONTENT_CONTROL_TAG}_`, "");

          if (!keepSourceIds.includes(sourceId)) {
            console.log(`🗑️ Queuing removal for source: ${sourceId}`);
            // Get paragraph, load font, and add to lists
            const paraCollection = control.getRange("Content").paragraphs; // [FIX] Get paragraph collection

            // [FIX] Load 'items' AND 'font' for each item in the collection
            paraCollection.load("items/font");

            paraCollectionsToHighlight.push(paraCollection); // Add collection to list
            controlsToDelete.push(control); // Add control to list

            documentCitations.delete(sourceId);
            removedSourceIds.push(sourceId);
          }
        }
      }

      // 3. Execute all queued loads (fonts and items)
      await context.sync();

      // 4. Now that fonts/items are loaded, apply changes
      for (const paraCollection of paraCollectionsToHighlight) {
        for (let i = 0; i < paraCollection.items.length; i++) {
          paraCollection.items[i].font.color = "Red";
        }
      }
      for (const control of controlsToDelete) {
        control.delete(false);
      }

      // 5. Execute all changes
      await context.sync();
      console.log(
        `✅ [syncCitationsWithBibliography] Removed ${removedSourceIds.length} citations and highlighted paragraphs.`
      );
    });
  } catch (error) {
    console.error("❌ [syncCitationsWithBibliography] Error syncing citations:", error);
    throw error;
  }

  return removedSourceIds;
};

/**
 * Formats Vancouver bibliography with proper numbering
 */
const formatVancouverBibliography = async (html: string): Promise<string> => {
  try {
    // Simple regex-based numbering for Vancouver style
    const lines = html.split("\n");
    let counter = 1;

    const numberedLines = lines.map((line) => {
      if (line.includes("csl-entry")) {
        // Add numbering to bibliography entries
        const numberedLine = line.replace(
          /(<[^>]*csl-entry[^>]*>)(.*?)(<\/[^>]*>)/,
          `$1${counter}. $2$3`
        );
        counter++;
        return numberedLine;
      }
      return line;
    });

    return numberedLines.join("\n");
  } catch (error) {
    console.warn("Error formatting Vancouver bibliography, using original:", error);
    return html;
  }
};

/**
 * Gets citation statistics
 */
export const getCitationStats = () => {
  return {
    totalCitations: documentCitations.size,
    citationsByStyle: Array.from(documentCitations.values()).reduce(
      (acc, citation) => {
        acc[citation.style] = (acc[citation.style] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
};


/**
 * Updates all citations in document with new style
 * Used when converting citation styles
 */
export const updateAllCitationsInDocument = async (
  convertedCitations: Array<{
    sourceId: string;
    inText: string;
    error?: string;
  }>,
  newStyle: string
): Promise<void> => {
  try {
    await Word.run(async (context) => {
      console.log("🔄 Starting to update all citations in document");

      // Find all citation content controls
      const allControls = context.document.contentControls;
      context.load(allControls, "items");
      await context.sync();

      let updateCount = 0;
      let errorCount = 0;

      // Create a map for quick lookup
      const citationMap = new Map(convertedCitations.map((c) => [c.sourceId, c.inText]));

      // Update each citation
      for (const control of allControls.items) {
        context.load(control, ["tag", "text"]);
        await context.sync();

        if (control.tag && control.tag.startsWith(CITATION_CONTENT_CONTROL_TAG)) {
          try {
            // Extract source ID from tag
            const sourceId = control.tag.replace(`${CITATION_CONTENT_CONTROL_TAG}_`, "");

            // Get new in-text citation
            const newInText = citationMap.get(sourceId);

            if (newInText) {
              // Update the citation text
              control.clear();
              control.insertText(newInText, Word.InsertLocation.start);
              updateCount++;
              console.log(`✅ Updated citation for source ${sourceId}: ${newInText}`);
            } else {
              console.warn(`⚠️ No converted citation found for source ${sourceId}`);
              errorCount++;
            }
          } catch (error) {
            console.error("❌ Error updating citation:", error);
            errorCount++;
          }
        }
      }

      await context.sync();

      console.log(`🎉 Citation update complete: ${updateCount} updated, ${errorCount} errors`);
    });
  } catch (error) {
    console.error("❌ Error in updateAllCitationsInDocument:", error);
    throw error;
  }
};

/**
 * Gets all cited source IDs with their citation order
 * Useful for Vancouver numbering
 */
export const getCitedSourceIdsInOrder = async (): Promise<string[]> => {
  const sourceIds: string[] = [];

  try {
    await Word.run(async (context) => {
      // Get all paragraphs in document order
      const paragraphs = context.document.body.paragraphs;
      context.load(paragraphs, "items");
      await context.sync();

      // For each paragraph, check for citations
      for (const para of paragraphs.items) {
        const controls = para.contentControls;
        context.load(controls, "items");
        await context.sync();

        for (const control of controls.items) {
          context.load(control, ["tag"]);
          await context.sync();

          if (control.tag && control.tag.startsWith(CITATION_CONTENT_CONTROL_TAG)) {
            const sourceId = control.tag.replace(`${CITATION_CONTENT_CONTROL_TAG}_`, "");

            // Add only if not already in the list (to maintain first occurrence order)
            if (!sourceIds.includes(sourceId)) {
              sourceIds.push(sourceId);
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("Error getting cited source IDs in order:", error);
  }

  return sourceIds;
};

/**
 * Highlights all citations in document for visual feedback
 * Useful during conversion process
 */
export const highlightAllCitations = async (color: string = "Yellow"): Promise<void> => {
  try {
    await Word.run(async (context) => {
      const allControls = context.document.contentControls;
      context.load(allControls, "items");
      await context.sync();

      for (const control of allControls.items) {
        context.load(control, ["tag"]);
        await context.sync();

        if (control.tag && control.tag.startsWith(CITATION_CONTENT_CONTROL_TAG)) {
          const range = control.getRange("Content");
          range.font.highlightColor = color;
        }
      }

      await context.sync();
    });
  } catch (error) {
    console.error("Error highlighting citations:", error);
  }
};

/**
 * Removes highlight from all citations
 */
export const removeHighlightFromCitations = async (): Promise<void> => {
  try {
    await Word.run(async (context) => {
      const allControls = context.document.contentControls;
      context.load(allControls, "items");
      await context.sync();

      for (const control of allControls.items) {
        context.load(control, ["tag"]);
        await context.sync();

        if (control.tag && control.tag.startsWith(CITATION_CONTENT_CONTROL_TAG)) {
          const range = control.getRange("Content");
          range.font.highlightColor = null;
        }
      }

      await context.sync();
    });
  } catch (error) {
    console.error("Error removing citation highlights:", error);
  }
};
