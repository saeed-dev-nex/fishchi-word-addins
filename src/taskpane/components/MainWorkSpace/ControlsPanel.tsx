import React from "react";
import {
  Dropdown,
  Option,
  Text,
  SearchBox,
  Label,
  makeStyles,
  shorthands,
} from "@fluentui/react-components";
import { Project, CitationStyle } from "../../types/fishchi";
import { CITATION_STYLES, BIBLIOGRAPHY_LANGUAGES, BibLanguage } from "../../types/fishchi";

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
  },
  searchBox: {
    width: "100%",
    "& input": {
      ...shorthands.borderRadius("8px"),
      fontSize: "14px",
    },
  },
  sectionLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#605e5c",
    marginBottom: "4px",
    display: "block",
  },
});

interface ControlsPanelProps {
  projects: Project[];
  selectedProjectId: string | null;
  selectedStyle: CitationStyle;
  bibLanguage: BibLanguage;
  onProjectChange: (e: any, data: { optionValue?: string }) => void;
  onStyleChange: (e: any, data: { optionValue?: string }) => void;
  onBibLanguageChange: (e: any, data: { optionValue?: string }) => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  projects,
  selectedProjectId,
  selectedStyle,
  bibLanguage,
  onProjectChange,
  onStyleChange,
  onBibLanguageChange,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.controlsCard}>
      <div>
        <Text className={styles.sectionLabel}>انتخاب پروژه</Text>
        <Dropdown
          className={styles.dropdown}
          placeholder="یک پروژه را انتخاب کنید"
          value={selectedProjectId || ""}
          onOptionSelect={onProjectChange}
          style={{ color: "#242424" }}
        >
          {projects.map((proj) => (
            <Option key={proj._id} value={proj._id} text={proj.title}>
              {proj.title}
            </Option>
          ))}
        </Dropdown>

        <Label>استایل استناد</Label>
        <Dropdown
          placeholder="استایل را انتخاب کنید"
          value={selectedStyle}
          onOptionSelect={onStyleChange}
        >
          {CITATION_STYLES.map((style) => (
            <Option key={style.value} value={style.value}>
              {style.label}
            </Option>
          ))}
        </Dropdown>

        <Label>زبان کتاب‌نامه</Label>
        <Dropdown
          placeholder="زبان کتاب‌نامه را انتخاب کنید"
          value={bibLanguage}
          onOptionSelect={onBibLanguageChange}
        >
          {BIBLIOGRAPHY_LANGUAGES.map((lang) => (
            <Option key={lang.value} value={lang.value}>
              {lang.label}
            </Option>
          ))}
        </Dropdown>
      </div>

      <SearchBox
        className={styles.searchBox}
        placeholder="جستجو در منابع و فیش‌ها..."
        appearance="outline"
      />
    </div>
  );
};
