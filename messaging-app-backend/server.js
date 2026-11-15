import express from "express";
import mongoose from "mongoose";
import Cors from "cors";
import Messages from "./dbMessages.js";
import multer from "multer";
import { Readable } from "stream";

// App Config
const app = express();
const port = process.env.PORT || 9000;
const connection_url = "mongodb://localhost:27017/chat";

// Middleware
app.use(express.json());
app.use(Cors());

// Configuração do Multer
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "image/png") {
      return cb(new Error("Apenas imagens PNG são permitidas"));
    }

    cb(null, true);
  },
});

// DB Config
let gridFSBucket;

mongoose
  .connect(connection_url)
  .then(() => {
    console.log("MongoDB conectado!");
  })
  .catch((error) => {
    console.error("Erro ao conectar ao MongoDB:", error);
  });

mongoose.connection.once("open", () => {
  gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "images",
  });

  console.log("GridFS conectado!");
});

// Buscar e preparar os dados da mensagem respondida
const getReplyData = async (replyToId) => {
  // Se não houver mensagem sendo respondida
  if (!replyToId) {
    return null;
  }

  // Validar o ID recebido
  if (!mongoose.Types.ObjectId.isValid(replyToId)) {
    const error = new Error("ID da mensagem respondida inválido");
    error.status = 400;
    throw error;
  }

  // Buscar a mensagem original
  const originalMessage = await Messages.findById(replyToId);

  if (!originalMessage) {
    const error = new Error("Mensagem original não encontrada");
    error.status = 404;
    throw error;
  }

  // Retornar somente os dados necessários para a referência
  return {
    messageId: originalMessage._id.toString(),
    name: originalMessage.name,
    message: originalMessage.message || "",
    imageId: originalMessage.imageId || null,
  };
};

// API Endpoints

app.get("/", (req, res) => {
  res.status(200).send("Hello TheWebDev");
});

// Criar mensagem
app.post("/messages/new", async (req, res) => {
  try {
    const { replyToId, ...messageData } = req.body;

    // Preparar a referência da mensagem respondida
    const replyTo = await getReplyData(replyToId);

    // Criar a nova mensagem
    const dbMessage = await Messages.create({
      ...messageData,
      replyTo,
    });

    res.status(201).send(dbMessage);
  } catch (error) {
    console.error("Erro ao criar mensagem:", error);

    res.status(error.status || 500).send({
      message: error.message || "Erro ao criar mensagem",
    });
  }
});

// Buscar mensagens
app.get("/messages/sync", async (req, res) => {
  try {
    const dbMessages = await Messages.find().sort({ _id: 1 });

    res.status(200).send(dbMessages);
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    res.status(500).send(error);
  }
});

// Editar mensagem
app.put("/messages/:id", async (req, res) => {
  try {
    const { message, name } = req.body;

    // Validar o conteúdo recebido
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).send({
        message: "O conteúdo da mensagem não pode estar vazio",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).send({
        message: "ID da mensagem inválido",
      });
    }

    // Buscar a mensagem pelo ID
    const dbMessage = await Messages.findById(req.params.id);

    if (!dbMessage) {
      return res.status(404).send({
        message: "Mensagem não encontrada",
      });
    }

    // Verificar se a mensagem pertence ao usuário
    if (!name || dbMessage.name !== name) {
      return res.status(403).send({
        message: "Você não pode editar esta mensagem",
      });
    }

    // Impedir a edição de mensagens que contenham imagens
    if (dbMessage.imageId) {
      return res.status(400).send({
        message: "Não é possível editar mensagens com imagens",
      });
    }

    // Atualizar os dados
    dbMessage.message = message.trim();
    dbMessage.edited = true;
    dbMessage.editedAt = new Date().toUTCString();

    // Salvar no MongoDB
    const updatedMessage = await dbMessage.save();

    res.status(200).send(updatedMessage);
  } catch (error) {
    console.error("Erro ao editar mensagem:", error);
    res.status(500).send({
      message: "Erro ao editar mensagem",
    });
  }
});

// Excluir mensagem
app.delete("/messages/:id", async (req, res) => {
  try {
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).send({
        message: "ID da mensagem inválido",
      });
    }

    // Buscar a mensagem pelo ID
    const dbMessage = await Messages.findById(req.params.id);

    if (!dbMessage) {
      return res.status(404).send({
        message: "Mensagem não encontrada",
      });
    }

    // Verificar se a mensagem pertence ao usuário
    if (!name || dbMessage.name !== name) {
      return res.status(403).send({
        message: "Você não pode excluir esta mensagem",
      });
    }

    // Se for uma mensagem com imagem, tentar remover o arquivo do GridFS
    if (dbMessage.imageId) {
      if (!gridFSBucket) {
        return res.status(503).send({
          message: "GridFS ainda não está pronto",
        });
      }

      if (mongoose.Types.ObjectId.isValid(dbMessage.imageId)) {
        try {
          await gridFSBucket.delete(
            new mongoose.Types.ObjectId(dbMessage.imageId),
          );
        } catch (imageError) {
          console.warn("Não foi possível remover a imagem:", imageError);
        }
      }
    }

    // Excluir a mensagem do MongoDB
    await Messages.deleteOne({ _id: dbMessage._id });

    res.status(200).send({
      message: "Mensagem excluída com sucesso",
      id: dbMessage._id,
    });
  } catch (error) {
    console.error("Erro ao excluir mensagem:", error);
    res.status(500).send({
      message: "Erro ao excluir mensagem",
    });
  }
});

// Buscar usuários ativos nos últimos 5 minutos
app.get("/messages/actives", async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const dbMessages = await Messages.find({
      timestamp: { $ne: null },
    });

    const activeUsers = new Map();

    dbMessages.forEach((message) => {
      const messageDate = new Date(message.timestamp);

      if (
        message.name &&
        !isNaN(messageDate.getTime()) &&
        messageDate >= fiveMinutesAgo
      ) {
        const previousDate = activeUsers.get(message.name);

        if (!previousDate || messageDate > previousDate) {
          activeUsers.set(message.name, messageDate);
        }
      }
    });

    const users = Array.from(activeUsers.keys());

    console.log("Usuários ativos:", users);

    res.status(200).json(users);
  } catch (error) {
    console.error("Erro ao buscar usuários ativos:", error);
    res.status(500).send(error);
  }
});

// Enviar imagem
app.post("/messages/image", upload.single("image"), async (req, res) => {
  try {
    if (!gridFSBucket) {
      return res.status(503).send({
        message: "GridFS ainda não está pronto",
      });
    }

    if (!req.file) {
      return res.status(400).send({
        message: "Nenhuma imagem PNG enviada",
      });
    }

    // Verifica a assinatura real do arquivo PNG
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    if (
      req.file.buffer.length < 8 ||
      !req.file.buffer.subarray(0, 8).equals(pngSignature)
    ) {
      return res.status(400).send({
        message: "O arquivo enviado não é um PNG válido",
      });
    }

    const uploadStream = gridFSBucket.openUploadStream(req.file.originalname, {
      contentType: "image/png",
    });

    await new Promise((resolve, reject) => {
      uploadStream.once("finish", resolve);
      uploadStream.once("error", reject);

      Readable.from(req.file.buffer).pipe(uploadStream);
    });

    // Preparar a referência da mensagem respondida
    const replyTo = await getReplyData(req.body.replyToId);

    // Criar a mensagem com imagem
    const dbMessage = await Messages.create({
      message: "",
      name: req.body.name,
      timestamp: new Date().toUTCString(),
      received: true,
      imageId: uploadStream.id.toString(),
      replyTo,
    });

    res.status(201).send(dbMessage);
  } catch (error) {
    console.error("Erro ao enviar imagem:", error);
    res.status(error.status || 500).send({
      message: error.message || "Erro ao enviar imagem",
    });
  }
});

// Recuperar imagem
app.get("/messages/image/:id", async (req, res) => {
  try {
    if (!gridFSBucket) {
      return res.status(503).send({
        message: "GridFS ainda não está pronto",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).send({
        message: "ID de imagem inválido",
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);

    res.set("Content-Type", "image/png");

    gridFSBucket
      .openDownloadStream(fileId)
      .on("error", (error) => {
        console.error("Erro ao recuperar imagem:", error);

        if (!res.headersSent) {
          res.status(404).send({
            message: "Imagem não encontrada",
          });
        }
      })
      .pipe(res);
  } catch (error) {
    console.error("Erro ao recuperar imagem:", error);
    res.status(500).send(error);
  }
});

// Tratamento de erros do Multer
app.use((error, req, res, next) => {
  if (error) {
    return res.status(400).send({
      message: error.message,
    });
  }

  next();
});

// Listener
app.listen(port, () => {
  console.log(`Listening on localhost: ${port}`);
});
