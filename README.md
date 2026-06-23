# Practica 3 - Galeria multimedia CRUD NoSQL

Aplicacion full-stack para crear, buscar, actualizar y eliminar elementos multimedia con MongoDB Atlas.

Cada documento guarda texto y las URL de imagen/audio. Si agregas credenciales de Cloudinary, los archivos se suben a la nube. Si no las agregas, la practica funciona localmente usando la carpeta `uploads`.

## Operaciones CRUD

- Crear: subir titulo, descripcion, tags, imagen y audio.
- Buscar: filtrar por titulo, descripcion o tags.
- Actualizar: editar texto y opcionalmente reemplazar imagen/audio.
- Eliminar: borrar registro y archivo asociado cuando sea posible.

## Estructura

```text
practica-3-galeria-multimedia-crud/
  package.json
  server.js
  .env.example
  .gitignore
  public/
    index.html
    styles.css
    app.js
  uploads/
    .gitkeep
```

## Ejecutar

```bash
npm install
copy .env.example .env
npm start
```

Abre `http://localhost:3000`.

## Variables para nube

- `MONGO_URI`: cadena de conexion de MongoDB Atlas.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: opcionales para guardar archivos en Cloudinary.
