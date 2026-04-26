import { useState } from "react";
import { Camera, Save, User } from "lucide-react";
import { useProfile, useUpdateProfile, useUploadAvatar, useDeleteAvatar } from "@/hooks/useSettings";

export function ProfileTab() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar  = useUploadAvatar();
  const deleteAvatar  = useDeleteAvatar();

  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", cedula: "", phone: "", bio: "", theme: "light" as "light" | "dark" });
  const [initialized, setInitialized] = useState(false);

  if (profile && !initialized) {
    setForm({
      first_name: profile.first_name,
      last_name:  profile.last_name,
      email:      profile.email,
      cedula:     profile.cedula ?? "",
      phone:      profile.phone  ?? "",
      bio:        profile.bio    ?? "",
      theme:      profile.theme,
    });
    setInitialized(true);
  }

  if (isLoading) return <div className="h-48 flex items-center justify-center text-gray-400">Cargando...</div>;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateProfile.mutate({
      first_name: form.first_name,
      last_name:  form.last_name,
      email:      form.email,
      cedula:     form.cedula || null,
      phone:      form.phone  || null,
      bio:        form.bio,
      theme:      form.theme,
    });
  }

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Camera size={16} className="text-primary-500" /> Foto de perfil
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative group w-20 h-20 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={28} className="text-primary-400" />
            )}
            <button
              type="button"
              onClick={() => document.getElementById("avatar-input")?.click()}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Camera size={18} className="text-white" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => document.getElementById("avatar-input")?.click()}
              className="btn-secondary text-xs py-1.5 px-3"
              disabled={uploadAvatar.isPending}
            >
              {uploadAvatar.isPending ? "Subiendo..." : "Cambiar foto"}
            </button>
            {profile?.avatar_url && (
              <button
                type="button"
                onClick={() => deleteAvatar.mutate()}
                className="text-xs text-red-500 hover:text-red-700 text-left"
                disabled={deleteAvatar.isPending}
              >
                Eliminar foto
              </button>
            )}
          </div>
          <input
            id="avatar-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar.mutate(f); e.target.value = ""; }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-3">JPG, PNG o WEBP · máx. 5 MB</p>
      </div>

      {/* Información personal */}
      <form onSubmit={handleSave} className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <User size={16} className="text-primary-500" /> Información personal
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico <span className="text-red-500">*</span></label>
            <input type="email" className="input-field" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cédula <span className="text-xs text-gray-400">(opcional)</span></label>
            <input className="input-field font-mono" value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} maxLength={13} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono <span className="text-xs text-gray-400">(opcional)</span></label>
            <input className="input-field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} maxLength={15} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Cuéntanos algo sobre ti..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
            <select className="input-field" value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value as "light" | "dark" }))}>
              <option value="light">☀️ Claro</option>
              <option value="dark">🌙 Oscuro</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={updateProfile.isPending}>
            <Save size={15} />
            {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
