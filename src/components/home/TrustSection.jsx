import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Shield, Wrench, Phone } from "lucide-react";
import { FEATURES } from "@/lib/features";

const features = [
  {
    icon: Shield,
    title: "Artisanal Quality",
    desc: "Every piece individually handcrafted by skilled Kenyan artisans using premium, durable materials.",
  },
  {
    icon: Truck,
    title: "Kenya-Wide Delivery",
    desc: "We safely deliver and install custom furniture and glass solutions countrywide across Kenya.",
  },
  {
    icon: Wrench,
    title: "Expert Installation",
    desc: "Our local technicians handle professional glass fitting and on-site furniture assembly.",
  },
  {
    icon: Phone,
    title: "Direct Support",
    desc: "Reach us on WhatsApp or phone for instant quotes and bespoke order consultation.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
};

export default function TrustSection() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">

        {/* Feature cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={itemVariants}
                className="group flex gap-5 items-start p-6 bg-white border border-black/5
                  hover:border-[#B07A45]/40 hover:shadow-lg hover:shadow-black/5
                  transition-all duration-500"
              >
                <div className="w-11 h-11 flex items-center justify-center bg-obsidian shrink-0">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="font-body font-semibold text-obsidian text-sm mb-1.5">{f.title}</h4>
                  <p className="text-[13px] text-[#8A7A6B] leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Custom Order CTA banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="relative overflow-hidden bg-obsidian px-8 lg:px-14 py-12 lg:py-14
            flex flex-col lg:flex-row items-center lg:items-end justify-between gap-8"
        >
          {/* Subtle texture lines */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute h-px bg-silk"
                style={{ top: `${12 + i * 12}%`, left: 0, right: 0 }}
              />
            ))}
          </div>

          <div className="relative text-center lg:text-left max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gold font-semibold mb-4">
              Bespoke Service
            </p>
            <h3 className="font-heading font-light text-silk leading-[1.1]"
              style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)" }}
            >
              Have something specific<br />
              <span className="italic font-normal">in mind?</span>
            </h3>
            <p className="mt-4 text-silk/55 text-sm leading-relaxed font-body">
              We build custom furniture and cut glass to any size. Share your design idea and we'll bring it to life.
            </p>
          </div>

          <div className="relative flex flex-wrap gap-3 shrink-0">
            <Link
              to="/custom-orders"
              className="inline-flex items-center gap-2 h-12 px-8
                bg-silk text-obsidian text-[11px] uppercase tracking-[0.2em] font-bold
                hover:bg-gold hover:text-obsidian transition-colors duration-300"
            >
              Request Custom Order
            </Link>
            {FEATURES.glassQuote && (
              <Link
                to="/quote-calculator"
                className="inline-flex items-center gap-2 h-12 px-8
                  bg-transparent text-silk text-[11px] uppercase tracking-[0.2em] font-bold
                  border border-silk/30 hover:border-gold hover:text-gold
                  transition-colors duration-300"
              >
                Glass Quote
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}