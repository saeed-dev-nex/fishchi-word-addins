import * as React from "react";
import { Button, Text, Spinner, makeStyles, shorthands } from "@fluentui/react-components";
import { getCitedSourceIds } from "../../services/wordService";

const useStyles = makeStyles({
  controlsCard: {
    backgroundColor: "#ffffff",
    ...shorthands.padding("16px"),
    ...shorthands.borderRadius("12px"),
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("12px"),
  },
});

interface CitationManagementPanelProps {
  selectedStyle: string;
  autoUpdateBib: boolean;
  isInserting: string | null;
  isInsertingBib: boolean;
  onInsertBibliography: () => void;
  onRenumberVancouver: () => void;
  onClearAllCitations: () => void;
  onClearBibliography: () => void;
  onAutoUpdateChange: (checked: boolean) => void;
}

export const CitationManagementPanel: React.FC<CitationManagementPanelProps> = ({
  selectedStyle,
  autoUpdateBib,
  isInserting,
  isInsertingBib,
  onInsertBibliography,
  onRenumberVancouver,
  onClearAllCitations,
  onClearBibliography,
  onAutoUpdateChange,
}) => {
  const styles = useStyles();
  const citedCount = getCitedSourceIds().length;

  return (
    <div className={styles.controlsCard}>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Text weight="semibold">مدیریت استنادها</Text>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button
            appearance="primary"
            size="small"
            onClick={onInsertBibliography}
            disabled={isInsertingBib || citedCount === 0}
            title="درج کتاب‌نامه در انتهای سند"
          >
            {isInsertingBib ? <Spinner size="tiny" /> : "درج کتاب‌نامه"}
          </Button>

          {selectedStyle.toLowerCase() === "vancouver" && (
            <Button
              appearance="secondary"
              size="small"
              onClick={onRenumberVancouver}
              disabled={isInserting === "renumber" || citedCount === 0}
              title="تجدید شماره‌گذاری استنادهای ونکوور"
            >
              {isInserting === "renumber" ? <Spinner size="tiny" /> : "شماره‌گذاری مجدد"}
            </Button>
          )}

          <Button
            appearance="subtle"
            size="small"
            onClick={onClearAllCitations}
            disabled={isInserting === "clear" || citedCount === 0}
            title="پاک کردن تمام استنادها از سند"
          >
            {isInserting === "clear" ? <Spinner size="tiny" /> : "پاک کردن همه استنادها"}
          </Button>

          <Button
            appearance="subtle"
            size="small"
            onClick={onClearBibliography}
            disabled={isInserting === "clear-bib"}
            title="پاک کردن فقط کتاب‌نامه (استنادها باقی می‌مانند)"
          >
            {isInserting === "clear-bib" ? <Spinner size="tiny" /> : "پاک کردن کتاب‌نامه"}
          </Button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
          <input
            type="checkbox"
            id="autoUpdateBib"
            checked={autoUpdateBib}
            onChange={(e) => onAutoUpdateChange(e.target.checked)}
          />
          <label htmlFor="autoUpdateBib">
            <Text size={200}>به‌روزرسانی خودکار کتاب‌نامه</Text>
          </label>
        </div>

        {citedCount > 0 && (
          <Text size={200} style={{ color: "#666" }}>
            {citedCount} منبع استناد شده
          </Text>
        )}
      </div>
    </div>
  );
};
