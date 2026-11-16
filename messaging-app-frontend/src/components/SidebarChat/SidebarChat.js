import React, { useEffect, useState } from "react";
import { Avatar } from "@mui/material";
import "./SidebarChat.css";

const SidebarChat = ({ person, lastTimestamp, darkmode }) => {
  const [seed, setSeed] = useState("");

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 5000));
  }, []);

  return (
    <div
      className={`sidebarChat ${
        darkmode ? "sidebarChat_darkMode" : ""
      }`}
    >
      <Avatar
        src={`https://api.dicebear.com/9.x/toonhead/svg?flip=true&seed=${seed}`}
      />

      <div
        className={`sidebarChat__info ${
          darkmode ? "sidebarChat__info_darkMode" : ""
        }`}
      >
        <h2 className={darkmode ? "sidebarChat__name_darkMode" : ""}>
          {person}
        </h2>
        <p className={darkmode ? "sidebarChat__timestamp_darkMode" : ""}>
          {lastTimestamp || "Nenhuma atividade registrada"}
        </p>
      </div>
    </div>
  );
};

export default SidebarChat;
