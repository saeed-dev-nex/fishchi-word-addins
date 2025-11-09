// --- IMPORTS ---
import * as React from "react";
import {
  Tab,
  TabList,
  Text,
  Badge,
  TabValue,
  makeStyles,
  shorthands,
} from "@fluentui/react-components";
import { UserProfile, Note } from "../../types/fishchi";
import { useAuth } from "../../contexts/AuthContext";
import { checkAndResetIfNewDocument, scanDocumentForCitations } from "../../services/wordService";
import { apiGetNotesBySource } from "../../services/api";
import { insertHtmlAndCitationAfter } from "../../services/wordService";
import { apiFormatCitation, apiTranslateText } from "../../services/api";
import { insertFootnote } from "../../services/wordService";
import { UNASSIGNED_PROJECT_ID } from "../../types/fishchi";

// Hooks
import { useProjects } from "../../hooks/useProjects";
import { useSources } from "../../hooks/useSources";
import { useNotes } from "../../hooks/useNotes";
import { useCitations } from "../../hooks/useCitations";

// Components
import { Header } from "./Header";
import { ControlsPanel } from "./ControlsPanel";
import { CitationManagementPanel } from "./CitationManagement";
import { SourcesList } from "./SourcesList";
import { NotesList } from "./NotesList";
import { LoadingState, NoProjectsState } from "./EmptyStates";

// --- STYLES ---
const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("16px"),
    ...shorthands.padding("16px"),
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
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
    flexGrow: 1,
  },
  notesBadge: {
    marginLeft: "6px",
  },
});

// --- COMPONENT PROPS ---
interface MainWorkspaceProps {
  user: UserProfile;
}

// --- COMPONENT DEFINITION ---
export const MainWorkspace: React.FC<MainWorkspaceProps> = ({ user }) => {
  const styles = useStyles();
  const { logout } = useAuth();

  // Custom Hooks
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isLoading,
    isRefreshing: isRefreshingProjects,
    error: projectsError,
    setError: setProjectsError,
    fetchProjects,
    unassignedProject,
  } = useProjects(user._id);

  const {
    sources,
    selectedSourceId,
    setSelectedSourceId,
    isRefreshing: isRefreshingSources,
    error: sourcesError,
    setError: setSourcesError,
  } = useSources(selectedProjectId);

  const {
    notes,
    setNotes,
    isRefreshing: isRefreshingNotes,
    error: notesError,
    setError: setNotesError,
  } = useNotes(selectedProjectId, selectedSourceId);

  const {
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
  } = useCitations(sources, setProjectsError);

  // Local State
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("sources");

  // Combined error state
  const error = projectsError || sourcesError || notesError;
  const isRefreshing = isRefreshingProjects || isRefreshingSources || isRefreshingNotes;

  // --- EFFECTS ---

  // Check if document changed on mount
  React.useEffect(() => {
    checkAndResetIfNewDocument().catch((err) => {
      console.warn("Failed to check document context:", err);
    });
  }, []);

  // Scan document for citations when tab becomes visible
  React.useEffect(() => {
    const syncCitations = async () => {
      try {
        const existingCitations = await scanDocumentForCitations();
        setCitedSourceIds(new Set(existingCitations));
      } catch (err) {
        console.warn("Failed to scan document citations:", err);
      }
    };
    syncCitations();
  }, [setCitedSourceIds]);

  // Switch to notes tab when notes are loaded
  React.useEffect(() => {
    if (notes.length > 0) {
      setSelectedTab("notes");
    }
  }, [notes]);

  // --- EVENT HANDLERS ---

  const handleRefresh = async () => {
    try {
      await fetchProjects();
      const existingCitations = await scanDocumentForCitations();
      setCitedSourceIds(new Set(existingCitations));
    } catch (err: any) {
      setProjectsError(err.message || "خطا در بروزرسانی");
    }
  };

  const handleProjectChange = (e: any, data: { optionValue?: string }) => {
    if (data.optionValue) {
      setSelectedProjectId(data.optionValue);
      setSelectedSourceId(null);
      setNotes([]);
      setProjectsError(null);
    }
  };

  const handleStyleChange = (e: any, data: { optionValue?: string }) => {
    if (data.optionValue) {
      setSelectedStyle(data.optionValue as any);
    }
  };

  const handleBibLanguageChange = (e: any, data: { optionValue?: string }) => {
    if (data.optionValue) {
      setBibLanguage(data.optionValue as any);
    }
  };

  const handleSourceClick = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setProjectsError(null);
  };

  const handleInsertCitation = async (
    sourceId: string,
    e: React.MouseEvent,
    shouldTranslate: boolean
  ) => {
    e.stopPropagation();
    await insertCitation(sourceId, shouldTranslate);
  };

  const handleNoteClick = async (note: Note, shouldTranslate: boolean) => {
    if (isInserting) return;

    const loadingKey = shouldTranslate ? `${note._id}_translate` : note._id;
    // This would need to be handled in the useCitations hook or extracted to a separate handler
    // For now, we'll keep the logic here since it's specific to notes

    setProjectsError(null);

    try {
      const source = sources.find((s) => s._id === note.source);
      const formattedCitation = await apiFormatCitation({
        sourceId: note.source,
        style: selectedStyle,
      });
      const originalInText = formattedCitation.inText;
      let inTextToInsert = originalInText;

      if (shouldTranslate && !translatedFootnotesAdded.has(note.source)) {
        await insertFootnote(` ${originalInText}.`);
        setTranslatedFootnotesAdded((prev) => new Set(prev).add(note.source));
      }

      if (shouldTranslate) {
        inTextToInsert = await apiTranslateText(inTextToInsert, "Persian");
      }

      const newCitedIds = new Set(citedSourceIds).add(note.source);
      setCitedSourceIds(newCitedIds);

      const onUpdate = () => updateBibliography(newCitedIds);

      await insertHtmlAndCitationAfter(
        note.content,
        note.source,
        selectedStyle,
        inTextToInsert,
        onUpdate
      );
    } catch (err: any) {
      setProjectsError(err.message || "Failed to insert note");
    }
  };

  // --- RENDER LOGIC ---

  if (isLoading) {
    return (
      <div className={styles.container}>
        <LoadingState />
      </div>
    );
  }

  if (projects.length === 0 && !isRefreshing) {
    return (
      <div className={styles.container}>
        <Header
          user={user}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onLogout={logout}
        />
        <NoProjectsState onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <Header user={user} isRefreshing={isRefreshing} onRefresh={handleRefresh} onLogout={logout} />

      {/* Error Display */}
      {error && (
        <Text weight="semibold" style={{ color: "red" }}>
          خطا: {error}
        </Text>
      )}

      {/* Controls Panel */}
      <ControlsPanel
        projects={projects}
        selectedProjectId={selectedProjectId}
        selectedStyle={selectedStyle}
        bibLanguage={bibLanguage}
        onProjectChange={handleProjectChange}
        onStyleChange={handleStyleChange}
        onBibLanguageChange={handleBibLanguageChange}
      />

      {/* Tabs */}
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

      {/* Citation Management Panel */}
      <CitationManagementPanel
        selectedStyle={selectedStyle}
        autoUpdateBib={autoUpdateBib}
        isInserting={isInserting}
        isInsertingBib={isInsertingBib}
        onInsertBibliography={insertBibliography}
        onRenumberVancouver={renumberVancouver}
        onClearAllCitations={clearAllCitations}
        onClearBibliography={clearBibliography}
        onAutoUpdateChange={setAutoUpdateBib}
      />

      {/* Content Area */}
      <div className={styles.contentCard}>
        {isRefreshing && !isLoading ? (
          <LoadingState message="در حال بارگذاری داده‌ها..." />
        ) : (
          <>
            {selectedTab === "sources" && (
              <SourcesList
                sources={sources}
                selectedSourceId={selectedSourceId}
                selectedProjectId={selectedProjectId}
                citedSourceIds={citedSourceIds}
                isInserting={isInserting}
                onSourceClick={handleSourceClick}
                onInsertCitation={handleInsertCitation}
                onRemoveCitation={removeCitationHandler}
              />
            )}

            {selectedTab === "notes" && (
              <NotesList
                notes={notes}
                sources={sources}
                selectedProjectId={selectedProjectId}
                selectedSourceId={selectedSourceId}
                isInserting={isInserting}
                onNoteClick={handleNoteClick}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
