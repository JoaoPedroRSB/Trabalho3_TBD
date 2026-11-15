import React, { useEffect, useRef, useState } from "react";

import { Avatar, IconButton, Menu, MenuItem } from "@mui/material";
import ReplyIcon from "@mui/icons-material/Reply";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";
import MicIcon from "@mui/icons-material/Mic";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import axios from "../axios";
import { useStateValue } from "../StateProvider";

import "./Chat.css";

// Formatar data e horário
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  if (isNaN(date.getTime())) return timestamp;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  });
};

const Chat = ({ messages = [], onMessagesUpdated }) => {
  const [seed, setSeed] = useState("");
  const [input, setInput] = useState("");

  // Controle do menu de opções
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Controle da edição
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedText, setEditedText] = useState("");

  // Controle da resposta
  const [replyingTo, setReplyingTo] = useState(null);

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

        // ID da mensagem respondida
        replyToId: replyingTo?._id || null,
      });

      setInput("");
      setReplyingTo(null);

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

    // ID da mensagem respondida, caso exista
    if (replyingTo) {
      formData.append("replyToId", replyingTo._id);
    }

    try {
      await axios.post("/messages/image", formData);

      // Limpar a resposta selecionada
      setReplyingTo(null);

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

  // Abrir menu de opções
  const handleMenuOpen = (event, message) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessage(message);
  };

  // Fechar menu
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Selecionar mensagem para responder
  const handleReply = () => {
    if (!selectedMessage) return;

    setReplyingTo(selectedMessage);
    handleMenuClose();
  };

  // Iniciar edição
  const handleEdit = () => {
    if (!selectedMessage) return;

    setEditingMessageId(selectedMessage._id);
    setEditedText(selectedMessage.message);

    handleMenuClose();
  };

  // Cancelar edição
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditedText("");
  };

  // Salvar mensagem editada
  const saveEditedMessage = async (e) => {
    e.preventDefault();

    if (!editedText.trim()) {
      alert("A mensagem não pode ficar vazia.");
      return;
    }

    try {
      await axios.put(`/messages/${editingMessageId}`, {
        message: editedText,
        name: user,
      });

      cancelEdit();

      if (onMessagesUpdated) {
        await onMessagesUpdated();
      }
    } catch (error) {
      console.error("Erro ao editar mensagem:", error);

      alert(
        error.response?.data?.message || "Não foi possível editar a mensagem.",
      );
    }
  };

  // Excluir mensagem
  const handleDelete = async () => {
    if (!selectedMessage) return;

    const messageId = selectedMessage._id;

    const confirmed = window.confirm(
      "Tem certeza de que deseja excluir esta mensagem?",
    );

    handleMenuClose();

    if (!confirmed) return;

    try {
      await axios.delete(`/messages/${messageId}`, {
        data: {
          name: user,
        },
      });

      setSelectedMessage(null);

      if (onMessagesUpdated) {
        await onMessagesUpdated();
      }
    } catch (error) {
      console.error("Erro ao excluir mensagem:", error);

      alert(
        error.response?.data?.message || "Não foi possível excluir a mensagem.",
      );
    }
  };

  // Gerar avatar
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

          <p>
            Visto em:{" "}
            {lastMessage?.timestamp
              ? formatTimestamp(lastMessage.timestamp)
              : "Nenhuma mensagem ainda"}
          </p>
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
        {messages.map((message) => {
          const isOwnMessage = message.name === user;
          const isEditing = editingMessageId === message._id;

          return (
            <div
              key={message._id}
              className={`chat__message ${
                isOwnMessage ? "chat__receiver" : ""
              }`}
            >
              <div className="chat__messageHeader">
                <span className="chat__name">{message.name}</span>

                {/* Menu de opções em todas as mensagens */}
                <IconButton
                  size="small"
                  className="chat__messageMenuButton"
                  onClick={(e) => handleMenuOpen(e, message)}
                  aria-label="Opções da mensagem"
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </div>

              {/* Referência à mensagem respondida */}
              {message.replyTo?.messageId && (
                <div className="chat__replyReference">
                  <span className="chat__replyReferenceName">
                    {message.replyTo.name}
                  </span>

                  {message.replyTo.imageId ? (
                    <div className="chat__replyReferenceContent">
                      <ReplyIcon fontSize="small" />
                      <span>Imagem</span>
                    </div>
                  ) : (
                    <div className="chat__replyReferenceContent">
                      <ReplyIcon fontSize="small" />
                      <span>{message.replyTo.message || "Mensagem"}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Conteúdo da mensagem */}
              {isEditing ? (
                <form className="chat__editForm" onSubmit={saveEditedMessage}>
                  <input
                    type="text"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    autoFocus
                  />

                  <div className="chat__editActions">
                    <button type="submit">Salvar</button>

                    <button type="button" onClick={cancelEdit}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {message.imageId ? (
                    <img
                      src={`http://localhost:9000/messages/image/${message.imageId}`}
                      alt="Imagem enviada"
                      className="chat__image"
                    />
                  ) : (
                    <span className="chat__messageText">{message.message}</span>
                  )}
                </>
              )}

              {/* Data e identificação de edição */}
              <span className="chat__timestamp">
                {message.edited && !isEditing ? "Editada • " : ""}
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Menu de opções */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {/* Responder aparece para todas as mensagens */}
        <MenuItem onClick={handleReply}>
          <ReplyIcon fontSize="small" sx={{ mr: 1 }} />
          Responder
        </MenuItem>

        {/* Editar e excluir aparecem somente nas próprias mensagens */}
        {selectedMessage?.name === user && (
          <>
            <MenuItem
              onClick={handleEdit}
              disabled={Boolean(selectedMessage?.imageId)}
            >
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              Editar mensagem
            </MenuItem>

            <MenuItem onClick={handleDelete}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              Excluir mensagem
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Rodapé */}
      <div className="chat__footer">
        {/* Prévia da mensagem que será respondida */}
        {replyingTo && (
          <div className="chat__replyingPreview">
            <div className="chat__replyingPreviewContent">
              <span className="chat__replyingPreviewName">
                Respondendo a {replyingTo.name}
              </span>

              {replyingTo.imageId ? (
                <span className="chat__replyingPreviewText">
                  <ReplyIcon fontSize="small" />
                  Imagem
                </span>
              ) : (
                <span className="chat__replyingPreviewText">
                  {replyingTo.message || "Mensagem"}
                </span>
              )}
            </div>

            <IconButton
              size="small"
              onClick={() => setReplyingTo(null)}
              aria-label="Cancelar resposta"
            >
              <span>×</span>
            </IconButton>
          </div>
        )}

        {/* Campo de envio */}
        <div className="chat__footerInput">
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
    </div>
  );
};

export default Chat;
