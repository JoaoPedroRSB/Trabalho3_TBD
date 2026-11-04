import "./App.css";

import Sidebar from "./components/Sidebar/Sidebar";
import Chat from "./components/Chat/Chat";
import Login from "./components/Login/Login";

import React, { useCallback, useEffect, useState } from "react";

import axios from "./components/axios";
import { useStateValue } from "./components/StateProvider";

function App() {
  const [messages, setMessages] = useState([]);

  const [{ user }] = useStateValue();

  // Buscar mensagens do MongoDB
  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get("/messages/sync");

      setMessages(res.data);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    }
  }, []);

  // Buscar mensagens ao abrir o aplicativo
  // e atualizar automaticamente a cada 3 segundos
  useEffect(() => {
    fetchMessages();

    const intervalId = setInterval(fetchMessages, 3000);

    return () => clearInterval(intervalId);
  }, [fetchMessages]);

  return (
    <div className="App">
      {!user ? (
        <Login />
      ) : (
        <div className="app__body">
          <Sidebar messages={messages} />

          <Chat messages={messages} onMessagesUpdated={fetchMessages} />
        </div>
      )}
    </div>
  );
}

export default App;
