// =========================================================================
// PERSONALIZATION CONFIGURATION — CHEF PETER PROFILE & CONTACT DATA
// You can easily update Chef Peter's contact information, company name, 
// phone number, WhatsApp link, email, and social links right in this file!
// =========================================================================

export interface Metric {
  value: string;
  label: string;
  description: string;
}

export interface LocationJourney {
  id: string;
  country: string;
  region: string;
  flag: string;
  coordinates: { x: number; y: number }; // Percentage on Africa/Global map UI
  summary: string;
  highlights: string[];
  roles: string[];
}

export interface CompetencyArea {
  id: string;
  title: string;
  iconName: string;
  shortDesc: string;
  items: string[];
}

export interface ExperienceItem {
  id: string;
  role: string;
  organization: string;
  period?: string;
  locations?: string[];
  category: 'consulting' | 'international' | 'aviation' | 'luxury' | 'advisory';
  description: string;
  achievements?: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  specializations: string[];
}

export interface ServiceItem {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  iconName: string;
  outcomes: string[];
}

export const CHEF_PROFILE = {
  // -----------------------------------------------------------------------
  // 📸 CHEF PETER IMAGE PLACEHOLDERS & PERSONALIZATION CONFIGURATION
  // -----------------------------------------------------------------------
  // STEP-BY-STEP INSTRUCTIONS TO ADD YOUR CHEF PHOTOS:
  // 1. You can upload photo files of ANY FORMAT (.jpg, .png, .webp, .avif, .svg, etc.)
  //    into the `/public/images/` folder of this project (e.g., `/public/images/chef-peter.jpg`).
  // 2. Or, paste any direct web image URL link below!
  // 3. If left as a placeholder or invalid path, our app automatically shows an elegant
  //    gold-accented "Chef Image Placeholder" frame without breaking the site layout.
  // -----------------------------------------------------------------------
  chefImages: {
    // Hero Section Chef Portrait
    heroPortrait: "/images/chef-peter.jpg", 
    heroFallbackStock: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1000&q=80",

    // Story Section Chef Portrait
    storyPortrait: "/images/chef-peter-2.jpeg",
    storyFallbackStock: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1000&q=80",

    // Technical Books / Author Portrait
    authorPortrait: "/images/chef-peter-author.jpg",
    authorFallbackStock: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1000&q=80",
  },

  // -----------------------------------------------------------------------
  // PERSONAL & COMPANY INFORMATION
  // -----------------------------------------------------------------------
  fullName: "YIGA EDWARD PETER KIRIGWAJJO ZIMWANGUYIZZA MULINDWA",
  professionalName: "Chef Peter the Teacher",
  companyName: "De'Chosen Events Consultants",
  companyRole: "Founder & Lead Hospitality Consultant",
  professionalTitle: "Founder of De'Chosen Events Consultants | Executive Hospitality Consultant | Master Culinary & Baking Trainer",
  shortTagline: "Founder of De'Chosen Events Consultants, master trainer in hospitality, culinary innovator, and author of technical baking & cooking guides.",
  heroIntro: "Founder of De'Chosen Events Consultants and internationally experienced executive consultant, master trainer in hospitality, and technical author. Dedicated to conducting hands-on classes in culinary and baking arts, mentoring rising talent, and establishing high-performing kitchen operations across Africa and the Gulf.",

  // -----------------------------------------------------------------------
  // DIRECT CONTACT & WHATSAPP CONFIGURATION (Update with your real details)
  // -----------------------------------------------------------------------
  contactDetails: {
    // PERSONALIZATION NOTE: Change the phone number below
    phoneDisplay: "+256 752345858",
    phoneRaw: "+256752345858",
    
    // PERSONALIZATION NOTE: Update with your WhatsApp phone number (with country code, no + or spaces for the wa.me link)
    whatsappDisplay: "+256 752345858",
    whatsappNumber: "256752345858", 
    whatsappDefaultMessage: "Hello Chef Peter, I am interested in your Culinary & Baking Classes and Hospitality Advisory services through De'Chosen Events Consultants.",
    
    // PERSONALIZATION NOTE: Update your email address
    email: "info@dechosenevents.com",
    secondaryEmail: "contact@chefpeter.com",

    // PERSONALIZATION NOTE: Location and office address
    locationDisplay: "Kampala, Uganda",
    officeAddress: "De'Chosen Events Consultants Headquarters, Kampala, Uganda",
    availability: "Available for worldwide consultancy, training workshops & event catering",
  },
  
  aboutStory: {
    title: "The Chef Peter & De'Chosen Story",
    paragraphs: [
      "Chef Peter's journey into culinary arts was driven by purpose and a profound conviction that culinary mastery is far more than a profession — it is an exact discipline requiring precision, patience, relentless curiosity, and respect for culinary traditions.",
      "As the Founder of De'Chosen Events Consultants, Chef Peter leads an elite hospitality advisory firm providing turnkey kitchen setups, commercial event catering, menu engineering, and structured training programs in the field of hospitality.",
      "The title 'Chef Peter the Teacher' was forged through years of hands-on masterclasses. He offers specialized practical training classes to individuals, private household chefs, commercial bakery teams, and aspiring culinary artists looking to master professional baking, pastry, inter-continental cooking, and traditional African gastronomy."
    ],
    pillars: [
      { title: "De'Chosen Excellence", desc: "Turnkey hospitality consultancy, commercial event management, and structured kitchen setup." },
      { title: "Culinary & Baking Arts Academy", desc: "Practical training classes for beginners, aspiring chefs, and commercial bakery operators." },
      { title: "Mentorship & Legacy", desc: "Author of technical baking and cooking manuals dedicated to raising the standard of African hospitality." }
    ]
  },

  metrics: [
    { value: "De'Chosen", label: "Events Consultants", description: "Founder & Lead Director of premier hospitality & events consultancy" },
    { value: "100s", label: "Students & Chefs Trained", description: "Hands-on classes in professional baking, pastry, and culinary arts" },
    { value: "7+", label: "International Territories", description: "Operations across Uganda, Congo, Kenya, South Sudan, UAE, Cameroon & Puntland" },
    { value: "3", label: "Published Technical Books", description: "Author of commercial baking and inter-continental culinary reference guides" }
  ] as Metric[],

  locations: [
    {
      id: "uganda",
      country: "Uganda",
      region: "East Africa",
      flag: "🇺🇬",
      coordinates: { x: 58, y: 56 },
      summary: "De'Chosen Events Consultants headquarters, hospitality leadership, aviation catering, and master culinary training.",
      highlights: [
        "Founder & Lead Consultant at De'Chosen Events Consultants",
        "Lead Culinary Consultant at Calm Waters Eco Lodge",
        "Newrest Uganda In-Flights — Precision aviation catering & food safety compliance",
        "Imperial Group & Speke Group of Hotels — Luxury kitchen divisions & banquet operations",
        "Culinary & Baking Masterclasses for individuals and commercial bakery teams"
      ],
      roles: ["Founder, De'Chosen Events Consultants", "Lead Culinary Consultant", "Senior Aviation Specialist", "Master Trainer"]
    },
    {
      id: "congo",
      country: "Congo (DRC)",
      region: "Central Africa",
      flag: "🇨🇩",
      coordinates: { x: 50, y: 58 },
      summary: "International culinary training, custom menu development, and executive kitchen management.",
      highlights: [
        "Custom menu engineering for high-net-worth private clients",
        "Staff development and commercial kitchen operational audits",
        "Inter-continental menu integration and high-standard banqueting"
      ],
      roles: ["International Culinary Specialist", "Kitchen Operations Advisor"]
    },
    {
      id: "kenya",
      country: "Kenya",
      region: "East Africa",
      flag: "🇰🇪",
      coordinates: { x: 62, y: 55 },
      summary: "Culinary advisory, cross-border hospitality strategy, and regional menu development.",
      highlights: [
        "Specialized training for hospitality teams and private estate chefs",
        "Technical culinary instruction in commercial baking and pastry arts"
      ],
      roles: ["Culinary Educator", "Hospitality Advisory Lead"]
    },
    {
      id: "south-sudan",
      country: "South Sudan",
      region: "East Africa",
      flag: "🇸🇸",
      coordinates: { x: 57, y: 50 },
      summary: "UN catering logistics, high-volume secure dining operations, and executive kitchen oversight.",
      highlights: [
        "UN Base catering operations — managing high-volume, secure dining environments",
        "Strict compliance with international hygiene, HACCP, and nutritional standards"
      ],
      roles: ["Senior Culinary Operations Lead", "UN Base Logistics Specialist"]
    },
    {
      id: "uae",
      country: "UAE",
      region: "Middle East / Gulf",
      flag: "🇦🇪",
      coordinates: { x: 72, y: 38 },
      summary: "Middle Eastern & Inter-continental cuisine innovation, specialized dining concepts, and luxury culinary consultancy.",
      highlights: [
        "Development of signature Shabati cuisine and inter-continental fusion menus",
        "Executive consulting for private clients and international hospitality brands"
      ],
      roles: ["Specialist Culinary Advisor", "Inter-Continental Concept Developer"]
    },
    {
      id: "cameroon",
      country: "Cameroon",
      region: "Central Africa",
      flag: "🇨🇲",
      coordinates: { x: 42, y: 54 },
      summary: "Private household culinary training, executive chef mentorship, and menu customization.",
      highlights: [
        "High-level private culinary instruction for VIP households and institutions",
        "Kitchen workflow optimization and artisanal baking masterclasses"
      ],
      roles: ["Master Educator", "Private Household Culinary Specialist"]
    },
    {
      id: "puntland",
      country: "Bosaso, Puntland",
      region: "Horn of Africa",
      flag: "🇸🇴",
      coordinates: { x: 68, y: 48 },
      summary: "International culinary logistics, port facility dining, and high-volume operations.",
      highlights: [
        "Green Castle International & DP World — Bosaso Port catering & hospitality management",
        "High-volume, multi-national workforce dining systems and food safety protocols"
      ],
      roles: ["Executive Culinary Logistics Specialist", "Head of Dining Operations"]
    }
  ] as LocationJourney[],

  competencies: [
    {
      id: "dechosen-consulting",
      title: "De'Chosen Events & Hospitality Advisory",
      iconName: "Briefcase",
      shortDesc: "Comprehensive advisory led by De'Chosen Events Consultants for hotel setups, wedding catering, and commercial kitchen design.",
      items: [
        "De'Chosen Events Turnkey Hospitality & Banquet Advisory",
        "Strategic Commercial Kitchen Layout & Workflow Engineering",
        "Menu Cost-Control Analysis & Yield Optimization",
        "Standard Operating Procedures (SOPs) & Staff Audits",
        "International HACCP Food Safety Compliance & Audit Prep"
      ]
    },
    {
      id: "training-academy",
      title: "Hospitality, Baking & Culinary Classes",
      iconName: "GraduationCap",
      shortDesc: "Hands-on practical training programs in commercial baking, confectionery, wedding cake design, and inter-continental cooking.",
      items: [
        "Master Wedding Cake Architecture & Royal Icing Confectionery",
        "Artisanal Commercial Baking (Sourdough, Brioche, Pastries)",
        "Inter-Continental & Traditional Ugandan Culinary Masterclasses",
        "Private Household Chef Certification & Brigade Up-Skilling",
        "Hospitality Hygiene, Kitchen Safety & Professional Discipline"
      ]
    },
    {
      id: "menu-innovation",
      title: "Menu Innovation & Specialty Cuisines",
      iconName: "Utensils",
      shortDesc: "Crafting signature dining concepts across Mongolian live wok, Shabati bread, Inter-Continental, and Artisanal Confectionery.",
      items: [
        "Signature Mongolian Live Wok Cooking Setups",
        "Authentic Shabati Cuisine & Middle Eastern Flatbreads",
        "Global Inter-Continental Fine Dining Curation",
        "Commercial Bakery Formulations & Dessert Displays",
        "Traditional Ugandan & African Gastronomy Reinterpretation"
      ]
    },
    {
      id: "author",
      title: "Published Technical Author",
      iconName: "BookOpen",
      shortDesc: "Authoring technical manuals on commercial baking, global gastronomy, and kitchen management.",
      items: [
        "Secrets of a Successful Baker (Commercial & Artisanal Baking)",
        "Inter-Continental Recipe Book (Global Culinary Adaptations)",
        "In 1000 Ways and More I Cooked (Techniques & Flavor Profiling)",
        "Technical Recipe Standardization for Commercial Operations",
        "African Heritage Gastronomy & Ingredient Research"
      ]
    }
  ] as CompetencyArea[],

  experiences: [
    {
      id: "dechosen-founder",
      role: "Founder & Lead Hospitality Consultant",
      organization: "De'Chosen Events Consultants",
      category: "consulting",
      description: "Leads premier hospitality advisory, event culinary production, and structured culinary/baking training programs across East Africa.",
      achievements: [
        "Established De'Chosen Events Consultants as a trusted benchmark in commercial hospitality advisory and event logistics",
        "Delivered hands-on culinary and baking masterclasses empowering hundreds of students, bakery staff, and private chefs"
      ]
    },
    {
      id: "calm-waters",
      role: "Lead Culinary Consultant",
      organization: "Calm Waters Eco Lodge",
      category: "consulting",
      description: "Directs culinary operations, menu development, and service standards to deliver sustainable, high-end guest dining experiences.",
      achievements: [
        "Engineered eco-sustainable farm-to-table menus blending local Ugandan delicacies with global fine dining",
        "Standardized kitchen operations resulting in elevated guest satisfaction ratings and food cost control"
      ]
    },
    {
      id: "global-specialist",
      role: "International Culinary Specialist & Master Trainer",
      organization: "Global Operations (Congo, Kenya, South Sudan, UAE, Cameroon)",
      category: "international",
      locations: ["Congo", "Kenya", "South Sudan", "UAE", "Cameroon"],
      description: "Delivered high-level culinary training, custom menu development, and executive kitchen management for private families, hotels, and elite institutions across Central/East Africa and the Gulf.",
      achievements: [
        "Trained over 50+ private household chefs and executive kitchen supervisors across 5 countries",
        "Customized high-grade inter-continental menus tailored to VIP dietary and cultural specifications"
      ]
    },
    {
      id: "un-aviation",
      role: "Senior Culinary & In-Flight Operations Specialist",
      organization: "UN Base & Newrest Uganda In-Flights & Visit Africa Uganda (Watoto Ltd)",
      category: "aviation",
      description: "Managed high-security, large-scale catering operations, strict aviation food safety compliance, and local cultural dining experiences.",
      achievements: [
        "UN Base Catering: Led large-scale, high-security kitchen logistics with zero-tolerance food safety standards",
        "Newrest Uganda: Executed precision aviation menu preparation meeting international airline compliance",
        "Visit Africa Uganda: Elevated traditional culinary experiences for international guests and delegations"
      ]
    },
    {
      id: "puntland-hotels",
      role: "Executive & Specialized Hospitality Operations",
      organization: "Green Castle International & DP World (Bosaso, Puntland) | Imperial & Speke Hotel Groups",
      category: "luxury",
      description: "Overaw international culinary logistics at Bosaso Port facilities and luxury kitchen divisions across Uganda's premier hotel groups.",
      achievements: [
        "Managed high-volume international dining facilities for DP World marine port infrastructure",
        "Led banquet divisions, fine dining kitchens, and VIP guest relations at Imperial & Speke Luxury Hotels"
      ]
    }
  ] as ExperienceItem[],

  education: {
    degree: "Bachelor's Degree",
    institution: "Makerere University Business School (MUBS)",
    specializations: [
      "Advanced Artisanal Baking & Pastry Formulations",
      "Global Gastronomy & Inter-Continental Culinary Art",
      "Hospitality Management & Strategic Operations",
      "Culinary Pedagogy & Technical Training Methodologies"
    ]
  } as EducationItem,

  philosophyQuote: "True culinary and baking excellence is a discipline worth passing on.",
  philosophySub: "At De'Chosen Events Consultants, we don't just cook — we train, empower, and equip aspiring chefs and baking enthusiasts with exact technical mastery.",

  services: [
    {
      id: "baking-culinary-classes",
      title: "Culinary & Baking Arts Classes (De'Chosen Academy)",
      shortDesc: "Hands-on practical training courses in commercial baking, multi-tier wedding cakes, confectionery, and inter-continental culinary art.",
      fullDesc: "Comprehensive practical masterclasses for beginners, baking enthusiasts, commercial bakery teams, and private chefs. Covers wedding cake framing, royal icing, pastry lamination, sourdough fermentation, menu plating, and kitchen discipline.",
      iconName: "GraduationCap",
      outcomes: ["Hands-on certificate training", "Mastery in wedding cakes & confectionery", "Commercial bakery recipe formulas", "Private chef career development"]
    },
    {
      id: "dechosen-consulting",
      title: "De'Chosen Hospitality & Events Advisory",
      shortDesc: "End-to-end advisory by De'Chosen Events Consultants for hotels, eco-lodges, commercial bakeries, and grand banquets.",
      fullDesc: "Complete operational audits, spatial kitchen layout design, menu engineering, inventory control systems, HACCP compliance protocols, and event catering management.",
      iconName: "Briefcase",
      outcomes: ["Lower kitchen food costs", "Streamlined service speed", "HACCP compliance", "Standardized luxury banqueting"]
    },
    {
      id: "menu-development",
      title: "Menu Engineering & Culinary Innovation",
      shortDesc: "Custom menu curation blending inter-continental techniques with traditional African & Asian culinary concepts.",
      fullDesc: "Development of signature menus (Mongolian live wok, Shabati, Inter-continental, Authentic Ugandan), ingredient yield analysis, food presentation styling, and standardized recipe manuals.",
      iconName: "UtensilsCrossed",
      outcomes: ["Higher menu profitability", "Unique signature dishes", "Consistent plating standards", "Reduced food waste"]
    },
    {
      id: "kitchen-operations",
      title: "Kitchen Operations & High-Volume Logistics",
      shortDesc: "Operational oversight for high-security, high-volume dining facilities, aviation catering, and UN bases.",
      fullDesc: "Logistical planning for large-scale meal production, strict cold-chain management, aviation safety standards, and multi-shift kitchen team synchronization.",
      iconName: "ShieldCheck",
      outcomes: ["Flawless food safety", "High-volume meal consistency", "Supply chain efficiency", "Audit readiness"]
    },
    {
      id: "private-consulting",
      title: "Private Household Culinary Advisory",
      shortDesc: "Exclusive customized culinary guidance, menu planning, and staff instruction for VIP families and estates.",
      fullDesc: "Discreet culinary management for high-net-worth households, specialized dietary menu plans, personal chef recruitment/training, and event banqueting oversight.",
      iconName: "UserCheck",
      outcomes: ["Tailored VIP menu plans", "Discreet household service", "Nutritional alignment", "Restaurant-grade private dining"]
    },
    {
      id: "hospitality-strategy",
      title: "Hospitality Strategy & Brand Transformation",
      shortDesc: "Strategic guidance for hospitality owners, investors, and developers launching or rebranding culinary venues.",
      fullDesc: "Concept ideation, target market culinary positioning, equipment specification, vendor selection, soft-launch supervision, and post-opening operational mentorship.",
      iconName: "TrendingUp",
      outcomes: ["Clear market positioning", "Turnkey kitchen launches", "Investor confidence", "Sustainable brand growth"]
    }
  ] as ServiceItem[]
};

