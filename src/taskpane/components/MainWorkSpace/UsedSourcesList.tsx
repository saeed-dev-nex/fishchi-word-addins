import * as React from "react";
import { Button, Text, Spinner, makeStyles, shorthands, Badge } from "@fluentui/react-components";
import { Source } from "../../types/fishchi";
import { EmptyState } from "./EmptyStates";

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
    position: "relative",
    "&:hover": {
      backgroundColor: "#f0f6ff",
      ...shorthands.borderColor("#0078d4"),
      boxShadow: "0 2px 6px rgba(0, 120, 212, 0.15)",
      transform: "translateY(-1px)",
    },
  },
  usedBadge: {
    position: "absolute",
    top: "8px",
    right: "8px",
  },
  sourceTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#242424",
    marginBottom: "4px",
    display: "block",
    lineHeight: "1.4",
    paddingRight: "60px",
  },
  sourceMetadata: {
    fontSize: "13px",
    color: "#605e5c",
    lineHeight: "1.3",
  },
  actionButtons: {
    display: "flex",
    gap: "4px",
    marginTop: "8px",
  },
  citationInfo: {
    fontSize: "12px",
    color: "#666",
    marginTop: "8px",
    fontStyle: "italic",
  },
});

interface UsedSourcesListProps {
  sources: Source[];
  citedSourceIds: Set<string>;
  selectedStyle: string;
  isInserting: string | null;
  onRemoveCitation: (sourceId: string) => void;
  onInsertCitation: (sourceId: string, e: React.MouseEvent, shouldTranslate: boolean) => void;
  onViewInDocument: (sourceId: string) => void;
}

export const UsedSourcesList: React.FC<UsedSourcesListProps> = ({
  sources,
  citedSourceIds,
  selectedStyle,
  isInserting,
  onRemoveCitation,
  onInsertCitation,
  onViewInDocument,
}) => {
  const styles = useStyles();

  // Filter only sources that are cited in the document
  const usedSources = sources.filter((source) => citedSourceIds.has(source._id));

  if (usedSources.length === 0) {
    return (
      <EmptyState
        icon="📋"
        message="هنوز منبعی در سند استفاده نشده است. برای اضافه کردن منبع به تب 'منابع' بروید."
      />
    );
  }

  return (
    <div className={styles.list}>
      {usedSources.map((source, index) => {
        const isNonPersian =
          source.language && !["persian", "fa", "fa-IR"].includes(source.language.toLowerCase());

        return (
          <div
            key={source._id}
            className={styles.listItem}
            onClick={() => onViewInDocument(source._id)}
          >
            <Badge appearance="filled" color="success" className={styles.usedBadge}>
              استفاده شده
            </Badge>

            <Text className={styles.sourceTitle}>{source.title}</Text>
            
            <Text className={styles.sourceMetadata}>
              {source.authors.map((a) => a.lastname).join("، ")}
              {source.year && ` (${source.year})`}
            </Text>

            <div className={styles.citationInfo}>
              شیوه منبع‌نویسی: <strong>{selectedStyle.toUpperCase()}</strong>
              {selectedStyle.toLowerCase() === "vancouver" && (
                <> | شماره: <strong>[{index + 1}]</strong></>
              )}
            </div>

            <div className={styles.actionButtons}>
              <Button
                size="small"
                appearance="subtle"
                onClick={(e) => {
                  e.stopPropagation();
                  onInsertCitation(source._id, e, false);
                }}
                disabled={isInserting === source._id}
                title="درج مجدد استناد"
              >
                {isInserting === source._id ? <Spinner size="tiny" /> : "درج مجدد"}
              </Button>

              {isNonPersian && (
                <Button
                  size="small"
                  appearance="subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInsertCitation(source._id, e, true);
                  }}
                  disabled={isInserting === `${source._id}_translate`}
                  title="ترجمه و درج مجدد"
                >
                  {isInserting === `${source._id}_translate` ? (
                    <Spinner size="tiny" />
                  ) : (
                    "🤖 ترجمه و درج"
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
                title="حذف از سند"
                style={{ color: "#d13438" }}
              >
                حذف از سند
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};