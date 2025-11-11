import * as React from "react";
import { Note } from "../types/fishchi";
import { apiGetNotesBySource } from "../services/api";
import { UNASSIGNED_PROJECT_ID } from "../types/fishchi";

interface UseNotesReturn {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  isRefreshing: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useNotes = (
  selectedProjectId: string | null,
  selectedSourceId: string | null
): UseNotesReturn => {
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch notes when selectedSourceId changes
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
      } catch (err: any) {
        setError(err.message || "خطا در دریافت فیش‌ها");
      } finally {
        setIsRefreshing(false);
      }
    };
    fetchNotes();
  }, [selectedSourceId, selectedProjectId]);

  return {
    notes,
    setNotes,
    isRefreshing,
    error,
    setError,
  };
};
