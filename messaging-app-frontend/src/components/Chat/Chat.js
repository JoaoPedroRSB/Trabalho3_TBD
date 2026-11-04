import React, { useEffect, useRef, useState } from "react";

import { Avatar, IconButton } from "@mui/material";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";
import MicIcon from "@mui/icons-material/Mic";

import axios from "../axios";
import { useStateValue } from "../StateProvider";

import "./Chat.css";

const Chat = ({ messages = [], onMessagesUpdated }) => {
  const [seed, setSeed] = useState("");
  const [input, setInput] = useState("");

  const fileInputRef = useRef(null);

  const [{ user }] = useStateValue();

  // Enviar mensagem de texto
  const sendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    try {
      await axios.post("/messages/new", {
        message: input,
        name: user,
        timestamp: new Date().toUTCString(),
        received: true,
      });

      setInput("");

      if (onMessagesUpdated) {
        await onMessagesUpdated();
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  // Abrir seletor de arquivos
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Enviar imagem
  const sendImage = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (file.type !== "image/png") {
      alert("Envie apenas imagens PNG.");
      e.target.value = "";
      return;
    }

    const formData = new FormData();

    formData.append("image", file);
    formData.append("name", user);

    try {
      await axios.post("/messages/image", formData);

      if (onMessagesUpdated) {
        await onMessagesUpdated();
      }
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);

      alert(
        error.response?.data?.message || "Não foi possível enviar a imagem.",
      );
    } finally {
      e.target.value = "";
    }
  };

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 5000));
  }, []);

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="chat">
      {/* Cabeçalho */}
      <div className="chat__header">
        <Avatar
          src={`https://api.dicebear.com/9.x/toonhead/svg?flip=true&seed=${seed}`}
        />

        <div className="chat__headerInfo">
          <h3>Dev Help</h3>

          <p>Visto em: {lastMessage?.timestamp || "Nenhuma mensagem ainda"}</p>
        </div>

        <div className="chat__headerRight">
          <IconButton>
            <SearchIcon />
          </IconButton>

          {/* Input oculto para selecionar imagens */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png"
            onChange={sendImage}
            style={{ display: "none" }}
          />

          {/* Botão de anexar */}
          <IconButton onClick={openFileSelector}>
            <AttachFileIcon />
          </IconButton>

          <IconButton>
            <MoreVertIcon />
          </IconButton>
        </div>
      </div>

      {/* Mensagens */}
      <div className="chat__body">
        {messages.map((message) => (
          <p
            key={message._id}
            className={`chat__message ${
              message.name === user ? "chat__receiver" : ""
            }`}
          >
            <span className="chat__name">{message.name}</span>

            {message.imageId ? (
              <img
                src={`http://localhost:9000/messages/image/${message.imageId}`}
                alt="Imagem enviada"
                className="chat__image"
              />
            ) : (
              message.message
            )}

            <span className="chat__timestamp">{message.timestamp}</span>
          </p>
        ))}
      </div>

      {/* Rodapé */}
      <div className="chat__footer">
        <InsertEmoticonIcon />

        <form onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem"
            type="text"
          />

          <button type="submit">Enviar</button>
        </form>

        <MicIcon />
      </div>
    </div>
  );
};

export default Chat;
