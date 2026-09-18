export interface SeoSection {
  title: string;
  body: string;
  points?: string[];
}

export interface CredentialItem {
  title: string;
  detail: string;
  status: 'verified' | 'confirmation-needed';
}

export interface ProfessionalEvidence {
  qualifications: CredentialItem[];
  certifications: CredentialItem[];
  organizations: string[];
  countries: string[];
  books: string[];
  media: CredentialItem[];
  awards: CredentialItem[];
  capabilities: string[];
}

export interface SeoPage {
  path: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  introduction: string;
  highlights: string[];
  sections: SeoSection[];
  audienceTitle: string;
  audience: string[];
  processTitle: string;
  process: Array<{ title: string; description: string }>;
  faqs: Array<{ question: string; answer: string }>;
  image?: string;
  imageAlt?: string;
  experienceNote?: string;
  professionalEvidence?: ProfessionalEvidence;
}

export const SEO_PAGES: SeoPage[] = [
  {
    path: '/private-chef-uganda',
    title: 'Private Chef Services in Uganda',
    metaTitle: 'Private Chef in Uganda | Chef Peter the Teacher',
    description: 'Book Chef Peter the Teacher for private dining, family meals, VIP hospitality and special occasions in Kampala, Entebbe and across Uganda.',
    eyebrow: 'Private Dining • Kampala • Entebbe',
    introduction: 'Enjoy a professionally planned dining experience in your home, villa, office or private venue. Chef Peter manages the menu, ingredients, preparation and presentation so that you can focus on your guests.',
    highlights: ['Personalised menus', 'Ugandan and international cuisine', 'Dietary needs considered', 'Professional preparation and presentation'],
    sections: [
      {
        title: 'A menu designed for your occasion',
        body: 'Every booking begins with a consultation about the occasion, number of guests, preferred dishes, service style, allergies and budget. Chef Peter then proposes a balanced menu suited to the setting.',
        points: ['Intimate dinners and family celebrations', 'Executive and diplomatic hospitality', 'Holiday-villa and household dining', 'Birthdays, anniversaries and selected private events']
      },
      {
        title: 'Complete culinary support',
        body: 'Depending on the agreed package, the service can include menu planning, ingredient sourcing, preparation, cooking, plating, buffet organisation and professional kitchen clean-up.',
        points: ['Ingredient and equipment planning', 'Portion and timing coordination', 'Attractive food presentation', 'Orderly service and kitchen handover']
      },
      {
        title: 'Cuisine with local character and global standards',
        body: 'Menus may feature refined Ugandan favourites, African cuisine, continental dishes, baking and pastry, or a carefully designed fusion menu. Seasonal and locally available ingredients are prioritised where practical.'
      }
    ],
    audienceTitle: 'Suitable for',
    audience: ['Families hosting special occasions', 'Visitors staying in villas or private residences', 'Corporate executives and VIP guests', 'Clients seeking regular household menu support'],
    processTitle: 'How a private-chef booking works',
    process: [
      { title: 'Consultation', description: 'Share the date, location, guest number, preferences, dietary needs and budget.' },
      { title: 'Menu proposal', description: 'Receive a suggested menu and agreed scope of service for approval.' },
      { title: 'Preparation', description: 'Ingredients, equipment and service timing are organised before the event.' },
      { title: 'Dining service', description: 'Chef Peter prepares and presents the meal according to the agreed plan.' }
    ],
    faqs: [
      { question: 'Can menus accommodate allergies or special diets?', answer: 'Yes. Dietary needs should be shared during the consultation so the menu and ingredient plan can be adjusted safely.' },
      { question: 'Where is the service available?', answer: 'Bookings are available in Kampala, Entebbe and other Ugandan locations subject to the date, travel requirements and assignment size.' },
      { question: 'How early should I book?', answer: 'Book as early as possible for weekends and large occasions. Availability and preparation time depend on the menu and number of guests.' }
    ]
  },
  {
    path: '/culinary-consultant-uganda',
    title: 'Professional Culinary Consultant in Uganda',
    metaTitle: 'Culinary Consultant Uganda | Chef Peter the Teacher',
    description: 'Practical culinary consultancy for restaurants, hotels, lodges, bakeries and catering businesses in Uganda, covering menus, costing, systems and training.',
    eyebrow: 'Menus • Kitchen Systems • Profitability',
    introduction: 'Chef Peter works with hospitality owners and kitchen teams to improve food quality, consistency, workflow and commercial performance. Recommendations are practical, measurable and adapted to the realities of each operation.',
    highlights: ['Menu engineering and costing', 'Kitchen workflow assessment', 'Recipe standardisation', 'Hands-on staff development'],
    sections: [
      {
        title: 'Menu development and menu engineering',
        body: 'Menus are assessed for customer appeal, preparation time, ingredient availability, pricing and contribution to the business. New dishes can be developed and tested before launch.',
        points: ['Menu concept and product selection', 'Standard recipes and portion sizes', 'Food-cost and selling-price guidance', 'Presentation and plating standards']
      },
      {
        title: 'Kitchen systems and operational control',
        body: 'Chef Peter reviews how food moves from purchasing and storage through preparation and service. The goal is to reduce confusion, waste, delays and inconsistency.',
        points: ['Preparation and production schedules', 'Stock rotation and storage practices', 'Cleaning and food-safety routines', 'Kitchen roles, handovers and checklists']
      },
      {
        title: 'Training that supports implementation',
        body: 'Advice is reinforced through demonstrations, supervised production and coaching. Managers receive clear priorities, while kitchen staff practise the required standards in their actual working environment.'
      }
    ],
    audienceTitle: 'Who can benefit',
    audience: ['Restaurants introducing or improving a menu', 'Hotels and lodges strengthening kitchen standards', 'Catering companies managing quality and volume', 'Bakeries requiring product and production guidance'],
    processTitle: 'The consultancy process',
    process: [
      { title: 'Discovery', description: 'Discuss the business goals, challenges, team, customers and present operation.' },
      { title: 'Assessment', description: 'Review menus, kitchen workflow, recipes, purchasing, storage, service and staff practices.' },
      { title: 'Action plan', description: 'Prioritise improvements with practical recommendations, documents and training needs.' },
      { title: 'Implementation', description: 'Support the team through testing, coaching, monitoring and follow-up.' }
    ],
    faqs: [
      { question: 'Can Chef Peter help a new restaurant?', answer: 'Yes. Support may include concept development, menu design, kitchen workflow, equipment guidance, recipes, training and opening preparation.' },
      { question: 'Can an existing menu be made more profitable?', answer: 'Yes. Ingredients, portions, preparation time, selling prices and customer demand can be reviewed to identify stronger and weaker menu items.' },
      { question: 'Is the consultancy only theoretical?', answer: 'No. The approach combines analysis with practical demonstrations, production trials, staff coaching and usable operating documents.' }
    ]
  },
  {
    path: '/cooking-classes-kampala',
    title: 'Practical Cooking Classes in Kampala',
    metaTitle: 'Practical Cooking Classes Kampala | Chef Peter',
    description: 'Hands-on cooking classes in Kampala covering professional culinary skills, Ugandan dishes, international cuisine, food safety, costing and presentation.',
    eyebrow: 'Hands-On Culinary Training',
    introduction: 'These classes are designed for beginners, aspiring chefs, domestic cooks and hospitality staff who want usable kitchen skills. Most learning is practical, supported by short theory sessions that explain safety, ingredients and technique.',
    highlights: ['Mainly practical instruction', 'Theory supporting each skill', 'Small-group and private options', 'Professional kitchen discipline'],
    sections: [
      {
        title: 'Core culinary skills',
        body: 'Students learn through guided preparation and cooking rather than observation alone. Each session develops accuracy, confidence, organisation and professional habits.',
        points: ['Knife handling and ingredient preparation', 'Stocks, sauces, soups and basic cookery methods', 'Ugandan and international dishes', 'Portioning, seasoning, presentation and service timing']
      },
      {
        title: 'Essential theory',
        body: 'Theory is connected directly to practical work so students understand why a method succeeds or fails.',
        points: ['Food hygiene, contamination and safe storage', 'Recipe reading and measurement', 'Basic nutrition and menu balance', 'Food costing, yield and waste control']
      },
      {
        title: 'Flexible training arrangements',
        body: 'Training can be organised for individuals, private groups, domestic staff, schools, restaurants, hotels and institutions. Course content and duration can be adjusted to the learners’ level and goals.'
      }
    ],
    audienceTitle: 'Who should enrol',
    audience: ['Beginners who want confidence in the kitchen', 'Aspiring chefs preparing for hospitality work', 'Domestic cooks improving household service', 'Working teams needing practical upskilling'],
    processTitle: 'How the training works',
    process: [
      { title: 'Skills assessment', description: 'Identify the learner’s current level, goals and preferred training topics.' },
      { title: 'Course plan', description: 'Agree on practical modules, supporting theory, schedule and required ingredients.' },
      { title: 'Hands-on sessions', description: 'Prepare real dishes under direct demonstration, correction and supervision.' },
      { title: 'Practical assessment', description: 'Demonstrate the techniques, hygiene and organisation learned during the programme.' }
    ],
    faqs: [
      { question: 'Are the classes suitable for complete beginners?', answer: 'Yes. Training can begin with basic equipment, hygiene, knife skills and simple dishes before progressing to more advanced work.' },
      { question: 'Are the classes practical or theoretical?', answer: 'They are mainly practical. Theory is included to explain food safety, ingredients, costing, nutrition and the principles behind each method.' },
      { question: 'Can organisations arrange private training?', answer: 'Yes. Schools, households and hospitality businesses can request a customised programme for their learners or staff.' }
    ]
  },
  {
    path: '/baking-pastry-classes',
    title: 'Practical Baking and Pastry Classes in Uganda',
    metaTitle: 'Baking & Pastry Classes Uganda | Chef Peter',
    description: 'Practical baking and pastry classes in Kampala covering bread, cakes, pastries, confectionery, decoration, hygiene and bakery costing.',
    eyebrow: 'Baking • Pastry • Confectionery',
    introduction: 'Build dependable skills in breads, cakes, pastry and confectionery while learning the ingredient science and production discipline needed for consistent results at home or in a commercial bakery.',
    highlights: ['Bread and dough production', 'Cakes and decoration', 'Pastry and confectionery', 'Bakery costing and hygiene'],
    sections: [
      {
        title: 'Bread and commercial baking foundations',
        body: 'Students practise accurate weighing, mixing, fermentation, shaping, proofing, baking and cooling while learning to identify and correct common faults.',
        points: ['Basic and enriched doughs', 'Fermentation and temperature control', 'Production planning and consistency', 'Packaging, storage and shelf-life awareness']
      },
      {
        title: 'Cakes, pastry and finishing',
        body: 'Modules can cover sponge and celebration cakes, fillings, buttercream, fondant, piping, pastry products, selected desserts and professional display.',
        points: ['Cake mixing and baking methods', 'Layering, filling and crumb coating', 'Decoration and celebration-cake finishing', 'Pastry handling and product presentation']
      },
      {
        title: 'Theory for successful production',
        body: 'Short theory lessons explain ingredient functions, recipe scaling, oven management, hygiene, yield, troubleshooting, storage and product costing.'
      }
    ],
    audienceTitle: 'Suitable for',
    audience: ['Home bakers developing reliable skills', 'Beginners preparing to start a baking business', 'Bakery staff requiring standard methods', 'Culinary students expanding into pastry'],
    processTitle: 'Learning journey',
    process: [
      { title: 'Choose a level', description: 'Select beginner, intermediate or customised commercial training.' },
      { title: 'Understand the formula', description: 'Review ingredients, measurements, equipment and expected product characteristics.' },
      { title: 'Bake practically', description: 'Complete each production stage with demonstration and correction.' },
      { title: 'Evaluate the product', description: 'Assess volume, texture, flavour, finish, consistency and costing.' }
    ],
    faqs: [
      { question: 'Do I need previous baking experience?', answer: 'No. Beginner programmes start with equipment, measurements, hygiene and simple production methods.' },
      { question: 'Can the course help someone starting a bakery?', answer: 'Yes. Custom training can include production planning, standard recipes, consistency, costing, storage and basic commercial discipline.' },
      { question: 'Are ingredients and equipment provided?', answer: 'Arrangements depend on the programme and venue. The requirements are agreed before training begins.' }
    ]
  },
  {
    path: '/hospitality-consultancy',
    title: 'Hospitality Consultancy in Uganda',
    metaTitle: 'Hospitality Consultant Uganda | Chef Peter',
    description: 'Hospitality consultancy for hotels, lodges, restaurants and catering operations in Uganda, including SOPs, staff training and service improvement.',
    eyebrow: 'Hotels • Lodges • Restaurants',
    introduction: 'Chef Peter provides practical guidance for hospitality businesses that want clearer systems, stronger teams and a more dependable guest experience across kitchen, food service and operational management.',
    highlights: ['Operational assessments', 'Service and kitchen SOPs', 'Staff training', 'Opening and improvement support'],
    sections: [
      {
        title: 'Operational assessment and diagnosis',
        body: 'The engagement begins with a structured review of the guest journey and the systems supporting it.',
        points: ['Food production and kitchen workflow', 'Purchasing, receiving and storage', 'Hygiene, safety and cleaning practices', 'Staff roles, communication and service standards']
      },
      {
        title: 'Practical standards and documentation',
        body: 'Clear operating procedures, checklists, recipes, duty expectations and monitoring tools are developed around the size and resources of the business.'
      },
      {
        title: 'Opening, improvement and follow-up support',
        body: 'Chef Peter can support new concepts and existing operations through staff orientation, menu trials, mock service, supervisory coaching and follow-up reviews.'
      }
    ],
    audienceTitle: 'Businesses supported',
    audience: ['Hotels and eco-lodges', 'Restaurants, cafés and private clubs', 'Event caterers and institutional kitchens', 'Hospitality investors and new venue owners'],
    processTitle: 'From assessment to improvement',
    process: [
      { title: 'Business consultation', description: 'Clarify the desired guest experience, current problems and commercial objectives.' },
      { title: 'Operational review', description: 'Observe systems, documentation, facilities, menus, service and staff practices.' },
      { title: 'Improvement programme', description: 'Create prioritised actions, SOPs, training and measurable operating standards.' },
      { title: 'Follow-up', description: 'Review adoption, correct gaps and help managers maintain the new standards.' }
    ],
    faqs: [
      { question: 'Can you support a hospitality business before opening?', answer: 'Yes. Pre-opening support can cover concept and menu planning, workflow, equipment guidance, procedures, recruitment input, staff training and trial service.' },
      { question: 'Do you provide written SOPs?', answer: 'Yes. The documents required depend on the assignment and may include kitchen, hygiene, production, service and supervisory checklists.' },
      { question: 'Can the consultancy include staff training?', answer: 'Yes. Practical training and supervisory coaching can be included so that teams understand and apply the recommended standards.' }
    ]
  },
  {
    path: '/about-chef-peter',
    title: 'About Chef Peter the Teacher',
    metaTitle: 'About Chef Peter | Professional Consultant Chef Uganda',
    description: 'Meet Chef Peter the Teacher, a Ugandan professional consultant chef, culinary educator and hospitality specialist with over 20 years of experience.',
    eyebrow: '20+ Years • Chef • Educator • Consultant',
    introduction: 'Chef Yiga Edward Peter Kirigwajjo Zimwanguyizza Mulindwa, widely known as Chef Peter the Teacher, is a professional consultant chef, culinary educator and hospitality specialist with over 20 years of experience in the field.',
    highlights: ['Over 20 years of professional experience', 'Consultant chef and hospitality advisor', 'International operational exposure', 'Practical culinary educator and author'],
    image: '/images/chef-peter.jpg',
    imageAlt: 'Chef Peter the Teacher, professional consultant chef in Uganda',
    experienceNote: 'More than two decades of practical culinary leadership, training and hospitality consultancy',
    sections: [
      {
        title: 'A career built through practical hospitality experience',
        body: 'Chef Peter’s work spans professional kitchens, hotels, aviation catering, institutional and high-volume food operations, private households, hospitality consultancy and culinary education. This varied experience allows him to understand both the creative and operational sides of food service.',
        points: ['Hotels, restaurants and lodge operations', 'Aviation and high-volume catering environments', 'Private and VIP culinary assignments', 'Commercial kitchen and hospitality consultancy']
      },
      {
        title: 'A professional consultant chef',
        body: 'As a consultant, Chef Peter helps hospitality businesses turn ideas and challenges into working systems. His areas of support include menu engineering, recipe standardisation, food costing, kitchen workflow, hygiene, staff development, opening preparation and service improvement.'
      },
      {
        title: 'Chef Peter the Teacher',
        body: 'His teaching style is practical, disciplined and encouraging. Learners prepare real products, understand the theory behind each technique and receive guidance on professional conduct, safety, consistency and commercial awareness.'
      },
      {
        title: 'Ugandan identity with international perspective',
        body: 'Chef Peter promotes Ugandan ingredients and culinary heritage while applying professional standards gained through assignments in Uganda and other international locations. His goal is to strengthen African hospitality through skills, systems and mentorship.'
      },
      {
        title: 'Founder, mentor and culinary author',
        body: 'Through D’E-Chosen Events Consultants, Chef Peter provides culinary services, consultancy and training. His culinary publications preserve practical knowledge for students, bakers, cooks and hospitality professionals.'
      }
    ],
    professionalEvidence: {
      qualifications: [
        {
          title: 'Bachelor’s Degree',
          detail: 'Makerere University Business School (MUBS), as listed in Chef Peter’s professional profile.',
          status: 'verified'
        }
      ],
      certifications: [
        {
          title: 'Professional culinary and hospitality certification',
          detail: 'Chef Peter is presented as a certified professional chef. Exact certificate titles, awarding institutions and completion dates should be added from the original certificates before publication as individual credentials.',
          status: 'confirmation-needed'
        },
        {
          title: 'Food safety and HACCP competence',
          detail: 'His profile demonstrates professional experience with food-safety compliance, aviation catering and high-volume operations. Any named HACCP or food-safety certificate should be listed only after its document is confirmed.',
          status: 'confirmation-needed'
        }
      ],
      organizations: [
        "De'Chosen Events Consultants",
        'Calm Waters Eco Lodge',
        'Newrest Uganda In-Flights',
        'UN Base catering operations',
        'Visit Africa Uganda (Watoto Ltd)',
        'Green Castle International',
        'DP World — Bosaso operations',
        'Imperial Group of Hotels',
        'Speke Group of Hotels'
      ],
      countries: [
        'Uganda',
        'Democratic Republic of the Congo',
        'Kenya',
        'South Sudan',
        'United Arab Emirates',
        'Cameroon',
        'Somalia — Bosaso, Puntland'
      ],
      books: [
        'Secrets of a Successful Baker',
        'Inter-Continental Recipe Book',
        'In 1000 Ways and More I Cooked'
      ],
      media: [
        {
          title: 'Media appearances and published features',
          detail: 'No specific verified television, radio, newspaper, podcast or online-feature references are currently listed. Confirmed programme names, publishers, dates and links can be added here later.',
          status: 'confirmation-needed'
        }
      ],
      awards: [
        {
          title: 'Awards and professional recognitions',
          detail: 'No named award or issuing organisation is currently documented on the website. Verified awards can be added after the certificate, trophy, announcement or official reference is provided.',
          status: 'confirmation-needed'
        }
      ],
      capabilities: [
        'Culinary and hospitality consultancy',
        'Menu development, engineering and food costing',
        'Commercial kitchen systems and workflow design',
        'Food safety, hygiene and HACCP-aligned operations',
        'Professional chef, baking and pastry training',
        'Staff development, mentorship and practical assessment',
        'High-volume, aviation and institutional catering',
        'Private household and VIP culinary service',
        'Hotel, lodge, restaurant and event operations',
        'Hospitality management and service improvement'
      ]
    },
    audienceTitle: 'Professional areas',
    audience: ['Culinary and hospitality consultancy', 'Menu development and kitchen systems', 'Practical chef, baking and pastry training', 'Private dining and event culinary services'],
    processTitle: 'How Chef Peter approaches an assignment',
    process: [
      { title: 'Listen', description: 'Understand the client, operation, audience, resources and desired result.' },
      { title: 'Assess', description: 'Identify the practical strengths, risks and priority areas requiring attention.' },
      { title: 'Design', description: 'Develop a suitable menu, training programme, system or improvement plan.' },
      { title: 'Implement', description: 'Work alongside people through demonstrations, coaching and structured follow-up.' }
    ],
    faqs: [
      { question: 'What makes Chef Peter a consultant chef?', answer: 'He combines professional cooking experience with operational analysis, menu development, costing, kitchen systems, food safety and team training.' },
      { question: 'How much experience does Chef Peter have?', answer: 'Chef Peter has more than 20 years of professional experience across culinary production, hospitality operations, training and consultancy.' },
      { question: 'Does Chef Peter work outside Uganda?', answer: 'Yes. His professional background includes assignments and operational exposure in Uganda and other African and international locations.' }
    ]
  },
  {
    path: '/culinary-books',
    title: 'Chef Peter’s Culinary Books',
    metaTitle: 'Culinary Books by Chef Peter the Teacher',
    description: 'Explore culinary and baking books by Chef Peter the Teacher covering professional baking, international recipes, kitchen management and practical techniques.',
    eyebrow: 'Published Culinary Knowledge',
    introduction: 'Chef Peter’s culinary publications organise years of practical kitchen knowledge into accessible references for students, working cooks, bakers, trainers and hospitality teams.',
    highlights: ['Baking techniques', 'International recipes', 'Kitchen management knowledge', 'Professional reference material'],
    sections: [
      {
        title: 'Secrets of a Successful Baker',
        body: 'A practical guide to baking principles, ingredient behaviour, production discipline and commercial bakery operations. It is designed to help learners understand both the method and the reason behind consistent baking.'
      },
      {
        title: 'Inter-Continental Recipe Book',
        body: 'A reference supporting cooks who work with international dishes, standard recipes and diverse flavour profiles. It encourages organised preparation, accurate methods and adaptable professional cooking.'
      },
      {
        title: 'In 1000 Ways and More I Cooked',
        body: 'A broad exploration of cooking methods, ingredients, flavour development and professional lessons gathered through Chef Peter’s culinary journey.'
      },
      {
        title: 'Knowledge for the working kitchen',
        body: 'The books complement Chef Peter’s practical training by giving learners material they can revisit for recipes, principles, problem-solving and professional development.'
      }
    ],
    audienceTitle: 'Written for',
    audience: ['Culinary and hospitality students', 'Professional and aspiring chefs', 'Home and commercial bakers', 'Training institutions and kitchen teams'],
    processTitle: 'How to use the books',
    process: [
      { title: 'Study the principle', description: 'Understand the ingredients, method, safety and production objective.' },
      { title: 'Prepare carefully', description: 'Organise equipment, measurements and mise en place before beginning.' },
      { title: 'Practise', description: 'Follow the technique and record observations about timing and results.' },
      { title: 'Improve', description: 'Evaluate the final product and use the guidance to correct future production.' }
    ],
    faqs: [
      { question: 'Are the books suitable for beginners?', answer: 'Yes. They are intended to make practical culinary knowledge accessible while also supporting working professionals.' },
      { question: 'Do the books replace practical training?', answer: 'They are valuable references, but practical demonstrations and supervised practice remain the best way to master culinary and baking techniques.' },
      { question: 'How can I ask about availability?', answer: 'Use the WhatsApp enquiry button and mention the title of the book you are interested in.' }
    ]
  }
];

export const getSeoPage = (pathname: string) =>
  SEO_PAGES.find(page => page.path === pathname.replace(/\/$/, '') || page.path + '/' === pathname);
