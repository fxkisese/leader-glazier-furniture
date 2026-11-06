import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Calculator, ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FEATURES } from "@/lib/features";

const WHATSAPP = "254110767199";

const IMAGE_MS = 6500;      // how long a photo stays on screen
const MAX_VIDEO_S = 30;     // long videos move on after this many seconds
const WIPE_S = 1.3;
const EASE = [0.77, 0, 0.18, 1];
// Wide enough to frame portrait media beside the headline
const LANDSCAPE_MQ = "(orientation: landscape) and (min-width: 1024px)";

const FALLBACK_SLIDES = [
  {
    eyebrow: "New Collection",
    heading: ["Durable.", "Stylish.", "Affordable."],
    italic: [false, true, false],
    sub: "Master Kenyan artisans handcraft every piece using premium locally sourced materials. Delivered countrywide.",
  },
  {
    eyebrow: "Custom Sofas",
    heading: ["Your Space,", "Your Vision,", "Realised."],
    italic: [false, true, false],
    sub: "Bespoke sofas, wardrobes and dining sets built exactly to your specification. No compromise.",
  },
  {
    eyebrow: "Glass & Mirrors",
    heading: ["Crystal Clear", "Precision", "Craftsmanship."],
    italic: [false, true, false],
    sub: "Custom-cut glass, mirrors, shower enclosures and office partitions — cut to size and fitted countrywide.",
  },
  {
    eyebrow: "Bedroom Series",
    heading: ["Where Rest", "Meets", "Elegance."],
    italic: [false, true, false],
    sub: "King and queen beds, upholstered headboards, and built-in wardrobes crafted for Kenyan homes.",
  },
];

// Slides uploaded in Admin → Homepage → Hero media. Blank text falls back to the default copy.
const toMediaSlides = (media) =>
  media
    .filter((m) => m.is_active !== false && m.url)
    .map((m, i) => {
      const fb = FALLBACK_SLIDES[i % FALLBACK_SLIDES.length];
      const lines = (m.title || "").split("\n").map((l) => l.trim()).filter(Boolean);
      return {
        key: m.id,
        type: m.type === "video" ? "video" : "image",
        src: m.url,
        poster: m.poster,
        tall: m.width && m.height ? m.height > m.width : undefined,
        eyebrow: m.eyebrow || fb.eyebrow,
        heading: lines.length ? lines : fb.heading,
        italic: lines.length ? lines.map((_, j) => j === 1) : fb.italic,
        sub: m.subtitle?.trim() || (lines.length ? "" : fb.sub),
      };
    });

const toImageSlide = (s, i) => ({ key: `img-${i}-${s.image}`, type: "image", src: s.image, ...s });

export default function HeroSection() {
  const reduceMotion = useReducedMotion();

  const mediaQ = useQuery({
    queryKey: ["hero-media"],
    queryFn: () => base44.entities.HeroMedia.list(),
    retry: false,
  });
  const productsQ = useQuery({
    queryKey: ["hero-products-all"],
    queryFn: () => base44.entities.Product.filter({ is_published: true }, "-created_date", 20),
  });

  const mediaSlides = useMemo(() => toMediaSlides(mediaQ.data || []), [mediaQ.data]);

  const slides = useMemo(() => {
    if (mediaSlides.length) return mediaSlides;

    // No uploaded media: featured products (in the admin's homepage order), then a text-only slide.
    // Only admin-uploaded images are ever shown here.
    const products = (productsQ.data || [])
      .filter((p) => p.is_featured && p.images?.length > 0)
      .sort((a, b) => (a.homepage_order ?? 0) - (b.homepage_order ?? 0))
      .slice(0, 4)
      .map((p, i) => toImageSlide({
        image: p.images[0],
        eyebrow: p.category || "Featured",
        heading: [p.name, "Handcrafted", "in Kenya."],
        italic: [false, true, false],
        sub: p.description || FALLBACK_SLIDES[i % FALLBACK_SLIDES.length].sub,
      }, i));
    return products.length ? products : [{ key: "text-only", type: "none", ...FALLBACK_SLIDES[0] }];
  }, [mediaSlides, productsQ.data]);

  // Hold back until we know which slides to show, so the stock photos don't flash first
  const ready = !mediaQ.isLoading && (mediaSlides.length > 0 || !productsQ.isLoading);

  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);

  // Portrait media on a landscape screen is framed instead of cropped. The shape comes from the
  // upload's stored size, or is measured once the file loads.
  const [tall, setTall] = useState({});
  const markShape = (key, w, h) => setTall((t) => (t[key] === h > w ? t : { ...t, [key]: h > w }));
  const [landscape, setLandscape] = useState(() => window.matchMedia(LANDSCAPE_MQ).matches);
  useEffect(() => {
    const mq = window.matchMedia(LANDSCAPE_MQ);
    const onChange = (e) => setLandscape(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const isTall = (s) => s.tall ?? tall[s.key];
  // All-portrait slideshows on a wide screen become a gallery wall rather than one lonely frame
  const gallery = ready && landscape && slides.length >= 2 && slides.every(isTall);

  const sectionRef = useRef(null);
  const videoRefs = useRef([]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const count = slides.length;
  // Slide count changes once data loads, so keep the indexes in range
  const index = current % count;
  const prevIndex = prev === null ? null : prev % count;
  const slide = slides[index];

  const goTo = useCallback((i, dir) => {
    if (i === index) return;
    setPrev(index);
    setDirection(dir ?? (i > index ? 1 : -1));
    setCurrent(i);
  }, [index]);

  const next = useCallback(() => goTo((index + 1) % count, 1), [goTo, index, count]);
  const back = useCallback(() => goTo((index - 1 + count) % count, -1), [goTo, index, count]);

  // One clock drives the progress bars and auto-advance: photos count time, videos follow playback
  useEffect(() => {
    if (!ready) return;
    let raf;
    let last = performance.now();
    let elapsed = 0;
    const tick = (now) => {
      const dt = now - last;
      last = now;
      let p;
      if (slides[index].type === "video") {
        const v = videoRefs.current[index];
        p = v && v.duration ? v.currentTime / Math.min(v.duration, MAX_VIDEO_S) : 0;
      } else {
        if (!pausedRef.current) elapsed += dt;
        p = elapsed / IMAGE_MS;
      }
      sectionRef.current?.style.setProperty("--hero-progress", Math.min(p, 1));
      if (p >= 1 && count > 1) return next();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, index, slides, count, next]);

  // The current video plays, the outgoing one keeps playing through the transition, the rest rewind
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      v.muted = muted;
      if (i === index) {
        if (paused) v.pause();
        else v.play().catch(() => {});
      } else if (i !== prevIndex) {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, [index, prevIndex, paused, muted, slides, gallery]);

  const wipeFrom = direction > 0 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)";

  const textVariants = {
    hidden: { opacity: 0, y: 32 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } },
  };

  const btn = "w-10 h-10 flex items-center justify-center border border-silk/20 text-silk/60 hover:text-silk hover:border-silk/50 transition-all duration-200 backdrop-blur-sm";

  return (
    <motion.section
      ref={sectionRef}
      className="relative h-[100svh] min-h-[600px] overflow-hidden bg-obsidian"
      style={{ touchAction: "pan-y" }}
      onPanEnd={(_, info) => {
        if (Math.abs(info.offset.x) < 60 || Math.abs(info.offset.x) < Math.abs(info.offset.y)) return;
        info.offset.x < 0 ? next() : back();
      }}
    >
      {/* ── Media layers: every slide stays mounted so videos buffer and transitions never blink ── */}
      {ready && gallery && (
        <PortraitGallery slides={slides} index={index} goTo={goTo} videoRefs={videoRefs} reduceMotion={reduceMotion} />
      )}

      {ready && !gallery && slides.map((s, i) => {
        const state = i === index ? "active" : i === prevIndex ? "prev" : "idle";
        const near = i === index || i === (index + 1) % count;
        const framed = landscape && isTall(s);
        return (
          <motion.div
            key={s.key}
            className="absolute inset-0 overflow-hidden"
            style={{ zIndex: state === "active" ? 3 : state === "prev" ? 2 : 1, visibility: state === "idle" ? "hidden" : "visible" }}
            initial={false}
            animate={state}
            variants={{
              active: reduceMotion
                ? { opacity: [0, 1], transition: { duration: 0.8 } }
                : { clipPath: [wipeFrom, "inset(0% 0% 0% 0%)"], transition: { duration: WIPE_S, ease: EASE } },
              prev: {},
              idle: {},
            }}
          >
            {framed && <StudioBackdrop />}

            <motion.div
              className={framed
                ? "absolute z-[1] right-[5vw] top-[12vh] h-[72vh] xl:right-[6vw] xl:top-[7vh] xl:h-[82vh] aspect-[9/16] overflow-hidden ring-1 ring-gold/40 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]"
                : "absolute inset-0"}
              initial={false}
              animate={framed && !reduceMotion && state === "idle" ? { y: 40, scale: 0.94 } : { y: 0, scale: 1 }}
              transition={state === "idle" ? { duration: 0 } : { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
            >
              {s.type === "none" ? (
                <StudioBackdrop />
              ) : s.type === "video" ? (
                <video
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={s.src}
                  poster={s.poster}
                  muted
                  playsInline
                  loop={count === 1}
                  preload={near ? "auto" : "metadata"}
                  onLoadedMetadata={(e) => markShape(s.key, e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <motion.img
                  src={s.src}
                  alt={s.heading.join(" ")}
                  draggable={false}
                  onLoad={(e) => markShape(s.key, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                  className="w-full h-full object-cover will-change-transform"
                  initial={false}
                  // Slow Ken Burns drift, alternating direction per slide; reset only once hidden
                  animate={reduceMotion ? {} : state === "idle" ? { scale: 1.02, x: "0%" } : framed ? { scale: 1.06, x: "0%" } : { scale: 1.14, x: i % 2 ? "-2.5%" : "2.5%" }}
                  transition={state === "idle" ? { duration: 0 } : { duration: IMAGE_MS / 1000 + WIPE_S + 1, ease: "linear" }}
                />
              )}
            </motion.div>
          </motion.div>
        );
      })}

      {/* ── Gold light that rides the edge of the wipe ── */}
      {ready && !gallery && prevIndex !== null && !reduceMotion && (
        <motion.div
          key={`sweep-${current}`}
          className="absolute inset-y-0 z-[4] w-[2px] -ml-px bg-gold pointer-events-none shadow-[0_0_40px_10px_rgba(176,122,69,0.45)]"
          initial={{ left: direction > 0 ? "100%" : "0%", opacity: 1 }}
          animate={{ left: direction > 0 ? "0%" : "100%", opacity: [1, 1, 0] }}
          transition={{ duration: WIPE_S, ease: EASE }}
        />
      )}

      {/* ── Gradient overlays — light on phones so the media fills the screen, shade only behind text ── */}
      {!gallery && (
        <>
          <div className="absolute inset-0 z-10
            bg-gradient-to-b from-obsidian/50 via-transparent to-transparent
            md:bg-gradient-to-r md:from-obsidian/90 md:via-obsidian/60 md:to-obsidian/20"
          />
          <div className="absolute inset-x-0 bottom-0 h-[60%] md:h-full z-10 bg-gradient-to-t from-obsidian/90 via-obsidian/40 md:from-obsidian/85 md:via-transparent to-transparent" />
        </>
      )}

      {/* ── Text content ────────────────────────────── */}
      <div className="relative z-20 h-full max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12
        flex flex-col justify-end md:justify-center pb-20 md:pb-0 pt-32 md:py-0">

        <AnimatePresence mode="wait">
          {ready && (
            <motion.div
              key={`text-${slide.key}`}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -16, transition: { duration: 0.35 } }}
              className={gallery ? "max-w-[40vw]" : "max-w-2xl"}
            >
              {/* Eyebrow */}
              <motion.p
                variants={textVariants}
                className="flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-gold font-semibold mb-3 md:mb-6"
              >
                <motion.span
                  className="h-px w-10 bg-gold origin-left"
                  variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.9, ease: EASE } } }}
                />
                {slide.eyebrow}
              </motion.p>

              {/* H1 — each line rises out of its own mask */}
              <h1
                className="font-heading font-light text-silk leading-[0.95]"
                style={{ fontSize: gallery ? "clamp(2.6rem, 5.2vw, 5.75rem)" : "clamp(2.3rem, 8vw, 6.5rem)" }}
              >
                {slide.heading.map((line, i) => (
                  <span key={i} className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
                    <motion.span
                      className={`block ${slide.italic[i] ? "italic font-normal" : ""}`}
                      variants={{
                        hidden: { y: "110%" },
                        show: { y: "0%", transition: { duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: 0.15 + i * 0.09 } },
                      }}
                    >
                      {line}
                    </motion.span>
                  </span>
                ))}
              </h1>

              {/* Sub */}
              {slide.sub && (
                <motion.p
                  variants={textVariants}
                  className="hidden md:block mt-7 text-silk/80 text-base md:text-lg max-w-lg leading-relaxed font-body font-light"
                >
                  {slide.sub}
                </motion.p>
              )}

              {/* CTAs */}
              <motion.div
                variants={textVariants}
                className="mt-5 md:mt-10 flex flex-wrap items-center gap-3 md:gap-4"
              >
                <Link
                  to="/catalogue"
                  className="group inline-flex items-center gap-3 h-11 md:h-[52px] px-6 md:px-8 py-3 md:py-4
                    bg-silk text-obsidian text-[12px] uppercase tracking-[0.2em] font-bold
                    hover:bg-obsidian hover:text-silk border border-silk
                    transition-colors duration-300"
                >
                  Browse Furniture
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                {FEATURES.glassQuote && (
                  <Link
                    to="/quote-calculator"
                    className="group inline-flex items-center gap-3 h-[52px] px-8 py-4
                      bg-transparent text-silk text-[12px] uppercase tracking-[0.2em] font-bold
                      border border-silk/40 hover:border-gold hover:text-gold
                      transition-colors duration-300"
                  >
                    <Calculator className="w-4 h-4" />
                    Glass Quote
                  </Link>
                )}

                <a
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 h-11 md:h-[52px] px-5 md:px-7 py-3 md:py-4
                    bg-[#25D366] text-white text-[12px] uppercase tracking-[0.18em] font-bold
                    hover:bg-[#1ebe5d] transition-colors duration-200"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              </motion.div>

              {/* Trust pills */}
              <motion.div
                variants={textVariants}
                className="hidden md:flex mt-8 flex-wrap gap-4"
              >
                {["Handcrafted in Kenya", "Bespoke Custom Orders", "Countrywide Delivery"].map((t) => (
                  <span key={t} className="flex items-center gap-2 text-[11px] text-silk/60 font-body uppercase tracking-[0.18em]">
                    <span className="text-gold">✦</span> {t}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {ready && count > 1 && (
        <>
          {/* ── Story-style progress bars ─────────────── */}
          <div className="absolute bottom-8 left-5 sm:left-8 lg:left-12 z-30 flex items-center gap-4">
            <div className="flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  className="h-6 flex items-center"
                >
                  <span className="block w-6 sm:w-10 h-[2px] bg-silk/25 overflow-hidden">
                    <span
                      className="block h-full bg-gold origin-left"
                      style={{ transform: i === index ? "scaleX(var(--hero-progress, 0))" : i < index ? "scaleX(1)" : "scaleX(0)" }}
                    />
                  </span>
                </button>
              ))}
            </div>
            <span className="text-[10px] text-silk/40 font-body uppercase tracking-[0.2em]">
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
          </div>

          {/* ── Filmstrip + controls (the gallery wall is its own filmstrip, so its controls sit left) ── */}
          <div className={`absolute z-30 flex items-end gap-4 ${gallery
            ? "bottom-[4vh] left-[50%]"
            : "bottom-6 right-5 sm:right-8"}`}>
            {count <= 8 && !gallery && (
              <div className="hidden lg:flex gap-2">
                {slides.map((s, i) => (
                  <button
                    key={s.key}
                    onClick={() => goTo(i)}
                    aria-label={`Show slide ${i + 1}`}
                    className={`group relative w-24 h-14 overflow-hidden border transition-all duration-500
                      ${i === index ? "border-gold w-32" : "border-silk/15 opacity-60 hover:opacity-100"}`}
                  >
                    {s.type === "video" && !s.poster ? (
                      <video src={`${s.src}#t=0.5`} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                    ) : (
                      <img src={s.poster || s.src} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    )}
                    {s.type === "video" && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-obsidian/70 flex items-center justify-center">
                        <Play className="w-2 h-2 text-silk fill-silk" />
                      </span>
                    )}
                    {i === index && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold origin-left" style={{ transform: "scaleX(var(--hero-progress, 0))" }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={back} aria-label="Previous slide" className={`${btn} hidden sm:flex`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={next} aria-label="Next slide" className={`${btn} hidden sm:flex`}>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play slideshow" : "Pause slideshow"} className={btn}>
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              {slide.type === "video" && (
                <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute video" : "Mute video"} className={btn}>
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Single video: still offer sound */}
      {ready && count === 1 && slide.type === "video" && (
        <div className="absolute bottom-6 right-5 sm:right-8 z-30">
          <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute video" : "Mute video"} className={btn}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* ── Floating glass quote card ────────────────── */}
      {FEATURES.glassQuote && <div className="absolute top-1/2 -translate-y-1/2 right-8 lg:right-16 z-30 hidden lg:flex">
        <Link
          to="/quote-calculator"
          className="group flex items-center gap-3 bg-silk/10 backdrop-blur-md
            border border-silk/15 px-5 py-4 hover:bg-silk/15 transition-all duration-300"
        >
          <div className="w-9 h-9 flex items-center justify-center bg-gold/20">
            <Calculator className="w-4 h-4 text-gold" />
          </div>
          <div>
            <p className="text-silk/50 text-[9px] uppercase tracking-[0.25em]">Instant</p>
            <p className="text-silk text-sm font-heading font-semibold">Glass Quote →</p>
          </div>
        </Link>
      </div>}
    </motion.section>
  );
}

// Fine film grain so the flat espresso doesn't look like a void
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

// Warm espresso "studio wall" behind framed portrait media
function StudioBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 bg-obsidian">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_70%_52%,rgba(176,122,69,0.24),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_50%_at_10%_90%,rgba(176,122,69,0.08),transparent_70%)]" />
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

// Card sizes in vh so the wall scales with the screen; 9:16 portrait cards
const BIG_H = 74;
const SMALL_H = 50;
const GAP = 3;
const cardW = (h) => (h * 9) / 16;

/**
 * Gallery wall for portrait media on wide screens: the current slide is a large framed card,
 * the upcoming ones queue to its right and the row glides left as the slideshow advances.
 */
function PortraitGallery({ slides, index, goTo, videoRefs, reduceMotion }) {
  const n = slides.length;
  // Slot each card held last render, so cards wrapping around the row jump instead of flying across it
  const lastSlot = useRef({});
  useEffect(() => {
    slides.forEach((s, i) => { lastSlot.current[s.key] = (i - index + n) % n; });
  });

  const hasLeftSlot = n >= 3;
  const xFor = (k) => {
    if (hasLeftSlot && k === n - 1) return -(cardW(SMALL_H) + GAP); // the outgoing card, faded out
    return k === 0 ? 0 : cardW(BIG_H) + GAP + (k - 1) * (cardW(SMALL_H) + GAP);
  };

  return (
    <div className="absolute inset-0 z-[5]">
      <StudioBackdrop />

      {/* Oversized slide number, like a gallery placard */}
      <div aria-hidden className="absolute bottom-[6vh] right-[50%] pr-[3vh] pointer-events-none select-none">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            className="block font-heading italic font-light leading-none text-silk/[0.06]"
            style={{ fontSize: "34vh" }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, y: -24, transition: { duration: 0.4 } }}
          >
            {String(index + 1).padStart(2, "0")}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="absolute inset-y-0 left-[50%] right-0">
        {slides.map((s, i) => {
          const k = (i - index + n) % n;
          const big = k === 0;
          const leftSlot = hasLeftSlot && k === n - 1;
          const was = lastSlot.current[s.key];
          const wraps = was !== undefined && hasLeftSlot && ((was === n - 1 && k !== 0) || (leftSlot && was !== 0));
          const h = big ? BIG_H : SMALL_H;
          const glide = { duration: reduceMotion ? 0 : 1.15, ease: EASE };

          return (
            <motion.button
              key={s.key}
              type="button"
              onClick={() => !big && goTo(i)}
              tabIndex={big || leftSlot ? -1 : 0}
              aria-label={big ? `Now showing: ${s.eyebrow}` : `Show ${s.eyebrow}`}
              className={`group absolute left-0 bottom-[13vh] overflow-hidden text-left
                ${big ? "cursor-default ring-1 ring-gold/50 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.85)]" : "ring-1 ring-silk/10"}`}
              style={{ zIndex: big ? 2 : 1, pointerEvents: leftSlot ? "none" : "auto" }}
              initial={false}
              animate={{ x: `${xFor(k)}vh`, width: `${cardW(h)}vh`, height: `${h}vh`, opacity: leftSlot ? 0 : 1 }}
              transition={wraps
                ? { duration: 0, opacity: { duration: leftSlot ? 0 : 0.7, delay: leftSlot ? 0 : 0.6 } }
                : glide}
            >
              {s.type === "video" ? (
                <video
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={s.src}
                  poster={s.poster}
                  muted
                  playsInline
                  loop={n === 1}
                  preload={k <= 1 ? "auto" : "metadata"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <img src={s.src} alt={s.heading.join(" ")} draggable={false} className="absolute inset-0 w-full h-full object-cover" />
              )}

              {/* Waiting cards rest dimmed and brighten on hover */}
              <span className={`absolute inset-0 bg-obsidian transition-opacity duration-700 ${big ? "opacity-0" : "opacity-50 group-hover:opacity-20"}`} />

              <span className={`absolute top-3 left-3 right-3 flex items-baseline gap-2 text-[10px] uppercase tracking-[0.3em] font-semibold text-silk/85 transition-opacity duration-500 ${big ? "opacity-0" : "opacity-100"}`}>
                <span className="text-gold">{String(i + 1).padStart(2, "0")}</span>
                <span className="truncate">{s.eyebrow}</span>
              </span>

              {big && (
                <span className="absolute bottom-0 inset-x-0 h-[2px] bg-gold origin-left" style={{ transform: "scaleX(var(--hero-progress, 0))" }} />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
