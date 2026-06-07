import { Instagram, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const posts = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800",
    likes: 124,
    comments: 12,
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800",
    likes: 89,
    comments: 5,
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=800",
    likes: 256,
    comments: 24,
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&q=80&w=800",
    likes: 167,
    comments: 8,
  },
];

export default function SocialFeedSection() {
  return (
    <section className="py-16 lg:py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <p className="text-gold font-inter font-medium tracking-widest uppercase mb-3">
            Join Our Community
          </p>
          <h2 className="font-playfair text-3xl md:text-5xl font-bold text-primary mb-6">
            Follow Us on Instagram
          </h2>
          <p className="text-muted-foreground text-lg">
            Get inspired by our latest designs, behind-the-scenes craftsmanship, and real homes transformed by Craftsman Galore.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {posts.map((post) => (
            <a
              key={post.id}
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square block overflow-hidden rounded-2xl bg-muted"
            >
              <img
                src={post.image}
                alt="Instagram post"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                <div className="flex items-center gap-6 text-white font-medium translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <span className="flex items-center gap-2">
                    <Heart className="w-5 h-5 fill-white" /> {post.likes}
                  </span>
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 fill-white" /> {post.comments}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a href="#" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-full px-8">
              <Instagram className="w-5 h-5" /> View Full Gallery
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
