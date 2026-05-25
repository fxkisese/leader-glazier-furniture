import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AdminSettingsTab() {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: async () => {
      const list = await base44.entities.SiteSetting?.list?.() || [];
      return list.reduce((acc, s) => ({ ...acc, [s.setting_key]: s }), {});
    },
  });

  const DEFAULT_SETTINGS = [
    {
      key: "show_pricing",
      label: "Show Pricing",
      type: "boolean",
      value: "true",
    },
    {
      key: "hide_unavailable",
      label: "Hide Unavailable Items",
      type: "boolean",
      value: "true",
    },
    {
      key: "enable_instant_quotes",
      label: "Enable Instant Quotes",
      type: "boolean",
      value: "true",
    },
    {
      key: "enable_whatsapp",
      label: "Enable WhatsApp Integration",
      type: "boolean",
      value: "true",
    },
    {
      key: "show_installation_option",
      label: "Show Installation Option",
      type: "boolean",
      value: "false",
    },
    {
      key: "company_phone",
      label: "Company WhatsApp Number",
      type: "text",
      value: "+254712345678",
    },
  ];

  const handleSave = async (key, value) => {
    try {
      const existing = settings[key];
      if (existing?.id) {
        await base44.entities.SiteSetting?.update?.(existing.id, {
          setting_key: key,
          setting_value: value,
        });
      } else {
        await base44.entities.SiteSetting?.create?.({
          setting_key: key,
          setting_value: value,
          setting_type: DEFAULT_SETTINGS.find(s => s.key === key)?.type,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      setEditingKey(null);
    } catch (err) {
      console.error("Error saving setting:", err);
    }
  };

  const toggleBooleanSetting = (key) => {
    const current = settings[key]?.setting_value === "true";
    handleSave(key, (!current).toString());
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Site Settings</h3>

      {isLoading ? (
        <p className="text-gray-500">Loading settings...</p>
      ) : (
        <div className="space-y-3">
          {DEFAULT_SETTINGS.map(setting => {
            const current = settings[setting.key];
            const value = current?.setting_value ?? setting.value;

            return (
              <div
                key={setting.key}
                className="border rounded p-3 flex justify-between items-center"
              >
                <div className="flex-1">
                  <div className="font-medium">{setting.label}</div>
                  <div className="text-sm text-gray-500">{setting.key}</div>
                </div>

                <div className="flex items-center gap-2">
                  {setting.type === "boolean" ? (
                    <button
                      onClick={() => toggleBooleanSetting(setting.key)}
                      className={`px-4 py-2 rounded font-medium ${
                        value === "true"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {value === "true" ? "ON" : "OFF"}
                    </button>
                  ) : (
                    <>
                      {editingKey === setting.key ? (
                        <div className="flex gap-2">
                          <Input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="w-40"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSave(setting.key, editValue)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingKey(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="flex gap-2 items-center cursor-pointer"
                          onClick={() => {
                            setEditingKey(setting.key);
                            setEditValue(value);
                          }}
                        >
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {value}
                          </code>
                          <span className="text-xs text-gray-500">Edit</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
