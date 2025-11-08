// --- IMPORTS ---
import * as React from "react";
import {
  Dropdown,
  Option,
  Spinner,
  Text,
  Tab,
  TabList,
  SearchBox,
  makeStyles,
  shorthands,
  Avatar,
  Button,
  Card,
  Badge,
  tokens,
  Label,
  TabValue,
} from "@fluentui/react-components";
// [NEW] Import Refresh icon for the new refresh button
import { ArrowSyncFilled } from "@fluentui/react-icons";
import { Project, Source, Note, UserProfile, CitationStyle } from "../types/fishchi";
import {
  apiGetProjects,
  apiGetSourcesByProject,
  apiGetNotesBySource,
  apiFormatCitation,
  apiFormatBibliography,
  apiTranslateText, // API for translation
} from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import {
  insertTextAtSelection,
  insertCitationWithTracking,
  insertHtmlAndCitationAfter,
  insertOrReplaceBibliography,
  removeCitation,
  removeBibliography,
  scanDocumentForCitations,
  getCitedSourceIds,
  clearCitationTracking,
  checkAndResetIfNewDocument,
  syncCitationsWithBibliography,
  insertFootnote,
} from "../services/wordService";

// --- STYLES ---
// Define modern styles using Fluent UI's makeStyles
const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("16px"),
    ...shorthands.padding("16px"),
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    ...shorthands.padding("16px"),
    ...shorthands.borderRadius("12px"),
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    ...shorthands.gap("12px"),
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("12px"),
    flexGrow: 1, // Allows user info to take available space
  },
  userName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#242424",
  },
  headerButtons: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("8px"),
  },
  logoutButton: {
    minWidth: "80px",
  },
  controlsCard: {
    backgroundColor: "#ffffff",
    ...shorthands.padding("16px"),
    ...shorthands.borderRadius("12px"),
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("12px"),
  },
  dropdown: {
    width: "100%",
    "& > button": {
      backgroundColor: "#ffffff !important",
      ...shorthands.border("1px", "solid", "#d1d1d1"),
      ...shorthands.borderRadius("8px"),
      minHeight: "40px",
      "&:hover": {
        backgroundColor: "#f5f5f5 !important",
        ...shorthands.borderColor("#0078d4"),
      },
      "&:focus": {
        ...shorthands.borderColor("#0078d4"),
      },
    },
    "& button span": {
      color: "#242424 !important",
      fontSize: "14px",
      fontWeight: "500",
    },
    "& [role='combobox']": {
      color: "#242424 !important",
    },
    "& .fui-Dropdown__button": {
      color: "#242424 !important",
    },
  },
  option: {
    color: "#242424 !important",
    fontSize: "14px",
    fontWeight: "500",
  },
  optionSelected: {
    color: "#0078d4 !important",
    fontSize: "14px",
    fontWeight: "500",
  },
  searchBox: {
    width: "100%",
    "& input": {
      ...shorthands.borderRadius("8px"),
      fontSize: "14px",
    },
  },
  tabsContainer: {
    backgroundColor: "#ffffff",
    ...shorthands.padding("12px", "16px"),
    ...shorthands.borderRadius("12px"),
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
  },
  tabList: {
    "& button": {
      fontWeight: "600",
      fontSize: "14px",
    },
  },
  contentCard: {
    backgroundColor: "#ffffff",
    ...shorthands.borderRadius("12px"),
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    ...shorthands.overflow("hidden"),
    flexGrow: 1, // Takes remaining vertical space
  },
  list: {
    maxHeight: "400px", // Define a max height for scrolling
    overflowY: "auto",
    ...shorthands.padding("8px"),
    "&::-webkit-scrollbar": {
      width: "8px",
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "#f1f1f1",
      ...shorthands.borderRadius("4px"),
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "#c1c1c1",
      ...shorthands.borderRadius("4px"),
      "&:hover": {
        backgroundColor: "#a1a1a1",
      },
    },
  },
  listItem: {
    ...shorthands.padding("12px", "16px"),
    ...shorthands.margin("4px", "0"),
    ...shorthands.borderRadius("8px"),
    cursor: "pointer",
    backgroundColor: "#ffffff",
    ...shorthands.border("1px", "solid", "#e1e1e1"),
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#f0f6ff",
      ...shorthands.borderColor("#0078d4"),
      boxShadow: "0 2px 6px rgba(0, 120, 212, 0.15)",
      transform: "translateY(-1px)",
    },
  },
  selectedListItem: {
    backgroundColor: "#e6f2ff",
    ...shorthands.borderColor("#0078d4"),
    boxShadow: "0 2px 6px rgba(0, 120, 212, 0.2)",
  },
  sourceTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#242424",
    marginBottom: "4px",
    display: "block",
    lineHeight: "1.4",
  },
  sourceMetadata: {
    fontSize: "13px",
    color: "#605e5c",
    lineHeight: "1.3",
  },
  noteContent: {
    fontSize: "14px",
    color: "#323130",
    lineHeight: "1.6",
    "& p": {
      margin: "0 0 8px 0",
    },
    "& strong": {
      fontWeight: "600",
      color: "#242424",
    },
  },
  emptyState: {
    ...shorthands.padding("40px", "20px"),
    textAlign: "center",
    color: "#605e5c",
    fontSize: "14px",
  },
  emptyStateIcon: {
    fontSize: "48px",
    marginBottom: "12px",
    opacity: 0.3,
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    ...shorthands.padding("40px"),
  },
  errorContainer: {
    backgroundColor: "#fef0f1",
    ...shorthands.border("1px", "solid", "#f1707b"),
    ...shorthands.borderRadius("8px"),
    ...shorthands.padding("16px"),
    color: "#d13438",
    fontSize: "14px",
  },
  notesBadge: {
    marginLeft: "6px",
  },
  sectionLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#605e5c",
    marginBottom: "4px",
    display: "block",
  },
});

// --- COMPONENT PROPS ---
interface MainWorkspaceProps {
  user: UserProfile; // The authenticated user's profile
}

// [NEW] Define a constant for our virtual project ID.
// This string is used to identify the "Unassigned Sources" option.
const UNASSIGNED_PROJECT_ID = "___UNASSIGNED___";

// --- COMPONENT DEFINITION ---
export const MainWorkspace: React.FC<MainWorkspaceProps> = ({ user }) => {
  // --- HOOKS ---
  const styles = useStyles();
  const { logout } = useAuth();

  // --- STATE MANAGEMENT ---

  // Loading States
  // [MODIFIED] Set initial isLoading to false, as per user's file.
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false); // Tracks subsequent data refreshes
  const [error, setError] = React.useState<string | null>(null); // Holds API or runtime error messages

  // Data States
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [sources, setSources] = React.useState<Source[]>([]);
  const [notes, setNotes] = React.useState<Note[]>([]);

  // Selection States
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(null);
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("sources");

  // Citation & Bibliography States
  const [citedSourceIds, setCitedSourceIds] = React.useState<Set<string>>(new Set());
  const [isInsertingBib, setIsInsertingBib] = React.useState(false);
  const [autoUpdateBib, setAutoUpdateBib] = React.useState(true);
  const [selectedStyle, setSelectedStyle] = React.useState<CitationStyle>("apa");
  const [isInserting, setIsInserting] = React.useState<string | null>(null);
  type BibLanguage = "fa-IR" | "en-US";
  const [bibLanguage, setBibLanguage] = React.useState<BibLanguage>("fa-IR");
  const [translatedFootnotesAdded, setTranslatedFootnotesAdded] = React.useState<Set<string>>(
    new Set()
  );

  // --- CONSTANTS ---

  //  Memoized virtual project object to prevent infinite re-renders
  const unassignedProject: Project = React.useMemo(
    () => ({
      _id: UNASSIGNED_PROJECT_ID,
      title: "📚 منابع بدون پروژه", // Add an icon for clarity
      user: user._id, // User ID is still needed for type consistency
      sources: [], // This is just for type consistency
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [user._id] // Only recreate if user._id changes
  );

  // --- DATA FETCHING ---

  //  Memoized function to fetch all projects.
  const fetchProjects = React.useCallback(async () => {
    // setIsRefreshing(true); // This was in my version, but not in user's file
    setError(null);
    try {
      const fetchedProjects = await apiGetProjects();

      // [NEW] Add the unassigned project to the *start* of the list
      setProjects([unassignedProject, ...fetchedProjects]);

      // Use functional setState to avoid dependency on selectedProjectId
      setSelectedProjectId((currentProjectId) => {
        if (!currentProjectId || !fetchedProjects.find((p) => p._id === currentProjectId)) {
          if (fetchedProjects.length > 0) {
            return fetchedProjects[0]._id;
          } else {
            return unassignedProject._id;
          }
        }
        return currentProjectId;
      });

      const existingCitations = await scanDocumentForCitations();
      setCitedSourceIds(new Set(existingCitations));
    } catch (err: any) {
      setError(err.message || "خطا در دریافت پروژه‌ها");
    } finally {
      setIsRefreshing(false);
    }
  }, [unassignedProject]); // Dependency: Only unassignedProject (now memoized and stable)

  // 0. Check if document changed and reset citation tracking
  React.useEffect(() => {
    checkAndResetIfNewDocument().catch((err) => {
      console.warn("Failed to check document context:", err);
    });
  }, []); // Run only on mount

  // 1. Fetch projects on component mount
  React.useEffect(() => {
    setIsLoading(true); // Use isLoading only for the *very first* load
    fetchProjects().finally(() => {
      setIsLoading(false); // Turn off the initial loader
    });
  }, [fetchProjects]); // Dependency: The memoized fetchProjects function.

  // 2. Fetch sources when selectedProjectId changes
  React.useEffect(() => {
    if (!selectedProjectId) {
      setSources([]);
      return;
    }

    setSources([]);
    setNotes([]);
    setSelectedSourceId(null);
    setError(null);

    const fetchSources = async () => {
      setIsRefreshing(true); // Show loading spinner
      try {
        const projectIdToFetch =
          selectedProjectId === UNASSIGNED_PROJECT_ID ? null : selectedProjectId;
        const fetchedSources = await apiGetSourcesByProject(projectIdToFetch);
        setSources(fetchedSources);
      } catch (err: any) {
        setError(err.message || "خطا در دریافت منابع");
      } finally {
        setIsRefreshing(false);
      }
    };
    fetchSources();
  }, [selectedProjectId]); // Dependency: This effect re-runs *only* when selectedProjectId changes.

  // 3. Fetch notes when selectedSourceId changes
  React.useEffect(() => {
    if (!selectedSourceId || !selectedProjectId) {
      setNotes([]);
      return;
    }
    if (selectedProjectId === UNASSIGNED_PROJECT_ID) {
      setNotes([]);
      return;
    }

    const fetchNotes = async () => {
      setIsRefreshing(true);
      try {
        const fetchedNotes = await apiGetNotesBySource(selectedProjectId, selectedSourceId);
        setNotes(fetchedNotes);
        setSelectedTab("notes");
      } catch (err: any) {
        setError(err.message || "خطا در دریافت فیش‌ها");
      } finally {
        setIsRefreshing(false);
      }
    };
    fetchNotes();
  }, [selectedSourceId, selectedProjectId]); // Dependency: Re-runs when source or project context changes.

  // --- EVENT HANDLERS ---

  /**
   * Calls the logout function from AuthContext to sign the user out.
   */
  const handleLogout = () => {
    logout();
  };

  /**
   * Provides a way for the user to manually refresh all data.
   */
  const handleRefresh = async () => {
    console.log("Refreshing data...");
    setIsRefreshing(true);
    setError(null);
    try {
      // 1. Fetch projects
      const fetchedProjects = await apiGetProjects();
      setProjects([unassignedProject, ...fetchedProjects]);

      // 2. Fetch sources for *current* project
      if (selectedProjectId) {
        const sourcesProjectId =
          selectedProjectId === UNASSIGNED_PROJECT_ID ? null : selectedProjectId;
        const fetchedSources = await apiGetSourcesByProject(sourcesProjectId);
        setSources(fetchedSources);
      }

      // 3. Fetch notes for *current* source (if applicable)
      if (selectedSourceId && selectedProjectId && selectedProjectId !== UNASSIGNED_PROJECT_ID) {
        const fetchedNotes = await apiGetNotesBySource(selectedProjectId, selectedSourceId);
        setNotes(fetchedNotes);
      }

      // 4. Re-scan document for any manual changes
      const existingCitations = await scanDocumentForCitations();
      setCitedSourceIds(new Set(existingCitations));
    } catch (err: any) {
      setError(err.message || "خطا در بروزرسانی");
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Updates state when a new project is selected from the dropdown.
   */
  const handleProjectChange = (e: any, data: { optionValue?: string }) => {
    if (data.optionValue) {
      setSelectedProjectId(data.optionValue);
      setSelectedSourceId(null);
      setNotes([]);
      setError(null);
    }
  };

  /**
   * Updates the selected citation style (e.g., 'apa', 'vancouver').
   */
  const handleStyleChange = (e: any, data: { optionValue?: string }) => {
    if (data.optionValue) {
      setSelectedStyle(data.optionValue as CitationStyle);
    }
  };

  /**
   * Updates state when a source is clicked, triggering note fetching.
   */
  const handleSourceClick = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setError(null);
  };

  /**
   * Updates the selected bibliography language (e.g., 'fa-IR', 'en-US').
   */
  const handleBibLanguageChange = (e: any, data: { optionValue?: string }) => {
    if (data.optionValue) {
      setBibLanguage(data.optionValue as BibLanguage);
    }
  };

  // --- BIBLIOGRAPHY & CITATION LOGIC ---

  /**
   * Memoized callback to update/insert the bibliography.
   */
  const updateBibliography = React.useCallback(
    async (overrideIds?: Set<string>) => {
      const idsToUse = overrideIds || citedSourceIds;
      if (!autoUpdateBib || idsToUse.size === 0) {
        // If no sources are cited, but auto-update is on, try to remove the bibliography
        if (autoUpdateBib && idsToUse.size === 0) {
          await removeBibliography();
        }
        return;
      }

      try {
        // Find sources from the *master list* (current project + all other projects)
        // This ensures sources from other projects are still found
        const masterSourceList = [...sources, ...projects.flatMap((p) => p.sources || [])];
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

        console.log("📚 [updateBibliography] Calling apiFormatBibliography with:", {
          sourceIds: Array.from(idsToUse),
          sourceIdsCount: citedSourceIds.size,
          style: selectedStyle,
          lang: finalLang,
          citedSources: citedSources.map((s) => ({ id: s._id, title: s.title })),
        });

        const bibHtml = await apiFormatBibliography(
          Array.from(idsToUse),
          selectedStyle,
          finalLang as "fa-IR" | "en-US" | "auto"
        );

        console.log("✅ [updateBibliography] Bibliography HTML received, length:", bibHtml?.length);
        await insertOrReplaceBibliography(bibHtml, Array.from(idsToUse), selectedStyle);
      } catch (err: any) {
        console.error("❌ [updateBibliography] Auto bibliography update failed:", {
          error: err.message,
          stack: err.stack,
          citedSourceIds: Array.from(citedSourceIds),
          selectedStyle,
          bibLanguage,
        });
      }
    },
    [citedSourceIds, selectedStyle, bibLanguage, autoUpdateBib, sources]
  ); // Dependencies

  /**
   *  Handles inserting an in-text citation.
   * Now accepts a `shouldTranslate` flag to decide whether to call the AI API.
   */
  const handleInsertCitation = async (
    sourceId: string,
    e?: React.MouseEvent,
    shouldTranslate: boolean = false // The new flag
  ) => {
    if (e) {
      e.stopPropagation(); // Prevent the click from also triggering handleSourceClick
    }
    if (isInserting) return; // Prevent double-click

    // Set a unique loading key for translation vs. normal insertion
    const loadingKey = shouldTranslate ? `${sourceId}_translate` : sourceId;
    setIsInserting(loadingKey);
    setError(null);

    try {
      const source = sources.find((s) => s._id === sourceId);
      const originalAuthors = source?.authors.map((a) => a.lastname).join(", ");
      // 1. Get formatted citation from API
      const formattedCitation = await apiFormatCitation({
        sourceId: sourceId,
        style: selectedStyle,
      });
      const originalInText = formattedCitation.inText;
      let inTextToInsert = originalInText;

      if (shouldTranslate && !translatedFootnotesAdded.has(sourceId)) {
        // We add the footnote *first* at the current selection
        await insertFootnote(`${originalInText}.`);
        // Track that we've added it
        setTranslatedFootnotesAdded((prev) => new Set(prev).add(sourceId));
      }

      //  Check if translation is requested
      if (shouldTranslate) {
        // 2. (If requested) Translate the citation text using AI
        inTextToInsert = await apiTranslateText(inTextToInsert, "Persian");
      }
      // 3. Create the new ID set *before* calling Word
      const newCitedIds = new Set(citedSourceIds).add(sourceId);
      // 4. Update state (this is still async)
      setCitedSourceIds(newCitedIds);
      // 5. Define the callback *with the new ID set*
      // We wrap it in another function to avoid passing event args
      const onUpdate = () => updateBibliography(newCitedIds);
      // 3. Insert the (potentially translated) citation into Word
      await insertCitationWithTracking(
        sourceId,
        selectedStyle,
        inTextToInsert, // Use the final text
        updateBibliography // Pass the auto-update callback
      );

      // 4. Track this source as cited for bibliography
      setCitedSourceIds((prev) => new Set(prev).add(sourceId));
    } catch (err: any) {
      setError(err.message || "Failed to insert citation");
    } finally {
      setIsInserting(null); // Clear loading state
    }
  };

  /**
   * Handles removing a citation.
   */
  const handleRemoveCitation = async (sourceId: string) => {
    if (isInserting) return;

    setIsInserting(sourceId);
    setError(null);
    try {
      // 1. Create the new ID set *before* calling Word
      const newCitedIds = new Set(citedSourceIds);
      newCitedIds.delete(sourceId);
      // 2. Update state
      setCitedSourceIds(newCitedIds);
      // 3. Define the callback
      const onUpdate = () => updateBibliography(newCitedIds);

      // 4. Pass the correct callback
      await removeCitation(sourceId, onUpdate);
    } catch (err: any) {
      setError(err.message || "Failed to remove citation");
    } finally {
      setIsInserting(null);
    }
  };

  /**
   * Handles the 'Insert Bibliography' button click.
   */
  const handleInsertBibliography = async () => {
    //  We must scan the document *first* to get the *absolute* truth
    // This avoids race conditions if the state hasn't updated yet
    const currentCitationIdsFromDoc = await scanDocumentForCitations();
    const currentCitations = new Set(currentCitationIdsFromDoc);
    setCitedSourceIds(currentCitations); // Sync state

    if (currentCitations.size === 0) {
      setError("ابتدا باید حداقل یک منبع را درج کنید.");
      return;
    }
    setIsInsertingBib(true);
    setError(null);

    let finalLang: "fa-IR" | "en-US" | "auto" = "fa-IR";

    try {
      //  Search all sources, not just the current project's
      const citedSources = sources.filter((s) => currentCitations.has(s._id));

      const hasPersianSources = citedSources.some(
        (s) => s.language === "persian" || s.language === "fa" || s.language === "fa-IR"
      );
      finalLang =
        hasPersianSources && bibLanguage === "fa-IR"
          ? "fa-IR"
          : !hasPersianSources && bibLanguage === "en-US"
            ? "en-US"
            : "auto";

      const bibHtml = await apiFormatBibliography(
        Array.from(currentCitations),
        selectedStyle,
        finalLang as "fa-IR" | "en-US" | "auto"
      );

      // Pass the *correct* list of IDs
      await insertOrReplaceBibliography(bibHtml, Array.from(currentCitations), selectedStyle);
    } catch (err: any) {
      setError(err.message || "Failed to create bibliography");
    } finally {
      setIsInsertingBib(false);
    }
  };

  /**
   *  Handles inserting a note's content and its citation.
   * Now accepts a `shouldTranslate` flag for the citation.
   */
  const handleNoteClick = async (note: Note, shouldTranslate: boolean = false) => {
    if (isInserting) return;

    const loadingKey = shouldTranslate ? `${note._id}_translate` : note._id;
    setIsInserting(loadingKey);
    setError(null);

    try {
      // [NEW for Problem 3] Get source info for footnote
      const source = sources.find((s) => s._id === note.source);
      const originalAuthors = source?.authors.map((a) => a.lastname).join(", ") || "";

      // 1. Get formatted citation
      const formattedCitation = await apiFormatCitation({
        sourceId: note.source,
        style: selectedStyle,
      });
      const originalInText = formattedCitation.inText;
      let inTextToInsert = originalInText;

      // [NEW for Problem 3] Check if we need to add a footnote
      if (shouldTranslate && !translatedFootnotesAdded.has(note.source)) {
        await insertFootnote(` ${originalInText}.`);
        setTranslatedFootnotesAdded((prev) => new Set(prev).add(note.source));
      }

      // 2. Check for translation
      if (shouldTranslate) {
        inTextToInsert = await apiTranslateText(inTextToInsert, "Persian");
      }

      // [FIX for Problem 1]
      // 3. Create the new ID set
      const newCitedIds = new Set(citedSourceIds).add(note.source);
      // 4. Update state
      setCitedSourceIds(newCitedIds);
      // 5. Define the callback
      const onUpdate = () => updateBibliography(newCitedIds);

      // 6. Insert HTML + Citation and pass the correct callback
      await insertHtmlAndCitationAfter(
        note.content,
        note.source,
        selectedStyle,
        inTextToInsert,
        onUpdate
      );
    } catch (err: any) {
      setError(err.message || "Failed to insert note");
    } finally {
      setIsInserting(null);
    }
  };

  /**
   * Handles the 'Renumber' button for Vancouver style.
   */
  const handleRenumberVancouver = async () => {
    if (selectedStyle.toLowerCase() !== "vancouver") return;
    setIsInserting("renumber");
    setError(null);
    try {
      const currentCitationIdsFromDoc = await scanDocumentForCitations();
      const currentCitations = new Set(currentCitationIdsFromDoc);
      setCitedSourceIds(currentCitations); // Sync state

      if (autoUpdateBib) {
        // [FIX] Pass the *current* state
        await updateBibliography(currentCitations);
      }
    } catch (err: any) {
      setError(err.message || "Failed to renumber citations");
    } finally {
      setIsInserting(null);
    }
  };

  /**
   * Removes all tracked citations from the document.
   */
  const handleClearAllCitations = async () => {
    setIsInserting("clear");
    setError(null);
    try {
      // [FIX] We call removeCitation repeatedly, but the final callback
      // will be an empty list, so it will sync correctly.
      const onUpdate = () => updateBibliography(new Set()); // Pass empty set

      // Create a static array to iterate over
      const idsToRemove = Array.from(citedSourceIds);

      for (const sourceId of idsToRemove) {
        // We pass a non-updating callback here to prevent N updates
        await removeCitation(sourceId, () => Promise.resolve());
      }

      // Clear state *locally*
      setCitedSourceIds(new Set());
      setTranslatedFootnotesAdded(new Set()); // [NEW] Clear footnote tracking
      clearCitationTracking(); // Clear service's internal map

      // Now call the *final* update once
      await onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to clear citations");
    } finally {
      setIsInserting(null);
    }
  };

  /**
   * Handles clearing the bibliography from the document.
   */
  const handleClearBibliography = async () => {
    setIsInserting("clear-bib");
    setError(null);
    try {
      await removeBibliography();
      console.log("✅ Bibliography cleared successfully");
    } catch (err: any) {
      setError(err.message || "Failed to clear bibliography");
      console.error("❌ Failed to clear bibliography:", err);
    } finally {
      setIsInserting(null);
    }
  };

  // --- RENDER LOGIC ---

  /**
   * Renders the initial loading spinner (full page).
   */
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner label="در حال بارگذاری..." size="large" />
        </div>
      </div>
    );
  }

  /**
   * Renders an empty state if no projects are found.
   */
  if (projects.length === 0 && !isRefreshing) {
    return (
      <div className={styles.container}>
        {/* Show header to allow refresh/logout even in empty state */}
        <div className={styles.header}>
          <div className={styles.userInfo}>
            <Avatar
              name={user.username}
              size={40}
              color="brand"
              image={user.avatar ? { src: `https://localhost:5000/${user.avatar}` } : undefined}
            />
            <Text className={styles.userName}>{user.username}</Text>
          </div>
          <div className={styles.headerButtons}>
            <Button
              appearance="subtle"
              icon={isRefreshing ? <Spinner size="tiny" /> : <ArrowSyncFilled />}
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="بروزرسانی"
            />
            <Button appearance="subtle" onClick={handleLogout} className={styles.logoutButton}>
              خروج
            </Button>
          </div>
        </div>

        {/* The empty state message */}
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📁</div>
          <Text weight="semibold">پروژه‌ای یافت نشد</Text>
          <br />
          <Text size={300}>لطفاً ابتدا در اپلیکیشن وب یک پروژه ایجاد کنید.</Text>
          <br />
          <Button appearance="primary" onClick={handleRefresh} style={{ marginTop: "16px" }}>
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  /**
   * Helper function to render the error message component.
   */
  const renderError = () => {
    if (!error) return null;
    return (
      <Text weight="semibold" style={{ color: "red" }}>
        خطا: {error}
      </Text>
    );
  };

  /**
   * Main component render.
   */
  return (
    <div className={styles.container}>
      {/* --- Header Section --- */}
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <Avatar
            name={user.username}
            size={40}
            color="brand"
            image={user.avatar ? { src: `https://localhost:5000/${user.avatar}` } : undefined}
          />
          <Text className={styles.userName}>{user.username}</Text>
        </div>
        <div className={styles.headerButtons}>
          <Button
            appearance="subtle"
            icon={isRefreshing ? <Spinner size="tiny" /> : <ArrowSyncFilled />}
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="بروزرسانی لیست پروژه‌ها و منابع"
          >
            {isRefreshing ? "بروزرسانی..." : ""}
          </Button>
          <Button appearance="subtle" onClick={handleLogout} className={styles.logoutButton}>
            خروج
          </Button>
        </div>
      </div>

      {/* --- Error Display --- */}
      {renderError()}

      {/* --- Controls Section --- */}
      <div className={styles.controlsCard}>
        <div>
          <Text className={styles.sectionLabel}>انتخاب پروژه</Text>
          <Dropdown
            className={styles.dropdown}
            placeholder="یک پروژه را انتخاب کنید"
            value={selectedProjectId || ""}
            onOptionSelect={handleProjectChange}
            style={{ color: "#242424" }}
          >
            {projects.map((proj) => (
              <Option key={proj._id} value={proj._id} text={proj.title} className={styles.option}>
                {proj.title}
              </Option>
            ))}
          </Dropdown>

          {/* --- Citation Style Selector --- */}
          <Label>استایل استناد</Label>
          <Dropdown
            placeholder="استایل را انتخاب کنید"
            value={selectedStyle}
            onOptionSelect={handleStyleChange}
          >
            <Option value="apa">APA</Option>
            <Option value="mla">MLA</Option>
            <Option value="vancouver">Vancouver</Option>
            <Option value="chicago-author-date">Chicago</Option>
            <Option value="harvard-cite-them-right">Harvard</Option>
          </Dropdown>

          {/* --- Bibliography Language Selector --- */}
          <Label>زبان کتاب‌نامه</Label>
          <Dropdown
            placeholder="زبان کتاب‌نامه را انتخاب کنید"
            value={bibLanguage}
            onOptionSelect={handleBibLanguageChange}
          >
            <Option value="fa-IR">فارسی (پیش‌فرض)</Option>
            <Option value="en-US">English</Option>
          </Dropdown>
        </div>

        <SearchBox
          className={styles.searchBox}
          placeholder="جستجو در منابع و فیش‌ها..."
          appearance="outline"
        />
      </div>

      {/* --- Tabs Section --- */}
      <div className={styles.tabsContainer}>
        <TabList
          className={styles.tabList}
          selectedValue={selectedTab}
          onTabSelect={(_e, d) => setSelectedTab(d.value as TabValue)}
        >
          <Tab value="sources">
            📚 منابع
            {sources.length > 0 && (
              <Badge appearance="filled" color="informative" className={styles.notesBadge}>
                {sources.length}
              </Badge>
            )}
          </Tab>
          <Tab value="notes">
            📝 فیش‌ها
            {notes.length > 0 && (
              <Badge appearance="filled" color="success" className={styles.notesBadge}>
                {notes.length}
              </Badge>
            )}
          </Tab>
        </TabList>
      </div>

      {/* --- Citation Management Panel --- */}
      <div className={styles.controlsCard}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Text weight="semibold">مدیریت استنادها</Text>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Button
              appearance="primary"
              size="small"
              onClick={handleInsertBibliography}
              disabled={isInsertingBib || getCitedSourceIds().length === 0}
              title="درج کتاب‌نامه در انتهای سند"
            >
              {isInsertingBib ? <Spinner size="tiny" /> : "درج کتاب‌نامه"}
            </Button>

            {selectedStyle.toLowerCase() === "vancouver" && (
              <Button
                appearance="secondary"
                size="small"
                onClick={handleRenumberVancouver}
                disabled={isInserting === "renumber" || getCitedSourceIds().length === 0}
                title="تجدید شماره‌گذاری استنادهای ونکوور"
              >
                {isInserting === "renumber" ? <Spinner size="tiny" /> : "شماره‌گذاری مجدد"}
              </Button>
            )}

            <Button
              appearance="subtle"
              size="small"
              onClick={handleClearAllCitations}
              disabled={isInserting === "clear" || getCitedSourceIds().length === 0}
              title="پاک کردن تمام استنادها از سند"
            >
              {isInserting === "clear" ? <Spinner size="tiny" /> : "پاک کردن همه استنادها"}
            </Button>

            <Button
              appearance="subtle"
              size="small"
              onClick={handleClearBibliography}
              disabled={isInserting === "clear-bib"}
              title="پاک کردن فقط کتاب‌نامه (استنادها باقی می‌مانند)"
            >
              {isInserting === "clear-bib" ? <Spinner size="tiny" /> : "پاک کردن کتاب‌نامه"}
            </Button>
          </div>

          {/* [REMOVED] The global AI translation checkbox is gone */}

          {/* --- Auto-Update Checkbox --- */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            {" "}
            {/* [MODIFIED] Added margin-top */}
            <input
              type="checkbox"
              id="autoUpdateBib"
              checked={autoUpdateBib}
              onChange={(e) => setAutoUpdateBib(e.target.checked)}
            />
            <label htmlFor="autoUpdateBib">
              <Text size={200}>به‌روزرسانی خودکار کتاب‌نامه</Text>
            </label>
          </div>

          {getCitedSourceIds().length > 0 && (
            <Text size={200} style={{ color: "#666" }}>
              {getCitedSourceIds().length} منبع استناد شده
            </Text>
          )}
        </div>
      </div>

      {/* --- Content Area (Sources/Notes List) --- */}
      <div className={styles.contentCard}>
        {isRefreshing && !isLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner label="در حال بارگذاری داده‌ها..." />
          </div>
        ) : (
          <div className={styles.list}>
            {/* --- Sources Tab --- */}
            {selectedTab === "sources" && (
              <div>
                {sources.map((source) => {
                  // [NEW] Check if the source language is non-Persian
                  const isNonPersian =
                    source.language &&
                    !["persian", "fa", "fa-IR"].includes(source.language.toLowerCase());

                  return (
                    <div
                      key={source._id}
                      className={`${styles.listItem} ${
                        source._id === selectedSourceId ? styles.selectedListItem : ""
                      }`}
                      onClick={() => handleSourceClick(source._id)} // Click to select and load notes
                    >
                      <Text className={styles.sourceTitle}>{source.title}</Text>
                      <Text className={styles.sourceMetadata}>
                        {source.authors.map((a) => a.lastname).join("، ")}
                        {source.year && ` (${source.year})`}
                      </Text>

                      {/* --- [MODIFIED] Citation Action Buttons --- */}
                      <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                        {!citedSourceIds.has(source._id) ? (
                          <>
                            {/* --- Insert --- */}
                            <Button
                              size="small"
                              appearance="subtle"
                              onClick={(e) => handleInsertCitation(source._id, e, false)}
                              disabled={isInserting === source._id}
                              title="درج استناد (زبان اصلی)"
                            >
                              {isInserting === source._id ? <Spinner size="tiny" /> : "درج استناد"}
                            </Button>
                            {/* --- Translate and Insert --- */}
                            {isNonPersian && (
                              <Button
                                size="small"
                                appearance="subtle"
                                onClick={(e) => handleInsertCitation(source._id, e, true)}
                                disabled={isInserting === `${source._id}_translate`}
                                title="ترجمه ارجاع به فارسی و درج"
                              >
                                {isInserting === `${source._id}_translate` ? (
                                  <Spinner size="tiny" />
                                ) : (
                                  "🤖 ترجمه و درج"
                                )}
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            {/* --- Re-insert --- */}
                            <Button
                              size="small"
                              appearance="subtle"
                              onClick={(e) => handleInsertCitation(source._id, e, false)}
                              disabled={isInserting === source._id}
                              title="درج استناد مجدد (زبان اصلی)"
                            >
                              {isInserting === source._id ? <Spinner size="tiny" /> : "درج مجدد"}
                            </Button>
                            {/* --- [NEW for Problem 2] Translate and Re-insert --- */}
                            {isNonPersian && (
                              <Button
                                size="small"
                                appearance="subtle"
                                onClick={(e) => handleInsertCitation(source._id, e, true)}
                                disabled={isInserting === `${source._id}_translate`}
                                title="ترجمه ارجاع به فارسی و درج مجدد"
                              >
                                {isInserting === `${source._id}_translate` ? (
                                  <Spinner size="tiny" />
                                ) : (
                                  "🤖 ترجمه و درج مجدد"
                                )}
                              </Button>
                            )}
                            {/* --- Remove --- */}
                            <Button
                              size="small"
                              appearance="subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCitation(source._id);
                              }}
                              disabled={isInserting === source._id}
                              title="حذف استناد از متن"
                              style={{ color: "#d13438" }}
                            >
                              {/* [FIX] Corrected text content */}
                              حذف استناد
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* --- Empty state for Sources --- */}
                {sources.length === 0 && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>📚</div>
                    <Text>
                      {selectedProjectId === UNASSIGNED_PROJECT_ID
                        ? "منبع بدون پروژه‌ای یافت نشد"
                        : "منبعی در این پروژه یافت نشد"}
                    </Text>
                  </div>
                )}
              </div>
            )}

            {/* --- Notes Tab --- */}
            {selectedTab === "notes" && (
              <div>
                {notes.map((note) => {
                  // [NEW] Find the parent source to check its language
                  const parentSource = sources.find((s) => s._id === note.source);
                  const isNonPersian =
                    parentSource?.language &&
                    !["persian", "fa", "fa-IR"].includes(parentSource.language.toLowerCase());

                  return (
                    <div
                      key={note._id}
                      className={styles.listItem}
                      onClick={() => handleNoteClick(note, false)} // Click to insert note + original citation
                      title="برای درج فیش (با ارجاع اصلی) کلیک کنید"
                    >
                      <div
                        className={styles.noteContent}
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />

                      {/* [NEW] Add a separate button for translating the note's citation */}
                      {isNonPersian && (
                        <div style={{ marginTop: "8px" }}>
                          <Button
                            size="small"
                            appearance="subtle"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent the main div click
                              handleNoteClick(note, true); // Insert note + translated citation
                            }}
                            disabled={isInserting === `${note._id}_translate`}
                            title="درج فیش + ترجمه ارجاع به فارسی"
                          >
                            {isInserting === `${note._id}_translate` ? (
                              <Spinner size="tiny" />
                            ) : (
                              "🤖 درج فیش با ارجاع ترجمه‌شده"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* --- Empty state for Notes --- */}
                {notes.length === 0 && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>📝</div>
                    <Text>
                      {selectedProjectId === UNASSIGNED_PROJECT_ID
                        ? "یادداشت‌ها فقط در پروژه‌ها در دسترس هستند"
                        : selectedSourceId
                          ? "فیشی برای این منبع یافت نشد"
                          : "ابتدا یک منبع را انتخاب کنید"}
                    </Text>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
