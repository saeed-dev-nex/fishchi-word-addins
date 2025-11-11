import * as React from "react";
import { Title1, Body1, Button, makeStyles, tokens } from "@fluentui/react-components";
import { useAuth } from "../contexts/AuthContext";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    padding: "20px",
    textAlign: "center",
  },
  logo: {
    width: "80px",
    height: "80px",
    marginBottom: tokens.spacingVerticalL,
  },
  title: {
    marginBottom: tokens.spacingVerticalS,
  },
  body: {
    marginBottom: tokens.spacingVerticalXXL,
  },
});

export const LoginScreen: React.FC = () => {
  const styles = useStyles();
  const { login, isOfficeInitialized } = useAuth(); // Get login function from context

  return (
    <div className={styles.container}>
      <img src="assets/logo-filled.png" alt="Fishchi Logo" className={styles.logo} />
      <Title1 className={styles.title}>به فیشچی خوش آمدید</Title1>
      <Body1 className={styles.body}>برای دسترسی به پروژه‌ها و فیش‌های خود وارد شوید.</Body1>
      <Button appearance="primary" size="large" onClick={login} disabled={!isOfficeInitialized}>
        ورود به حساب کاربری
      </Button>
    </div>
  );
};
