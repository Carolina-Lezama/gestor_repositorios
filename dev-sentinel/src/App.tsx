import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { 
  FolderOpen, 
  Code, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  FileText
} from "lucide-react";
import StorageReclaimer from "./components/StorageReclaimer";
import PortfolioGenerator from "./components/PortfolioGenerator";

// Estructura que coincide con nuestro backend en Rust
interface RepoStatus {
  path: string;
  has_uncommitted_changes: boolean;
  has_unpushed_commits: boolean;
}

export default function App() {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [repos, setRepos] = useState<RepoStatus[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedRepoForReadme, setSelectedRepoForReadme] = useState<string | null>(null);

  // Seleccionar directorio y escanear
  const handleSelectFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });

    if (selected && typeof selected === "string") {
      setRootPath(selected);
      scanRepositories(selected);
    }
  };

  const scanRepositories = async (path: string) => {
    setIsScanning(true);
    try {
      const result: RepoStatus[] = await invoke("scan_repositories", { rootPath: path });
      setRepos(result);
    } catch (error) {
      console.error("Error al escanear:", error);
    } finally {
      setIsScanning(false);
    }
  };

  // --- ACCIONES RÁPIDAS ---

const openInEditor = async (repoPath: string) => {
  try {
    await invoke("open_in_vscode", { path: repoPath });
  } catch (error) {
    console.error("Error abriendo VS Code:", error);
  }
};

const gitPush = async (repoPath: string) => {
  try {
    await invoke("git_push_repo", { path: repoPath });
    if (rootPath) scanRepositories(rootPath);
  } catch (error) {
    console.error("Error en git push:", error);
  }
};

  // Extraer el nombre de la carpeta de la ruta completa
  const getRepoName = (path: string) => {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Git Sentinel
          </h1>
          <p className="text-slate-400 text-sm mt-1">Auditor de estado de repositorios locales</p>
        </div>
        
        <button 
          onClick={handleSelectFolder}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition-colors px-4 py-2 rounded-lg font-medium shadow-lg shadow-indigo-500/20"
        >
          <FolderOpen size={18} />
          {rootPath ? "Cambiar Carpeta Raíz" : "Seleccionar Carpeta Raíz"}
        </button>
      </header>

      {/* ESTADO DE CARGA */}
      {isScanning && (
        <div className="flex flex-col items-center justify-center py-20 text-indigo-400">
          <RefreshCw className="animate-spin mb-4" size={32} />
          <p>Escaneando el sistema de archivos, buscando repositorios...</p>
        </div>
      )}

      {/* LISTADO DE REPOSITORIOS */}
      {!isScanning && repos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {repos.map((repo, idx) => {
            
            // Lógica de indicadores visuales
            let statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            let StatusIcon = CheckCircle2;
            let statusText = "Al día";

            if (repo.has_uncommitted_changes) {
              statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
              StatusIcon = AlertTriangle;
              statusText = "Cambios pendientes";
            } else if (repo.has_unpushed_commits) {
              statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
              StatusIcon = XCircle;
              statusText = "Commits por subir";
            }

            return (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm">
                
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg truncate w-3/4" title={repo.path}>
                    {getRepoName(repo.path)}
                  </h3>
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor}`}>
                    <StatusIcon size={14} />
                    {statusText}
                  </div>
                </div>

                <p className="text-xs text-slate-500 truncate mb-5">{repo.path}</p>

                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => openInEditor(repo.path)}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Code size={16} /> Code
                  </button>

                  <button
                    onClick={() => setSelectedRepoForReadme(repo.path)}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-sm font-medium transition-colors text-indigo-400"
                  >
                    <FileText size={16} /> Ficha
                  </button>
                  
                  {repo.has_unpushed_commits && !repo.has_uncommitted_changes && (
                    <button 
                      onClick={() => gitPush(repo.path)}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20"
                    >
                      <UploadCloud size={16} /> Push
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ESTADO VACÍO */}
      {!isScanning && repos.length === 0 && rootPath && (
        <div className="text-center py-20 text-slate-500">
          <p>No se encontraron repositorios Git en esta carpeta.</p>
        </div>
      )}
      
      {!isScanning && !rootPath && (
        <div className="text-center py-32 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
          <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Selecciona una carpeta para comenzar a auditar tus proyectos</p>
          <p className="text-sm mt-2 opacity-70">Soporta escaneo profundo de subdirectorios</p>
        </div>
      )}

      {!isScanning && repos.length > 0 && (
        <StorageReclaimer repos={repos} />
      )}

      {/* MODAL GENERADOR DE README */}
      {selectedRepoForReadme && (
        <PortfolioGenerator
          repoPath={selectedRepoForReadme}
          onClose={() => setSelectedRepoForReadme(null)}
        />
      )}

    </div>
  );
}