import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileText, Copy, Check } from "lucide-react";

export default function PortfolioGenerator({ repoPath, onClose }: { repoPath: string; onClose: () => void }) {
  const [description, setDescription] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    try {
      const result: string = await invoke("generate_readme_markdown", {
        repoPath,
        description: description || "Proyecto desarrollado con alto rendimiento y buenas prácticas.",
      });
      setMarkdown(result);
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-indigo-400">
          <FileText /> Generador de README / Ficha
        </h3>

        {!markdown ? (
          <div className="space-y-4">
            <textarea
              placeholder="Escribe una breve descripción del proyecto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800">
                Cancelar
              </button>
              <button onClick={handleGenerate} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium">
                Generar Ficha
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-300 max-h-60 overflow-y-auto border border-slate-800">
              {markdown}
            </pre>
            <div className="flex justify-end gap-3">
              <button onClick={copyToClipboard} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium">
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copiado" : "Copiar Markdown"}
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}