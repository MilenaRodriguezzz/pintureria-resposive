 /* global */
const API_BASE = "https://utnfra-api-pinturas.onrender.com";
let pinturasOriginales = [];  /* acá van las pinturas traidas de la api de arriba */

document.addEventListener("DOMContentLoaded", () => {  /* primero se carga todo el DOM == */
    /* barra de navegación (osea botones de arriba) */
    document.getElementById("btnInicio").addEventListener("click", mostrarInicio);
    document.getElementById("btnAlta").addEventListener("click", mostrarFormulario);
    document.getElementById("btnListado").addEventListener("click", cargarPinturas);
    
    /* formulario (agregar,modificar,limpiar) */
    document.getElementById("btnAgregar").addEventListener("click", agregarPintura);
    document.getElementById("btnModificar").addEventListener("click", modificarPintura);
    document.getElementById("btnLimpiar").addEventListener("click", limpiarFormulario);
    
    /* filtros (filtrar, calcular promedio, exportar datos) */
    document.getElementById("btnFiltrar").addEventListener("click", (e) => filtrarPorMarca(e));
    document.getElementById("btnPromedio").addEventListener("click", calcularPromedio);
    document.getElementById("btnExportar").addEventListener("click", exportarCSV);
    
    /* atajo desde la pantalla de inicio (botones de abajo) */
    document.getElementById("btnAltaInferior").addEventListener("click", () => {
        mostrarSeccion('form');
        limpiarFormulario();
    });
    document.getElementById("btnListadoInferior").addEventListener("click", () => {
        mostrarSeccion('list');
        cargarPinturas();
    });
    document.getElementById("btnEstadisticas").addEventListener("click", async () => {
        await cargarPinturas(); // Asegura que los datos estén cargados
        mostrarSeccion('stats');
        mostrarEstadisticas();
    });  
    
    /* para poder cambiar entre modo oscuro-modo claro cuando hace clic */
    document.getElementById("btnModoOscuro").addEventListener("click", toggleModoOscuro);

    // cargar el inicio 
    mostrarInicio();
});


/* Parte 1 – Listado inicial y alta básica */

async function cargarPinturas(){
    mostrarSpinner(); /* mostrar la animación de carga */
    mostrarSeccion('list'); /* cambiar a la pantalla de listado */
    document.getElementById("btnListado").classList.add('active'); /* se marca como activo en el navbar (para que tenga color) */

    try{ /* se conecta con la api y la convierte a json */
        const res = await fetch(`${API_BASE}/pinturas`) /*https://utnfra-api-pinturas.onrender.com*/
        const data = await res.json();

        pinturasOriginales = data; /* la guarda en variable pinturasOriginales */
        mostrarTablaPinturas(data); /* llama a la función que muestra la tabla */
    } catch (error) {
        mostrarError("Error al cargar las pinturas ");
        console.log(error); /* si tira error, informa el error */
    }
}

function mostrarTablaPinturas(pinturas) {
    const divListado = document.getElementById("divListado"); /* marca el div en donde se va a mostrar la tabla */
    if (pinturas.length === 0) { /* primero hay que verificar que hay pinturas para mostrar */
        divListado.innerHTML = '<p class="text-muted text-center">No hay pinturas para mostrar</p>';
        return;
    }
    /*tuve que hacer una validación porque mucha gente estaba poniendo en la api  [object Object] o NULL/UNDEFINED y eso rompía todo el programa
    con estas validaciones te aseguras de que se filtre bien todo por más que tengan valores fallados y se pueda mostrar bien en cualquier caso */
    pinturas = pinturas.filter(pintura => 
        pintura && 
        pintura.id !== undefined && 
        pintura.id !== null &&
        pintura.marca && 
        typeof pintura.marca === 'string' &&
        typeof pintura.precio === 'number' && 
        !isNaN(pintura.precio) &&
        pintura.color &&
        typeof pintura.cantidad === 'number' &&
        !isNaN(pintura.cantidad)
    );
    /* creas la tabla con sus encabezados */
    let tabla = ` 
        <table class="table table-striped table-hover">
            <thead class="table-dark">
                <tr>
                    <th>ID</th>
                    <th>MARCA</th>
                    <th>PRECIO (USD)</th>
                    <th>COLOR</th>
                    <th>CANTIDAD</th>
                    <th>ACCIONES</th>
                </tr>
            </thead>
            <tbody>
    `;
    /* después la fila por cada pintura, dicha pintura va a tener el botón editar y eliminar */
        pinturas.forEach(pintura => {
        tabla += `
            <tr>
                <td>${pintura.id}</td>
                <td>${pintura.marca}</td>
                <td>$${pintura.precio}</td>
                <td>
                    <input type="color" value="${pintura.color}" disabled 
                    class="form-control form-control-color" style="width: 50px; height: 30px;">
                </td>
                <td>${pintura.cantidad}</td>
                <td>
                    <button class="btn btn-outline-primary btn-sm me-1" onclick="seleccionarPintura(${pintura.id})" title="Seleccionar">
                    <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="eliminarPintura(${pintura.id}, '${pintura.marca}')" title="Eliminar">
                    <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tabla += '</tbody></table>';
    divListado.innerHTML = tabla; /* la tabla creada la insertas en el DOM que previamente ya había seteado en el html dejando un espacio vacío */

}

async function agregarPintura(){
    if (!validarFormulario()) return;

    const maxId = pinturasOriginales.reduce((max, pintura) => // va a generar un id sumando 1 al ID más alto que se encuentre
        pintura.id > max ? pintura.id : max, 0);
    const nuevoId = maxId + 1;

    document.getElementById("inputID").value = nuevoId; // ingresa el id generado al inputID
    
    const pintura = obtenerDatosFormulario(); // obtiene los datos y muestra un spinner mientras hace la solicitud
    mostrarSpinner();

    try {
        const res = await fetch(`${API_BASE}/pinturas`, {
            method: "POST", // le manda un POST a la api para agregar uno nuevo
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(pintura) // se pasa a string para que no presente fallas en las peticiones 
        });

        if (res.ok) { // si se recibe bien, agrega la pintura, limpia el formulario y carga las pinturas 
            mostrarExito("Pintura agregada correctamente");
            limpiarFormulario();
            cargarPinturas();
        } else {
            mostrarError("Error al agregar la pintura");
        }
    } catch (error) {
        mostrarError("Error de conexión al agregar la pintura"); // mensaje personalizado de error 
        console.log(error);
    }
}

/* Parte 2 – Acciones de selección, modificación y eliminación */

async function seleccionarPintura(id){ 
    if (!id || isNaN(id)) { /* el id no tiene que ser NaN (validación hecha porque ingresaron mal ids en la api los compañeros) */
        mostrarError("ID de pintura inválido");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/pinturas/${id}`); /* primero se le va a solicitar a la api una pintura específica por su id */
        const data = await res.json();
        const pintura = data.pintura;

        /* se rellena el formulario con todos los datos de dicha pintura que se eleccióno */    
        document.getElementById("inputID").value = pintura.id; 
        document.getElementById("inputID").readOnly = true; /* el id NO se puede editar, así que queda en readOnly */  
        document.getElementById("inputMarca").value = pintura.marca || "";
        document.getElementById("inputPrecio").value = pintura.precio|| "";
        document.getElementById("inputColor").value = pintura.color|| "#000000";
        document.getElementById("inputCantidad").value = pintura.cantidad|| "";
        document.getElementById("btnAgregar").style.display = "none";
        document.getElementById("btnModificar").style.display = "inline-block";
        mostrarSeccion('form'); /* se muestra el formulario con los datos ya cargados */  

        mostrarExito("Pintura cargada para edición"); /* mensaje personalizado de éxito */  
    } catch (error) {
        mostrarError("Error al cargar la pintura");  /* mensaje personalizado de error */  
        console.log(error);
    }
}

async function modificarPintura(e) {
    e.preventDefault(); /* prevenis el comportamiento por defecto (el submit del formulario) */  

    if (!validarFormulario()) return; /* para modificarlo, primero se tienen que validar los datos que haya puesto para modificar */

    if (!id) { /* si no se tiene id, se informa que tiene que seleccionar una para poder modificar (en realidad no debería pasar, pero mejor validarlo) */
        mostrarAlerta("Debe seleccionar una pintura antes de modificar", "warning");
        return;
    }

    const id = document.getElementById("inputID").value; 
    const pintura = obtenerDatosFormulario(); /* toma el id y los datos ingresados */

    console.log("Modificando pintura ID:", id, pintura);

    try {
        const res = await fetch(`${API_BASE}/pinturas/${id}`, /* envía los datos al id previamente tomado */  
            {
                method: "PUT", /* mediante put, porque se quiere modificar, no guardar uno nuevo */  
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pintura), /* lo pasas a string para evitar futuros errores con los tipos de datos */  
            }
        );

        if (res.ok) {
            cargarPinturas();
            limpiarFormulario();
            mostrarExito("Pintura modificada exitosamente"); /* si se ejecutó todo bien, muestra un mensaje personalizado de éxito */  
        } else {
            mostrarError("Error al modificar la pintura"); /* si algo está mal ejecutado, muestra mensaje personalizado de error */  
        }
    } catch (error) {
        mostrarError("Error de conexión al modificar la pintura");
        console.log("Error en PUT:", error);
    }
}


async function eliminarPintura(id, marca){ /* va a tomar el ID de la pintura para saber qué eliminar, y la marca es para el mensaje de confirmación */
    if (!confirm(`¿Estás seguro de querer eliminar la pintura de marca ${marca} con ID ${id})?`)){ 
        return; /* primero se le pide al usuario una confirmación y retorna su respuesta */
}
    mostrarSpinner();

    try {
        const res = await fetch(`${API_BASE}/pinturas/${id}`, {
            method: "DELETE" /* envia la solicitud de DELETE a la API por el id de la pintura */
        });
        if (res.ok) {
            mostrarExito("Pintura eliminada correctamente");
            cargarPinturas();
        } else {
            mostrarError("Error al eliminar la pintura");
        }
    } catch (error) {
        mostrarError("Error de conexión al eliminar la pintura");
        console.log(error);
    }
}

/* Parte 3 – Validaciones con Bootstrap y JS */

function validarFormulario() {
    limpiarErrores();  /* se limpian las validaciones que se hicieron antes */

    const id = document.getElementById("inputID"); /* tomas los campos rellenados para poder validarlos */
    const marca = document.getElementById("inputMarca");
    const precio = document.getElementById("inputPrecio");
    const cantidad = document.getElementById("inputCantidad");

    let valido = true; /* se setea valido en true en un principio, si alguna validacion falla, se cambia a false */

    if (!marca.value.trim()) { /* se quitan los espacios y se fija si está vacía */
        mostrarErrorCampo(marca, "error-marca", "La marca es obligatoria"); /* si hay un error, se lanza el mensaje */
        valido = false; /* si se ejecuta algún error en la validación, valido se cambia a false */
    }

    const precioVal = parseFloat(precio.value); /* se convierte a float (porque es un float) */
    if (!precio.value || precioVal < 50 || precioVal > 500) { /* tiene que estar entre 50 y 500, y no puede estar vacio */
        mostrarErrorCampo(precio, "error-precio", "El precio debe estar entre $50 y $500");
        valido = false; /* si se ejecuta algún error en la validación, valido se cambia a false */
    }

    const cantidadVal = parseInt(cantidad.value); /* se convierte a int porque es un valor de cantidad */
    if (!cantidad.value || cantidadVal < 1 || cantidadVal > 400) { /* tiene que estar entre 1 y 400, y no puede estar vacio */
        mostrarErrorCampo(cantidad, "error-cantidad", "La cantidad debe estar entre 1 y 400");
        valido = false; /* si se ejecuta algún error en la validación, valido se cambia a false */
    }

    if (valido) { /* si algo es válido u inválido, les cambia la clase (para poder verlo con colores si algo está bien o mal) */
        [marca, precio, cantidad].forEach(campo => {
            campo.classList.add("is-valid");
            campo.classList.remove("is-invalid");
        });
    }

    return valido; /* retorna true si todo se validó bien, false si almenos 1 no estaba correcta */

}

function mostrarErrorCampo(campo, errorId, mensaje) { /* agrega la clase de error a los inputs que tengan el mensaje */
    campo.classList.add("is-invalid");
    campo.classList.remove("is-valid");
    document.getElementById(errorId).textContent = mensaje;
}

function limpiarErrores() { /* Para que si el usuario se equivoque, se borre y no se quede ahí el (!) */
    const campos = document.querySelectorAll('.form-control');
    campos.forEach(campo => {
        campo.classList.remove('is-invalid', 'is-valid'); /* pasa por cada campo removiendo las clases */
    });
    
    const errores = document.querySelectorAll('.invalid-feedback');
    errores.forEach(error => {
        error.textContent = ''; /* borra el texto escrito en cada error */
    });
}

/* Parte 4 – UX mejorado y filtros */
async function filtrarPorMarca(e) {
    e.preventDefault();
    const marcaFiltro = document.getElementById("inputFiltroMarca").value.trim().toLowerCase(); /* pasa la marca a minusculas para poder compararla */
    
    if (!marcaFiltro) {
        mostrarError("Por favor ingrese una marca para filtrar"); /* si no se ingresa marca, muestra un mensaje de error */
        return;
    }
    
    mostrarSpinner();
    
    try {
        const pinturasFiltradas = pinturasOriginales.filter(pintura => {
            /* validar que el objeto tenga las propiedades necesarias (porque muchos pusieron un [Object object y tiraba error])
            con estas validaciones se verifica que pintura no sea null, undefined, que sea una cadena de texto, y el precio sea numérico
            e igualmente aunque pintura.precio fuera numérico, aveces podria ser NaN (isNan) todas estas validaciones para que tome los números nada más*/
            if (!pintura || 
                !pintura.marca || 
                typeof pintura.marca !== 'string' ||
                typeof pintura.precio !== 'number' ||
                isNaN(pintura.precio)) { 
                return false;
            }
            return pintura.marca.toLowerCase().includes(marcaFiltro);
        });
        
        mostrarTablaPinturas(pinturasFiltradas); /* las que tengan el texto ingresado, se van a filtrar */
        
        if (pinturasFiltradas.length === 0) { /* si son 0, significa que no hay marcas con ese nombre y devuelve ese mensjae */
            mostrarError(`No se encontraron pinturas de la marca "${marcaFiltro}"`);
        } else { /* si sí hay marcas, se muestra cuántas hay */
            mostrarExito(`Se encontraron ${pinturasFiltradas.length} pintura(s) de la marca "${marcaFiltro}"`);
        }
        
    } catch (error) {
        mostrarError("Error al filtrar pinturas por marca");
        console.log(error);
    }
}

function calcularPromedio(){
    /*validación extra por el valor en $NaN (debido a que gente agregó [Object object] a la api, y se rompía todo*/ 
    const pinturasValidas = filtrarPinturasValidas(pinturasOriginales);

    if (pinturasValidas.length === 0) { /* si no hubiera pinturas cargadas (no debería pasar, pero bueno), se muestra un mensaje */
        alert("No hay pinturas cargadas para calcular el promedio");
        return;
    }

    const sumaPrecios = pinturasValidas.reduce((suma, pintura) => suma + pintura.precio, 0); /* se calcula la suma de las pinturas que sí se pueden usar usando reduce */
    const promedio = (sumaPrecios / pinturasValidas.length).toFixed(2); /* con esa suma, se saca el promedio y se limita con el toFixed a que hayan solo dos números atrás de la coma (lo redondea) */

    alert(`El precio promedio de las pinturas es: $${promedio}`);
}

/* Parte 5 – Mejoras visuales y experiencia de usuario (UX/UI) */
function mostrarInicio() {
    // se ocultan todas las secciones para que solo se vea el inicio apenas abris la página
    mostrarSeccion('inicio');
 
    // se muestra el inicio
    document.getElementById("seccionInicio").style.display = "block";
        
    // actualizar navegación
    actualizarNavegacion('btnInicio');
    }


function mostrarFormulario() {
    mostrarSeccion('form');  /* llama a la sección form para mostrar el formulario */
    actualizarNavegacion('btnAlta'); /* lo vincula con el boton Alta para que se sepa que está en esa sección (y pueda marcarlo) */
    limpiarFormulario(); /* se limpia */

}

function actualizarNavegacion(seccionId) {
    // se mapean las secciones a los botones
    const seccionABoton = {
        'inicio': 'btnInicio',
        'form': 'btnAlta',
        'list': 'btnListado',
        'stats': 'btnEstadisticas'
    };
    
    // remover clase active de todos los botones (porque sólo una va a estar activa a la vez)
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // depende del botón que se haya clickeado y la sección que esté, se marca active esa clase
    const botonId = seccionABoton[seccionId]; /* busca en qué sección está el boton que se seleccionó */
    if (botonId) {
        document.getElementById(botonId).classList.add('active'); /* y la pone como active */
    }
}

/* Parte 6 – Funcionalidades estadísticas y exportación */

function mostrarEstadisticas(){
    const pinturasValidas = filtrarPinturasValidas(pinturasOriginales); /* filtras las pinturas validas -que no son NaN, null, undefined */

    if (pinturasValidas.length === 0){ /* se valida si hay pinturas para mostrar (debería haberlas, pero uno nunca sabe) */
        document.getElementById("divEstadisticas").innerHTML = 
            '<p class="text-muted">No hay datos para mostrar estadísticas</p>';
        return;
    }

    const total = pinturasValidas.length; /* se calcula el total de pinturas válidas con .length */
    const sumaPrecios = pinturasValidas.reduce((suma, p) => suma + p.precio, 0); /* los sumas con reduce */
    const promedio = (sumaPrecios / total).toFixed(2); /* sacas el promedio y redondeas los decimales con el toFixed(2) */

    /* calcular promedio por marca */
    const marcas = {}; // va a almacenar las estadisticas de cada marca (cantidad y total)
    pinturasValidas.forEach(p => { // recorres el array 
        if (!marcas[p.marca]) { // si la marca todavía no está en el marcas, se agrega
            marcas[p.marca] = { count: 0, total: 0 };
        }
        marcas[p.marca].count++; // si la marca ya está en el marcas, se le suma al contador de la cantidad
        marcas[p.marca].total += p.precio; // y se va sumando en el total el precio
    });

    const promedioPorMarca = Object.keys(marcas).map(marca => { // primero va a sacar todas las marcas registradas de marcas y usa map() para recorrerlas
        return { 
            marca, // en la marca se suma el total de precios dividido por la cantidad de pinturas que tiene dicha marca
            promedio: (marcas[marca].total / marcas[marca].count).toFixed(2) // habiendo recorrido cada una se calcula el promedio
        };
    });

    /* calcular promedio por marca */
    const marcaMasComun = Object.keys(marcas).reduce((a, b) => //usa object keys para sacar las marcas registradas de marcas y se usa reduce para recorrerlas y encontrar la que tiene más (entre a y b)
        marcas[a].count > marcas[b].count ? a : b //va a comparar el count de a y b y va a sacar la que tiene mayor cantidad
    );

    /* calcular la pintura más cara */
    const pinturaMasCara = pinturasValidas.reduce((max, p) => p.precio > max.precio ? p : max); // reduce para recorrer todas y comprar los precios, siempre el máximo se guarda en max y se va comparando max con p 

    // Mostrar estadísticas resumen -- se hacen listas de los valores sacados con javascript
    document.getElementById("estadisticas-resumen").innerHTML = ` 
        <ul class="list-unstyled">
            <li><strong>Total de pinturas:</strong> ${total}</li>
            <li><strong>Precio promedio:</strong> $${promedio}</li>
            <li><strong>Marca más común:</strong> ${marcaMasComun} (${marcas[marcaMasComun].count})</li>
        </ul>
    `;

    // Mostrar destacados
    document.getElementById("estadisticas-destacados").innerHTML = `
        <ul class="list-unstyled">
            <li><strong>Pintura más cara:</strong></li>
            <li class="ms-3">${pinturaMasCara.marca} - $${pinturaMasCara.precio}</li>
            <li><strong>ID:</strong> ${pinturaMasCara.id}</li>
        </ul>
    `;

    // Mostrar gráfico de promedio por marca
    /* se hace un gráfico con HTML, iterando sobre cada marca que hay dentro del array promedioPorMarca, por cada marca se saca su nombre y
    su promedio. */
    let graficoHTML = '<div class="grafico-barras">';
    promedioPorMarca.forEach(item => {
        const porcentaje = (item.promedio / 500 * 100).toFixed(0); // se calcula la proporción del precio con el máximo (500 es el límite) y lo convierte a un porcentaje (*100), lo redondea a entero con el toFixed
        graficoHTML += `
            <div class="mb-2">
                <div class="d-flex justify-content-between">
                    <span>${item.marca}</span>
                    <span>$${item.promedio}</span>
                </div>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar" role="progressbar" style="width: ${porcentaje}%" 
                        aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        `;
    }); /* se crean todas las filas del gráfico del html con la marca, el precio promedio, el contenedor de la barra y la barra con el ancho propocional al porcentaje */
    graficoHTML += '</div>'; /* cerrás el div del grafico-barras abierto en la linea 468 */
    document.getElementById("grafico-promedio-marca").innerHTML = graficoHTML; /* mandas el gráfico a la página HTML */

    mostrarExito("Estadísticas cargadas"); /* mensaje de éxito */
}

// Modificar la función mostrarTablaPinturas para agregar ordenamiento
function mostrarTablaPinturas(pinturas) {
    const divListado = document.getElementById("divListado"); /* obtenes el elemento donde va a estar la tabla */
    pinturas = filtrarPinturasValidas(pinturas); /* filtras las válidas */
    
    if (pinturas.length === 0) { /* verificación que hay pinturas */
        divListado.innerHTML = '<p class="text-muted text-center">No hay pinturas para mostrar</p>';
        return;
    }

    let tabla = ` 
        <table class="table table-striped table-hover">
            <thead class="table-dark">
                <tr>
                    <th>ID</th>
                    <th>MARCA</th>
                    <th>PRECIO (USD) <button class="btn btn-sm btn-outline-light ms-1" id="btnPrecio" onclick="ordenarPorPrecio()"><i class="bi bi-arrow-down-up"></i></button></th>
                    <th>COLOR</th>
                    <th>CANTIDAD</th>
                    <th>ACCIONES</th>
                </tr>
            </thead>
            <tbody>
    `; /* creas la tabla con los nombres de los atributos */

    pinturas.forEach(pintura => { /* se recorre el array de pinturas y se genera una fila por cada pintura que haya dentro del array */
        tabla += `
            <tr>
                <td>${pintura.id}</td>
                <td>${pintura.marca}</td>
                <td>$${pintura.precio}</td>
                <td>
                    <input type="color" value="${pintura.color}" disabled 
                    class="form-control form-control-color" style="width: 50px; height: 30px;">
                </td>
                <td>${pintura.cantidad}</td>
                <td>
                    <button class="btn btn-outline-primary btn-sm me-1" onclick="seleccionarPintura(${pintura.id})" title="Seleccionar">
                    <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="eliminarPintura(${pintura.id}, '${pintura.marca}')" title="Eliminar">
                    <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tabla += '</tbody></table>'; /* cerras la tabla que creaste con todas las pinturas */
    divListado.innerHTML = tabla; /* la mandas al html */
}

let ordenPrecioAscendente = true; /* primero definis el orden inicial como ascendente (cuando se haga click, el orden se altera) */

function ordenarPorPrecio() {
    const pinturasFiltradas = [...pinturasOriginales].filter(pintura =>  /* creas una copia de pinturasOriginales para que no se modifique el array original */
        pintura && typeof pintura.precio === 'number' && !isNaN(pintura.precio) /* filtra solo pinturas con precios válidos (no Nan, null ó undefined) */
    );

    if (ordenPrecioAscendente) { 
        pinturasFiltradas.sort((a, b) => a.precio - b.precio); /* si ordenPrecioAscendente es true, lo ordena de menor a mayor con sort, los va a comparar y organizar el array gracias a la comparacio´n*/
    } else {
        pinturasFiltradas.sort((a, b) => b.precio - a.precio); /* si ordenPrecioAscendente es false, lo ordena de mayor con sort */
    }
    
    ordenPrecioAscendente = !ordenPrecioAscendente; /* altera el valor para que la próxima vaz cambie el orden (de ascendente a descendente o viceversa) */
    mostrarTablaPinturas(pinturasFiltradas); /* vuelve a mostrar la tabla ya ordenada */
}

function exportarCSV() {
    if (pinturasOriginales.length === 0) { // verificar si hay pinturas
        mostrarError("No hay datos para exportar");
        return;
    }

    const pinturasValidas = filtrarPinturasValidas(pinturasOriginales); // filtrar solo las pinturas válidas

    let csvContent = "ID || Marca || Precio (USD) || Color || Cantidad\n";     // encabezado del csv

    pinturasValidas.forEach(pintura => {   // agregar cada pintura por linea en el csv
        csvContent += `ID: ${pintura.id} -- MARCA:  "${pintura.marca}" -- PRECIO: $${pintura.precio} -- COLOR: ${pintura.color} -- CANTIDAD: ${pintura.cantidad}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); // para crear el archivo csv y descargarlo
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pinturas_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarExito("Datos exportados correctamente");
}

function toggleModoOscuro() { /* función para cambiar de modo oscuro a modo claro en la página*/ 
    const body = document.body;
    const btnModo = document.getElementById('btnModoOscuro');
    const icon = btnModo.querySelector('i');
    
    // alternar clase dark-mode en el body para poder cambiar el tema
    body.classList.toggle('dark-mode');
    
    // Cambiar icono y texto del botón (para que sea una luna o un sol)
    if (body.classList.contains('dark-mode')) {
        icon.classList.remove('bi-moon-stars'); // elimina el otro icono
        icon.classList.add('bi-sun'); // cambia el ícono
        localStorage.setItem('modoOscuro', 'activado'); // guarda preferencia en el navegador
    } else {
        icon.classList.remove('bi-sun'); // elimina el otro icono
        icon.classList.add('bi-moon-stars');// cambia el ícono
        localStorage.setItem('modoOscuro', 'desactivado');
    }
}

/* cuando se carga la preferencia se verifica la preferencia del usuario*/ 
function verificarModoOscuro() {
    const preferencia = localStorage.getItem('modoOscuro'); // desde el localStorage, va a verificar la preferencia previa del usuario para ponerle la clase que corresponda
    const body = document.body;
    const btnModo = document.getElementById('btnModoOscuro');
    const icon = btnModo.querySelector('i');
    
    if (preferencia === 'activado') {
        body.classList.add('dark-mode');
        icon.classList.remove('bi-moon-stars');
        icon.classList.add('bi-sun');
    }
}
// llamar a la función de verificación cuando se carga la página
document.addEventListener('DOMContentLoaded', verificarModoOscuro);

/* FUNCIONES QUE USÉ ADICIONALES */
function obtenerDatosFormulario(){ /* función para recuperar los datos ingresados y devolverlos como objeto javascript */ 
    return {
        id: document.getElementById("inputID").value,
        marca: document.getElementById("inputMarca").value.trim(), // limpia los espacios demás que pueda llegar a haber
        precio: parseFloat(document.getElementById("inputPrecio").value), // lo convierte a float por ser un precio
        color: document.getElementById("inputColor").value,
        cantidad: parseInt(document.getElementById("inputCantidad").value) // lo convierte a int por ser una cantidad
    }
}

function limpiarFormulario(){ /* función para limpiar todos los campos del formulario y quitar los mensajes de error */ 
    document.getElementById("frmFormulario").reset();
    limpiarErrores();
    document.getElementById("inputID").value = "";  // lo deja vacío
    document.getElementById("inputID").readOnly = true; // para que no pueda ser editable
    document.getElementById("btnAgregar").style.display = "inline-block"; // para que aparezca el agregar
    document.getElementById("btnModificar").style.display = "none"; // para que no aparezca el modificar
    

    document.getElementById("inputColor").value = "#ffffff"; // resetea el color al blanco

}

function mostrarSpinner(contenedorId = "divListado") { /* inserta un spiner de bootstrap */ 
    const contenedor = document.getElementById(contenedorId);
    if (contenedor) {
        contenedor.innerHTML = "<div class='text-center mt-3'><div class='spinner-border text-primary' role='status'></div></div>";
    }
}


/* En realidad acá se podría haber optimizado las funciones y hecho una función de mostrarAlerta(mensaje, tipo)
con tipo 'sucess' o 'error' pero la verdad no quise tocar más el código porque ya funcionaba todo bien jajaj, pero está mal (es código repetido)*/
function mostrarExito(mensaje) {
    /* es una alerta de mensaje temporal */
    const alerta = document.createElement('div');
    alerta.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alerta.style.cssText = 'top: 80px; right: 20px; z-index: 9999; min-width: 300px;';
    alerta.innerHTML = `
        <i class="bi bi-check-circle me-2"></i>${mensaje}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(alerta);

    setTimeout(() => {     // se remueve dsp de 3 segundos
        if (alerta.parentElement) {
            alerta.remove();
        }
    }, 3000);
}

function mostrarError(mensaje) {
    /* es una alerta de error temporal */
    const alerta = document.createElement('div');
    alerta.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alerta.style.cssText = 'top: 80px; right: 20px; z-index: 9999; min-width: 300px;';
    alerta.innerHTML = `
        <i class="bi bi-exclamation-triangle me-2"></i>${mensaje}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {     // se remueve dsp de 4 segundos
        if (alerta.parentElement) {
            alerta.remove();
        }
    }, 4000);
}

function mostrarSeccion(seccionId) {
    /*se ocultan todas las secciones*/ 
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
    });
    
    /*se muestra solo la sección que clickeo el usuario*/ 
    const seccion = document.getElementById(seccionId);
    if (seccion) {
        seccion.classList.add('show', 'active');
    }
    
    /* actualizar para que te lleve a esa sección*/ 
    actualizarNavegacion(seccionId);
}

/*Función que cree para evitar repetir código en las siguientes funciones:
mostrarTablaPinturas(pinturas)
mostrarEstadisticas()
calcularPromedio()
exportarCSV()
esto es porque cuando estaban probando todos con  la api cargaban mal los datos y esto hacía que no se pueda validar bien
así que tuve que crear una función que valide que no sean null u Nan los valores que se pasan*/

function filtrarPinturasValidas(pinturas) {
    return pinturas.filter(pintura => 
        pintura && 
        pintura.id !== undefined && 
        pintura.id !== null &&
        pintura.marca && 
        typeof pintura.marca === 'string' &&
        typeof pintura.precio === 'number' && 
        !isNaN(pintura.precio) &&
        Number.isFinite(pintura.precio) && // <-- Esto valida números válidos (isFinite verifica si es un número finito)
        pintura.color &&
        typeof pintura.cantidad === 'number' &&
        !isNaN(pintura.cantidad)
    );
}