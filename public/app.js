const API_URL = "/api/multimedia";

const form = document.getElementById("formMultimedia");
const galeria = document.getElementById("galeria");
const busqueda = document.getElementById("busqueda");
const cancelar = document.getElementById("cancelar");
const elementoId = document.getElementById("elementoId");
const tituloFormulario = document.getElementById("tituloFormulario");
const imagenInput = document.getElementById("imagen");
const audioInput = document.getElementById("audio");

function resolverUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return url;
}

async function cargarGaleria() {
  const q = busqueda.value.trim();
  const res = await fetch(`${API_URL}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  const elementos = await res.json();

  if (!elementos.length) {
    galeria.innerHTML = "<p>No hay elementos multimedia registrados.</p>";
    return;
  }

  galeria.innerHTML = elementos
    .map(
      (item) => `
        <article class="media-card">
          <img src="${resolverUrl(item.imagenUrl)}" alt="${item.titulo}">
          <div>
            <h3>${item.titulo}</h3>
            <p>${item.descripcion || ""}</p>
            <p class="tags">${(item.tags || []).map((tag) => `#${tag}`).join(" ")}</p>
          </div>
          <audio controls src="${resolverUrl(item.audioUrl)}"></audio>
          <div class="card-actions">
            <button type="button" onclick='editarElemento(${JSON.stringify(item)})'>Editar</button>
            <button type="button" class="danger" onclick="eliminarElemento('${item._id}')">Eliminar</button>
          </div>
        </article>
      `
    )
    .join("");
}

function limpiarFormulario() {
  form.reset();
  elementoId.value = "";
  tituloFormulario.textContent = "Subir elemento";
  imagenInput.required = true;
  audioInput.required = true;
}

window.editarElemento = function editarElemento(item) {
  elementoId.value = item._id;
  document.getElementById("titulo").value = item.titulo;
  document.getElementById("descripcion").value = item.descripcion || "";
  document.getElementById("tags").value = (item.tags || []).join(", ");
  tituloFormulario.textContent = "Actualizar elemento";
  imagenInput.required = false;
  audioInput.required = false;
};

window.eliminarElemento = async function eliminarElemento(id) {
  if (!confirm("Deseas eliminar este elemento?")) return;
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  cargarGaleria();
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = elementoId.value;
  const datos = new FormData(form);
  await fetch(id ? `${API_URL}/${id}` : API_URL, {
    method: id ? "PUT" : "POST",
    body: datos
  });

  limpiarFormulario();
  cargarGaleria();
});

cancelar.addEventListener("click", limpiarFormulario);
busqueda.addEventListener("input", cargarGaleria);
limpiarFormulario();
cargarGaleria();
