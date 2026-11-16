import React, { useEffect, useState } from "react";
import "./Sidebar.css";

import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import ChatIcon from "@mui/icons-material/Chat";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

import { Avatar, IconButton } from "@mui/material";

import SidebarChat from "../SidebarChat/SidebarChat";
import axios from "../axios";

const Sidebar = ({ messages = [], darkmode, onDarkModeToggle }) => {
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const response = await axios.get("/messages/actives");

        console.log("Usuários ativos recebidos:", response.data);

        if (Array.isArray(response.data)) {
          setActiveUsers(response.data);
        }
      } catch (error) {
        console.error("Erro ao buscar usuários ativos:", error);
      }
    };

    fetchActiveUsers();

    const intervalId = setInterval(fetchActiveUsers, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const logoDark =
    "/Gemini_Generated_Image_nsf4a7nsf4a7nsf4.png";
  const logoLight =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Instituto_Federal_Sul-rio-grandense_-_Marca_Vertical_2015.svg/1920px-Instituto_Federal_Sul-rio-grandense_-_Marca_Vertical_2015.svg.png";
  return (
    <div className={`sidebar ${darkmode ? "sidebar_darkMode" : ""}`}>
      <div
        className={`sidebar__header ${
          darkmode ? "sidebar__header_darkMode" : ""
        }`}
      >
        <Avatar src={darkmode ? logoDark : logoLight} />

        <div
          className={`sidebar__headerRight ${
            darkmode ? "sidebar__headerRight_darkMode" : ""
          }`}
        >
          <IconButton
            onClick={onDarkModeToggle}
            aria-label={darkmode ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {darkmode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          <IconButton>
            <DonutLargeIcon />
          </IconButton>

          <IconButton>
            <ChatIcon />
          </IconButton>

          <IconButton>
            <MoreVertIcon />
          </IconButton>
        </div>
      </div>

      <div
        className={`sidebar__search ${
          darkmode ? "sidebar__search_darkMode" : ""
        }`}
      >
        <div
          className={`sidebar__searchContainer ${
            darkmode ? "sidebar__searchContainer_darkMode" : ""
          }`}
        >
          <SearchOutlinedIcon />
          <input placeholder="Busque ou inicie um novo chat" type="text" />
        </div>
      </div>

      <div
        className={`sidebar__chats ${
          darkmode ? "sidebar__chats_darkMode" : ""
        }`}
      >
        {activeUsers.length > 0 ? (
          activeUsers.map((activeUser) => {
            const userMessages = messages.filter(
              (message) => message.name === activeUser,
            );

            const lastUserMessage = userMessages.reduce((latest, message) => {
              if (
                !latest ||
                new Date(message.timestamp).getTime() >
                  new Date(latest.timestamp).getTime()
              ) {
                return message;
              }

              return latest;
            }, null);

            console.log("Renderizando usuário:", activeUser);

            return (
              <SidebarChat
                key={activeUser}
                person={activeUser}
                lastTimestamp={lastUserMessage?.timestamp}
                darkmode={darkmode}
              />
            );
          })
        ) : (
          <p
            className={`sidebar__empty ${
              darkmode ? "sidebar__empty_darkMode" : ""
            }`}
          >
            Nenhum usuário ativo no momento.
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
