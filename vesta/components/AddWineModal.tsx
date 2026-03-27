"use client";

import { useState, useRef } from "react";
import { addWine } from "@/services/firebaseDb";
import { auth } from "@/lib/firebase";

async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw new Error("Cloudinary no configurado");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Error subiendo imagen a Cloudinary");
  const data = await res.json();
  return data.secure_url as string;
}

export default function AddWineModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [variety, setVariety] = useState("");
  const [year, setYear] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    setUploadStatus(null);

    try {
      let imageUrl = "";

      if (imageFile) {
        setUploadStatus("Subiendo imagen...");
        imageUrl = await uploadToCloudinary(imageFile);
        setUploadStatus(null);
      }

      await addWine(auth.currentUser.uid, name, variety, year, imageUrl);
      onSuccess();
      onClose();
      setName("");
      setVariety("");
      setYear("");
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      alert("Error guardando vino");
    } finally {
      setLoading(false);
      setUploadStatus(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/20 rounded-3xl w-full max-w-md p-8 shadow-[0_30px_100px_rgba(2,6,23,0.8)] overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-1">Registrar Etiqueta</h2>
          <p className="text-emerald-100/50 text-sm mb-6">
            Agregar un nuevo vino a tu catálogo de trazabilidad VESTA.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-emerald-200 uppercase tracking-widest mb-1.5 opacity-80">
                Nombre Comercial
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                placeholder="Ej: Gran Reserva Monteviejo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-200 uppercase tracking-widest mb-1.5 opacity-80">
                  Cepa / Variety
                </label>
                <input
                  type="text"
                  required
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                  placeholder="Malbec"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-200 uppercase tracking-widest mb-1.5 opacity-80">
                  Cosecha
                </label>
                <input
                  type="text"
                  required
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                  placeholder="2024"
                />
              </div>
            </div>

            {/* Imagen opcional */}
            <div>
              <label className="block text-xs font-semibold text-emerald-200 uppercase tracking-widest mb-1.5 opacity-80">
                Foto de etiqueta{" "}
                <span className="text-slate-500 normal-case font-normal">(opcional)</span>
              </label>

              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-40 object-contain rounded-xl border border-emerald-500/20 bg-black/40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 text-xs flex items-center justify-center transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 border border-dashed border-emerald-500/25 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-emerald-400/50 hover:bg-emerald-500/5 transition-all text-slate-500 hover:text-emerald-300"
                >
                  <span className="text-2xl">📷</span>
                  <span className="text-xs">Seleccionar imagen</span>
                  <span className="text-[10px] text-slate-600">JPG, PNG, WEBP</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {uploadStatus && (
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 rounded-xl px-4 py-3">
                <svg className="animate-spin h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {uploadStatus}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all disabled:opacity-50"
              >
                {loading ? "Registrando..." : "Guardar Etiqueta"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
