import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Phone, ExternalLink } from "lucide-react";

const BRANCHES = [
  {
    name: "Nairobi Branch",
    address: ["Whitehouse Footbridge", "Tena, Nairobi", "Nairobi, Kenya"],
    mapsUrl: "https://www.google.com/maps/search/Tena+Estate+Nairobi+Kenya",
    embed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.820456!2d36.874!3d-1.296!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMTcnNDYuOCJTIDM2wrA1Mic0Ni40IkU!5e0!3m2!1sen!2ske!4v1700000000000",
  },
  {
    name: "Machakos Branch",
    address: ["Kyumbi Junction", "Machakos, Kenya"],
    mapsUrl: "https://www.google.com/maps/search/Kyumbi+Junction+Machakos+Kenya",
    embed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.820456!2d37.263!3d-1.519!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMzEnMDguNCJTIDM3wrAxNSc0Ni44IkU!5e0!3m2!1sen!2ske!4v1700000000000",
  },
];

export default function ShowroomSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 lg:py-24" style={{ background: "#1A1A1A" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 lg:mb-16"
        >
          <p className="text-gold text-xs font-medium uppercase tracking-[0.2em] mb-3">Find Us</p>
          <h2 className="font-playfair text-3xl lg:text-4xl font-bold text-white mb-4">Visit Our Showroom</h2>
          <p className="text-white/50 max-w-xl leading-relaxed text-sm">
            Crafted furniture, mirrors, wardrobes, office setups, and custom interior solutions — designed for modern homes and workspaces. Come see it in person.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left — showroom image + phone */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="flex flex-col gap-6"
          >
            {/* Showroom image */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] group">
              <img
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop&q=85"
                alt="Leader Glazier & Furniture Showroom"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-white font-playfair text-lg font-semibold">Leader Glazier & Furniture</p>
                <p className="text-white/60 text-sm mt-1">Premium showroom — Nairobi & Machakos</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/5">
              <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">Call or WhatsApp</p>
                <a href="tel:+254722914819" className="text-white font-semibold text-lg hover:text-gold transition-colors">
                  0722 914 819
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right — branch cards with maps */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="flex flex-col gap-6"
          >
            {BRANCHES.map((branch) => (
              <div key={branch.name} className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                {/* Embedded map */}
                <div className="h-[180px] w-full overflow-hidden">
                  <iframe
                    src={branch.embed}
                    width="100%"
                    height="180"
                    style={{ border: 0, filter: "grayscale(30%) contrast(1.1)" }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={branch.name}
                    className="w-full"
                  />
                </div>

                {/* Branch info */}
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white font-semibold text-sm mb-1">{branch.name}</p>
                      {branch.address.map((line) => (
                        <p key={line} className="text-white/50 text-xs leading-relaxed">{line}</p>
                      ))}
                    </div>
                  </div>
                  <a
                    href={branch.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 text-xs text-gold hover:text-white border border-gold/30 hover:border-white/30 rounded-lg px-3 py-1.5 transition-all duration-200"
                  >
                    Directions <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}