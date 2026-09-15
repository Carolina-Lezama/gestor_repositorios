import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { HardDrive, Trash2, AlertCircle, CheckSquare, Square } from "lucide-react";

interface HeavyFolder {
  name: string;
  path: string;
  size_mb: number;
}

interface ReclaimableItem extends HeavyFolder {
  repoPath: string;
  daysInactive: number;
}

export default function StorageReclaimer({ repos }: { repos: any[] }) {
  const [items, setItems] = useState<ReclaimableItem[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (repos.length > 0) analyzeStorage();
  }, [repos]);

  const analyzeStorage = async () => {
    setIsScanning(true);
    const foundItems: ReclaimableItem[] = [];

    for (const repo of repos) {
      try {
        const daysInactive: number = await invoke("get_days_since_last_commit", { repoPath: repo.path });
        
        // Filtramos repositorios con más de 30 días de inactividad
        if (daysInactive >= 30) {
          const folders: HeavyFolder[] = await invoke("calculate_heavy_folders", { repoPath: repo.path });
          
          folders.forEach(folder => {
            foundItems.push({ ...folder, repoPath: repo.path, daysInactive });
          });
        }
      } catch (error) {
        console.error("Error analizando:", error);
      }
    }
    
    setItems(foundItems);
    setIsScanning(false);
  };

  const toggleSelection = (path: string) => {
    const newSelection = new Set(selectedPaths);
    if (newSelection.has(path)) newSelection.delete(path);
    else newSelection.add(path);
    setSelectedPaths(newSelection);
  };

  const totalSpaceMB = items.reduce((acc, item) => acc + item.size_mb, 0);
  const selectedSpaceMB = items
    .filter(item => selectedPaths.has(item.path))
    .reduce((acc, item) => acc + item.size_mb, 0);

  const executeDeletion = async () => {
    for (const path of selectedPaths) {
      await invoke("delete_heavy_folder", { folderPath: path });
    }
    setIsModalOpen(false);
    setSelectedPaths(new Set());
    analyzeStorage(); // Refrescar lista
  };

  const formatSize = (mb: number) => mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;

  if (isScanning) return <p className="text-indigo-400 mt-8 text-center animate-pulse">Analizando inactividad y cachés pesados...</p>;
  if (items.length === 0) return null;

  return (
    <div className="mt-12 bg-slate-900 rounded-2xl border border-slate-800 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-rose-400">
            <HardDrive /> Storage Reclaimer
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {formatSize(totalSpaceMB)} detectados en repositorios inactivos (+30 días).
          </p>
        </div>
        
        <button
          disabled={selectedPaths.size === 0}
          onClick={() => setIsModalOpen(true)}
          className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-rose-900/20"
        >
          <Trash2 size={18} />
          Liberar {formatSize(selectedSpaceMB)}
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-4">
              <button onClick={() => toggleSelection(item.path)} className="text-slate-400 hover:text-indigo-400">
                {selectedPaths.has(item.path) ? <CheckSquare className="text-indigo-400" /> : <Square />}
              </button>
              <div>
                <p className="font-medium text-slate-200">{item.repoPath.split(/[/\\]/).pop()} <span className="text-slate-500 text-xs font-normal">({item.daysInactive} días inactivo)</span></p>
                <p className="text-xs text-rose-400 font-mono mt-1">/{item.name} · {formatSize(item.size_mb)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 p-8 rounded-2xl border border-rose-500/30 max-w-md w-full shadow-2xl">
            <AlertCircle className="text-rose-500 w-16 h-16 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-center mb-2">¿Confirmas la eliminación?</h3>
            <p className="text-slate-400 text-center mb-6 text-sm">
              Estás a punto de eliminar permanentemente <strong>{selectedPaths.size} carpetas</strong> de compilación, liberando <strong>{formatSize(selectedSpaceMB)}</strong>. Deberás reinstalar dependencias (ej. npm install) si retomas estos proyectos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">Cancelar</button>
              <button onClick={executeDeletion} className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 font-medium transition-colors">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}