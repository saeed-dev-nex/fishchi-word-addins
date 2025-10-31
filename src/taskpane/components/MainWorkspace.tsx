// src/taskpane/components/MainWorkspace.tsx

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
} from "@fluentui/react-components";
import { Project, Source, Note, UserProfile } from "../types/fishchi";
import { apiGetProjects, apiGetSourcesByProject, apiGetNotesBySource } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

// Define styles using Fluent UI's makeStyles
const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("10px"),
    ...shorthands.padding("10px"),
  },
  list: {
    maxHeight: "300px",
    overflowY: "auto",
  },
  listItem: {
    ...shorthands.padding("5px"),
    ...shorthands.borderBottom("1px", "solid", "#ccc"),
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#f5f5f5",
    },
  },
  selectedListItem: {
    backgroundColor: "#e0e0e0",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("10px"),
  },
});
interface MainWorkspaceProps {
  user: UserProfile; // We get this from App.tsx
}
export const MainWorkspace: React.FC<MainWorkspaceProps> = ({ user }) => {
  const styles = useStyles();
  const { logout } = useAuth(); // Get logout function from context
  // --- State Management ---
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Data state
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [sources, setSources] = React.useState<Source[]>([]);
  const [notes, setNotes] = React.useState<Note[]>([]);

  // Selection state
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(null);

  // Tab state
  type TabValue = "sources" | "notes";
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("sources");

  // --- Data Fetching Effects ---

  // 1. Fetch projects on component mount
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const fetchedProjects = await apiGetProjects();
        setProjects(fetchedProjects);
        if (fetchedProjects.length > 0) {
          // Auto-select the first project
          setSelectedProjectId(fetchedProjects[0]._id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch projects");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // 2. Fetch sources when selectedProjectId changes
  React.useEffect(() => {
    if (!selectedProjectId) {
      setSources([]);
      return;
    }
    const fetchSources = async () => {
      try {
        setIsLoading(true);
        const fetchedSources = await apiGetSourcesByProject(selectedProjectId);
        setSources(fetchedSources);
      } catch (err: any) {
        setError(err.message || "Failed to fetch sources");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSources();
  }, [selectedProjectId]);

  // 3. Fetch notes when selectedSourceId changes
  React.useEffect(() => {
    if (!selectedSourceId) {
      setNotes([]);
      return;
    }
    const fetchNotes = async () => {
      try {
        setIsLoading(true);
        const fetchedNotes = await apiGetNotesBySource(selectedSourceId);
        setNotes(fetchedNotes);
        setSelectedTab("notes"); // Automatically switch to notes tab
      } catch (err: any) {
        setError(err.message || "Failed to fetch notes");
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotes();
  }, [selectedSourceId]);

  // --- Event Handlers ---
  const handleProjectChange = (_e: any, data: { optionValue?: string }) => {
    if (data.optionValue) {
      setSelectedProjectId(data.optionValue);
      setSelectedSourceId(null); // Clear source selection
      setNotes([]); // Clear notes
    }
  };

  const handleSourceClick = (sourceId: string) => {
    setSelectedSourceId(sourceId);
  };

  const handleNoteClick = (note: Note) => {
    // TODO: Phase 3 - Insert note content into Word
    console.log("Insert note:", note.content);
    // This is where we will call Word.run()
  };

  // --- Render Logic ---
  if (isLoading && projects.length === 0) {
    return <Spinner label="در حال بارگذاری پروژه‌ها..." />;
  }

  if (error) {
    return (
      <Text weight="semibold" style={{ color: "red" }}>
        خطا: {error}
      </Text>
    );
  }

  if (projects.length === 0) {
    return <Text>پروژه‌ای یافت نشد. لطفاً ابتدا در اپلیکیشن وب یک پروژه بسازید.</Text>;
  }
  const handleLogout = () => {
    logout();
  };

  return (
    <div className={styles.container}>
      {/* ---  Header --- */}
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <Avatar
            name={user.username}
            image={user.avatar ? { src: `https://localhost:5000/${user.avatar}` } : undefined} // ⚠️ Update with your server URL for avatars
          />
          <Text weight="semibold">{user.username}</Text>
        </div>
        <Button onClick={handleLogout} size="small">
          خروج
        </Button>
      </div>
      {/* ---  Header --- */}
      {/* 1. Project Selector */}
      <Dropdown
        placeholder="یک پروژه را انتخاب کنید"
        value={selectedProjectId || ""}
        onOptionSelect={handleProjectChange}
      >
        {projects.map((proj) => (
          <Option key={proj._id} value={proj._id}>
            {proj.name}
          </Option>
        ))}
      </Dropdown>

      {/* 2. Search Box (functionality not implemented yet) */}
      <SearchBox placeholder="جستجو در منابع و فیش‌ها..." />

      {/* 3. Tabs for Sources and Notes */}
      <TabList
        selectedValue={selectedTab}
        onTabSelect={(_e, d) => setSelectedTab(d.value as TabValue)}
      >
        <Tab value="sources">منابع</Tab>
        <Tab value="notes">فیش‌ها ({notes.length})</Tab>
      </TabList>

      {isLoading && <Spinner label="در حال بارگذاری داده‌ها..." />}

      {/* 4. Content Area */}
      <div className={styles.list}>
        {selectedTab === "sources" && (
          <div>
            {sources.map((source) => (
              <div
                key={source._id}
                className={`${styles.listItem} ${source._id === selectedSourceId ? styles.selectedListItem : ""}`}
                onClick={() => handleSourceClick(source._id)}
              >
                <Text weight="semibold">{source.title}</Text>
                <br />
                <Text size={200}>
                  {source.authors.map((a) => a.lastName).join("، ")} ({source.year})
                </Text>
              </div>
            ))}
            {sources.length === 0 && !isLoading && <Text>منبعی در این پروژه یافت نشد.</Text>}
          </div>
        )}

        {selectedTab === "notes" && (
          <div>
            {notes.map((note) => (
              <div
                key={note._id}
                className={styles.listItem}
                onClick={() => handleNoteClick(note)}
                title="برای درج کلیک کنید"
              >
                {/* We use dangerouslySetInnerHTML to render HTML content from the rich text editor */}
                <div dangerouslySetInnerHTML={{ __html: note.content }} />
              </div>
            ))}
            {notes.length === 0 && !isLoading && (
              <Text>
                {selectedSourceId
                  ? "فیشی برای این منبع یافت نشد."
                  : "ابتدا یک منبع را انتخاب کنید."}
              </Text>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
