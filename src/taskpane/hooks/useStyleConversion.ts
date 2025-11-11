// src/taskpane/hooks/useStyleConversion.ts
import * as React from "react";
import { CitationStyle } from "../types/fishchi";
import { apiConvertStyle } from "../services/api";
import {
  updateAllCitationsInDocument,
  removeBibliography,
  insertOrReplaceBibliography,
  getCitedSourceIds,
} from "../services/wordService";

interface UseStyleConversionReturn {
  convertStyle: (newStyle: CitationStyle) => Promise<void>;
  isConverting: boolean;
  conversionError: string | null;
}

export const useStyleConversion = (
  currentStyle: CitationStyle,
  citedSourceIds: Set<string>,
  setCitedSourceIds: React.Dispatch<React.SetStateAction<Set<string>>>,
  setSelectedStyle: React.Dispatch<React.SetStateAction<CitationStyle>>,
  setError: (error: string | null) => void
): UseStyleConversionReturn => {
  const [isConverting, setIsConverting] = React.useState(false);
  const [conversionError, setConversionError] = React.useState<string | null>(null);

  const convertStyle = React.useCallback(
    async (newStyle: CitationStyle) => {
      if (currentStyle === newStyle) {
        throw new Error("شیوه جدید با شیوه فعلی یکسان است");
      }

      if (citedSourceIds.size === 0) {
        throw new Error("هیچ استنادی در سند وجود ندارد");
      }

      setIsConverting(true);
      setConversionError(null);
      setError(null);

      try {
        console.log(`🔄 Starting style conversion: ${currentStyle} → ${newStyle}`);

        // Step 1: Call API to get converted citations
        const response = await apiConvertStyle({
          sourceIds: Array.from(citedSourceIds),
          currentStyle: currentStyle,
          newStyle: newStyle,
          lang: "fa-IR",
        });

        console.log("✅ API conversion response received:", response);

        // Step 2: Update all citations in document
        await updateAllCitationsInDocument(
          response.convertedCitations,
          newStyle
        );

        console.log("✅ All citations updated in document");

        // Step 3: Remove old bibliography
        await removeBibliography();
        console.log("✅ Old bibliography removed");

        // Step 4: Insert new bibliography
        await insertOrReplaceBibliography(
          response.bibliography,
          Array.from(citedSourceIds),
          newStyle
        );

        console.log("✅ New bibliography inserted");

        // Step 5: Update state
        setSelectedStyle(newStyle);

        console.log(`🎉 Style conversion complete: ${currentStyle} → ${newStyle}`);
      } catch (error: any) {
        console.error("❌ Style conversion failed:", error);
        const errorMessage = error.message || "خطا در تبدیل شیوه منبع‌نویسی";
        setConversionError(errorMessage);
        setError(errorMessage);
        throw error;
      } finally {
        setIsConverting(false);
      }
    },
    [currentStyle, citedSourceIds, setCitedSourceIds, setSelectedStyle, setError]
  );

  return {
    convertStyle,
    isConverting,
    conversionError,
  };
};