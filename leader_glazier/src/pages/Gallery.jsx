import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import AddGalleryModal from "../components/admin/AddGalleryModal";

const SAMPLE_PROJECTS = [
  { id: "1", title: "Living Room Sofa Set", category: "furniture", images: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop"], description: "Custom L-shaped sofa with matching coffee table." },
  { id: "2", title: "Office Glass Partition", category: "glass", images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop"], description: "Full floor-to-ceiling glass partitions for a corporate office." },
  { id: "3", title: "Master Bedroom Wardrobe", category: "furniture", images: ["https://images.unsplash.com/photo-1558997519-83ea9252edc8?w=600&h=400&fit=crop"], description: "6-door mirrored wardrobe with internal organizers." },
  { id: "4", title: "Bathroom Mirror & Shower Glass", category: "glass", images: ["https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=400&fit=crop"], description: "Frameless shower enclosure and full-length bathroom mirror." },
  { id: "5", title: "Executive Office Setup", category: "furniture", images: ["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&h=400&fit=crop"], description: "Executive desk, credenza, and ergonomic chair set." },
  { id: "6", title: "Glass Dining Table Top", category: "glass", images: ["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop"], description: "10mm toughened glass table top for a dining room." },
];

const CATS = [{ v: "all", l: "All Projects" }, { v: "furniture", l: "Furniture" }, { v: "glass", l: "Glass Works" }, { v: "custom", l: "Custom" }, { v: "interior", l: "Interior" }];

export default function Gallery() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [cat, setCat] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["gallery-projects"],
    queryFn: () => base44.entities.GalleryProject.list("-created_date"),
  });

  const display = projects.length > 0 ? projects : SAMPLE_PROJECTS;
  const filtered = cat === "all" ? display : display.filter((p) => p.category === cat);

  const openLightbox = (project, i = 0) => { setLightbox(project); setImgIdx(i); };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-[#f8f5ff] to-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <p className="text-gold text-sm font-medium uppercase tracking-widest mb-2">Our Work</p>
          <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground">Completed Projects</h1>
          <p className="text-muted-foreground mt-2 max-w-lg">A showcase of furniture installations, glass works, and custom projects across Nairobi.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATS.map((c) => (
            <button key={c.v} onClick={() => setCat(c.v)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${cat === c.v ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border hover:border-primary/40 hover:text-primary"}`}>
              {c.l}
            </button>
          ))}
        </div>

        {/* Masonry-style grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {filtered.map((project) => (
            <div key={project.id} className="break-inside-avoid bg-white rounded-2xl overflow-hidden border border-border hover:border-primary/20 hover:shadow-xl hover:shadow-primary/8 transition-all duration-300 group cursor-pointer"
              onClick={() => openLightbox(project, 0)}>
              {project.images?.[0] && (
                <div className="overflow-hidden">
                  <img src={project.images[0]} alt={project.title} className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{project.category}</p>
                <h3 className="font-semibold text-foreground mt-1">{project.title}</h3>
                {project.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>}
              </div>
              {isAdmin && (
                <div className="px-4 pb-4">
                  <Button size="sm" variant="outline" className="w-full text-xs border-primary/30 text-primary"
                    onClick={(e) => { e.stopPropagation(); setEditProject(project); setShowAdd(true); }}>
                    Edit
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {isAdmin && (
          <button onClick={() => { setEditProject(null); setShowAdd(true); }}
            className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110">
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white p-2"><X className="w-6 h-6" /></button>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.images?.[imgIdx]} alt={lightbox.title} className="w-full rounded-2xl max-h-[70vh] object-contain" />
            <div className="text-center mt-4">
              <h3 className="text-white font-semibold">{lightbox.title}</h3>
              <p className="text-white/60 text-sm">{lightbox.description}</p>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <AddGalleryModal
          project={editProject}
          onClose={() => { setShowAdd(false); setEditProject(null); }}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ["gallery-projects"] }); setShowAdd(false); }}
        />
      )}
    </div>
  );
}