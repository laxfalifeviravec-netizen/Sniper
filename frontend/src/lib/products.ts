import type { Category, CategoryMeta, Product } from "@/types";

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "wheels",
    label: "Wheels & Tires",
    description: "Forged, flow-formed, and cast wheels in every fitment.",
    icon: "Disc",
  },
  {
    id: "wraps",
    label: "Wraps & Paint",
    description: "Vinyl wraps, PPF, and custom color-shift finishes.",
    icon: "Palette",
  },
  {
    id: "body-kits",
    label: "Body Kits & Aero",
    description: "Splitters, diffusers, wide-body kits, and carbon accents.",
    icon: "Layers",
  },
  {
    id: "exhaust",
    label: "Exhaust",
    description: "Cat-back, axle-back, and valved performance systems.",
    icon: "Wind",
  },
  {
    id: "suspension",
    label: "Suspension",
    description: "Coilovers, air suspension, sway bars, and drop kits.",
    icon: "MoveVertical",
  },
  {
    id: "lighting",
    label: "Lighting",
    description: "LED headlights, tail lights, and underglow kits.",
    icon: "Lightbulb",
  },
  {
    id: "interior",
    label: "Interior",
    description: "Seats, wraps, gauges, and custom upholstery.",
    icon: "Armchair",
  },
  {
    id: "tuning",
    label: "ECU Tuning",
    description: "Piggyback tunes, flash tunes, and bolt-on power.",
    icon: "Cpu",
  },
  {
    id: "audio",
    label: "Audio & Electronics",
    description: "Head units, subs, amps, and dash cams.",
    icon: "Speaker",
  },
];

export const CATEGORY_LABELS: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label])
) as Record<Category, string>;

export const CATEGORY_COLORS: Record<Category, string> = {
  wheels: "from-zinc-500 to-zinc-700",
  wraps: "from-fuchsia-500 to-purple-700",
  "body-kits": "from-sky-500 to-blue-700",
  exhaust: "from-slate-400 to-slate-600",
  suspension: "from-emerald-500 to-teal-700",
  lighting: "from-cyan-400 to-blue-600",
  interior: "from-amber-600 to-orange-800",
  tuning: "from-red-500 to-rose-700",
  audio: "from-indigo-500 to-violet-700",
};

// 58-item static catalog. Prices in cents. No DB required — this is the
// platform's own inventory, so every sale below is 100% margin-controlled
// (vs. a pure affiliate model), which is what makes the take-rate math work.
export const PRODUCTS: Product[] = [
  // ── Wheels ──────────────────────────────────────────────────────────────
  { id: "wh-forge-18", category: "wheels", brand: "Forgeline", name: "GA3R Forged 18\" Set", price_cents: 289900, compare_at_cents: 329900, description: "Three-piece forged wheels, custom offset per vehicle.", compatibility: "universal", rating: 4.9, reviews: 412, featured: true, install_time_hrs: 1 },
  { id: "wh-vossen-19", category: "wheels", brand: "Vossen", name: "HF-3 Flow Formed 19\"", price_cents: 149900, compare_at_cents: 169900, description: "Lightweight flow-formed construction, staggered fitment.", compatibility: "universal", rating: 4.7, reviews: 890, install_time_hrs: 1 },
  { id: "wh-bbs-18", category: "wheels", brand: "BBS", name: "CH-R 18\" Wheel Set", price_cents: 219900, description: "Motorsport-derived design, satin titanium finish.", compatibility: ["BMW", "Audi", "Volkswagen", "Porsche"], rating: 4.8, reviews: 561, install_time_hrs: 1 },
  { id: "wh-work-17", category: "wheels", brand: "Work Wheels", name: "Meister S1 17\"", price_cents: 179900, description: "JDM classic three-piece design, deep concave.", compatibility: ["Nissan", "Toyota", "Mazda", "Honda"], rating: 4.6, reviews: 233, install_time_hrs: 1 },
  { id: "wh-tire-mich", category: "wheels", brand: "Michelin", name: "Pilot Sport 4S Set of 4", price_cents: 119900, description: "Max-performance summer tire, OEM to many marques.", compatibility: "universal", rating: 4.8, reviews: 2140, install_time_hrs: 0.5 },
  { id: "wh-fifteen52", category: "wheels", brand: "fifteen52", name: "Tarmac R-MT 17\"", price_cents: 99900, description: "Rally-inspired, off-road rated flow-formed wheel.", compatibility: ["Subaru", "Ford", "Toyota"], rating: 4.7, reviews: 178, install_time_hrs: 1 },

  // ── Wraps ───────────────────────────────────────────────────────────────
  { id: "wr-3m-satin", category: "wraps", brand: "3M", name: "1080 Satin Full Wrap", price_cents: 249900, description: "Premium cast vinyl, full-body install, 40+ colors.", compatibility: "universal", rating: 4.8, reviews: 703, featured: true, install_time_hrs: 12 },
  { id: "wr-avery-chrome", category: "wraps", brand: "Avery Dennison", name: "Chrome Shift Wrap", price_cents: 329900, description: "Color-shift chrome finish, showstopper effect.", compatibility: "universal", rating: 4.9, reviews: 190, sponsored: true, install_time_hrs: 14 },
  { id: "wr-xpel-ppf", category: "wraps", brand: "XPEL", name: "Ultimate Plus PPF — Full Front", price_cents: 189900, description: "Self-healing paint protection film for the front end.", compatibility: "universal", rating: 4.9, reviews: 1120, install_time_hrs: 6 },
  { id: "wr-matte-black", category: "wraps", brand: "3M", name: "1080 Matte Black Wrap", price_cents: 219900, description: "The classic — deep matte black, low-sheen finish.", compatibility: "universal", rating: 4.7, reviews: 954, install_time_hrs: 10 },
  { id: "wr-tint-ceramic", category: "wraps", brand: "SunTek", name: "Ceramic Window Tint — Full Car", price_cents: 69900, description: "IR-rejecting ceramic tint, all windows.", compatibility: "universal", rating: 4.8, reviews: 640, install_time_hrs: 3 },
  { id: "wr-brake-caliper", category: "wraps", brand: "Foliatec", name: "Brake Caliper Paint Kit", price_cents: 8900, description: "High-heat caliper paint, 6 colors available.", compatibility: "universal", rating: 4.5, reviews: 1310, install_time_hrs: 2 },

  // ── Body kits ───────────────────────────────────────────────────────────
  { id: "bk-carbon-splitter", category: "body-kits", brand: "Seibon", name: "Carbon Fiber Front Splitter", price_cents: 89900, description: "Dry carbon splitter, direct bolt-on fitment.", compatibility: "universal", rating: 4.7, reviews: 288, install_time_hrs: 3 },
  { id: "bk-widebody", category: "body-kits", brand: "Liberty Walk", name: "Wide-Body Kit — Full", price_cents: 899900, compare_at_cents: 999900, description: "Full fender flare wide-body conversion, FRP.", compatibility: ["Porsche", "Nissan", "Lamborghini", "Ford"], rating: 4.9, reviews: 96, featured: true, install_time_hrs: 24 },
  { id: "bk-diffuser", category: "body-kits", brand: "APR Performance", name: "Rear Carbon Diffuser", price_cents: 129900, description: "Track-proven aero diffuser with mounting hardware.", compatibility: "universal", rating: 4.8, reviews: 214, install_time_hrs: 4 },
  { id: "bk-hood-vented", category: "body-kits", brand: "Anderson Composites", name: "Vented Carbon Hood", price_cents: 189900, description: "Weight-saving vented hood, OEM-style latch points.", compatibility: ["Ford", "Chevrolet", "Dodge"], rating: 4.6, reviews: 132, install_time_hrs: 2 },
  { id: "bk-wing", category: "body-kits", brand: "Voltex", name: "GT Wing — Adjustable", price_cents: 149900, description: "Multi-angle adjustable rear wing with risers.", compatibility: "universal", rating: 4.7, reviews: 176, install_time_hrs: 3 },
  { id: "bk-sideskirts", category: "body-kits", brand: "Rocket Bunny", name: "Side Skirt Extensions", price_cents: 59900, description: "Aggressive side skirt add-ons, paint-ready FRP.", compatibility: "universal", rating: 4.5, reviews: 121, install_time_hrs: 2 },

  // ── Exhaust ─────────────────────────────────────────────────────────────
  { id: "ex-akrapovic", category: "exhaust", brand: "Akrapovič", name: "Evolution Titanium Cat-Back", price_cents: 349900, compare_at_cents: 399900, description: "Full titanium system, up to 15lb weight savings.", compatibility: "universal", rating: 4.9, reviews: 512, featured: true, sponsored: true, install_time_hrs: 3 },
  { id: "ex-borla-atak", category: "exhaust", brand: "Borla", name: "ATAK Cat-Back System", price_cents: 129900, description: "Aggressive tone, stainless steel construction.", compatibility: ["Ford", "Chevrolet", "Dodge"], rating: 4.7, reviews: 980, install_time_hrs: 2 },
  { id: "ex-hks-hipower", category: "exhaust", brand: "HKS", name: "Hi-Power Spec-L Axle-Back", price_cents: 89900, description: "JDM-legendary axle-back, deep resonant tone.", compatibility: ["Nissan", "Toyota", "Honda", "Mazda"], rating: 4.6, reviews: 440, install_time_hrs: 1.5 },
  { id: "ex-valve-remote", category: "exhaust", brand: "Fi Exhaust", name: "Valvetronic Exhaust w/ Remote", price_cents: 259900, description: "App-controlled valves — quiet at idle, loud on demand.", compatibility: "universal", rating: 4.8, reviews: 267, install_time_hrs: 3 },
  { id: "ex-downpipe", category: "exhaust", brand: "Milltek", name: "Sport Downpipe — High-Flow Cat", price_cents: 99900, description: "High-flow catalytic downpipe, dyno-proven power gain.", compatibility: ["BMW", "Audi", "Volkswagen"], rating: 4.7, reviews: 322, install_time_hrs: 2 },
  { id: "ex-header", category: "exhaust", brand: "Kooks", name: "Long-Tube Header Set", price_cents: 189900, description: "Stainless long-tube headers, dyno gains up to 25whp.", compatibility: ["Chevrolet", "Dodge", "Ford"], rating: 4.7, reviews: 198, install_time_hrs: 5 },

  // ── Suspension ──────────────────────────────────────────────────────────
  { id: "su-kw-v3", category: "suspension", brand: "KW", name: "Variant 3 Coilovers", price_cents: 249900, compare_at_cents: 279900, description: "Independent rebound & compression damping.", compatibility: "universal", rating: 4.9, reviews: 601, featured: true, install_time_hrs: 4 },
  { id: "su-air-lift", category: "suspension", brand: "Air Lift Performance", name: "3P Air Suspension Kit", price_cents: 379900, description: "App-controlled bag suspension, slam-to-street in seconds.", compatibility: "universal", rating: 4.8, reviews: 344, install_time_hrs: 8 },
  { id: "su-bc-br", category: "suspension", brand: "BC Racing", name: "BR Series Coilovers", price_cents: 109900, description: "32-way adjustable damping, great value entry coilover.", compatibility: "universal", rating: 4.5, reviews: 890, install_time_hrs: 4 },
  { id: "su-swaybar", category: "suspension", brand: "Whiteline", name: "Adjustable Sway Bar Kit", price_cents: 39900, description: "Front & rear sway bars, 3-way adjustable stiffness.", compatibility: "universal", rating: 4.6, reviews: 410, install_time_hrs: 2 },
  { id: "su-drop-springs", category: "suspension", brand: "Eibach", name: "Pro-Kit Lowering Springs", price_cents: 29900, description: "1.0-1.5\" drop, retains OEM ride comfort.", compatibility: "universal", rating: 4.7, reviews: 1560, install_time_hrs: 2.5 },
  { id: "su-strut-brace", category: "suspension", brand: "Cusco", name: "Front Strut Tower Brace", price_cents: 24900, description: "Chassis rigidity upgrade, bolt-in fitment.", compatibility: "universal", rating: 4.6, reviews: 275, install_time_hrs: 0.5 },

  // ── Lighting ────────────────────────────────────────────────────────────
  { id: "li-morimoto-led", category: "lighting", brand: "Morimoto", name: "XB LED Headlight Set", price_cents: 89900, description: "Direct-fit LED headlights, DOT/SAE compliant.", compatibility: "universal", rating: 4.8, reviews: 1330, featured: true, install_time_hrs: 1 },
  { id: "li-diode-tails", category: "lighting", brand: "Diode Dynamics", name: "Sequential LED Tail Lights", price_cents: 64900, description: "Sequential turn signal tail lights, smoked lens.", compatibility: ["Ford", "Chevrolet", "Dodge", "Toyota"], rating: 4.7, reviews: 980, install_time_hrs: 1 },
  { id: "li-underglow", category: "lighting", brand: "XKGlow", name: "RGB Underglow Kit", price_cents: 24900, description: "App + remote controlled, millions of colors.", compatibility: "universal", rating: 4.4, reviews: 2210, install_time_hrs: 2 },
  { id: "li-fog", category: "lighting", brand: "Rigid Industries", name: "LED Fog Light Kit", price_cents: 34900, description: "High-output fog lights with amber/white switch.", compatibility: "universal", rating: 4.7, reviews: 512, install_time_hrs: 1 },
  { id: "li-interior-ambient", category: "lighting", brand: "OPT7", name: "Interior Ambient LED Kit", price_cents: 14900, description: "App-synced interior ambient lighting, 16M colors.", compatibility: "universal", rating: 4.5, reviews: 1870, install_time_hrs: 1.5 },
  { id: "li-drl", category: "lighting", brand: "Diode Dynamics", name: "DRL LED Board Set", price_cents: 12900, description: "Daytime running light upgrade boards.", compatibility: "universal", rating: 4.6, reviews: 640, install_time_hrs: 0.5 },

  // ── Interior ────────────────────────────────────────────────────────────
  { id: "in-recaro-seats", category: "interior", brand: "Recaro", name: "Sportster CS Seat Pair", price_cents: 189900, description: "Race-derived bucket seats with heat + OEM airbag compat.", compatibility: "universal", rating: 4.9, reviews: 288, featured: true, install_time_hrs: 3 },
  { id: "in-alcantara-wheel", category: "interior", brand: "MOMO", name: "Alcantara Steering Wheel", price_cents: 34900, description: "Hand-stitched Alcantara wrap, flat-bottom design.", compatibility: "universal", rating: 4.7, reviews: 640, install_time_hrs: 1 },
  { id: "in-shift-knob", category: "interior", brand: "Weighted Shift", name: "Titanium Shift Knob", price_cents: 8900, description: "Weighted titanium knob, universal thread adapters.", compatibility: "universal", rating: 4.5, reviews: 990, install_time_hrs: 0.25 },
  { id: "in-gauge-pod", category: "interior", brand: "AEM", name: "X-Series Digital Gauge", price_cents: 29900, description: "Wideband AFR + boost gauge, full color display.", compatibility: "universal", rating: 4.6, reviews: 410, install_time_hrs: 2 },
  { id: "in-floor-mats", category: "interior", brand: "WeatherTech", name: "Custom-Fit Floor Liners", price_cents: 24900, description: "Laser-measured floor liners, all-weather protection.", compatibility: "universal", rating: 4.8, reviews: 3210, install_time_hrs: 0.25 },
  { id: "in-roll-cage", category: "interior", brand: "Cusco", name: "6-Point Bolt-In Roll Cage", price_cents: 189900, description: "Track-day safety cage, powder coated.", compatibility: "universal", rating: 4.7, reviews: 88, install_time_hrs: 6 },

  // ── Tuning ──────────────────────────────────────────────────────────────
  { id: "tu-cobb-accessport", category: "tuning", brand: "COBB", name: "Accessport V3 Flash Tuner", price_cents: 79900, compare_at_cents: 89900, description: "Handheld flash tuner with off-the-shelf performance maps.", compatibility: ["Subaru", "Ford", "Volkswagen", "Nissan"], rating: 4.8, reviews: 1980, featured: true, install_time_hrs: 1 },
  { id: "tu-jb4", category: "tuning", brand: "Burger Motorsports", name: "JB4 Piggyback Tuner", price_cents: 44900, description: "Plug-and-play tuner, app-based map switching.", compatibility: ["BMW", "Mini"], rating: 4.7, reviews: 1340, install_time_hrs: 1 },
  { id: "tu-intake", category: "tuning", brand: "K&N", name: "Cold Air Intake System", price_cents: 34900, description: "High-flow intake, reusable filter, dyno-proven power.", compatibility: "universal", rating: 4.6, reviews: 2870, install_time_hrs: 1.5 },
  { id: "tu-intercooler", category: "tuning", brand: "CSF", name: "Front Mount Intercooler", price_cents: 89900, description: "Bar-and-plate FMIC, drop-in replacement.", compatibility: ["Subaru", "Ford", "Volkswagen"], rating: 4.7, reviews: 322, install_time_hrs: 3 },
  { id: "tu-ecu-flash", category: "tuning", brand: "RideForge Tuning", name: "Custom Dyno Tune (Remote)", price_cents: 59900, description: "Remote-flashed custom tune by a certified RideForge partner.", compatibility: "universal", rating: 4.9, reviews: 210, sponsored: true, install_time_hrs: 2 },
  { id: "tu-clutch", category: "tuning", brand: "ACT", name: "Heavy-Duty Performance Clutch", price_cents: 64900, description: "Upgraded clutch kit rated to 500+ ft-lb torque.", compatibility: "universal", rating: 4.6, reviews: 288, install_time_hrs: 6 },

  // ── Audio ───────────────────────────────────────────────────────────────
  { id: "au-headunit", category: "audio", brand: "Alpine", name: "Halo9 Digital Media Receiver", price_cents: 109900, description: "9\" floating touchscreen, wireless CarPlay/Android Auto.", compatibility: "universal", rating: 4.8, reviews: 640, featured: true, install_time_hrs: 3 },
  { id: "au-sub", category: "audio", brand: "JL Audio", name: "10\" Powered Subwoofer Enclosure", price_cents: 44900, description: "Ready-to-run loaded sub box with built-in amp.", compatibility: "universal", rating: 4.7, reviews: 980, install_time_hrs: 1.5 },
  { id: "au-amp", category: "audio", brand: "Rockford Fosgate", name: "4-Channel Amplifier", price_cents: 29900, description: "Punch series amp, 500W total power output.", compatibility: "universal", rating: 4.6, reviews: 720, install_time_hrs: 2 },
  { id: "au-speakers", category: "audio", brand: "Focal", name: "Component Speaker Set", price_cents: 34900, description: "Premium component speakers, silk dome tweeters.", compatibility: "universal", rating: 4.7, reviews: 410, install_time_hrs: 2 },
  { id: "au-dashcam", category: "audio", brand: "Blackvue", name: "4K Front + Rear Dash Cam", price_cents: 39900, description: "4K/2K dual channel, cloud connectivity, parking mode.", compatibility: "universal", rating: 4.8, reviews: 1120, install_time_hrs: 1.5 },
  { id: "au-radar", category: "audio", brand: "Escort", name: "MAX 4 Radar Detector", price_cents: 44900, description: "Bluetooth-connected, AI-based false alert filtering.", compatibility: "universal", rating: 4.7, reviews: 560, install_time_hrs: 0.25 },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function filterProducts(filters: {
  q?: string;
  category?: string;
  make?: string;
  price_min?: number;
  price_max?: number;
  sort?: string;
}): Product[] {
  let items = [...PRODUCTS];

  if (filters.category) {
    items = items.filter((p) => p.category === filters.category);
  }
  if (filters.make) {
    items = items.filter(
      (p) =>
        p.compatibility === "universal" ||
        (Array.isArray(p.compatibility) && p.compatibility.includes(filters.make!))
    );
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  if (filters.price_min != null) {
    items = items.filter((p) => p.price_cents >= filters.price_min!);
  }
  if (filters.price_max != null) {
    items = items.filter((p) => p.price_cents <= filters.price_max!);
  }

  switch (filters.sort) {
    case "price_asc":
      items.sort((a, b) => a.price_cents - b.price_cents);
      break;
    case "price_desc":
      items.sort((a, b) => b.price_cents - a.price_cents);
      break;
    case "rating":
      items.sort((a, b) => b.rating - a.rating);
      break;
    default:
      // "featured" — sponsored & featured first, then rating
      items.sort((a, b) => {
        const aw = (a.sponsored ? 2 : 0) + (a.featured ? 1 : 0);
        const bw = (b.sponsored ? 2 : 0) + (b.featured ? 1 : 0);
        if (bw !== aw) return bw - aw;
        return b.rating - a.rating;
      });
  }

  return items;
}
