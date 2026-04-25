import { useState } from "react";
import { User, ShieldCheck, Info, Settings } from "lucide-react";
import { ProfileTab }    from "./tabs/ProfileTab";
import { SecurityTab }   from "./tabs/SecurityTab";
import { SystemInfoTab } from "./tabs/SystemInfoTab";

type TabId = "profile" | "security" | "system";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "profile",  label: "Perfil",    icon: <User size={16} /> },
  { id: "security", label: "Seguridad", icon: <ShieldCheck size={16} /> },
  { id: "system",   label: "Sistema",   icon: <Info size={16} /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
          <Settings size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configura tu perfil y preferencias del sistema</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar de pestañas */}
        <nav className="md:w-48 shrink-0">
          <div className="card p-2 flex md:flex-col gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                  activeTab === tab.id
                    ? "bg-primary-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile"  && <ProfileTab />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "system"   && <SystemInfoTab />}
        </div>
      </div>
    </div>
  );
}
