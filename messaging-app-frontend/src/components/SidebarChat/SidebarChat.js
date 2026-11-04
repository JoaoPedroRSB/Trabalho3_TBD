import React, { useEffect, useState } from "react";
import { Avatar } from "@mui/material";
import "./SidebarChat.css";

const SidebarChat = ({ person, lastTimestamp }) => {
  const [seed, setSeed] = useState("");

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 5000));
  }, []);

  return (
    <div className="sidebarChat">
      <Avatar
        src={`https://api.dicebear.com/9.x/toonhead/svg?flip=true&seed=${seed}`}
      />

      <div className="sidebarChat__info">
        <h2>{person}</h2>
        <p>{lastTimestamp || "Nenhuma atividade registrada"}</p>
      </div>
    </div>
  );
};

export default SidebarChat;
