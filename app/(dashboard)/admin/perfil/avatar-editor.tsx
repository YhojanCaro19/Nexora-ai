"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { AvatarCropper } from "@/components/shared/AvatarCropper";
import { uploadAvatarAction, deleteAvatarAction } from "./actions";

// Mismo tamaño para el avatar mostrado y para el círculo de recorte — lo
// que el usuario ajusta en AvatarCropper corresponde 1:1 con lo que ve
// después. Extraído del antiguo identity-form.tsx sin cambiar la lógica.
const AVATAR_SIZE = 120;

export function AvatarEditor({ initialUrl, name }: { initialUrl: string | null; name: string }) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      setError("La foto debe ser JPG o PNG");
      return;
    }
    setPendingFile(file);
  }

  async function handleCropConfirm(croppedFile: File) {
    setPendingFile(null);
    const previousUrl = avatarUrl;
    setAvatarUrl(URL.createObjectURL(croppedFile));
    setUploading(true);
    const result = await uploadAvatarAction(croppedFile);
    setUploading(false);
    if (result.error || !result.url) {
      setError(result.error ?? "No se pudo subir la foto, intenta de nuevo");
      setAvatarUrl(previousUrl);
      return;
    }
    setAvatarUrl(result.url);
  }

  async function handleDelete() {
    setError(null);
    const previousUrl = avatarUrl;
    setAvatarUrl(null);
    setUploading(true);
    const result = await deleteAvatarAction();
    setUploading(false);
    if (result.error) {
      setError(result.error);
      setAvatarUrl(previousUrl);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="group relative block shrink-0 overflow-hidden rounded-full transition-opacity"
      >
        <Avatar url={avatarUrl} name={name} size={AVATAR_SIZE} />
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ opacity: uploading ? 1 : undefined }}
        >
          <Camera size={22} strokeWidth={1.75} color="#fff" />
        </div>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleChange}
        className="hidden"
      />
      {uploading ? (
        <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          Subiendo foto...
        </p>
      ) : avatarUrl ? (
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs underline underline-offset-2"
          style={{ color: "var(--nexora-alert)" }}
        >
          Quitar foto
        </button>
      ) : (
        <p className="text-xs" style={{ color: "var(--nexora-ink-dim)" }}>
          JPG o PNG, máx. 3MB
        </p>
      )}
      {error && (
        <p className="text-xs" style={{ color: "var(--nexora-alert)" }}>
          {error}
        </p>
      )}

      {pendingFile && (
        <AvatarCropper
          file={pendingFile}
          size={AVATAR_SIZE}
          onCancel={() => setPendingFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
