import * as React from "react";
import {
  Button,
  Text,
  Spinner,
  makeStyles,
  shorthands,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Dropdown,
  Option,
} from "@fluentui/react-components";
import { ArrowSyncFilled, CheckmarkCircleFilled, DismissCircleFilled } from "@fluentui/react-icons";
import { CitationStyle, CITATION_STYLES } from "../../types/fishchi";

const useStyles = makeStyles({
  card: {
    backgroundColor: "#ffffff",
    ...shorthands.padding("16px"),
    ...shorthands.borderRadius("12px"),
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("12px"),
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  conversionInfo: {
    backgroundColor: "#f0f6ff",
    ...shorthands.padding("12px"),
    ...shorthands.borderRadius("8px"),
    ...shorthands.border("1px", "solid", "#d0e4ff"),
    fontSize: "13px",
    lineHeight: "1.5",
  },
  warningBox: {
    backgroundColor: "#fff4e6",
    ...shorthands.padding("12px"),
    ...shorthands.borderRadius("8px"),
    ...shorthands.border("1px", "solid", "#ffd591"),
    fontSize: "13px",
    color: "#d46b08",
    marginTop: "8px",
  },
  successBox: {
    backgroundColor: "#f6ffed",
    ...shorthands.padding("12px"),
    ...shorthands.borderRadius("8px"),
    ...shorthands.border("1px", "solid", "#b7eb8f"),
    fontSize: "13px",
    color: "#52c41a",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("8px"),
  },
  errorBox: {
    backgroundColor: "#fff2f0",
    ...shorthands.padding("12px"),
    ...shorthands.borderRadius("8px"),
    ...shorthands.border("1px", "solid", "#ffccc7"),
    fontSize: "13px",
    color: "#ff4d4f",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("8px"),
  },
  progressInfo: {
    fontSize: "12px",
    color: "#666",
    marginTop: "8px",
  },
});

interface StyleConverterProps {
  currentStyle: CitationStyle;
  citedCount: number;
  onConvert: (newStyle: CitationStyle) => Promise<void>;
}

export const StyleConverter: React.FC<StyleConverterProps> = ({
  currentStyle,
  citedCount,
  onConvert,
}) => {
  const styles = useStyles();
  const [isOpen, setIsOpen] = React.useState(false);
  const [targetStyle, setTargetStyle] = React.useState<CitationStyle>(currentStyle);
  const [isConverting, setIsConverting] = React.useState(false);
  const [conversionResult, setConversionResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [progress, setProgress] = React.useState<string>("");

  const handleConvert = async () => {
    if (targetStyle === currentStyle) {
      setConversionResult({
        success: false,
        message: "شیوه هدف با شیوه فعلی یکسان است!",
      });
      return;
    }

    setIsConverting(true);
    setConversionResult(null);
    setProgress("در حال شروع تبدیل...");

    try {
      // Step 1: Update progress
      setProgress(`در حال تبدیل ${citedCount} استناد...`);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 2: Call conversion
      await onConvert(targetStyle);

      // Step 3: Success
      setProgress("تبدیل با موفقیت انجام شد!");
      setConversionResult({
        success: true,
        message: `تمام استنادها و کتاب‌نامه از ${currentStyle.toUpperCase()} به ${targetStyle.toUpperCase()} تبدیل شدند.`,
      });

      // Auto close after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setConversionResult(null);
        setProgress("");
      }, 2000);
    } catch (error: any) {
      console.error("Conversion error:", error);
      setConversionResult({
        success: false,
        message: error.message || "خطا در تبدیل شیوه منبع‌نویسی",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleDialogClose = () => {
    if (!isConverting) {
      setIsOpen(false);
      setConversionResult(null);
      setProgress("");
      setTargetStyle(currentStyle);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Text weight="semibold">تبدیل شیوه منبع‌نویسی</Text>
      </div>

      <div className={styles.conversionInfo}>
        <Text size={200}>
          شیوه فعلی: <strong>{currentStyle.toUpperCase()}</strong>
        </Text>
        <br />
        <Text size={200}>تعداد استنادها: {citedCount}</Text>
      </div>

      <Dialog open={isOpen} onOpenChange={(_, data) => setIsOpen(data.open)}>
        <DialogTrigger disableButtonEnhancement>
          <Button
            appearance="primary"
            icon={<ArrowSyncFilled />}
            disabled={citedCount === 0}
            title="تبدیل شیوه تمام استنادها و کتاب‌نامه"
          >
            تبدیل به شیوه دیگر
          </Button>
        </DialogTrigger>

        <DialogSurface>
          <DialogBody>
            <DialogTitle>تبدیل شیوه منبع‌نویسی</DialogTitle>
            <DialogContent>
              <div style={{ marginBottom: "16px" }}>
                <Text size={300}>
                  شما می‌خواهید <strong>{citedCount}</strong> استناد و کتاب‌نامه را از{" "}
                  <strong>{currentStyle.toUpperCase()}</strong> به شیوه جدید تبدیل کنید.
                </Text>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <Text weight="semibold" block style={{ marginBottom: "8px" }}>
                  شیوه جدید را انتخاب کنید:
                </Text>
                <Dropdown
                  placeholder="انتخاب شیوه"
                  value={targetStyle}
                  onOptionSelect={(_, data) => setTargetStyle(data.optionValue as CitationStyle)}
                  disabled={isConverting}
                >
                  {CITATION_STYLES.map((style) => (
                    <Option
                      text={style.label}
                      key={style.value}
                      value={style.value}
                      disabled={style.value === currentStyle}
                    >
                      {style.label}
                      {style.value === currentStyle && " (فعلی)"}
                    </Option>
                  ))}
                </Dropdown>
              </div>

              {targetStyle !== currentStyle && (
                <div className={styles.warningBox}>
                  ⚠️ <strong>هشدار:</strong> این عملیات تمام استنادهای درون‌متنی و کتاب‌نامه را
                  بازنویسی می‌کند. اطمینان حاصل کنید که پشتیبان از سند خود دارید.
                </div>
              )}

              {isConverting && (
                <div className={styles.progressInfo}>
                  <Spinner size="small" /> {progress}
                </div>
              )}

              {conversionResult && (
                <div className={conversionResult.success ? styles.successBox : styles.errorBox}>
                  {conversionResult.success ? <CheckmarkCircleFilled /> : <DismissCircleFilled />}
                  <Text>{conversionResult.message}</Text>
                </div>
              )}
            </DialogContent>

            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary" onClick={handleDialogClose} disabled={isConverting}>
                  انصراف
                </Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={handleConvert}
                disabled={isConverting || targetStyle === currentStyle}
              >
                {isConverting ? <Spinner size="tiny" /> : "تبدیل"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
