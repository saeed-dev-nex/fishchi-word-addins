import * as React from "react";
import { Button, Text, Spinner, makeStyles, shorthands } from "@fluentui/react-components";
import { Note, Source } from "../../types/fishchi";
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
});

interface NotesListProps {
  notes: Note[];
  sources: Source[];
  selectedProjectId: string | null;
  selectedSourceId: string | null;
  isInserting: string | null;
  onNoteClick: (note: Note, shouldTranslate: boolean) => void;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  sources,
  selectedProjectId,
  selectedSourceId,
  isInserting,
  onNoteClick,
}) => {
  const styles = useStyles();

  if (notes.length === 0) {
    return (
      <EmptyState
        icon="📝"
        message={
          selectedProjectId === UNASSIGNED_PROJECT_ID
            ? "یادداشت‌ها فقط در پروژه‌ها در دسترس هستند"
            : selectedSourceId
              ? "فیشی برای این منبع یافت نشد"
              : "ابتدا یک منبع را انتخاب کنید"
        }
      />
    );
  }

  return (
    <div className={styles.list}>
      {notes.map((note) => {
        const parentSource = sources.find((s) => s._id === note.source);
        const isNonPersian =
          parentSource?.language &&
          !["persian", "fa", "fa-IR"].includes(parentSource.language.toLowerCase());

        return (
          <div
            key={note._id}
            className={styles.listItem}
            onClick={() => onNoteClick(note, false)}
            title="برای درج فیش (با ارجاع اصلی) کلیک کنید"
          >
            <div
              className={styles.noteContent}
              dangerouslySetInnerHTML={{ __html: note.content }}
            />

            {isNonPersian && (
              <div style={{ marginTop: "8px" }}>
                <Button
                  size="small"
                  appearance="subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNoteClick(note, true);
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
    </div>
  );
};
