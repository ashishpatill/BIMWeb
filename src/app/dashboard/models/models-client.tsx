"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Search, CheckCircle2, AlertCircle, UploadCloud, Info, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelViewer } from "@/components/viewer/model-viewer";
import { createModel, deleteModel } from "@/lib/actions";

interface ModelItem {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  fileSize: string;
  fileUrl: string | null;
  status: string;
  createdAt: Date;
}

interface Project {
  id: number;
  name: string;
}

interface ModelsClientProps {
  initialModels: ModelItem[];
  projects: Project[];
}

export function ModelsClient({ initialModels, projects }: ModelsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedModel, setSelectedModel] = useState<ModelItem | null>(
    initialModels.length > 0 ? initialModels[0] : null
  );
  
  // Upload states
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [fileSize, setFileSize] = useState("0.0 MB");
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModelId, setDeleteModelId] = useState<number | null>(null);
  const [deleteIsPending, startDeleteTransition] = useTransition();

  const handleDeleteModel = async () => {
    if (deleteModelId === null) return;
    startDeleteTransition(async () => {
      const res = await deleteModel(deleteModelId);
      if (res.success) {
        setDeleteModelId(null);
        if (selectedModel?.id === deleteModelId) setSelectedModel(null);
        router.refresh();
      }
    });
  };

  const filteredModels = initialModels.filter((model) =>
    model.name.toLowerCase().includes(search.toLowerCase()) ||
    (model.description && model.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setName(selectedFile.name);
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      setFileSize(`${sizeMB} MB`);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !projectId || !file) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 80) + 10;
          setUploadProgress(Math.min(pct, 90));
        }
      });

      const uploadRes = await new Promise<{ url: string; fileSize: string; name: string }>((resolve, reject) => {
        xhr.open("POST", "/api/upload");
        xhr.onload = () => {
          if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
          else reject(new Error("Upload failed"));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });

      setUploadProgress(95);

      startTransition(async () => {
        const res = await createModel(Number(projectId), uploadRes.name, description, uploadRes.fileSize, uploadRes.url);
        setIsUploading(false);
        setUploadProgress(0);
        if (res.success) {
          setIsOpen(false);
          setName("");
          setDescription("");
          setProjectId("");
          setFileSize("0.0 MB");
          setFile(null);
          router.refresh();
          if (res.model) setSelectedModel(res.model as ModelItem);
        } else {
          setError(res.error || "Upload failed");
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">BIM Models</h1>
          <p className="text-zinc-400">Upload, review, and inspect structural building representations.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button className="w-full sm:w-auto px-6 py-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all hover:scale-105 active:scale-95" />}>
            <UploadCloud className="w-5 h-5" />
            Upload Model
          </DialogTrigger>
          <DialogContent className="glass-panel border border-white/10 bg-zinc-950/97 text-white max-w-md rounded-2xl p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Box className="text-primary w-6 h-6" /> Upload 3D Model
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Upload `.ifc`, `.gltf`, `.obj`, or `.fbx` formats to analyze in our browser model viewer.
              </DialogDescription>
            </DialogHeader>

            {projects.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl flex items-start gap-3 mt-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">No Projects Available</p>
                  <p className="mt-1 text-zinc-400">You must create at least one project before uploading models.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-zinc-300">Target Project</Label>
                  <Select value={projectId} onValueChange={(val) => setProjectId(val || "")} required>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border border-white/10 text-white rounded-xl">
                      {projects.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id.toString()} className="focus:bg-primary/20 focus:text-white">
                          {proj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-zinc-300">File Upload</Label>
                  <div className="border border-dashed border-white/10 hover:border-primary/40 bg-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative">
                    <input
                      type="file"
                      accept=".ifc,.gltf,.obj,.fbx"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      required
                    />
                    <UploadCloud className="w-10 h-10 text-zinc-500 mb-2" />
                    <span className="text-sm font-semibold text-zinc-300">
                      {name ? name : "Click or Drag BIM file here"}
                    </span>
                    <span className="text-xs text-zinc-500 mt-1">Supports IFC, glTF, OBJ, FBX up to 100MB</span>
                  </div>
                </div>

                {name && (
                  <div className="text-xs text-zinc-400 flex justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="font-semibold truncate max-w-[250px]">{name}</span>
                    <span className="font-mono text-primary font-bold">{fileSize}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold text-zinc-300">
                    Model Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Provide version information, revisions, or load changes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 min-h-[80px]"
                  />
                </div>

                {isUploading && (
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs font-semibold text-zinc-300">
                      <span>Uploading & Processing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && <p className="text-sm font-semibold text-red-400 mt-2">{error}</p>}

                <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    disabled={isUploading}
                    className="w-full sm:w-auto rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUploading || isPending || !name || !projectId}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                  >
                    Upload Model
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Models List */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 w-full"
            />
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-1">
            {filteredModels.length === 0 ? (
              <div className="glass-panel p-8 text-center border border-white/5 rounded-2xl flex flex-col items-center justify-center">
                <Box className="w-8 h-8 text-zinc-600 mb-2" />
                <span className="text-sm text-zinc-400">No models found.</span>
              </div>
            ) : (
              filteredModels.map((model) => {
                const isSelected = selectedModel?.id === model.id;
                return (
                  <Card
                    key={model.id}
                    onClick={() => setSelectedModel(model)}
                    className={`glass-panel cursor-pointer transition-all border rounded-xl overflow-hidden group ${
                      isSelected
                        ? "border-primary/40 bg-primary/5 shadow-md"
                        : "border-white/5 hover:border-white/10 bg-white/5"
                    }`}
                  >
                    <CardContent className="p-4 relative">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className={`text-sm font-bold truncate flex-1 transition-colors ${
                          isSelected ? "text-primary" : "text-white group-hover:text-primary"
                        }`}>
                          {model.name}
                        </h4>
                        <span className="text-[10px] font-mono font-semibold text-zinc-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {model.fileSize}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                        {model.description || "No description provided."}
                      </p>
                      <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-500">
                        <span>{new Date(model.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setDeleteModelId(model.id); }}
                            className="text-red-400/60 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete model">
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: WebGL Viewer Panel */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {selectedModel ? (
            <div className="flex flex-col gap-4 h-full">
              <div className="flex-1 min-h-[400px]">
                <ModelViewer modelName={selectedModel.name} modelUrl={selectedModel.fileUrl} />
              </div>
              
              {/* Selected Model Details card */}
              <Card className="glass-panel border border-white/5 bg-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{selectedModel.name}</h3>
                    <p className="text-xs text-zinc-400">
                      Uploaded on {new Date(selectedModel.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                    Active Model
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-zinc-950/40 rounded-xl border border-white/5 mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">File Size</span>
                    <span className="text-sm font-bold text-zinc-300 font-mono">{selectedModel.fileSize}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Status</span>
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Normal
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Renderer</span>
                    <span className="text-sm font-bold text-zinc-300">GPU Accelerated</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5 text-sm text-zinc-400 leading-relaxed">
                  <Info className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-zinc-300 mb-1 font-sans">Metadata & Description</p>
                    <p className="font-medium text-xs">
                      {selectedModel.description || "This building model represents the structural component containing columns, slabs, and curtain walls. Interact with it directly in the 3D orbit viewer above by dragging your mouse."}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="glass-panel border border-white/5 rounded-2xl h-[500px] flex flex-col items-center justify-center text-center p-10">
              <Box className="w-16 h-16 text-zinc-600 mb-4 animate-pulse" />
              <h3 className="text-lg font-bold text-white mb-2">No Model Selected</h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                Select a model from the list, or upload a new model to review structural elements.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteModelId !== null} onOpenChange={(open) => { if (!open) setDeleteModelId(null); }}>
        <DialogContent className="glass-panel border border-white/10 bg-zinc-950/95 text-white max-w-sm rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" /> Delete Model
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to delete this model? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteModelId(null)}
              className="w-full sm:w-auto rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5">Cancel</Button>
            <Button onClick={handleDeleteModel} disabled={deleteIsPending}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl">
              {deleteIsPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Delete Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

