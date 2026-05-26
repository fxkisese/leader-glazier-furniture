import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Truck, Wrench, Award, MessageCircle } from "lucide-react";

const WHATSAPP = "254700000000";

export default function About() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <div className="bg-gradient-to-br from-primary to-[hsl(270,60%,35%)] text-primary-foreground">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
                    <p className="text-gold text-sm font-medium uppercase tracking-widest mb-3">Our Story</p>
                    <h1 className="font-playfair text-3xl lg:text-5xl font-bold mb-6">About Craftsman Galore</h1>
                    <p className="text-primary-foreground/80 text-lg leading-relaxed max-w-2xl mx-auto">
                        We are Nairobi's trusted source for premium furniture and professional glass solutions. From custom sofas to office glass partitions, we bring quality craftsmanship to every project.
                    </p>
                </div>
            </div>

            {/* Story */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="font-playfair text-3xl font-bold text-foreground">Quality You Can See</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Craftsman Galore was founded with one goal — to make it easy for Nairobi homes and businesses to access premium furniture and artisan craftsmanship at transparent prices.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            We stock a wide range of ready-made furniture and accept custom orders for pieces built to your exact specifications. Our glass team handles everything from bathroom mirrors to full office glass partitions.
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            We believe buying furniture or ordering glass shouldn't require three site visits and a phone call that goes nowhere. That's why our website lets you browse products, calculate glass quotes, and submit custom orders directly — 24 hours a day.
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

            {/* Values */}
            <div className="bg-[#f8f5ff] py-14">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="font-playfair text-3xl font-bold text-foreground">Why Choose Us</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: Shield, title: "Quality Assured", desc: "Every product is selected or built with quality materials." },
                            { icon: Award, title: "Expert Craftsmanship", desc: "Our team has years of experience in furniture and glass works." },
                            { icon: Truck, title: "Nairobi Delivery", desc: "We deliver and install across Nairobi and surrounding areas." },
                            { icon: Wrench, title: "After-Sales Support", desc: "We're here after the purchase if anything needs attention." },
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
                <p className="text-muted-foreground">Browse our catalogue, get a glass quote, or send us a WhatsApp message — we're here to help.</p>
                <div className="flex flex-wrap gap-3 justify-center">
                    <Link to="/catalogue"><Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-8">Browse Furniture</Button></Link>
                    <Link to="/quote-calculator"><Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white rounded-full px-8">Glass Quote</Button></Link>
                    <Link to="/contact"><Button variant="outline" className="border-border text-foreground hover:border-primary hover:text-primary rounded-full px-8">Contact Us</Button></Link>
                </div>
            </div>
        </div>
    );
}