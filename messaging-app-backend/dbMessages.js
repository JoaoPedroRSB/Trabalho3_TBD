import mongoose from "mongoose";

const messagingSchema = mongoose.Schema({
  message: String,
  name: String,
  timestamp: String,
  received: Boolean,
  imageId: String,
  audioId: String,

  edited: {
    type: Boolean,
    default: false,
  },

  editedAt: {
    type: String,
    default: null,
  },

  // Referência à mensagem que está sendo respondida
  replyTo: {
    messageId: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      default: null,
    },
    imageId: {
      type: String,
      default: null,
    },
  },
});

export default mongoose.model("messagingmessages", messagingSchema);
