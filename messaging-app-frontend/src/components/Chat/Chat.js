import React, { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";

import { Avatar, IconButton, Menu, MenuItem } from "@mui/material";
import ReplyIcon from "@mui/icons-material/Reply";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";
import MicIcon from "@mui/icons-material/Mic";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import StopIcon from "@mui/icons-material/Stop";

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

const Chat = ({ messages = [], onMessagesUpdated, darkmode }) => {
  const [seed, setSeed] = useState("");
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Controle do menu de opções
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Controle da edição
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedText, setEditedText] = useState("");

  // Controle da resposta
  const [replyingTo, setReplyingTo] = useState(null);

  const [recording, setRecording] = useState(false);

  const fileInputRef = useRef(null);
  const recorderRef = useRef(null);

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

  const handleEmojiClick = (emojiData) => {
    setInput((currentInput) => currentInput + emojiData.emoji);
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

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const formData = new FormData();

        formData.append("audio", new Blob(chunks, { type: recorder.mimeType }));
        formData.append("name", user);

        try {
          await axios.post("/messages/audio", formData);

          if (onMessagesUpdated) {
            await onMessagesUpdated();
          }
        } catch (error) {
          console.error("Erro ao enviar áudio:", error);
          alert("Não foi possível enviar o áudio.");
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (error) {
      console.error("Erro ao acessar o microfone:", error);
      alert("Não foi possível acessar o microfone.");
    }
  };

  const clearConversation = async () => {
    if (!window.confirm("Tem certeza de que deseja apagar toda a conversa?")) {
      return;
    }

    try {
      await axios.delete("/messages");

      if (onMessagesUpdated) {
        await onMessagesUpdated();
      }
    } catch (error) {
      console.error("Erro ao limpar conversa:", error);
      alert("Não foi possível limpar a conversa.");
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
      selectedMessage.audioId
        ? "Tem certeza de que deseja apagar este áudio?"
        : "Tem certeza de que deseja excluir esta mensagem?",
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
    <div className={`chat ${darkmode ? "chat_darkMode" : ""}`}>
      {/* Cabeçalho */}
      <div className={`chat__header ${darkmode ? "chat__header_darkMode" : ""}`}>
        <Avatar
          src={`https://api.dicebear.com/9.x/toonhead/svg?flip=true&seed=${seed}`}
        />

        <div
          className={`chat__headerInfo ${
            darkmode ? "chat__headerInfo_darkMode" : ""
          }`}
        >
          <h3>Dev Help</h3>

          <p>
            Visto em:{" "}
            {lastMessage?.timestamp
              ? formatTimestamp(lastMessage.timestamp)
              : "Nenhuma mensagem ainda"}
          </p>
        </div>

        <div
          className={`chat__headerRight ${
            darkmode ? "chat__headerRight_darkMode" : ""
          }`}
        >
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

          {/* Botão de anexar a */}
          <IconButton onClick={openFileSelector}>
            <AttachFileIcon />
          </IconButton>

          <IconButton onClick={clearConversation} aria-label="Limpar conversa">
            <DeleteSweepIcon />
          </IconButton>

          <IconButton>
            <MoreVertIcon />
          </IconButton>
        </div>
      </div>

      {/* Mensagens  */}
      <div className={`chat__body ${darkmode ? "chat__body_darkMode" : ""}`}>
        {messages.map((message) => {
          const isOwnMessage = message.name === user;
          const isEditing = editingMessageId === message._id;

          return (
            <div
              key={message._id}
              className={`chat__message ${
                isOwnMessage ? "chat__receiver" : ""
              } ${darkmode ? "chat__message_darkMode" : ""} ${
                isOwnMessage && darkmode ? "chat__receiver_darkMode" : ""
              }`}
            >
              <div
                className={`chat__messageHeader ${
                  darkmode ? "chat__messageHeader_darkMode" : ""
                }`}
              >
                <span
                  className={`chat__name ${
                    darkmode ? "chat__name_darkMode" : ""
                  }`}
                >
                  {message.name}
                </span>

                {/* Menu de opções em todas as mensagens */}

                <IconButton
                  size="small"
                  className={`chat__messageMenuButton ${
                    darkmode ? "chat__messageMenuButton_darkMode" : ""
                  }`}
                  onClick={(e) => handleMenuOpen(e, message)}
                  aria-label="Opções da mensagem"
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </div>

              {/* Referência à mensagem respondida */}
              {message.replyTo?.messageId && (
                <div
                  className={`chat__replyReference ${
                    darkmode ? "chat__replyReference_darkMode" : ""
                  }`}
                >
                  <span
                    className={`chat__replyReferenceName ${
                      darkmode ? "chat__replyReferenceName_darkMode" : ""
                    }`}
                  >
                    {message.replyTo.name}
                  </span>

                  {message.replyTo.imageId ? (
                    <div
                      className={`chat__replyReferenceContent ${
                        darkmode ? "chat__replyReferenceContent_darkMode" : ""
                      }`}
                    >
                      <ReplyIcon fontSize="small" />
                      <span>Imagem</span>
                    </div>
                  ) : (
                    <div
                      className={`chat__replyReferenceContent ${
                        darkmode ? "chat__replyReferenceContent_darkMode" : ""
                      }`}
                    >
                      <ReplyIcon fontSize="small" />
                      <span>{message.replyTo.message || "Mensagem"}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Conteúdo da mensagem */}
              {isEditing ? (
                <form
                  className={`chat__editForm ${
                    darkmode ? "chat__editForm_darkMode" : ""
                  }`}
                  onSubmit={saveEditedMessage}
                >
                  <input
                    type="text"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    autoFocus
                  />

                  <div
                    className={`chat__editActions ${
                      darkmode ? "chat__editActions_darkMode" : ""
                    }`}
                  >
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
                  ) : message.audioId ? (
                    <audio
                      controls
                      src={`http://localhost:9000/messages/audio/${message.audioId}`}
                      className="chat__audio"
                    />
                  ) : (
                    <span
                      className={`chat__messageText ${
                        darkmode ? "chat__messageText_darkMode" : ""
                      }`}
                    >
                      {message.message}
                    </span>
                  )}
                </>
              )}

              {/* Data e identificação de edição */}
              <span
                className={`chat__timestamp ${
                  darkmode ? "chat__timestamp_darkMode" : ""
                }`}
              >
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
        PaperProps={{
          className: darkmode ? "chat__menu_darkMode" : "",
        }}
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
              disabled={Boolean(
                selectedMessage?.imageId || selectedMessage?.audioId,
              )}
            >
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              Editar mensagem
            </MenuItem>

            <MenuItem onClick={handleDelete}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              {selectedMessage?.audioId ? "Apagar áudio" : "Excluir mensagem"}
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Rodapé */}
      <div
        className={`chat__footer ${
          darkmode ? "chat__footer_darkMode" : ""
        }`}
      >
        {/* Prévia da mensagem que será respondida */}
        {replyingTo && (
          <div
            className={`chat__replyingPreview ${
              darkmode ? "chat__replyingPreview_darkMode" : ""
            }`}
          >
            <div
              className={`chat__replyingPreviewContent ${
                darkmode ? "chat__replyingPreviewContent_darkMode" : ""
              }`}
            >
              <span
                className={`chat__replyingPreviewName ${
                  darkmode ? "chat__replyingPreviewName_darkMode" : ""
                }`}
              >
                Respondendo a {replyingTo.name}
              </span>

              {replyingTo.imageId ? (
                <span
                  className={`chat__replyingPreviewText ${
                    darkmode ? "chat__replyingPreviewText_darkMode" : ""
                  }`}
                >
                  <ReplyIcon fontSize="small" />
                  Imagem
                </span>
              ) : (
                <span
                  className={`chat__replyingPreviewText ${
                    darkmode ? "chat__replyingPreviewText_darkMode" : ""
                  }`}
                >
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
        <div
          className={`chat__footerInput ${
            darkmode ? "chat__footerInput_darkMode" : ""
          }`}
        >
          <button
            type="button"
            className="chat__emojiButton"
            onClick={() => setShowEmojiPicker((current) => !current)}
            aria-label="Abrir seletor de emojis"
          >
            <InsertEmoticonIcon />
          </button>

          {showEmojiPicker && (
            <div className="chat__emojiPicker">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={darkmode ? "dark" : "light"}
              />
            </div>
          )}

          <form onSubmit={sendMessage}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem"
              type="text"
            />

            <button type="submit">Enviar</button>
          </form>

          <IconButton
            onClick={toggleRecording}
            aria-label={recording ? "Parar e enviar áudio" : "Gravar áudio"}
          >
            {recording ? <StopIcon color="error" /> : <MicIcon />}
          </IconButton>
        </div>
      </div>
    </div>
  );
};

export default Chat;
