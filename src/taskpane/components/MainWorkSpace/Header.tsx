import * as React from "react";
import { Avatar, Button, Text, Spinner, makeStyles, shorthands } from "@fluentui/react-components";
import { ArrowSyncFilled } from "@fluentui/react-icons";
import { UserProfile } from "../../types/fishchi";

const useStyles = makeStyles({
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    ...shorthands.padding("16px"),
    ...shorthands.borderRadius("12px"),
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    ...shorthands.gap("12px"),
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("12px"),
    flexGrow: 1,
  },
  userName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#242424",
  },
  headerButtons: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("8px"),
  },
  logoutButton: {
    minWidth: "80px",
  },
});

interface HeaderProps {
  user: UserProfile;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, isRefreshing, onRefresh, onLogout }) => {
  const styles = useStyles();

  return (
    <div className={styles.header}>
      <div className={styles.userInfo}>
        <Avatar
          name={user.username}
          size={40}
          color="brand"
          image={user.avatar ? { src: `https://localhost:5000/${user.avatar}` } : undefined}
        />
        <Text className={styles.userName}>{user.username}</Text>
      </div>
      <div className={styles.headerButtons}>
        <Button
          appearance="subtle"
          icon={isRefreshing ? <Spinner size="tiny" /> : <ArrowSyncFilled />}
          onClick={onRefresh}
          disabled={isRefreshing}
          title="بروزرسانی لیست پروژه‌ها و منابع"
        >
          {isRefreshing ? "بروزرسانی..." : ""}
        </Button>
        <Button appearance="subtle" onClick={onLogout} className={styles.logoutButton}>
          خروج
        </Button>
      </div>
    </div>
  );
};
