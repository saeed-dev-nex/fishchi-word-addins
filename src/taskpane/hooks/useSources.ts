import * as React from "react";
import { Source } from "../types/fishchi";
import { apiGetSourcesByProject } from "../services/api";
import { UNASSIGNED_PROJECT_ID } from "../types/fishchi";

interface UseSourcesReturn {
  sources: Source[];
  selectedSourceId: string | null;
  setSelectedSourceId: React.Dispatch<React.SetStateAction<string | null>>;
  isRefreshing: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useSources = (selectedProjectId: string | null): UseSourcesReturn => {
  const [sources, setSources] = React.useState<Source[]>([]);
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch sources when selectedProjectId changes
  React.useEffect(() => {
    if (!selectedProjectId) {
      setSources([]);
      return;
    }

    setSources([]);
    setSelectedSourceId(null);
    setError(null);

    const fetchSources = async () => {
      setIsRefreshing(true);
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
  }, [selectedProjectId]);

  return {
    sources,
    selectedSourceId,
    setSelectedSourceId,
    isRefreshing,
    error,
    setError,
  };
};
