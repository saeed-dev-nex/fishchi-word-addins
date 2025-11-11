import * as React from "react";
import { Text, Button, Spinner, makeStyles, shorthands } from "@fluentui/react-components";

const useStyles = makeStyles({
  emptyState: {
    ...shorthands.padding("40px", "20px"),
    textAlign: "center",
    color: "#605e5c",
    fontSize: "14px",
  },
  emptyStateIcon: {
    fontSize: "48px",
    marginBottom: "12px",
    opacity: 0.3,
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    ...shorthands.padding("40px"),
  },
});

interface EmptyStateProps {
  icon: string;
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, message }) => {
  const styles = useStyles();

  return (
  <div className={styles.emptyState}>

      <div className={styles.emptyStateIcon}>{icon}</div>
      <Text>{message}</Text>
    </div>
  );
};

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = "در حال بارگذاری..." }) => {
  const styles = useStyles();

  return (
    <div className={styles.loadingContainer}>
      <Spinner label={message} size="large" />
    </div>
  );
};

interface NoProjectsStateProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const NoProjectsState: React.FC<NoProjectsStateProps> = ({ onRefresh, isRefreshing }) => {
  const styles = useStyles();

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>📁</div>
      <Text weight="semibold">پروژه‌ای یافت نشد</Text>
      <br />
      <Text size={300}>لطفاً ابتدا در اپلیکیشن وب یک پروژه ایجاد کنید.</Text>
      <br />
      <Button
        appearance="primary"
        onClick={onRefresh}
        disabled={isRefreshing}
        style={{ marginTop: "16px" }}
      >
        {isRefreshing ? <Spinner size="tiny" /> : "تلاش مجدد"}
      </Button>
    </div>
  );
};
