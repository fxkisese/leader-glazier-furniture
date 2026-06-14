import { useEffect } from "react";
import { Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SocialFeedSection() {
  useEffect(() => {
    // Dynamically load the Elfsight platform script
    const script = document.createElement("script");
    script.src = "https://elfsightcdn.com/platform.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Clean up the script when the component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

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

        {/* Elfsight Instagram Widget Container */}
        <div className="flex justify-center w-full min-h-[400px]">
          <div className="elfsight-app-edc7aee4-0d29-4445-bc20-ed0bcc8ef3c8 w-full" data-elfsight-app-lazy></div>
        </div>

        <div className="mt-12 text-center">
          <a href="https://www.instagram.com/craftsman_galore/" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-full px-8">
              <Instagram className="w-5 h-5" /> View Full Gallery
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
