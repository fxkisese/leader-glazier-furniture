import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Trash2, Eye, EyeOff } from "lucide-react";

export default function AdminAccessoriesTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    optional: true,
    is_visible: true,
    image: "",
    description: "",
  });

  const { data: accessories = [], isLoading } = useQuery({
    queryKey: ["accessories"],
    queryFn: () => base44.entities.Accessory?.list?.() || [],
  });

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      price: "",
      optional: true,
      is_visible: true,
      image: "",
      description: "",
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return alert("Name and price required");
    try {
      if (editingId) {
        await base44.entities.Accessory?.update?.(editingId, form);
      } else {
        await base44.entities.Accessory?.create?.(form);
      }
      queryClient.invalidateQueries({ queryKey: ["accessories"] });
      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error("Error saving accessory:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this accessory?")) return;
    try {
      await base44.entities.Accessory?.delete?.(id);
      queryClient.invalidateQueries({ queryKey: ["accessories"] });
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleEdit = (acc) => {
    setForm(acc);
    setEditingId(acc.id);
    setShowForm(true);
  };

  const handleToggleVisibility = async (acc) => {
    try {
      await base44.entities.Accessory?.update?.(acc.id, {
        ...acc,
        is_visible: !acc.is_visible,
      });
      queryClient.invalidateQueries({ queryKey: ["accessories"] });
    } catch (err) {
      console.error("Error toggling visibility:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Accessories</h3>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Accessory
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">
              {editingId ? "Edit Accessory" : "New Accessory"}
            </h4>
            <button onClick={() => { resetForm(); setShowForm(false); }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Name"
              value={form.name}
              onChange={e => set("name", e.target.value)}
            />
            <Input
              placeholder="Category"
              value={form.category}
              onChange={e => set("category", e.target.value)}
            />
            <Input
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={e => set("price", e.target.value)}
            />
            <Input
              placeholder="Image URL"
              value={form.image}
              onChange={e => set("image", e.target.value)}
            />
          </div>

          <Textarea
            placeholder="Description"
            value={form.description}
            onChange={e => set("description", e.target.value)}
            rows={2}
          />

          <div className="flex gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.optional}
                onChange={e => set("optional", e.target.checked)}
              />
              <span className="text-sm">Optional</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={e => set("is_visible", e.target.checked)}
              />
              <span className="text-sm">Visible</span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm">
              Save
            </Button>
            <Button
              onClick={() => { resetForm(); setShowForm(false); }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-gray-500">Loading accessories...</p>
        ) : accessories.length === 0 ? (
          <p className="text-gray-500">No accessories yet</p>
        ) : (
          accessories.map(acc => (
            <div
              key={acc.id}
              className="border rounded p-3 flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="font-medium">{acc.name}</div>
                <div className="text-sm text-gray-600">
                  {acc.category} • KSh {acc.price}
                </div>
                <div className="flex gap-2 mt-1">
                  <Badge variant={acc.optional ? "secondary" : "default"}>
                    {acc.optional ? "Optional" : "Required"}
                  </Badge>
                  <Badge variant={acc.is_visible ? "default" : "outline"}>
                    {acc.is_visible ? "Visible" : "Hidden"}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleToggleVisibility(acc)}
                  className="p-2 hover:bg-gray-200 rounded"
                >
                  {acc.is_visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => handleEdit(acc)}
                  className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(acc.id)}
                  className="p-2 hover:bg-red-100 rounded text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
