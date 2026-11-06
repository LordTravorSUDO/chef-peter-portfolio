/**
 * Full first drafts for the first four articles in the editorial calendar.
 *
 * These are drafts for review, not finished articles:
 *   - Text in square brackets — [EDITOR: …], [CHEF PETER: …], [PHOTO: …] —
 *     must be completed or removed. The CMS will not publish or schedule an
 *     article while any remain (src/lib/editorial/placeholders.ts).
 *   - "Chef Peter’s tip" boxes are left for Chef Peter to write or confirm.
 *     No experience, opinion or quotation is attributed to him here.
 *   - The general boxes ("Practical kitchen lesson", "Common kitchen
 *     mistakes", "What professional chefs should know") are editorial
 *     guidance, not personal claims.
 *   - References are real publications; the editor should check the draft
 *     against their current versions before publishing.
 */

const chefPeterTip = (idea: string) =>
  `<blockquote><p><strong>Chef Peter’s tip:</strong> [CHEF PETER: write your own tip here, or delete this box. Suggested topic: ${idea}]</p></blockquote>`;

export const ARTICLE_DRAFTS: Record<string, string> = {
  // ────────────────────────────────────────────────────────────────────────────
  'mise-en-place-professional-kitchen': `
<p>Watch a good line cook at the start of a busy service and you will notice something surprising: they hardly seem to hurry. Onions are already sliced, sauces are in their pans, garnishes sit in small containers within reach. The calm is not talent alone. It is the result of work done earlier, and professional kitchens have a name for it: <em>mise en place</em>.</p>
<p>This lesson explains what mise en place means, why kitchens depend on it, and how you can use the same habits whether you cook for two people or two hundred.</p>

<h2>What “mise en place” means</h2>
<p><em>Mise en place</em> (pronounced roughly “meez-on-plass”) is French for “putting in place”. In the kitchen it means having everything you need — ingredients, equipment and a plan — ready before cooking begins. Cooks often shorten it to “mise”: “Is your mise ready?” simply means “Are you prepared for service?”</p>
<p>The idea is older and wider than a row of small bowls. It is a way of thinking: decide what the dish needs, prepare it in the right order, and arrange it so that the actual cooking becomes a sequence of simple steps.</p>

<h2>Why professional kitchens depend on it</h2>
<p>During service, a cook may have several dishes on the go, each with its own timing. There is no time to peel garlic while a fish is cooking or to search for a ladle while a sauce reduces. Mise en place moves the slow, predictable work to the quiet hours before service so that the busy hours are spent on cooking, tasting and plating.</p>
<p>It also protects quality and safety. Measured ingredients mean the dish tastes the same every time. A clean, organised station means raw and ready-to-eat foods are kept apart and nothing is forgotten on the side of a hot stove.</p>
<blockquote><p><strong>What professional chefs should know:</strong> In most kitchens your mise en place is judged before your cooking is. An organised station tells the head chef that you understand the menu, the timing and the standards — long before the first order arrives.</p></blockquote>

<h2>The three parts: ingredients, equipment and time</h2>
<h3>1. Ingredients</h3>
<p>Read the recipe or the menu all the way through. Then wash, peel, cut, weigh and measure everything that can safely be prepared in advance. Keep each item in its own container and label anything that will be stored. Perishable items should stay chilled until they are needed.</p>
<h3>2. Equipment</h3>
<p>Set out the pans, utensils, boards, knives, trays and serving dishes you will use. Check that the oven is preheating, that the thermometer works and that you have clean cloths. Missing equipment is one of the most common causes of delay during service.</p>
<h3>3. Time</h3>
<p>The part beginners often forget is planning. Work out which tasks take longest and start them first: stocks, braises and doughs before quick garnishes. Ask yourself what can be done the day before and what must be done at the last minute to stay fresh.</p>

<h2>How to build a simple prep list</h2>
<p>A prep list turns the menu into tasks. Professional kitchens write one for every shift; it works just as well at home before a family celebration.</p>
<ol>
<li><strong>List every dish</strong> you will serve and the number of portions.</li>
<li><strong>Break each dish into components</strong> — for example, a pilau needs washed rice, sliced onions, ground spices, meat and stock.</li>
<li><strong>Note the quantity</strong> of each component for the number of portions.</li>
<li><strong>Order the tasks by time</strong>: longest first, most delicate last.</li>
<li><strong>Tick tasks off</strong> as they are completed, so anyone in the team can see what is left.</li>
</ol>
<blockquote><p><strong>Practical kitchen lesson:</strong> Choose a dish you cook often. Before you next make it, write a prep list, prepare every ingredient into containers and set out your equipment. Time yourself from switching on the stove to serving, and compare with the last time you cooked it without preparing first.</p></blockquote>
${chefPeterTip('how you teach trainees to write and use a prep list')}

<h2>Mise en place at home and in small kitchens</h2>
<p>You do not need a large professional kitchen or dozens of containers. Cups, saucers and a single tray are enough. In a small space, the order of work matters even more: clear and wipe the counter, prepare ingredients, then put away anything you no longer need before you start cooking.</p>
<p>If you cook on a charcoal stove or a single gas burner, plan around the heat source. Prepare everything before the fire is ready, because charcoal heat changes over time and cannot be paused while you chop.</p>

<h2>Common mistakes</h2>
<blockquote><p><strong>Common kitchen mistakes:</strong></p><ul><li>Preparing delicate items such as cut herbs or sliced avocado too early, so they wilt or brown.</li><li>Leaving prepared perishable food at room temperature instead of chilling it until needed.</li><li>Preparing ingredients but forgetting equipment — the ladle, the strainer or the serving plates.</li><li>Starting with quick tasks and leaving slow ones, such as stocks or soaking beans, until it is too late.</li><li>Letting the station become cluttered. Clean as you go: wipe the board and clear waste between tasks.</li></ul></blockquote>

<h2>In summary</h2>
<p>Mise en place is preparation with purpose: the right ingredients, the right equipment and a plan for your time. It makes cooking calmer, faster and safer, and it is one of the first habits professional kitchens teach — because every other skill depends on it.</p>
<p>To practise these skills with guidance, see Chef Peter’s <a href="/cooking-classes-kampala">practical cooking classes in Kampala</a>, or continue with the library’s lessons on knife skills and kitchen organisation.</p>

<h2>References</h2>
<ul>
<li>The Culinary Institute of America. <em>The Professional Chef</em>. Hoboken, NJ: Wiley.</li>
<li>Gisslen, W. <em>Professional Cooking</em>. Hoboken, NJ: Wiley.</li>
</ul>
<p>[PHOTO: add a featured image — an organised workstation with prepared ingredients in small bowls, photographed from above. Add alt text in the Media library.]</p>
`,

  // ────────────────────────────────────────────────────────────────────────────
  'cross-contamination-in-the-kitchen': `
<p>Most food poisoning does not come from food that looks or smells bad. It comes from harmful bacteria and viruses that cannot be seen, carried from one place to another on hands, knives, boards and cloths. This movement is called cross-contamination, and preventing it is one of the most important habits in any kitchen.</p>
<p>This guide explains how cross-contamination happens and the routines that prevent it, based on guidance from the World Health Organization (WHO), the Codex Alimentarius food hygiene principles and the UK Food Standards Agency (FSA).</p>

<h2>What cross-contamination is</h2>
<p>Cross-contamination is the transfer of harmful microorganisms — or allergens — from one food, surface or person to another. The greatest risk is when something from <strong>raw</strong> food reaches <strong>ready-to-eat</strong> food: food that will not be cooked again before it is eaten, such as salads, fruit, bread, cooked meat or desserts.</p>
<p>Raw meat, poultry, fish and eggs, and soil on unwashed vegetables, can carry bacteria such as <em>Salmonella</em> and <em>Campylobacter</em>. Thorough cooking kills most of them. But if they reach a salad or a cooked dish that is not heated again, nothing stops them.</p>

<h2>The three routes: food to food, hands and equipment</h2>
<h3>Food to food</h3>
<p>Raw meat juices dripping onto cooked food in a refrigerator, or raw chicken touching vegetables in a shopping bag, are typical examples.</p>
<h3>Hands</h3>
<p>Hands touch everything: raw meat, phones, money, door handles, the face. WHO’s first key to safer food is “keep clean” — wash hands before handling food and often during food preparation, and after using the toilet.</p>
<h3>Equipment and surfaces</h3>
<p>A knife used on raw meat and then on tomatoes, a board wiped with the same cloth all day, or a tray that carried raw fish and then cooked food can all transfer bacteria.</p>
<blockquote><p><strong>Food safety:</strong> Washing raw chicken does not make it safer. Splashing water can spread bacteria around the sink and onto nearby food and surfaces. Cooking the chicken thoroughly is what kills the bacteria.</p></blockquote>

<h2>Allergen cross-contact</h2>
<p>For a person with a food allergy, a trace of peanut, egg, milk, sesame, fish or another allergen can cause a serious reaction. Cooking does not remove allergens. Keep allergen-free dishes separate, use clean utensils and boards for them, and make sure staff know which dishes contain which allergens before they answer a guest’s question.</p>

<h2>Separating raw and ready-to-eat food</h2>
<p>WHO’s second key to safer food is “separate raw and cooked”. In practice, this means:</p>
<ul>
<li><strong>Different boards and utensils</strong> for raw meat, poultry and fish, and for ready-to-eat food. Many kitchens use colour-coded boards so the rule is easy to follow.</li>
<li><strong>Storage order in the refrigerator:</strong> ready-to-eat food on the upper shelves, raw meat, poultry and fish below, in covered containers, so that nothing can drip down.</li>
<li><strong>Separate preparation areas or times:</strong> if space is limited, prepare ready-to-eat food first, then raw food, and clean and disinfect thoroughly between them.</li>
<li><strong>Clean containers for cooked food:</strong> never return cooked food to the container that held it raw.</li>
</ul>
<blockquote><p><strong>What professional chefs should know:</strong> Separation is a system, not a single action. It covers delivery, storage, preparation, cooking, holding and service. If one stage fails — for example, raw chicken stored above a cooked dessert — good practice at every other stage cannot fully make up for it.</p></blockquote>

<h2>Cleaning and disinfecting: the difference</h2>
<p><strong>Cleaning</strong> removes visible dirt, food and grease, usually with hot water and detergent. <strong>Disinfecting</strong> reduces harmful microorganisms to a safe level, using heat or a suitable chemical disinfectant. Disinfectants work poorly on dirty surfaces, so cleaning always comes first.</p>
<p>The FSA advises businesses to clean and disinfect work surfaces, chopping boards and equipment before starting food preparation and after they have been used for raw food. Follow the manufacturer’s instructions for any chemical, including dilution and contact time.</p>
<p>Cloths deserve special attention. A damp cloth used all day can spread bacteria across every surface it touches. Use disposable cloths for raw-food areas, or wash and dry reusable cloths frequently at a high temperature.</p>
<blockquote><p><strong>Common kitchen mistakes:</strong></p><ul><li>Using one board for everything and only rinsing it with cold water.</li><li>Wiping hands on an apron or a cloth instead of washing them after handling raw meat.</li><li>Tasting with a spoon and putting it back in the pot.</li><li>Placing cooked food on the plate or tray that held it raw.</li><li>Spraying disinfectant onto a dirty surface and wiping it straight off.</li></ul></blockquote>

<h2>A daily routine for small kitchens</h2>
<ol>
<li>Before work: wash hands, put on a clean apron, and clean and disinfect the work surfaces.</li>
<li>Check the refrigerator: raw food covered and below ready-to-eat food.</li>
<li>Prepare ready-to-eat items first, then raw items, using separate boards and knives.</li>
<li>Wash hands every time you move from raw food to anything else.</li>
<li>Clean and disinfect boards, knives and surfaces after raw food.</li>
<li>Replace or wash cloths regularly through the day.</li>
<li>At the end of the day, clean the whole area and leave equipment to dry.</li>
</ol>
<blockquote><p><strong>Practical kitchen lesson:</strong> Walk through your kitchen and follow the path of one raw chicken from delivery to the plate. At each point — storage, preparation, cooking, serving — ask: what else could this chicken, its juices or the hands that touched it reach? Each answer is a place where your routine needs a barrier.</p></blockquote>
${chefPeterTip('a simple separation habit you train kitchen teams to follow')}
<p>[EDITOR: if the article is to mention Ugandan food hygiene requirements, add them only with a reference to the relevant Ugandan authority; otherwise delete this note.]</p>

<h2>In summary</h2>
<p>Cross-contamination is prevented by a few habits repeated every day: keep raw and ready-to-eat food apart, wash hands often, clean before you disinfect, and give raw food its own boards, utensils and storage space. For hospitality businesses that want to build these routines into their operations and staff training, see Chef Peter’s <a href="/hospitality-consultancy">hospitality consultancy</a> services.</p>

<h2>References</h2>
<ul>
<li>World Health Organization (2006). <em>Five Keys to Safer Food Manual</em>. Geneva: WHO. <a href="https://www.who.int/publications/i/item/9789241594639" rel="noopener">who.int</a></li>
<li>FAO &amp; WHO (2023). <em>General Principles of Food Hygiene</em>, CXC 1-1969 (Rev. 2022). Codex Alimentarius. <a href="https://doi.org/10.4060/cc6125en" rel="noopener">doi.org/10.4060/cc6125en</a></li>
<li>Food Standards Agency (UK). <em>Avoiding cross-contamination in your food business</em>. <a href="https://www.food.gov.uk/business-guidance/avoiding-cross-contamination-in-your-food-business" rel="noopener">food.gov.uk</a></li>
</ul>
<p>[PHOTO: add a featured image — colour-coded chopping boards in a rack. Add alt text in the Media library.]</p>
`,

  // ────────────────────────────────────────────────────────────────────────────
  'how-yeast-works-in-bread': `
<p>Flour, water and salt make a flat, dense dough. Add a small amount of yeast, wait, and the same dough becomes light, springy and full of flavour. Understanding why helps you control your bread instead of hoping it rises.</p>

<h2>What yeast is</h2>
<p>Baker’s yeast is a living, single-celled fungus, <em>Saccharomyces cerevisiae</em>. Each gram of yeast contains billions of cells. When they have moisture, food and a comfortable temperature, they become active and begin to ferment.</p>

<h2>What happens during fermentation</h2>
<p>Flour contains starch. Enzymes naturally present in flour break some of that starch down into simple sugars, which the yeast feeds on. As it feeds, yeast produces mainly two things:</p>
<ul>
<li><strong>Carbon dioxide gas</strong>, which forms bubbles in the dough. The stretchy gluten network — formed when flour proteins are mixed with water and kneaded — traps these bubbles, and the dough rises.</li>
<li><strong>Alcohol and flavour compounds</strong>, which give bread its characteristic aroma. Most of the alcohol evaporates during baking.</li>
</ul>
<p>In the oven, the gas bubbles expand with the heat and the dough rises one last time — bakers call this <em>oven spring</em> — before the heat kills the yeast and the crumb sets.</p>
<blockquote><p><strong>What professional chefs should know:</strong> Yeast makes the gas, but gluten holds it. A well-fermented dough made from weak or under-developed dough will still bake flat, because the gas escapes. Fermentation and dough development must work together.</p></blockquote>

<h2>Temperature: the baker’s main control</h2>
<p>Yeast is sensitive to temperature. In a cold dough it works slowly; in a warm dough it works quickly. When it becomes too hot, it is damaged and eventually killed — which is why recipes warn against dissolving yeast in very hot water.</p>
<p>Professional bakers therefore aim for a particular <em>dough temperature</em> rather than a fixed rising time. Many bread recipes target a dough temperature in the mid-20s °C. [EDITOR: confirm the target dough temperature range and the temperature at which yeast is killed against Cauvain (2015) or Figoni (2011), and give figures here.]</p>
<p>In a warm Ugandan kitchen, dough can rise much faster than a recipe written for a cooler climate suggests. Watch the dough, not the clock.</p>
<blockquote><p><strong>In the Ugandan kitchen:</strong> On a hot afternoon, use cool water to mix the dough and keep it out of direct sun. On a cool morning, or at higher altitude, the rise may be slower — give it more time rather than adding more yeast.</p></blockquote>

<h2>Sugar, salt and yeast</h2>
<p><strong>Sugar:</strong> a little sugar is readily used by yeast. Large amounts — as in sweet buns and brioche — draw water away from the yeast cells and slow fermentation. That is why rich doughs often rise more slowly and some bakers use special yeast for sweet doughs.</p>
<p><strong>Salt:</strong> salt slows fermentation and strengthens gluten. It also gives bread its flavour; bread without salt tastes flat. Weigh salt accurately, because too much will hold the rise back noticeably.</p>
<p><strong>Fat:</strong> butter, oil and milk tenderise the crumb and can also slow the rise slightly.</p>

<h2>Fresh, active dry and instant yeast</h2>
<ul><li><p><strong>Fresh (compressed) yeast</strong></p><p>What it is: Moist block of live yeast; must be kept refrigerated and used within a short time.</p><p>How to use it: Crumble into the flour or dissolve in some of the recipe’s water.</p></li><li><p><strong>Active dry yeast</strong></p><p>What it is: Dried granules with a protective outer layer.</p><p>How to use it: Usually dissolved in lukewarm water before mixing (check the packet).</p></li><li><p><strong>Instant (fast-action) yeast</strong></p><p>What it is: Finer dried granules that activate quickly.</p><p>How to use it: Mixed directly into the flour.</p></li></ul>
<p>The three types can replace one another, but not gram for gram, because dried yeast is more concentrated. [EDITOR: add a conversion guide checked against the cited sources and the packet instructions of brands sold in Uganda.]</p>
<p>Store dried yeast sealed in a cool, dry place and use it before the date on the packet. Once opened, keep it airtight and refrigerated.</p>

<h2>Why bread fails to rise</h2>
<ul>
<li><strong>The yeast is old or was killed</strong> by very hot water. Test it: dissolve a little in lukewarm water with a pinch of sugar. If it does not foam within about ten minutes, replace it.</li>
<li><strong>The dough is too cold</strong>, so fermentation is very slow.</li>
<li><strong>Too much salt</strong>, or salt and sugar measured incorrectly.</li>
<li><strong>The dough was not developed enough</strong> to hold the gas.</li>
<li><strong>It over-proved</strong>: left too long, the dough rises and then collapses, and the bread bakes flat with a sour smell.</li>
</ul>
<blockquote><p><strong>Practical kitchen lesson:</strong> Make one batch of simple bread dough and divide it in two. Leave one half at room temperature and put the other in the refrigerator. Compare them after one hour and after several hours. You will see temperature control fermentation more clearly than any explanation can show.</p></blockquote>
${chefPeterTip('judging when dough is ready in a hot kitchen')}

<h2>In summary</h2>
<p>Yeast feeds on sugars in the dough and produces gas and flavour. Temperature controls how fast this happens; sugar and salt slow it; and a well-developed dough holds the gas. Learn to read your dough and you will have reliable bread in any climate.</p>
<p>For practical bread and commercial baking training, see Chef Peter’s <a href="/baking-pastry-classes">baking and pastry classes</a>, or his book <a href="/culinary-books#secrets-of-a-successful-baker"><em>Secrets of a Successful Baker</em></a>.</p>

<h2>References</h2>
<ul>
<li>Cauvain, S. P. (2015). <em>Technology of Breadmaking</em> (3rd ed.). Cham: Springer.</li>
<li>Figoni, P. (2011). <em>How Baking Works</em> (3rd ed.). Hoboken, NJ: Wiley.</li>
<li>McGee, H. (2004). <em>On Food and Cooking</em> (revised ed.). New York: Scribner.</li>
</ul>
<p>[PHOTO: add a featured image — fresh, active dry and instant yeast side by side, labelled. Add alt text in the Media library.]</p>
`,

  // ────────────────────────────────────────────────────────────────────────────
  'why-cakes-fail': `
<p>A cake that sinks in the middle or comes out heavy is disappointing, especially when it was made for a celebration. The good news is that cake problems almost always have a clear cause — and once you know the cause, the fix is usually simple.</p>
<p>This guide goes through the most common faults, why they happen and what to change next time.</p>

<h2>Start with the recipe and the measurements</h2>
<p>Baking is closer to chemistry than most cooking. Flour, sugar, fat, eggs and raising agents must be in balance. Small changes that would not matter in a stew can ruin a cake.</p>
<ul>
<li><strong>Weigh, don’t scoop.</strong> A cup of flour can vary a great deal in weight depending on how it is filled. Digital scales are the single best investment for a baker.</li>
<li><strong>Measure raising agents exactly</strong> with proper measuring spoons, levelled.</li>
<li><strong>Use ingredients at the temperature the recipe asks for.</strong> Most butter cakes expect softened butter and room-temperature eggs.</li>
</ul>
<blockquote><p><strong>What professional chefs should know:</strong> Professional bakeries work from tested formulas, usually by weight, and change one thing at a time when a product goes wrong. Keep notes of what you changed — otherwise you cannot tell what fixed the problem.</p></blockquote>

<h2>Why cakes sink in the middle</h2>
<ul>
<li><strong>Underbaked:</strong> the centre had not set when the cake left the oven. Test with a skewer in the centre; it should come out clean or with a few dry crumbs.</li>
<li><strong>The oven door was opened too early:</strong> cool air enters before the structure has set.</li>
<li><strong>Too much raising agent:</strong> the batter rises too fast, the bubbles become too large, and the structure collapses.</li>
<li><strong>Oven too cool:</strong> the cake rises slowly and sets too late.</li>
<li><strong>Too much sugar or fat</strong> for the amount of flour and eggs, weakening the structure.</li>
</ul>

<h2>Why cakes are dense or heavy</h2>
<ul>
<li><strong>Under-creamed butter and sugar:</strong> creaming beats in the tiny air cells that raising agents later enlarge. Cream until light in colour and fluffy.</li>
<li><strong>Curdled batter:</strong> cold eggs added too quickly to creamed butter can split the mixture, which then holds less air.</li>
<li><strong>Over-mixing after adding flour:</strong> mixing develops gluten and knocks out air. Fold flour in just until it disappears.</li>
<li><strong>Old or missing raising agent.</strong> Baking powder loses strength over time, especially in humid conditions.</li>
</ul>

<h2>Why cakes are dry</h2>
<ul>
<li><strong>Overbaked:</strong> even a few extra minutes can dry a sponge.</li>
<li><strong>Too much flour</strong>, often from measuring by cup.</li>
<li><strong>Not enough fat or sugar</strong> — both help keep cakes moist and tender.</li>
<li><strong>Stored uncovered</strong> after cooling.</li>
</ul>

<h2>Why cakes crack or dome</h2>
<p>A high dome with a crack usually means the outside set before the centre had finished rising. Common causes are an oven that is too hot, a tin that is too small or deep for the amount of batter, or placing the tin too high in the oven.</p>
<blockquote><p><strong>Common kitchen mistakes:</strong></p><ul><li>Trusting the oven dial without checking the temperature with an oven thermometer.</li><li>Changing tin size without adjusting baking time.</li><li>Replacing ingredients — butter with oil, or cake flour with bread flour — without understanding what each one does.</li><li>Opening the oven repeatedly to check.</li><li>Cutting a cake while it is still hot, so it tears and looks undercooked.</li></ul></blockquote>
${chefPeterTip('checking and adjusting for ovens that run hot or cold')}

<h2>Quick troubleshooting guide</h2>
<ul><li><p><strong>Sinks in the middle</strong></p><p>Most likely causes: Underbaked; door opened early; too much raising agent.</p><p>What to try next time: Bake until the skewer comes out clean; keep the door closed for the first two-thirds of baking; measure raising agent exactly.</p></li><li><p><strong>Dense and heavy</strong></p><p>Most likely causes: Under-creamed; curdled batter; over-mixed.</p><p>What to try next time: Cream longer; add eggs gradually at room temperature; fold flour in gently.</p></li><li><p><strong>Dry and crumbly</strong></p><p>Most likely causes: Overbaked; too much flour.</p><p>What to try next time: Check earlier; weigh the flour.</p></li><li><p><strong>Domed and cracked</strong></p><p>Most likely causes: Oven too hot; tin too small.</p><p>What to try next time: Check oven temperature; use the tin size in the recipe.</p></li><li><p><strong>Sticky, gummy layer</strong></p><p>Most likely causes: Underbaked; too much liquid or sugar.</p><p>What to try next time: Bake longer at the correct temperature; check measurements.</p></li></ul>
<blockquote><p><strong>Practical kitchen lesson:</strong> Place an oven thermometer in the centre of your oven, set the dial to 180 °C and wait 20 minutes. Note the actual temperature. Many ovens differ noticeably from their dial — knowing yours will fix more cakes than any recipe change.</p></blockquote>

<h2>In summary</h2>
<p>Most cake failures come from measurement, mixing or oven temperature. Weigh your ingredients, cream and fold with care, know your oven’s real temperature and bake until the centre is set. Change one thing at a time and keep notes.</p>
<p>For hands-on cake and pastry training, see Chef Peter’s <a href="/baking-pastry-classes">baking and pastry classes</a>, and his book <a href="/culinary-books#secrets-of-a-successful-baker"><em>Secrets of a Successful Baker</em></a>.</p>

<h2>References</h2>
<ul>
<li>Figoni, P. (2011). <em>How Baking Works</em> (3rd ed.). Hoboken, NJ: Wiley.</li>
<li>Gisslen, W. <em>Professional Baking</em>. Hoboken, NJ: Wiley.</li>
<li>McGee, H. (2004). <em>On Food and Cooking</em> (revised ed.). New York: Scribner.</li>
</ul>
<p>[PHOTO: add a featured image — a sunken cake cut in half beside a well-risen cake. Add alt text in the Media library.]</p>
`,
};
