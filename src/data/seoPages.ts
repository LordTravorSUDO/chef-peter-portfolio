export interface SeoPage {
  path: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  introduction: string;
  highlights: string[];
  sections: Array<{ title: string; body: string }>;
}

export const SEO_PAGES: SeoPage[] = [
  {
    path: '/private-chef-uganda',
    title: 'Private Chef Services in Uganda',
    metaTitle: 'Private Chef in Uganda | Chef Peter the Teacher',
    description: 'Book Chef Peter the Teacher for private dining, family meal preparation, VIP hospitality and special occasions in Kampala, Entebbe and across Uganda.',
    eyebrow: 'Private Dining • Kampala • Entebbe',
    introduction: 'Enjoy restaurant-quality dining in your home, villa, office or private venue. Chef Peter plans the menu, sources ingredients, prepares each course and leaves the kitchen professionally organised.',
    highlights: ['Personalised menus', 'Ugandan and international cuisine', 'Dietary requirements supported', 'Private residences and corporate guests'],
    sections: [
      { title: 'A menu designed around your occasion', body: 'Every booking begins with a discussion about the occasion, number of guests, preferred cuisine, allergies and budget. The final menu is created specifically for you.' },
      { title: 'Professional service from preparation to presentation', body: 'The service can include ingredient sourcing, cooking, plating, table presentation and kitchen clean-up, giving hosts more time with their guests.' },
      { title: 'Serving Kampala, Entebbe and beyond', body: 'Private-chef assignments are available for intimate dinners, family celebrations, visiting executives, diplomatic residences and selected events across Uganda.' }
    ]
  },
  {
    path: '/culinary-consultant-uganda',
    title: 'Culinary Consultant in Uganda',
    metaTitle: 'Culinary Consultant Uganda | Chef Peter the Teacher',
    description: 'Culinary consultancy for restaurants, hotels, lodges and catering businesses in Uganda: menu development, costing, kitchen systems and staff training.',
    eyebrow: 'Menus • Kitchen Systems • Profitability',
    introduction: 'Chef Peter helps hospitality businesses improve food quality, consistency, kitchen workflow and profitability through practical, operation-focused consultancy.',
    highlights: ['Menu engineering and costing', 'Kitchen workflow reviews', 'Recipe standardisation', 'Practical staff development'],
    sections: [
      { title: 'Menu development and cost control', body: 'Menus are reviewed for customer appeal, ingredient availability, preparation time, portion control and realistic food-cost targets.' },
      { title: 'Kitchen operations and standard procedures', body: 'Clear recipes, preparation lists, storage systems and service procedures help teams produce consistent results during busy operations.' },
      { title: 'Hands-on team support', body: 'Recommendations are reinforced through demonstrations, supervised production and practical coaching for chefs and kitchen supervisors.' }
    ]
  },
  {
    path: '/cooking-classes-kampala',
    title: 'Practical Cooking Classes in Kampala',
    metaTitle: 'Cooking Classes Kampala | Chef Peter the Teacher',
    description: 'Join practical cooking classes in Kampala covering professional culinary skills, Ugandan dishes, international cuisine, kitchen safety and presentation.',
    eyebrow: 'Hands-On Culinary Training',
    introduction: 'Practical classes are designed for beginners, aspiring chefs, domestic cooks and working hospitality staff who want usable kitchen skills and professional confidence.',
    highlights: ['Mostly practical instruction', 'Small-group and private options', 'Ugandan and international dishes', 'Food safety included'],
    sections: [
      { title: 'Learn by preparing real dishes', body: 'Students practise knife skills, ingredient preparation, cooking methods, seasoning, portioning and presentation under direct guidance.' },
      { title: 'Theory that supports practical work', body: 'Essential theory covers kitchen safety, hygiene, food storage, recipe interpretation, nutrition, costing and the reasons behind each cooking technique.' },
      { title: 'Training for individuals and organisations', body: 'Programmes can be arranged for individuals, domestic staff, schools, restaurants, lodges and hospitality teams.' }
    ]
  },
  {
    path: '/baking-pastry-classes',
    title: 'Baking and Pastry Classes in Uganda',
    metaTitle: 'Baking & Pastry Classes Uganda | Chef Peter',
    description: 'Practical baking and pastry classes in Kampala covering bread, cakes, pastries, confectionery, decoration, food safety and bakery costing.',
    eyebrow: 'Baking • Pastry • Confectionery',
    introduction: 'Build practical skills in breads, cakes, pastry and confectionery while learning the ingredient science and production discipline required for consistent results.',
    highlights: ['Bread and dough production', 'Cakes and decoration', 'Pastry and confectionery', 'Bakery costing and hygiene'],
    sections: [
      { title: 'Commercial and home-baking skills', body: 'Lessons cover weighing, mixing, fermentation, shaping, baking, cooling, finishing and professional product presentation.' },
      { title: 'Cake finishing and confectionery', body: 'Students practise fillings, buttercream, fondant, piping, celebration-cake assembly and selected plated desserts.' },
      { title: 'Bake with understanding', body: 'Short theory sessions explain ingredient functions, temperature control, recipe scaling, troubleshooting, storage and product costing.' }
    ]
  },
  {
    path: '/hospitality-consultancy',
    title: 'Hospitality Consultancy in Uganda',
    metaTitle: 'Hospitality Consultant Uganda | Chef Peter',
    description: 'Hospitality consultancy for hotels, lodges, restaurants and catering operations in Uganda, including SOPs, staff training and service improvement.',
    eyebrow: 'Hotels • Lodges • Restaurants',
    introduction: 'Chef Peter provides practical hospitality guidance for new and established operations that want stronger standards, trained teams and a more consistent guest experience.',
    highlights: ['Operational assessments', 'Service and kitchen SOPs', 'Staff training', 'Opening and improvement support'],
    sections: [
      { title: 'Operational assessment', body: 'Current workflows, menus, staffing, hygiene, purchasing and guest-service standards are reviewed to identify practical priorities.' },
      { title: 'Standards that teams can follow', body: 'Simple operating procedures, checklists and role expectations are developed around the realities of the business.' },
      { title: 'Implementation support', body: 'Training and follow-up help managers turn recommendations into daily habits rather than reports that remain unused.' }
    ]
  },
  {
    path: '/about-chef-peter',
    title: 'About Chef Peter the Teacher',
    metaTitle: 'About Chef Peter the Teacher | Ugandan Chef',
    description: 'Meet Chef Peter the Teacher, Ugandan private chef, culinary educator, hospitality consultant and founder of D’E-Chosen Events Consultants.',
    eyebrow: 'Chef • Educator • Consultant',
    introduction: 'Chef Yiga Edward Peter Kirigwajjo Zimwanguyizza Mulindwa, widely known as Chef Peter the Teacher, combines professional cooking, practical education and hospitality leadership.',
    highlights: ['Ugandan culinary professional', 'International operational experience', 'Practical culinary educator', 'Founder of D’E-Chosen Events Consultants'],
    sections: [
      { title: 'Experience across different hospitality environments', body: 'His professional journey includes hotels, aviation catering, institutional kitchens, private residences and consultancy assignments in Uganda and other international locations.' },
      { title: 'Teaching through practical experience', body: 'Chef Peter’s training approach connects technique with kitchen discipline, food safety, commercial awareness and respect for ingredients.' },
      { title: 'Promoting Ugandan culinary excellence', body: 'His work presents Ugandan food with pride while helping cooks and hospitality businesses meet professional international expectations.' }
    ]
  },
  {
    path: '/culinary-books',
    title: 'Chef Peter’s Culinary Books',
    metaTitle: 'Culinary Books by Chef Peter the Teacher',
    description: 'Explore culinary and baking books by Chef Peter the Teacher covering professional baking, international recipes and practical cooking techniques.',
    eyebrow: 'Published Culinary Knowledge',
    introduction: 'Chef Peter’s culinary publications turn years of practical kitchen experience into accessible references for students, working cooks, bakers and hospitality teams.',
    highlights: ['Baking techniques', 'International recipes', 'Kitchen management knowledge', 'Professional reference material'],
    sections: [
      { title: 'Secrets of a Successful Baker', body: 'A practical guide to baking principles, production discipline, ingredient behaviour and commercial bakery operations.' },
      { title: 'Inter-Continental Recipe Book', body: 'A collection designed to support cooks working with international dishes, standard recipes and diverse flavour profiles.' },
      { title: 'In 1000 Ways and More I Cooked', body: 'A broad exploration of cooking techniques, ingredients and lessons developed through Chef Peter’s professional journey.' }
    ]
  }
];

export const getSeoPage = (pathname: string) =>
  SEO_PAGES.find(page => page.path === pathname.replace(/\/$/, '') || page.path + '/' === pathname);
