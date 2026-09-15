use serde::Serialize;
use std::fs;
use std::path::Path;
use std::process::Command;
use walkdir::WalkDir;

// --- ESTRUCTURAS DE DATOS ---
// Estas estructuras se convertirán en objetos JSON cuando lleguen a React

#[derive(Serialize)]
pub struct RepoStatus {
    path: String,
    has_uncommitted_changes: bool,
    has_unpushed_commits: bool,
}

#[derive(Serialize)]
pub struct HeavyFolder {
    name: String,
    path: String,
    size_mb: f64,
}

// --- COMANDOS DE TAURI ---

#[tauri::command]
fn scan_repositories(root_path: String) -> Result<Vec<RepoStatus>, String> {
    let mut repos = Vec::new();

    // Iniciamos el escaneo de carpetas
    let mut it = WalkDir::new(&root_path).into_iter();

    while let Some(Ok(entry)) = it.next() {
        let path = entry.path();

        if path.is_dir() {
            let git_dir = path.join(".git");

            if git_dir.exists() {
                // ¡Encontramos un repositorio!
                let repo_path = path.to_string_lossy().to_string();

                // 1. Revisar cambios sin guardar (git status)
                let status_output = Command::new("git")
                    .current_dir(path)
                    .args(["status", "--porcelain"])
                    .output()
                    .map_err(|e| format!("Error en git status: {}", e))?;

                let has_uncommitted_changes = !status_output.stdout.is_empty();

                // 2. Revisar commits sin subir (git log)
                let log_output = Command::new("git")
                    .current_dir(path)
                    .args(["log", "@{u}..HEAD", "--oneline"])
                    .output();

                let has_unpushed_commits = match log_output {
                    Ok(output) => !output.stdout.is_empty(),
                    Err(_) => false,
                };

                repos.push(RepoStatus {
                    path: repo_path,
                    has_uncommitted_changes,
                    has_unpushed_commits,
                });

                // Evitamos escanear dentro de este repo para ahorrar tiempo
                it.skip_current_dir();
            } else {
                // Si no es un repo, pero es una carpeta pesada típica, la saltamos para no perder tiempo
                let name = entry.file_name().to_string_lossy();
                if name == "node_modules" || name == "target" || name == ".venv" || name == "dist" {
                    it.skip_current_dir();
                }
            }
        }
    }

    Ok(repos)
}

// Función auxiliar para calcular el peso real de una carpeta (recursiva)
fn get_dir_size(path: &Path) -> u64 {
    let mut size = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_dir() {
                    size += get_dir_size(&entry.path());
                } else {
                    size += metadata.len();
                }
            }
        }
    }
    size
}

#[tauri::command]
fn calculate_heavy_folders(repo_path: String) -> Result<Vec<HeavyFolder>, String> {
    // Carpetas objetivo a limpiar
    let targets = ["node_modules", ".venv", ".next", "dist", "target", "build"];
    let mut heavy_folders = Vec::new();
    let base_path = Path::new(&repo_path);

    for target in targets {
        let target_path = base_path.join(target);

        if target_path.exists() && target_path.is_dir() {
            let size_bytes = get_dir_size(&target_path);
            let size_mb = size_bytes as f64 / (1024.0 * 1024.0);

            heavy_folders.push(HeavyFolder {
                name: target.to_string(),
                path: target_path.to_string_lossy().to_string(),
                // Redondeamos a 2 decimales
                size_mb: (size_mb * 100.0).round() / 100.0,
            });
        }
    }

    Ok(heavy_folders)
}

#[tauri::command]
fn delete_heavy_folder(folder_path: String) -> Result<(), String> {
    let path = Path::new(&folder_path);
    if path.exists() && path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("Error al borrar carpeta: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn get_days_since_last_commit(repo_path: String) -> Result<u64, String> {
    // Obtenemos el timestamp (UNIX) del último commit
    let output = Command::new("git")
        .current_dir(&repo_path)
        .args(["log", "-1", "--format=%ct"])
        .output()
        .map_err(|e| format!("Error de git: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let timestamp: i64 = stdout.trim().parse().unwrap_or(0);

    if timestamp == 0 {
        return Ok(0); // Si no hay commits o falla
    }

    let current_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let days = (current_time - timestamp) / (60 * 60 * 24);
    Ok(days as u64)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_repositories,
            calculate_heavy_folders,
            delete_heavy_folder,
            get_days_since_last_commit,
            generate_readme_markdown,
            open_in_vscode,
            git_push_repo
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn generate_readme_markdown(repo_path: String, description: String) -> Result<String, String> {
    let base_path = std::path::Path::new(&repo_path);
    let mut tech_stack = Vec::new();

    // 1. Lectura de package.json (Node.js)
    let pkg_path = base_path.join("package.json");
    if pkg_path.exists() {
        if let Ok(content) = fs::read_to_string(pkg_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(deps) = json.get("dependencies").and_then(|d| d.as_object()) {
                    tech_stack.extend(deps.keys().cloned());
                }
            }
        }
    }

    // 2. Lectura de requirements.txt (Python)
    let req_path = base_path.join("requirements.txt");
    if req_path.exists() {
        if let Ok(content) = fs::read_to_string(req_path) {
            for line in content.lines() {
                let clean = line.trim();
                if !clean.is_empty() && !clean.starts_with('#') {
                    let name = clean
                        .split(&['=', '>', '<', '~'][..])
                        .next()
                        .unwrap_or("")
                        .trim();
                    if !name.is_empty() {
                        tech_stack.push(name.to_string());
                    }
                }
            }
        }
    }

    let repo_name = base_path.file_name().unwrap_or_default().to_string_lossy();
    let stack_str = if tech_stack.is_empty() {
        "`General`".to_string()
    } else {
        tech_stack
            .iter()
            .map(|t| format!("`{}`", t))
            .collect::<Vec<_>>()
            .join(", ")
    };

    let markdown = format!(
        "# {}\n\n## Descripción\n{}\n\n## 🛠 Tech Stack\n{}\n\n##  Instalación\n```bash\n# Clona este repositorio e instala sus dependencias\n```",
        repo_name, description, stack_str
    );

    Ok(markdown)
}

#[tauri::command]
fn open_in_vscode(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "code", &path])
            .spawn()
            .map_err(|e| format!("Error al abrir VS Code: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("code")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Error al abrir VS Code: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn git_push_repo(path: String) -> Result<(), String> {
    let output = Command::new("git")
        .current_dir(&path)
        .args(["push"])
        .output()
        .map_err(|e| format!("Error ejecutando git push: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
