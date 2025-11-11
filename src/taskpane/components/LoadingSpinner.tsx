import * as React from "react";
import { Spinner, makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  spinnerContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
});

interface LoadingSpinnerProps {
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = "در حال بارگذاری..." }) => {
  const styles = useStyles();
  return (
    <div className={styles.spinnerContainer}>
      <Spinner size="huge" label={label} />
    </div>
  );
};
