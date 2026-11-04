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

// API Endpoints

app.get("/", (req, res) => {
  res.status(200).send("Hello TheWebDev");
});

// Criar mensagem
app.post("/messages/new", async (req, res) => {
  try {
    const dbMessage = await Messages.create(req.body);

    res.status(201).send(dbMessage);
  } catch (error) {
    console.error("Erro ao criar mensagem:", error);
    res.status(500).send(error);
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

    const dbMessage = await Messages.create({
      message: "",
      name: req.body.name,
      timestamp: new Date().toUTCString(),
      received: true,
      imageId: uploadStream.id.toString(),
    });

    res.status(201).send(dbMessage);
  } catch (error) {
    console.error("Erro ao enviar imagem:", error);
    res.status(500).send(error);
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
