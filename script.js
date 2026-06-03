// ======================== CONFIGURACIÓN ========================
// 🔴 IMPORTANTE: Reemplaza "TU_API_KEY_GROQ" con tu clave real de Groq (empieza con gsk_)
const GROQ_API_KEY = "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";   // <---- CÁMBIALA AQUÍ

const SYSTEM_PROMPT = "Eres JARVIS, asistente personal inteligente, sarcástico a veces pero súper útil. Responde siempre en español de forma natural, breve y directa. Si no sabes algo, dímelo con honestidad.";

// Memoria local
let tareas = JSON.parse(localStorage.getItem("jarvis_tareas")) || [];
let nombreUsuario = localStorage.getItem("jarvis_nombre") || "";
let preferencias = JSON.parse(localStorage.getItem("jarvis_preferencias")) || [];

// ======================== DOM ELEMENTOS ========================
const chatDiv = document.getElementById("chat");
const inputMensaje = document.getElementById("mensaje");
const btnEnviar = document.getElementById("btnEnviar");
const btnMicrofono = document.getElementById("btnMicrofono");

// ======================== FUNCIONES AUXILIARES ========================
function agregarMensaje(texto, tipo) {
    const div = document.createElement("div");
    div.className = tipo === "usuario" ? "mensaje-usuario" : "mensaje-jarvis";
    div.innerHTML = texto.replace(/\n/g, "<br>");
    chatDiv.appendChild(div);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Síntesis de voz (Jarvis habla)
function hablar(texto) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = "es-ES";
    voz.rate = 0.95;
    voz.pitch = 1.0;
    window.speechSynthesis.speak(voz);
}

// ======================== PETICIÓN A GROQ (SIN CORS USANDO PROXY PÚBLICO TEMPORAL) ========================
async function consultarJarvis(pregunta) {
    // Usamos un proxy CORS público para evitar bloqueos en móvil (solo para pruebas)
    // Si el proxy falla, usamos otro de respaldo
    const proxyUrl = "https://cors-anywhere.herokuapp.com/";
    const targetUrl = "https://api.groq.com/openai/v1/chat/completions";
    
    try {
        const respuesta = await fetch(proxyUrl + targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: pregunta }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!respuesta.ok) {
            const errorText = await respuesta.text();
            throw new Error(`HTTP ${respuesta.status}: ${errorText}`);
        }

        const datos = await respuesta.json();
        return datos.choices[0].message.content;
    } catch (error) {
        console.error("Error Groq:", error);
        return "Lo siento, tengo problemas de conexión. A veces pasa. Inténtalo de nuevo en un momento.";
    }
}

// ======================== COMANDOS LOCALES ========================
async function procesarComando(mensaje) {
    const msg = mensaje.toLowerCase().trim();
    
    // Comandos básicos
    if (msg === "hora") return new Date().toLocaleTimeString();
    if (msg === "fecha") return new Date().toLocaleDateString();
    if (msg === "ayuda") {
        return "🗣️ Comandos: hora, fecha, recuerda [tarea], mis tareas, llámame [nombre], ¿quién soy?, me gusta [algo], recuerda que [preferencia]. También puedes preguntarme cualquier cosa.";
    }
    
    // Recordatorios / tareas
    if (msg.startsWith("recuerda ") || msg.startsWith("recordar ")) {
        let tarea = msg.replace(/recuerda |recordar /, "");
        tareas.push(tarea);
        localStorage.setItem("jarvis_tareas", JSON.stringify(tareas));
        return `✅ Guardado: "${tarea}". Te lo recordaré cuando me preguntes.`;
    }
    if (msg === "mis tareas") {
        if (tareas.length === 0) return "No tienes tareas pendientes. ¡Disfruta!";
        return "📋 Tus tareas:\n" + tareas.map((t, i) => `${i+1}. ${t}`).join("\n");
    }
    
    // Nombre del usuario
    if (msg.startsWith("llámame ")) {
        nombreUsuario = msg.replace("llámame ", "");
        localStorage.setItem("jarvis_nombre", nombreUsuario);
        return `Perfecto, te llamaré ${nombreUsuario}. ¿En qué te ayudo?`;
    }
    if (msg === "¿quién soy?" || msg === "quien soy") {
        return nombreUsuario ? `Eres ${nombreUsuario}, mi creador y amigo.` : "Aún no sé tu nombre. Dime 'llámame [nombre]'.";
    }
    
    // Preferencias / gustos
    if (msg.startsWith("me gusta ") || msg.startsWith("recuerda que ")) {
        let pref = msg;
        preferencias.push(pref);
        localStorage.setItem("jarvis_preferencias", JSON.stringify(preferencias));
        return "Lo anoté en mi memoria. 📝";
    }
    if (msg === "qué sabes de mí") {
        let info = `📌 ${nombreUsuario ? `Nombre: ${nombreUsuario}` : "Nombre: no registrado"}`;
        if (preferencias.length) info += "\n📝 Preferencias:\n" + preferencias.map(p => `- ${p}`).join("\n");
        if (tareas.length) info += "\n📋 Tareas pendientes:\n" + tareas.map(t => `- ${t}`).join("\n");
        return info || "Por ahora no tengo información tuya. Háblame de ti.";
    }
    
    // Si no es comando local, preguntamos a la IA
    return null; // null significa que usaremos Groq
}

// ======================== ENVÍO PRINCIPAL ========================
async function enviarMensaje(texto) {
    if (!texto.trim()) return;
    agregarMensaje(texto, "usuario");
    inputMensaje.value = "";
    
    // Mostrar "escribiendo..."
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "mensaje-jarvis";
    loadingDiv.innerText = "✍️ ...";
    chatDiv.appendChild(loadingDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
    
    let respuestaFinal = "";
    const comandoRespuesta = await procesarComando(texto);
    
    if (comandoRespuesta !== null) {
        respuestaFinal = comandoRespuesta;
    } else {
        respuestaFinal = await consultarJarvis(texto);
    }
    
    // Reemplazar el mensaje de loading por la respuesta
    loadingDiv.remove();
    agregarMensaje(respuestaFinal, "jarvis");
    hablar(respuestaFinal);
}

// ======================== RECONOCIMIENTO DE VOZ ========================
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
        const texto = event.results[0][0].transcript;
        inputMensaje.value = texto;
        enviarMensaje(texto);
    };
    recognition.onerror = (event) => {
        console.error("Error micrófono:", event.error);
        agregarMensaje("🔴 No te escuché bien, intenta de nuevo.", "jarvis");
    };
}

function iniciarVoz() {
    if (recognition) {
        recognition.start();
        agregarMensaje("🎙️ Escuchando...", "jarvis");
    } else {
        agregarMensaje("Tu navegador no soporta reconocimiento de voz. Usa escritura.", "jarvis");
    }
}

// ======================== EVENTOS ========================
btnEnviar.addEventListener("click", () => enviarMensaje(inputMensaje.value));
btnMicrofono.addEventListener("click", iniciarVoz);
inputMensaje.addEventListener("keypress", (e) => {
    if (e.key === "Enter") enviarMensaje(inputMensaje.value);
});

// Mensaje de bienvenida
setTimeout(() => {
    agregarMensaje("⚡ ¡Hola! Soy JARVIS, tu asistente personal. ¿En qué puedo ayudarte? Puedes hablarme o escribirme.", "jarvis");
    hablar("Hola, soy Jarvis. Estoy listo para servirte.");
}, 500);