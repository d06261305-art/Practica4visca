const fs = require("fs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsDir = path.join(__dirname, "uploads");
const tempDir = path.join(uploadsDir, "temp");

fs.mkdirSync(tempDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadsDir));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Galeria conectada a MongoDB Atlas"))
  .catch((error) => console.error("Error de conexion:", error.message));

const cloudinaryActivo =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (cloudinaryActivo) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "imagen" && file.mimetype.startsWith("image/")) return cb(null, true);
    if (file.fieldname === "audio" && file.mimetype.startsWith("audio/")) return cb(null, true);
    cb(new Error("Tipo de archivo no permitido"));
  }
});

const ElementoMultimediaSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "", trim: true },
    tags: [{ type: String, trim: true }],
    imagenUrl: { type: String, required: true },
    imagenPublicId: String,
    audioUrl: { type: String, required: true },
    audioPublicId: String,
    fechaCreacion: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const Multimedia = mongoose.model("Multimedia", ElementoMultimediaSchema);

function normalizarTags(tags) {
  return String(tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function guardarArchivo(file, resourceType) {
  if (!file) return null;

  if (cloudinaryActivo) {
    const resultado = await cloudinary.uploader.upload(file.path, {
      folder: "galeria_multimedia",
      resource_type: resourceType
    });
    fs.unlinkSync(file.path);
    return { url: resultado.secure_url, publicId: resultado.public_id };
  }

  const destino = path.join(uploadsDir, file.filename);
  fs.renameSync(file.path, destino);
  return { url: `/uploads/${file.filename}`, publicId: "" };
}

async function eliminarArchivo(url, publicId, resourceType) {
  if (cloudinaryActivo && publicId) {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return;
  }

  if (url && url.startsWith("/uploads/")) {
    const archivo = path.join(uploadsDir, path.basename(url));
    if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
  }
}

app.get("/api/multimedia", async (req, res) => {
  const q = (req.query.q || "").trim();
  const filtro = q
    ? {
        $or: [
          { titulo: { $regex: q, $options: "i" } },
          { descripcion: { $regex: q, $options: "i" } },
          { tags: { $regex: q, $options: "i" } }
        ]
      }
    : {};

  const elementos = await Multimedia.find(filtro).sort({ createdAt: -1 });
  res.json(elementos);
});

app.get("/api/multimedia/:id", async (req, res) => {
  try {
    const elemento = await Multimedia.findById(req.params.id);
    if (!elemento) return res.status(404).json({ mensaje: "Elemento no encontrado" });
    res.json(elemento);
  } catch (error) {
    res.status(400).json({ mensaje: "ID invalido" });
  }
});

app.post(
  "/api/multimedia",
  upload.fields([
    { name: "imagen", maxCount: 1 },
    { name: "audio", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const imagen = req.files?.imagen?.[0];
      const audio = req.files?.audio?.[0];
      if (!imagen || !audio) return res.status(400).json({ mensaje: "Imagen y audio son obligatorios" });

      const imagenGuardada = await guardarArchivo(imagen, "image");
      const audioGuardado = await guardarArchivo(audio, "video");

      const elemento = await Multimedia.create({
        titulo: req.body.titulo,
        descripcion: req.body.descripcion,
        tags: normalizarTags(req.body.tags),
        imagenUrl: imagenGuardada.url,
        imagenPublicId: imagenGuardada.publicId,
        audioUrl: audioGuardado.url,
        audioPublicId: audioGuardado.publicId
      });

      res.status(201).json({ mensaje: "Elemento multimedia creado", elemento });
    } catch (error) {
      res.status(400).json({ mensaje: "No se pudo crear", detalle: error.message });
    }
  }
);

app.put(
  "/api/multimedia/:id",
  upload.fields([
    { name: "imagen", maxCount: 1 },
    { name: "audio", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const elemento = await Multimedia.findById(req.params.id);
      if (!elemento) return res.status(404).json({ mensaje: "Elemento no encontrado" });

      const imagen = req.files?.imagen?.[0];
      const audio = req.files?.audio?.[0];

      elemento.titulo = req.body.titulo || elemento.titulo;
      elemento.descripcion = req.body.descripcion || "";
      elemento.tags = normalizarTags(req.body.tags);

      if (imagen) {
        await eliminarArchivo(elemento.imagenUrl, elemento.imagenPublicId, "image");
        const nuevaImagen = await guardarArchivo(imagen, "image");
        elemento.imagenUrl = nuevaImagen.url;
        elemento.imagenPublicId = nuevaImagen.publicId;
      }

      if (audio) {
        await eliminarArchivo(elemento.audioUrl, elemento.audioPublicId, "video");
        const nuevoAudio = await guardarArchivo(audio, "video");
        elemento.audioUrl = nuevoAudio.url;
        elemento.audioPublicId = nuevoAudio.publicId;
      }

      await elemento.save();
      res.json({ mensaje: "Elemento actualizado", elemento });
    } catch (error) {
      res.status(400).json({ mensaje: "No se pudo actualizar", detalle: error.message });
    }
  }
);

app.delete("/api/multimedia/:id", async (req, res) => {
  try {
    const elemento = await Multimedia.findByIdAndDelete(req.params.id);
    if (!elemento) return res.status(404).json({ mensaje: "Elemento no encontrado" });

    await eliminarArchivo(elemento.imagenUrl, elemento.imagenPublicId, "image");
    await eliminarArchivo(elemento.audioUrl, elemento.audioPublicId, "video");

    res.json({ mensaje: "Elemento eliminado" });
  } catch (error) {
    res.status(400).json({ mensaje: "No se pudo eliminar" });
  }
});

app.listen(PORT, () => console.log(`Servidor multimedia activo en puerto ${PORT}`));
