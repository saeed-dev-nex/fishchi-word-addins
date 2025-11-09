import * as React from "react";
import { Project } from "../types/fishchi";
import { apiGetProjects } from "../services/api";
import { scanDocumentForCitations } from "../services/wordService";
import { UNASSIGNED_PROJECT_ID } from "../types/fishchi";

interface UseProjectsReturn {
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  fetchProjects: () => Promise<void>;
  unassignedProject: Project;
}

export const useProjects = (userId: string): UseProjectsReturn => {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Memoized virtual project object
  const unassignedProject: Project = React.useMemo(
    () => ({
      _id: UNASSIGNED_PROJECT_ID,
      title: "📚 منابع بدون پروژه",
      user: userId,
      sources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [userId]
  );

  // Fetch projects function
  const fetchProjects = React.useCallback(async () => {
    setError(null);
    try {
      const fetchedProjects = await apiGetProjects();
      setProjects([unassignedProject, ...fetchedProjects]);

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
    } catch (err: any) {
      setError(err.message || "خطا در دریافت پروژه‌ها");
    } finally {
      setIsRefreshing(false);
    }
  }, [unassignedProject]);

  // Initial fetch on mount
  React.useEffect(() => {
    setIsLoading(true);
    fetchProjects().finally(() => {
      setIsLoading(false);
    });
  }, [fetchProjects]);

  return {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isLoading,
    isRefreshing,
    error,
    setError,
    fetchProjects,
    unassignedProject,
  };
};
