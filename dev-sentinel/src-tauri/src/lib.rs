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
                // Nota: Esto puede fallar si no hay rama remota (upstream), por eso usamos unwrap_or_default
                let log_output = Command::new("git")
                    .current_dir(path)
                    .args(["log", "@{u}..HEAD", "--oneline"])
                    .output()
                    .unwrap_or_default();

                let has_unpushed_commits = !log_output.stdout.is_empty();

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
            get_days_since_last_commit // <- NUEVA
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
