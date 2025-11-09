import * as React from "react";
import { Source, CitationStyle } from "../types/fishchi";
import { apiFormatCitation, apiFormatBibliography, apiTranslateText } from "../services/api";
import {
  insertCitationWithTracking,
  insertOrReplaceBibliography,
  removeCitation,
  removeBibliography,
  clearCitationTracking,
  getCitedSourceIds,
  insertFootnote,
} from "../services/wordService";
import { BibLanguage } from "../types/fishchi";

interface UseCitationsReturn {
  citedSourceIds: Set<string>;
  setCitedSourceIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedStyle: CitationStyle;
  setSelectedStyle: React.Dispatch<React.SetStateAction<CitationStyle>>;
  bibLanguage: BibLanguage;
  setBibLanguage: React.Dispatch<React.SetStateAction<BibLanguage>>;
  autoUpdateBib: boolean;
  setAutoUpdateBib: React.Dispatch<React.SetStateAction<boolean>>;
  isInserting: string | null;
  isInsertingBib: boolean;
  translatedFootnotesAdded: Set<string>;
  setTranslatedFootnotesAdded: React.Dispatch<React.SetStateAction<Set<string>>>;
  insertCitation: (sourceId: string, shouldTranslate?: boolean) => Promise<void>;
  removeCitationHandler: (sourceId: string) => Promise<void>;
  insertBibliography: () => Promise<void>;
  clearAllCitations: () => Promise<void>;
  clearBibliography: () => Promise<void>;
  renumberVancouver: () => Promise<void>;
  updateBibliography: (overrideIds?: Set<string>) => Promise<void>;
}

export const useCitations = (
  sources: Source[],
  setError: (error: string | null) => void
): UseCitationsReturn => {
  const [citedSourceIds, setCitedSourceIds] = React.useState<Set<string>>(new Set());
  const [selectedStyle, setSelectedStyle] = React.useState<CitationStyle>("apa");
  const [bibLanguage, setBibLanguage] = React.useState<BibLanguage>("fa-IR");
  const [autoUpdateBib, setAutoUpdateBib] = React.useState(true);
  const [isInserting, setIsInserting] = React.useState<string | null>(null);
  const [isInsertingBib, setIsInsertingBib] = React.useState(false);
  const [translatedFootnotesAdded, setTranslatedFootnotesAdded] = React.useState<Set<string>>(
    new Set()
  );

  // Update bibliography function
  const updateBibliography = React.useCallback(
    async (overrideIds?: Set<string>) => {
      const idsToUse = overrideIds || citedSourceIds;
      if (!autoUpdateBib || idsToUse.size === 0) {
        if (autoUpdateBib && idsToUse.size === 0) {
          await removeBibliography();
        }
        return;
      }

      try {
        const citedSources = sources.filter((s) => citedSourceIds.has(s._id));
        const hasPersianSources = citedSources.some(
          (s) => s.language === "persian" || s.language === "fa" || s.language === "fa-IR"
        );

        const finalLang =
          hasPersianSources && bibLanguage === "fa-IR"
            ? "fa-IR"
            : !hasPersianSources && bibLanguage === "en-US"
              ? "en-US"
              : "auto";

        const bibHtml = await apiFormatBibliography(
          Array.from(idsToUse),
          selectedStyle,
          finalLang as "fa-IR" | "en-US" | "auto"
        );

        await insertOrReplaceBibliography(bibHtml, Array.from(idsToUse), selectedStyle);
      } catch (err: any) {
        console.error("Auto bibliography update failed:", err);
      }
    },
    [citedSourceIds, selectedStyle, bibLanguage, autoUpdateBib, sources]
  );

  // Insert citation handler
  const insertCitation = React.useCallback(
    async (sourceId: string, shouldTranslate: boolean = false) => {
      if (isInserting) return;

      const loadingKey = shouldTranslate ? `${sourceId}_translate` : sourceId;
      setIsInserting(loadingKey);
      setError(null);

      try {
        const source = sources.find((s) => s._id === sourceId);
        const formattedCitation = await apiFormatCitation({
          sourceId: sourceId,
          style: selectedStyle,
        });
        const originalInText = formattedCitation.inText;
        let inTextToInsert = originalInText;

        if (shouldTranslate && !translatedFootnotesAdded.has(sourceId)) {
          await insertFootnote(`${originalInText}.`);
          setTranslatedFootnotesAdded((prev) => new Set(prev).add(sourceId));
        }

        if (shouldTranslate) {
          inTextToInsert = await apiTranslateText(inTextToInsert, "Persian");
        }

        const newCitedIds = new Set(citedSourceIds).add(sourceId);
        setCitedSourceIds(newCitedIds);

        const onUpdate = () => updateBibliography(newCitedIds);

        await insertCitationWithTracking(sourceId, selectedStyle, inTextToInsert, onUpdate);
      } catch (err: any) {
        setError(err.message || "Failed to insert citation");
      } finally {
        setIsInserting(null);
      }
    },
    [
      isInserting,
      sources,
      selectedStyle,
      translatedFootnotesAdded,
      citedSourceIds,
      updateBibliography,
      setError,
    ]
  );

  // Remove citation handler
  const removeCitationHandler = React.useCallback(
    async (sourceId: string) => {
      if (isInserting) return;

      setIsInserting(sourceId);
      setError(null);
      try {
        const newCitedIds = new Set(citedSourceIds);
        newCitedIds.delete(sourceId);
        setCitedSourceIds(newCitedIds);

        const onUpdate = () => updateBibliography(newCitedIds);
        await removeCitation(sourceId, onUpdate);
      } catch (err: any) {
        setError(err.message || "Failed to remove citation");
      } finally {
        setIsInserting(null);
      }
    },
    [isInserting, citedSourceIds, updateBibliography, setError]
  );

  // Insert bibliography handler
  const insertBibliography = React.useCallback(async () => {
    if (citedSourceIds.size === 0) {
      setError("ابتدا باید حداقل یک منبع را درج کنید.");
      return;
    }
    setIsInsertingBib(true);
    setError(null);

    try {
      const citedSources = sources.filter((s) => citedSourceIds.has(s._id));
      const hasPersianSources = citedSources.some(
        (s) => s.language === "persian" || s.language === "fa" || s.language === "fa-IR"
      );

      const finalLang =
        hasPersianSources && bibLanguage === "fa-IR"
          ? "fa-IR"
          : !hasPersianSources && bibLanguage === "en-US"
            ? "en-US"
            : "auto";

      const bibHtml = await apiFormatBibliography(
        Array.from(citedSourceIds),
        selectedStyle,
        finalLang as "fa-IR" | "en-US" | "auto"
      );

      await insertOrReplaceBibliography(bibHtml, Array.from(citedSourceIds), selectedStyle);
    } catch (err: any) {
      setError(err.message || "Failed to create bibliography");
    } finally {
      setIsInsertingBib(false);
    }
  }, [citedSourceIds, sources, bibLanguage, selectedStyle, setError]);

  // Clear all citations handler
  const clearAllCitations = React.useCallback(async () => {
    setIsInserting("clear");
    setError(null);
    try {
      const onUpdate = () => updateBibliography(new Set());
      const idsToRemove = Array.from(citedSourceIds);

      for (const sourceId of idsToRemove) {
        await removeCitation(sourceId, () => Promise.resolve());
      }

      setCitedSourceIds(new Set());
      setTranslatedFootnotesAdded(new Set());
      clearCitationTracking();

      await onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to clear citations");
    } finally {
      setIsInserting(null);
    }
  }, [citedSourceIds, updateBibliography, setError]);

  // Clear bibliography handler
  const clearBibliography = React.useCallback(async () => {
    setIsInserting("clear-bib");
    setError(null);
    try {
      await removeBibliography();
    } catch (err: any) {
      setError(err.message || "Failed to clear bibliography");
    } finally {
      setIsInserting(null);
    }
  }, [setError]);

  // Renumber Vancouver handler
  const renumberVancouver = React.useCallback(async () => {
    if (selectedStyle.toLowerCase() !== "vancouver") return;
    setIsInserting("renumber");
    setError(null);
    try {
      const currentCitations = new Set(citedSourceIds);
      setCitedSourceIds(currentCitations);

      if (autoUpdateBib) {
        await updateBibliography(currentCitations);
      }
    } catch (err: any) {
      setError(err.message || "Failed to renumber citations");
    } finally {
      setIsInserting(null);
    }
  }, [selectedStyle, citedSourceIds, autoUpdateBib, updateBibliography, setError]);

  return {
    citedSourceIds,
    setCitedSourceIds,
    selectedStyle,
    setSelectedStyle,
    bibLanguage,
    setBibLanguage,
    autoUpdateBib,
    setAutoUpdateBib,
    isInserting,
    isInsertingBib,
    translatedFootnotesAdded,
    setTranslatedFootnotesAdded,
    insertCitation,
    removeCitationHandler,
    insertBibliography,
    clearAllCitations,
    clearBibliography,
    renumberVancouver,
    updateBibliography,
  };
};
