import * as React from "react";
import { Button, Text, Spinner, makeStyles, shorthands } from "@fluentui/react-components";
import { Source } from "../../types/fishchi";
import { EmptyState } from "./EmptyStates";
import { UNASSIGNED_PROJECT_ID } from "../../types/fishchi";

const useStyles = makeStyles({
  list: {
    maxHeight: "400px",
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
});

interface SourcesListProps {
  sources: Source[];
  selectedSourceId: string | null;
  selectedProjectId: string | null;
  citedSourceIds: Set<string>;
  isInserting: string | null;
  onSourceClick: (sourceId: string) => void;
  onInsertCitation: (sourceId: string, e: React.MouseEvent, shouldTranslate: boolean) => void;
  onRemoveCitation: (sourceId: string) => void;
}

export const SourcesList: React.FC<SourcesListProps> = ({
  sources,
  selectedSourceId,
  selectedProjectId,
  citedSourceIds,
  isInserting,
  onSourceClick,
  onInsertCitation,
  onRemoveCitation,
}) => {
  const styles = useStyles();

  if (sources.length === 0) {
    return (
      <EmptyState
        icon="📚"
        message={
          selectedProjectId === UNASSIGNED_PROJECT_ID
            ? "منبع بدون پروژه‌ای یافت نشد"
            : "منبعی در این پروژه یافت نشد"
        }
      />
    );
  }

  return (
    <div className={styles.list}>
      {sources.map((source) => {
        const isNonPersian =
          source.language && !["persian", "fa", "fa-IR"].includes(source.language.toLowerCase());

        return (
          <div
            key={source._id}
            className={`${styles.listItem} ${
              source._id === selectedSourceId ? styles.selectedListItem : ""
            }`}
            onClick={() => onSourceClick(source._id)}
          >
            <Text className={styles.sourceTitle}>{source.title}</Text>
            <Text className={styles.sourceMetadata}>
              {source.authors.map((a) => a.lastname).join("، ")}
              {source.year && ` (${source.year})`}
            </Text>

            <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
              {!citedSourceIds.has(source._id) ? (
                <>
                  <Button
                    size="small"
                    appearance="subtle"
                    onClick={(e) => onInsertCitation(source._id, e, false)}
                    disabled={isInserting === source._id}
                    title="درج استناد (زبان اصلی)"
                  >
                    {isInserting === source._id ? <Spinner size="tiny" /> : "درج استناد"}
                  </Button>
                  {isNonPersian && (
                    <Button
                      size="small"
                      appearance="subtle"
                      onClick={(e) => onInsertCitation(source._id, e, true)}
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
                  <Button
                    size="small"
                    appearance="subtle"
                    onClick={(e) => onInsertCitation(source._id, e, false)}
                    disabled={isInserting === source._id}
                    title="درج استناد مجدد (زبان اصلی)"
                  >
                    {isInserting === source._id ? <Spinner size="tiny" /> : "درج مجدد"}
                  </Button>
                  {isNonPersian && (
                    <Button
                      size="small"
                      appearance="subtle"
                      onClick={(e) => onInsertCitation(source._id, e, true)}
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
                  <Button
                    size="small"
                    appearance="subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveCitation(source._id);
                    }}
                    disabled={isInserting === source._id}
                    title="حذف استناد از متن"
                    style={{ color: "#d13438" }}
                  >
                    حذف استناد
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
