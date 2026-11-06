import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Truck, Wrench, Award, MessageCircle } from "lucide-react";
import { FEATURES } from "@/lib/features";

const WHATSAPP = "254110767199";

// Stock inspiration photos. These live only on the About page; everywhere else shows admin uploads.
const INSPIRATION = [
    { src: "https://images.unsplash.com/photo-1618219740975-d40978bb7378?w=800&h=600&fit=crop&q=80", alt: "Living room sofa" },
    { src: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=600&fit=crop&q=80", alt: "Bedroom" },
    { src: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&h=600&fit=crop&q=80", alt: "Wardrobe" },
    { src: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&h=600&fit=crop&q=80", alt: "Dining set" },
    { src: "https://images.unsplash.com/photo-1618219944342-824e40a13285?w=800&h=600&fit=crop&q=80", alt: "TV stand" },
    { src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop&q=80", alt: "Mirror" },
    { src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop&q=80", alt: "Office glass partition" },
    { src: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&h=600&fit=crop&q=80", alt: "Shower glass" },
];

export default function About() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <div className="bg-gradient-to-br from-primary to-[#6B4F3A] text-primary-foreground">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
                    <p className="text-gold text-sm font-medium uppercase tracking-widest mb-3">Our Story</p>
                    <h1 className="font-playfair text-3xl lg:text-5xl font-bold mb-6">About Craftsman Galore</h1>
                    <p className="text-primary-foreground/80 text-lg leading-relaxed max-w-2xl mx-auto">
                        We are Kenya's trusted workshop for authentic handmade furniture and professional glass solutions. Built by local artisans, we bring high-quality bespoke designs to homes and offices countrywide.
                    </p>
                </div>
            </div>

            {/* Story */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="font-playfair text-3xl font-bold text-foreground">Crafted by Hand, Built to Last</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Craftsman Galore was founded to elevate authentic Kenyan artisanship. We believe that furniture should be crafted by hand, not mass-produced in a factory. Our workshop works with master woodcarvers and carpenters to design and build durable, stunning pieces that bring warmth to your home.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            We source premium local materials and hardwoods to custom-build sofas, dining tables, wardrobes, and TV stands exactly to your specifications. Combined with our professional glass and mirror services, we deliver complete, bespoke interiors.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            We've made it simple to design your space. Browse our collections, {FEATURES.glassQuote ? "get an instant customized glass quote online" : "ask us about glass and mirror work"}, or share your custom design request directly. We bring the workshop directly to you, with delivery and installation across all 47 counties of Kenya.
                        </p>
                        <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
                            <Button className="bg-primary hover:bg-primary/90 text-white rounded-full gap-2">
                                <MessageCircle className="w-4 h-4" /> Chat With Us
                            </Button>
                        </a>
                    </div>
                    <div className="rounded-3xl overflow-hidden aspect-[4/3] shadow-xl shadow-primary/10">
                        <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=450&fit=crop" alt="Showroom" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>

            {/* Inspiration */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
                <div className="text-center mb-8">
                    <p className="text-gold text-sm font-medium uppercase tracking-widest mb-2">Inspiration</p>
                    <h2 className="font-playfair text-3xl font-bold text-foreground">Spaces We Love</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    {INSPIRATION.map((img) => (
                        <div key={img.src} className="rounded-2xl overflow-hidden aspect-[4/3] group">
                            <img src={img.src} alt={img.alt} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Values */}
            <div className="bg-[#F3EBDF] py-14">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="font-playfair text-3xl font-bold text-foreground">Why Choose Us</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: Award, title: "Authentic Craftsmanship", desc: "Built with passion by skilled Kenyan woodcarvers and carpenters." },
                            { icon: Shield, title: "Locally Sourced Wood", desc: "Using durable local hardwoods and premium materials built for longevity." },
                            { icon: Truck, title: "Countrywide Delivery", desc: "We safely deliver and install across Nairobi and nationwide to Mombasa, Kisumu, Nakuru, and beyond." },
                            { icon: Wrench, title: "Dedicated Support", desc: "Our technicians handle measurements, installation, and after-sales care." },
                        ].map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="bg-white rounded-2xl p-6 text-center space-y-3 border border-border">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                                    <Icon className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="font-semibold text-foreground">{title}</h3>
                                <p className="text-sm text-muted-foreground">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center space-y-6">
                <h2 className="font-playfair text-3xl font-bold text-foreground">Ready to Get Started?</h2>
                <p className="text-muted-foreground">Browse our catalogue{FEATURES.glassQuote && ", get a glass quote,"} or send us a WhatsApp message — we're here to help.</p>
                <div className="flex flex-wrap gap-3 justify-center">
                    <Link to="/catalogue"><Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-8">Browse Furniture</Button></Link>
                    {FEATURES.glassQuote && <Link to="/quote-calculator"><Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white rounded-full px-8">Glass Quote</Button></Link>}
                    <Link to="/contact"><Button variant="outline" className="border-border text-foreground hover:border-primary hover:text-primary rounded-full px-8">Contact Us</Button></Link>
                </div>
            </div>
        </div>
    );
}