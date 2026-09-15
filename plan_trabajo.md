# Paso 0: Preparación del Entorno y Creación del Proyecto: Configuración inicial de herramientas nativas y frontend.
1.	Instalar prerrequisitos: Asegúrate de contar con Node.js (v18+), Rust (mediante rustup) y un editor con las extensiones de Tauri y Rust.


2.	Inicializar la aplicación:
- npm create tauri-app@latest dev-sentinel -- --template react-ts
- cd dev-sentinel
- npm install

3.	Instalar dependencias clave:
- npm install lucide-react tailwindcss @tailwindcss/vite
- npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-shell  @tauri-apps/plugin-fs

4.	Configurar Tailwind CSS: Agrega la directiva @import "tailwindcss"; en tu archivo src/index.css.

# Paso 1: Backend en Rust (Comandos de Auditoría):Lectura eficiente del sistema de archivos y comandos Git.
Implementa en src-tauri/src/lib.rs las funciones nativas invocables desde React:

- scan_repositories(root_path: String): Recorre recursivamente las subcarpetas, detecta la presencia de .git y ejecuta mediante std::process::Command las revisiones de estado: git status --porcelain y git log @{u}..HEAD.
- calculate_heavy_folders(repo_path: String): Mide en segundo plano el tamaño de carpetas pesadas (node_modules, .venv, .next, dist, target).
- delete_heavy_folder(folder_path: String): Elimina de forma segura las carpetas de compilación seleccionadas.


# Paso 2: Desarrollar el MVP — Git Sentinel:Dashboard principal y visualización de estados.
- Selector de Ruta: Integra @tauri-apps/plugin-dialog (open({ directory: true })) para seleccionar el directorio raíz (~/Developer o C:\Proyectos).
- Tarjetas/Tabla de Repositorios: Muestra la lista de proyectos auditados con indicadores visuales:
    - Verde: Repositorio limpio y sincronizado con el remoto.
    - Amarillo: Cambios pendientes (uncommitted) o commits locales por subir (unpushed).
    - Rojo: Rama remota desactualizada o conflictos detectados.
- Acciones Rápidas: Añade botones para abrir la terminal en el directorio, lanzar el editor (code .) o ejecutar un git push directo.

# Paso 3: Módulo Storage Reclaimer:Auditoría de espacio e inactividad de carpetas pesadas.
- Detección de Inactividad: Filtra repositorios con más de 30 o 60 días sin commits ni modificaciones recientes.
- Métricas de Espacio: Visualiza un indicador global del espacio recuperable acumulado (ej. "38.4 GB detectados en cachés e inactivos").
- Limpieza Segura: Implementa un selector múltiple con modal de confirmación previa antes de invocar la eliminación masiva desde el backend en Rust.


# Paso 4: Generador de Fichas de Portafolio:Extractor automático de metadatos y documentación Markdown.
- Parsing de Dependencias: Diseña un analizador ligero que lea package.json o requirements.txt para identificar las tecnologías principales del proyecto.
- Generación de Markdown: Crea una vista previa editable con una plantilla estructurada (Descripción, Tech Stack, Instrucciones de instalación) lista para copiar al portapapeles o guardar directamente como README.md.


# Paso 5: Pulido de UI, Pruebas y Empaquetado Final:Compilación del binario ejecutable para tu portafolio.
- Estados de Carga: Añade skeletons de carga mientras el backend analiza directorios pesados para evitar bloqueos en la interfaz.
- Compilar la Aplicación Nativa:
     - npm run tauri build
- Entrega: Obtén el instalador generado (.exe, .dmg o .AppImage) ubicado en src-tauri/target/release/bundle/. Publícalo en la sección de Releases de tu repositorio en GitHub junto con capturas de pantalla de la app.



