# Dev Sentinel — Dashboard & Auditor de Repositorios

> **Dev Sentinel** es una aplicación de escritorio nativa, ultraligera y de alto rendimiento diseñada para desarrolladores que necesitan auditar sus proyectos locales, liberar gigabytes de espacio en disco y generar documentación de portafolio automáticamente.

---

## Características Principales

- ** Git Sentinel (Auditor de Estado):** Escaneo profundo de directorios para detectar en segundos repositorios con cambios sin guardar (`uncommitted`) o commits locales pendientes de subir (`unpushed`).
- ** Storage Reclaimer (Liberador de Espacio):** Identifica repositorios inactivos (+30 días) y permite eliminar con un solo clic carpetas pesadas de compilación (`node_modules`, `.venv`, `.next`, `dist`, `target`).
- ** Generador de Fichas Markdown:** Analizador automático de dependencias (`package.json`, `requirements.txt`) que redacta un archivo `README.md` estructurado y listo para publicar.
- ** Integración Nativa:** Acceso directo al sistema operativo para abrir VS Code o ejecutar comandos `git` sin salir de la app.

---

## Tech Stack

- **Core & Backend Nativo:** [Rust](https://www.rust-lang.org/) + [Tauri v2](https://v2.tauri.app/) (Ejecutable ultra ligero `< 15 MB`).
- **Frontend:** [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/).
- **Estilos & UI:** [Tailwind CSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/).
- **Herramientas de Build:** Vite + Cargo.

---

## Instalación y Desarrollo Local

### Prerrequisitos

- **Node.js** (v18 o superior)
- **Rust & Cargo** ([Instalar Rustup](https://rustup.rs/))

### Pasos para ejecutar

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/dev-sentinel.git](https://github.com/tu-usuario/dev-sentinel.git)
   cd dev-sentinel
   ```

# Instalar dependencias de Node:

## Bash

    npm install

Iniciar en modo desarrollo:

## Bash

    npm run tauri dev

Compilar para producción (Ejecutable .exe):

## Bash

    npm run tauri build

# Licencia

Este proyecto está bajo la Licencia MIT.
