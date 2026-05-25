import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, Shield, Wrench, Phone } from "lucide-react";

const features = [
  { icon: Shield, title: "Premium Quality", desc: "Every piece is crafted with quality materials and attention to detail." },
  { icon: Truck, title: "Nairobi Delivery", desc: "We deliver and install furniture and glass across Nairobi and beyond." },
  { icon: Wrench, title: "Professional Installation", desc: "Our team handles glass installation, fitting, and furniture assembly." },
  { icon: Phone, title: "Direct Support", desc: "Reach us directly on WhatsApp or phone for quotes and inquiries." },
];

export default function TrustSection() {
  return (
    <section className="py-16 lg:py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex gap-4 items-start p-5 bg-white rounded-2xl border border-border">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{f.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Order CTA */}
        <div className="bg-gradient-to-r from-primary to-[hsl(270,60%,35%)] rounded-3xl p-8 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="text-center lg:text-left">
            <h3 className="font-playfair text-2xl lg:text-3xl font-bold text-white">Have Something Specific in Mind?</h3>
            <p className="text-white/70 mt-2 max-w-lg">We build custom furniture and cut glass to any size. Share your design idea and we'll bring it to life.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/custom-orders">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full font-semibold px-8">
                Request Custom Order
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}