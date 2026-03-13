# 🚀 OPS-Workspace: Centro Operativo Integral

Bienvenido a **OPS-Workspace**, el punto central de acceso para todas las herramientas operativas de la plataforma. Este espacio de trabajo (Hub) está diseñado para centralizar la gestión de cashouts, credenciales, balanceos e incidencias técnicas bajo un mismo sistema de autenticación unificado.

## 📌 Estructura del Workspace

El proyecto está organizado en módulos independientes accesibles desde un **Dashboard Maestro**:

### 1. 🏠 Hub Principal (`/index.html`)
Es el punto de entrada. Sus funciones incluyen:
- **Autenticación Unificada**: Login centralizado mediante JWT que persiste la sesión en todas las aplicaciones del workspace.
- **Acceso por Roles**: La interfaz se adapta dinámicamente según el rol del usuario:
    - **Supervisor**: Acceso total a todas las herramientas y gestión de equipos.
    - **Analista**: Enfoque en verificación de cashouts y operapedia.
    - **Chats / Asistente**: Acceso restringido a herramientas de consulta específicas.
- **Personalización**: Soporte para modo claro y oscuro con persistencia local.

### 2. 💸 Módulo: Cashouts (`/cashouts/`)
Sistema crítico para el flujo financiero:
- **Registro en tiempo real**: Los operadores envían solicitudes de retiro.
- **Verificación**: Cola de trabajo para supervisores con cronómetros activos.
- **Sincronización**: Conexión directa con Google Sheets para auditoría.
- **Zona Horaria**: Configurado en **Central Time (Chicago)**.

### 3. 📓 Módulo: Operapedia (`/operapedia/`)
Enciclopedia operativa y gestión de credenciales:
- **Base de Datos**: Gestión de compañías, partners (Dragon, Tierlock, etc) y juegos.
- **Métodos de Pago**: Información detallada sobre depósitos y retiros.
- **Catálogo Maestro**: Lista centralizada de juegos con autorelleno de enlaces.
- **Modo Edición**: Protegido para administradores.

### 4. 📊 Módulo: Balance Monitor (`/balance-monitor/`)
Herramienta externa integrada para el monitoreo de saldos y movimientos operativos.

### 5. 🛠️ Soporte TI (Help Desk)
Integración con Airtable para un flujo ordenado de mantenimiento:
- **Reporte de Bugs**: Formulario para fallas técnicas.
- **Nuevas Solicitudes**: Canal para proponer mejoras o nuevas herramientas.

---

## 🛠️ Detalles Técnicos

### Tecnologías Core
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript ES6+.
- **Fondo Dinámico**: `particles.js` para una estética tecnológica premium.
- **Backend Relacionado**: El API central se encuentra en un repositorio separado (o carpeta `General-cashouts`) pero sirve a todo el Workspace.

### Variables Críticas
- **API_BASE**: Apunta al servidor de Render (`general-cashouts.onrender.com`).
- **Autenticación**: Se maneja vía `localStorage` compartiendo el `token` y el objeto `user`.

---

## 🎨 Guía de Diseño
El Workspace utiliza una estética **Premium Dark/Light Glassmorphism**:
- **Tipografía**: Inter.
- **Colores**: Acentos en Indigo `#5e6ad2` para elementos de navegación.
- **Efectos**: Desenfoque de fondo (blur) en navbars y modales para mayor profundidad.

---

## 📦 Instalación y Despliegue

1.  Asegúrate de tener acceso al servidor backend.
2.  Carga el contenido de `OPS-Workspace` en cualquier servidor de archivos estáticos.
3.  Configura el `API_BASE` en el `index.html` del root para que coincida con tu entorno.
4.  ¡Listo! Acceso inmediato a todo el ecosistema.
