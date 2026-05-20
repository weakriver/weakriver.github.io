/* global React, ReactDOM */
const { useState, useRef, useEffect } = React;

// ─── DATA ───────────────────────────────────────────────────────
const westPhilosophers = [
  { name: "苏格拉底", nameEn: "Socrates", year: -470, death: -399, era: "古希腊", color: "#C4956A", ideas: "「我只知道我一无所知。」苏格拉底不写书，只用对话追问真理。他开创了「苏格拉底诘问法」——通过不断提问，揭露对方思想中的矛盾，引导人走向自我认知。他认为美德即知识，人作恶是因为无知，而「认识你自己」是哲学的起点。", work: "《申辩篇》（柏拉图记录）", workDesc: "苏格拉底在雅典法庭上为自己辩护的记录，展现了他对真理的不妥协与面对死亡的坦然。" },
  { name: "柏拉图", nameEn: "Plato", year: -428, death: -348, era: "古希腊", color: "#7B9DB7", ideas: "世界分为「理念世界」和「现象世界」。我们看到的一切只是理念的影子（洞穴隐喻）。真正的实在是永恒不变的理念/形式。灵魂由理性、激情、欲望三部分组成，正义就是三者各安其位。哲学家应当成为统治者，因为只有他们能认识真理。", work: "《理想国》", workDesc: "探讨正义的本质，构想由哲学家治理的理想城邦，包含著名的「洞穴寓言」。" },
  { name: "亚里士多德", nameEn: "Aristotle", year: -384, death: -322, era: "古希腊", color: "#8B7355", ideas: "反对柏拉图的理念论，认为形式内在于事物本身。万物皆有「四因」：质料因、形式因、动力因、目的因。提出「中庸之道」——美德是两个极端之间的平衡。人是「政治的动物」，幸福（eudaimonia）在于依照理性过完善的生活。创立了形式逻辑学。", work: "《尼各马可伦理学》", workDesc: "系统探讨幸福、美德与中庸之道，是西方伦理学的奠基之作。" },
  { name: "伊壁鸠鲁", nameEn: "Epicurus", year: -341, death: -270, era: "古希腊", color: "#A0C4A0", ideas: "快乐是最高善，但不是放纵——而是「没有痛苦的宁静」（ataraxia）。通过节制欲望、友谊和理性思考达到幸福。死亡不必恐惧：「死亡与我们无关，因为当我们存在时，死亡还未来；当死亡来临时，我们已不在。」世界由原子构成，无需神的干预。", work: "《致美诺伊凯斯的信》", workDesc: "阐述伊壁鸠鲁的自然哲学、原子论和对死亡恐惧的解药。" },
  { name: "芝诺 / 斯多葛学派", nameEn: "Zeno / Stoicism", year: -334, death: -262, era: "古希腊", color: "#9B8EA0", ideas: "宇宙由理性（logos）支配，一切皆有因果。我们无法控制外在事件，但可以控制自己的反应——这就是自由。美德是唯一的善，外在财富、名誉皆无关紧要。「顺应自然而活」，接受命运，专注于自身能掌控之事。情绪来自错误判断，智者应保持内心平静。", work: "《沉思录》（马可·奥勒留）", workDesc: "罗马皇帝的私人日记，斯多葛哲学最动人的实践记录。" },
  { name: "奥古斯丁", nameEn: "Augustine", year: 354, death: 430, era: "中世纪", color: "#C4A06A", ideas: "人因原罪而堕落，唯有上帝的恩典能拯救灵魂。时间是灵魂的延展，不在外部世界。世界分「上帝之城」与「尘世之城」，历史是走向上帝的朝圣之旅。恶不是实体，而是善的缺乏。信仰先于理解：「我信，故我理解。」", work: "《忏悔录》", workDesc: "西方第一部自传体哲学作品，记录奥古斯丁从放荡到皈依的灵魂历程。" },
  { name: "托马斯·阿奎那", nameEn: "Thomas Aquinas", year: 1225, death: 1274, era: "中世纪", color: "#7A6B5D", ideas: "理性与信仰并不矛盾，而是互补。提出上帝存在的「五路证明」。将亚里士多德哲学与基督教神学融合。自然法则植根于上帝的永恒法——人类通过理性可以发现道德法则。灵魂是身体的形式，人是灵肉统一体。", work: "《神学大全》", workDesc: "中世纪最宏大的哲学-神学体系，试图以理性论证信仰的全部内容。" },
  { name: "笛卡尔", nameEn: "Descartes", year: 1596, death: 1650, era: "近代早期", color: "#5B8FA8", ideas: "「我思故我在」（Cogito ergo sum）——怀疑一切之后，唯一不可怀疑的是「我在怀疑」这件事本身。心灵与身体是两种不同的实体（心物二元论）。建立了以理性和数学为基础的哲学方法，要求从清晰明确的观念出发推导知识。", work: "《第一哲学沉思集》", workDesc: "通过系统怀疑重建知识大厦，奠定了近代理性主义哲学的基石。" },
  { name: "斯宾诺莎", nameEn: "Spinoza", year: 1632, death: 1677, era: "近代早期", color: "#6B8E6B", ideas: "上帝即自然（Deus sive Natura），整个宇宙是一个唯一的实体。自由意志是幻觉——一切事件都是必然的。人的解放在于用理性理解必然性，从而达到「对上帝的理智之爱」。情感可以通过理性认识来转化，最高的善是认知的喜悦。", work: "《伦理学》", workDesc: "以几何学方式（定义-公理-命题）构建的完整哲学体系，探讨上帝、心灵、情感与自由。" },
  { name: "休谟", nameEn: "David Hume", year: 1711, death: 1776, era: "启蒙时代", color: "#B07D62", ideas: "一切知识来自经验（经验主义）。因果关系不过是习惯性联想——我们从未真正「看见」因果。理性是激情的奴隶，道德基于情感而非理性。自我不过是一束不断变化的知觉。对宗教奇迹和上帝存在的证明提出了毁灭性批判。", work: "《人性论》", workDesc: "试图用实验方法研究人性，动摇了因果律、自我同一性和理性道德的传统观念。" },
  { name: "卢梭", nameEn: "Rousseau", year: 1712, death: 1778, era: "启蒙时代", color: "#7CAA7C", ideas: "「人生而自由，却无往不在枷锁之中。」文明使人堕落，自然状态中的人是善良的「高贵野蛮人」。私有制是不平等的根源。通过「社会契约」，人民将个人意志汇聚为「公意」，实现真正的自由。教育应顺应儿童天性，而非强制灌输。", work: "《社会契约论》", workDesc: "提出人民主权与公意理论，深刻影响了法国大革命和现代民主思想。" },
  { name: "康德", nameEn: "Immanuel Kant", year: 1724, death: 1804, era: "启蒙时代", color: "#8A7EB8", ideas: "人的认识不是被动接受，而是主动建构——心灵为经验提供时空和范畴的框架（哥白尼式革命）。道德的最高原则是「绝对命令」：只按你愿意它成为普遍法则的准则行事。人是目的，永远不能仅仅被当作手段。自由、上帝和灵魂不朽虽不可证明，但是道德实践的必要预设。", work: "《纯粹理性批判》", workDesc: "重新定义了人类认识的边界与结构，被认为是哲学史上最重要的著作之一。" },
  { name: "黑格尔", nameEn: "Hegel", year: 1770, death: 1831, era: "19世纪", color: "#6A6A8A", ideas: "现实是「绝对精神」自我展开的过程。一切发展遵循辩证法：正题→反题→合题。历史有方向——是自由意识的不断进步。真理是整体，孤立的事物不具有完全的实在性。存在即合理，合理即存在。哲学是「把握在思想中的时代」。", work: "《精神现象学》", workDesc: "追踪意识从最初的感性确定性到绝对知识的辩证发展历程。" },
  { name: "叔本华", nameEn: "Schopenhauer", year: 1788, death: 1860, era: "19世纪", color: "#7A5C5C", ideas: "世界的本质是盲目的「意志」——一种无目的、永不满足的冲动。人生本质上是痛苦的：欲望满足后是空虚，未满足则是痛苦。解脱之道有三：艺术审美（暂时忘我）、同情心（打破个体化幻象）、禁欲否定意志（彻底解脱）。深受佛教和印度哲学影响。", work: "《作为意志和表象的世界》", workDesc: "构建了以「意志」为核心的悲观主义哲学体系，影响了尼采、弗洛伊德和瓦格纳。" },
  { name: "克尔凯郭尔", nameEn: "Kierkegaard", year: 1813, death: 1855, era: "19世纪", color: "#A07B5B", ideas: "存在主义之父。反对黑格尔的抽象体系，强调个体的主观存在。人生有三个阶段：审美阶段（追求快感）→伦理阶段（承担责任）→宗教阶段（信仰的飞跃）。焦虑是自由的眩晕。真正的信仰需要「信仰的跳跃」——超越理性的抉择。", work: "《恐惧与颤栗》", workDesc: "通过亚伯拉罕献子的故事，探讨信仰、伦理与荒谬之间的张力。" },
  { name: "马克思", nameEn: "Karl Marx", year: 1818, death: 1883, era: "19世纪", color: "#B85C5C", ideas: "「哲学家们只是用不同的方式解释世界，问题在于改变世界。」历史是阶级斗争的历史。经济基础决定上层建筑。资本主义通过剥削工人的剩余价值运转，必然导致异化——人与劳动、产品和自身的疏离。无产阶级革命将终结阶级社会，实现共产主义。", work: "《资本论》", workDesc: "系统分析资本主义生产方式的运作逻辑、内在矛盾与历史趋势。" },
  { name: "尼采", nameEn: "Nietzsche", year: 1844, death: 1900, era: "19世纪", color: "#C45C5C", ideas: "「上帝死了」——传统道德和宗教失去了根基。主奴道德：强者创造价值，弱者以怨恨制造「善恶」。「超人」（Übermensch）是超越旧道德、自我创造价值的人。永恒回归：如果你的人生要无限重复，你能欣然接受吗？对生命说「是」——即使在苦难之中。", work: "《查拉图斯特拉如是说》", workDesc: "以诗化散文宣告超人理想、永恒回归和对生命的肯定，尼采最具文学性的哲学作品。" },
  { name: "海德格尔", nameEn: "Heidegger", year: 1889, death: 1976, era: "20世纪", color: "#5C7A8A", ideas: "哲学最根本的问题是「存在的意义」。人是「此在」（Dasein）——被「抛入」世界的存在者。日常生活中我们沉沦于「常人」的庸碌中，只有面对死亡（向死而生），才能唤醒本真的存在。技术时代的危险在于把一切存在者都变成可利用的「持存物」。", work: "《存在与时间》", workDesc: "重新追问存在的意义，从此在的时间性出发展开存在论分析，是20世纪最重要的哲学著作之一。" },
  { name: "维特根斯坦", nameEn: "Wittgenstein", year: 1889, death: 1951, era: "20世纪", color: "#6B9A7B", ideas: "前期：语言是世界的逻辑图像，「凡是不能说的，就应当沉默。」后期：语言没有固定本质，意义来自使用——「语言游戏」。哲学问题是语言的误用造成的困惑。哲学的任务不是建构理论，而是治疗：让苍蝇找到飞出瓶子的路。", work: "《哲学研究》", workDesc: "推翻自己早期理论，提出语言游戏、家族相似性等概念，重塑了20世纪语言哲学。" },
  { name: "萨特", nameEn: "Sartre", year: 1905, death: 1980, era: "20世纪", color: "#8A6A9A", ideas: "「存在先于本质」——人没有预定的本质，你的选择定义了你是谁。人被「判处自由」：你不能不选择，即使不选也是一种选择。「他人即地狱」——他人的注视使我物化。自欺（bad faith）是逃避自由与责任的自我欺骗。人必须在荒诞中创造意义。", work: "《存在与虚无》", workDesc: "存在主义的哲学巨著，系统论述自由、意识、他者与人的存在处境。" },
  { name: "加缪", nameEn: "Camus", year: 1913, death: 1960, era: "20世纪", color: "#B89A6A", ideas: "人生是荒诞的——我们渴望意义，但宇宙沉默不语。面对荒诞有三种态度：自杀（拒绝）、信仰飞跃（逃避）、反抗（直面）。西西弗斯推石上山，石头永远滚落——但「我们必须想象西西弗斯是幸福的」。在荒诞中反抗、创造、活着，就是意义本身。", work: "《西西弗斯神话》", workDesc: "从「自杀是否值得」这个问题出发，探讨荒诞与人如何在无意义中活出尊严。" },
];
 
const westEras = [
  { name: "古希腊", color: "#C4956A" },
  { name: "中世纪", color: "#C4A06A" },
  { name: "近代早期", color: "#5B8FA8" },
  { name: "启蒙时代", color: "#8A7EB8" },
  { name: "19世纪", color: "#C45C5C" },
  { name: "20世纪", color: "#6B9A7B" },
];
 
const eastPhilosophers = [
  { name: "释迦牟尼", nameEn: "Siddhartha Gautama", year: -563, death: -483, era: "古印度", color: "#D4A76A", ideas: "人生有「四谛」：苦谛（生命充满苦）、集谛（苦因是贪爱与执着）、灭谛（苦可以终结）、道谛（八正道是解脱之路）。世间万物皆「无常」「无我」，一切现象因缘和合而生，没有永恒不变的自我。通过戒、定、慧的修行，断除无明与渴爱，超越生死轮回，达到涅槃——苦的彻底止息。「中道」避免苦行与纵欲两个极端。", work: "《法句经》（Dhammapada）", workDesc: "佛陀核心教诲的诗偈集，涵盖心念、因果、无常与解脱之道，是最广泛传诵的佛教经典之一。" },
  { name: "帕坦伽利", nameEn: "Patanjali", year: -200, death: -100, era: "古印度", color: "#A8B878", ideas: "瑜伽是「心念波动的止息」（citta vrtti nirodha）。人的痛苦来自无明、我执、贪爱、嗔恨和恐惧（五种烦恼）。通过瑜伽八支——持戒、精进、体式、调息、制感、专注、禅定、三摩地——逐步净化身心，最终实现纯粹意识（purusha）与物质（prakriti）的分离，获得解脱。", work: "《瑜伽经》（Yoga Sutras）", workDesc: "系统整理瑜伽哲学与修行方法的经典，以196条简洁箴言构成，是印度六大正统哲学派别之一的根本典籍。" },
  { name: "龙树", nameEn: "Nāgārjuna", year: 150, death: 250, era: "古印度", color: "#7BA8A8", ideas: "一切事物皆「空」（śūnyatā）——不是说什么都不存在，而是没有任何事物拥有独立、固有的本质。万物都依赖条件而存在（缘起）。空与缘起是同一回事。正因为空，变化才可能，解脱才可能。执着于「有」或「无」都是偏见——中观之道超越一切二元对立。", work: "《中论》（Mūlamadhyamakakārikā）", workDesc: "大乘佛教中观学派的奠基之作，以严密的逻辑论证「空」与「缘起」的统一。" },
  { name: "商羯罗", nameEn: "Ādi Śaṅkara", year: 788, death: 820, era: "古印度", color: "#C49A6A", ideas: "唯一真实的是「梵」（Brahman）——无形、无限、纯粹的意识。个体灵魂（Atman）与梵本是一体：「梵我合一」（Tat Tvam Asi——你就是那个）。我们看到的多样世界是「幻」（Māyā）——不是不存在，而是非究竟的实在。无明使我们误认分离，觉悟即是认识到自我从未与梵分离。", work: "《梵经注》（Brahma Sutra Bhashya）", workDesc: "对《梵经》的权威注释，系统阐述不二论吠檀多哲学，论证现象世界的虚幻与梵的唯一实在。" },
  { name: "周文王 + 周公旦", nameEn: "King Wen + Duke of Zhou", year: -1100, death: -1032, era: "上古经典", color: "#B8956A", ideas: "《周易》以六十四卦象征天地万物的变化法则。核心思想是「变易」——唯一不变的就是变化本身。阴阳互根、刚柔相推，万物在对立中运动转化。「一阴一阳之谓道」，宇宙是阴阳交感、生生不息的动态过程。「天行健，君子以自强不息；地势坤，君子以厚德载物」——人应效法天地之德。吉凶悔吝皆由人心与时势互动而生，善易者不卜，而是洞察变化规律，见微知著，顺时而动。", work: "《周易》（易经）", workDesc: "中国最古老的经典之一，以卦象与爻辞构成的符号系统，是儒道共尊的「群经之首」，涵盖宇宙观、伦理观与决策智慧。" },
  { name: "老子", nameEn: "Laozi", year: -571, death: -471, era: "先秦诸子", color: "#8AAA8A", ideas: "「道」是万物的根源和法则，无形无名，先天地而生。「道法自然」——道的本性就是自然而然。「无为而无不为」——不是什么都不做，而是不强行干预，顺应万物的本性。柔弱胜刚强，「上善若水」。反对过度的礼法和欲望，主张复归朴素。对立统一：有无相生，难易相成。", work: "《道德经》", workDesc: "仅五千余字，却是道家哲学的根本经典，论「道」之体与「德」之用，是中国文化最具影响力的著作之一。" },
  { name: "庄子", nameEn: "Zhuangzi", year: -369, death: -286, era: "先秦诸子", color: "#6A9A8A", ideas: "「逍遥游」——精神的绝对自由，不被任何外在标准束缚。万物齐一（「齐物论」）：是非、美丑、生死都是相对的，从道的高度看没有本质区别。「庄周梦蝶」——你怎么知道是你在做梦，还是蝴蝶在做梦？「无用之用」——无用之物往往得以保全自身。语言无法穷尽真理：「得意忘言」。", work: "《庄子》（南华经）", workDesc: "以寓言、故事和奇幻想象展开的哲学杰作，文学性与哲思融为一体，道家思想的巅峰之作。" },
  { name: "孔子", nameEn: "Confucius", year: -551, death: -479, era: "先秦诸子", color: "#C47A5C", ideas: "「仁」是核心——爱人、忠恕之道（己所不欲，勿施于人）。人通过修身、齐家、治国、平天下，实现社会和谐。「礼」是文明秩序的基础，规范人伦关系（君臣、父子、夫妻、兄弟、朋友）。「君子」是理想人格——不仅有知识，更有品德。学而不厌，诲人不倦。", work: "《论语》", workDesc: "孔子及弟子的言行录，以简洁对话呈现仁、礼、学、治的思想，是儒学第一经典。" },
  { name: "孟子", nameEn: "Mencius", year: -372, death: -289, era: "先秦诸子", color: "#B8786A", ideas: "「人性本善」——人天生有四种善端：恻隐之心（仁）、羞恶之心（义）、辞让之心（礼）、是非之心（智）。如同水往低处流，人性自然向善，恶是后天环境造成的。「民为贵，社稷次之，君为轻」——民本思想。暴政失去天命，人民有权推翻。", work: "《孟子》", workDesc: "记录孟子与诸侯、弟子的对话，系统论述性善论和仁政思想，是儒家「四书」之一。" },
  { name: "荀子", nameEn: "Xunzi", year: -310, death: -235, era: "先秦诸子", color: "#8A7A6A", ideas: "「人之性恶，其善者伪也」——人天性好利、嫉妒、贪欲，善是后天礼义教化的结果（「伪」即人为）。因此「礼」至关重要——礼是圣人制定来规范人性、维持社会秩序的。重视学习和积累：「不积跬步，无以至千里」。「天行有常」——自然有其规律，人应该「制天命而用之」。", work: "《荀子》", workDesc: "先秦最系统的哲学著作之一，论述性恶论、礼制论和天人关系，综合儒法思想。" },
  { name: "墨子", nameEn: "Mozi", year: -470, death: -391, era: "先秦诸子", color: "#7A8A9A", ideas: "「兼爱」——爱无差等，对所有人一视同仁（反对儒家以亲疏分等的仁爱）。「非攻」——反对侵略战争。一切思想和行为要看实际效果（「三表法」）。「尚贤」——任人唯贤，不论出身。「节用」「节葬」——反对铺张浪费。注重逻辑推理和科学实验。", work: "《墨子》", workDesc: "墨家学派的思想总集，涵盖兼爱非攻的伦理观、逻辑学（墨辩）和防御工程技术。" },
  { name: "韩非子", nameEn: "Han Feizi", year: -280, death: -233, era: "先秦诸子", color: "#9A6A6A", ideas: "人性自利，不可寄望于道德感化——必须靠「法」（法律制度）、「术」（驾驭臣下的权术）、「势」（权力地位）三者结合来治国。法要公开、统一、严格执行，「法不阿贵」。时代在变，治理方法也要变——「世异则事异，事异则备变」。反对儒家的复古，主张面对现实的务实治理。", work: "《韩非子》", workDesc: "法家思想的集大成之作，以冷峻犀利的笔法论述法、术、势的统治之道。" },
  { name: "慧能", nameEn: "Huineng", year: 638, death: 713, era: "汉唐", color: "#7A9A7A", ideas: "「菩提本无树，明镜亦非台，本来无一物，何处惹尘埃。」佛性人人本具，不假外求。顿悟成佛——觉悟不是渐修积累，而是刹那间直见本心。不执着于文字经典（「不立文字，直指人心」）。烦恼即菩提，世俗生活中即可修行。开创了禅宗南宗。", work: "《六祖坛经》", workDesc: "中国佛教唯一被称为「经」的祖师著作，记录慧能的顿悟禅法与核心开示。" },
  { name: "朱熹", nameEn: "Zhu Xi", year: 1130, death: 1200, era: "宋明", color: "#8A7A5A", ideas: "万物皆有「理」（本质规律）和「气」（物质载体）。理先于气，是宇宙的根本法则。「格物致知」——通过逐一考察事物的道理来获取知识，积累到一定程度就能豁然贯通。人性本善（天命之性），但气质之性有清浊之分，需要通过读书、修养来「存天理、灭人欲」。", work: "《四书章句集注》", workDesc: "对《论语》《孟子》《大学》《中庸》的注释，成为此后七百年科举考试的标准教材。" },
  { name: "道元禅师", nameEn: "Dōgen", year: 1200, death: 1253, era: "汉唐", color: "#6A8A9A", ideas: "修行与证悟不是因果关系——「修证一如」，坐禅本身就是开悟，不是为了达到某个目标。「只管打坐」（只管端坐，放下一切目的）。存在即时间（「有时」），时间不是从外部流过我们，我们的存在就是时间的展开。日常生活的每一刻——做饭、洗碗、行走——都是修行。", work: "《正法眼藏》", workDesc: "日本哲学史上最深邃的著作，以日语写就，探讨存在、时间、修证与佛性的关系。" },
  { name: "王阳明", nameEn: "Wang Yangming", year: 1472, death: 1529, era: "宋明", color: "#AA7A5A", ideas: "「心即理」——道理不在外部事物中，而在自己心中。反对朱熹的「格物」论，主张直接体认内心的「良知」。「致良知」——将本心固有的道德直觉发挥到极致。「知行合一」——真正的知必然包含行，知而不行只是未知。在事上磨练才能真正修心。", work: "《传习录》", workDesc: "王阳明与弟子的问答及书信集，是心学的核心文献，论「致良知」与「知行合一」。" },
  { name: "袁了凡", nameEn: "Yuan Liaofan", year: 1533, death: 1606, era: "宋明", color: "#9A8A5A", ideas: "命运并非注定不变——人可以通过「改过」「积善」「谦德」来改造命运。早年被算命先生精准预言一生，后遇云谷禅师，领悟命由我作、福自己求。将儒家修身、佛教因果、道家感应融为一体：断恶修善不是空谈，而是日日记录、逐条反省的实修功夫。「从前种种，譬如昨日死；从后种种，譬如今日生。」", work: "《了凡四训》", workDesc: "袁了凡写给儿子的家训四篇——立命之学、改过之法、积善之方、谦德之效，是中国善书文化中流传最广的经典。" },
  { name: "泰戈尔", nameEn: "Rabindranath Tagore", year: 1861, death: 1941, era: "近现代", color: "#C4956A", ideas: "神不在庙堂中，而在劳动者流汗的田野里。个体灵魂与宇宙灵魂的合一是最高的喜悦——不是弃世苦修，而是在爱与美中实现。东西方文明应对话而非对抗。教育要解放心灵，而非制造工具。生命的意义在于创造——像河流不断奔涌。", work: "《吉檀迦利》（Gitanjali）", workDesc: "献给神的颂歌，以诗的形式表达对生命、自然与神性的冥想与热爱，获诺贝尔文学奖。" },
  { name: "甘地", nameEn: "Mahatma Gandhi", year: 1869, death: 1948, era: "近现代", color: "#8AAA6A", ideas: "「非暴力」（Ahimsa）不是软弱，而是最强大的力量——用灵魂的力量感化压迫者。「真理之力」（Satyagraha）——坚持真理即坚持正义，不合作运动是对不公的积极抵抗。手段与目的不可分割：暴力的手段不可能带来和平的结果。「以眼还眼，世界只会更盲目。」", work: "《我体验真理的故事》", workDesc: "甘地自传，坦诚记录他从平凡少年到非暴力运动领袖的精神探索历程。" },
  { name: "西田几多郎", nameEn: "Nishida Kitarō", year: 1870, death: 1945, era: "近现代", color: "#7A7AAA", ideas: "「纯粹经验」——在主客未分之前的直接体验才是最根本的实在（比如听音乐时忘记自我的那一刻）。「绝对无」——终极实在不是某个「有」，而是「无」——一个让一切存在得以显现的场域。「场所逻辑」——取代西方的主体逻辑，用「场所」来理解自我与世界的关系。", work: "《善的研究》", workDesc: "日本近代哲学的开山之作，从「纯粹经验」出发融合禅宗体验与西方哲学体系。" },
  { name: "铃木大拙", nameEn: "D.T. Suzuki", year: 1870, death: 1966, era: "近现代", color: "#6A8A6A", ideas: "禅不是理论，而是体验——「直指人心，见性成佛」。禅的核心是「悟」（Satori），一种突破日常意识的直觉体验。逻辑和语言无法把握实在的全貌，公案和坐禅打破概念思维的牢笼。禅不离日常——喝茶、扫地、射箭中都有禅。将东方禅学介绍给西方世界。", work: "《禅与日本文化》", workDesc: "阐述禅如何渗透日本的武士道、茶道、花道、绘画与诗歌，是西方了解禅文化的经典入门。" },
];
 
const eastEras = [
  { name: "古印度", color: "#D4A76A" },
  { name: "上古经典", color: "#B8956A" },
  { name: "先秦诸子", color: "#8AAA8A" },
  { name: "汉唐", color: "#7A9A7A" },
  { name: "宋明", color: "#AA7A5A" },
  { name: "近现代", color: "#7A7AAA" },
];

// ─── SHARED DETAIL CARD ─────────────────────────────────────────
function DetailCard({ ph, onClose, theme }) {
  const dark = theme === "dark";
  return (
    <div style={{
      animation: "cardIn 0.45s cubic-bezier(0.4,0,0.2,1)",
      margin: "12px 0 6px",
      padding: "clamp(16px,3vw,28px)",
      background: dark
        ? "linear-gradient(135deg, rgba(26,22,16,0.96), rgba(30,25,18,0.98))"
        : "linear-gradient(145deg, #FBF7F0, #F0EBE0)",
      border: dark ? `1px solid ${ph.color}40` : "none",
      borderLeft: dark ? undefined : `3px solid ${ph.color}`,
      borderRadius: dark ? 14 : "0 12px 12px 0",
      boxShadow: dark
        ? `0 6px 30px rgba(0,0,0,0.4), inset 0 1px 0 ${ph.color}15`
        : "0 4px 24px rgba(80,60,30,0.08)",
      position: "relative",
    }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <h3 style={{
            fontSize: "clamp(18px,3.5vw,24px)",
            fontWeight: 800,
            color: dark ? ph.color : "#3A3025",
            lineHeight: 1.2,
            margin: 0,
          }}>{ph.name}</h3>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 13,
            color: dark ? "#8A7B68" : "#A09080",
            fontStyle: "italic",
            marginTop: 2,
          }}>
            {ph.nameEn} · {ph.year < 0 ? `${Math.abs(ph.year)}` : ph.year}–{ph.death < 0 ? `${Math.abs(ph.death)} BC` : `${ph.death}`}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: dark ? "#8A7B68" : "#B8A890", fontSize: 16,
          width: 28, height: 28, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "sans-serif",
          transition: "all 0.2s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(107,93,74,0.15)" : "rgba(107,93,74,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >✕</button>
      </div>

      {/* divider */}
      <div style={{
        height: 1,
        background: dark
          ? `linear-gradient(90deg, ${ph.color}50, transparent)`
          : `linear-gradient(90deg, ${ph.color}40, transparent)`,
        marginBottom: 16,
      }} />

      {/* ideas */}
      <div style={{ marginBottom: 4 }}>
        <div style={{
          fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase",
          fontFamily: "'Cormorant Garamond', serif",
          color: dark ? "#6B5D4A" : "#A09080",
          marginBottom: 10,
        }}>核心思想 · Core Ideas</div>
        <p style={{
          fontSize: "clamp(12.5px,2vw,14px)",
          lineHeight: 1.9,
          color: dark ? "#D4C8B4" : "#4A4035",
          margin: 0,
        }}>{ph.ideas}</p>
      </div>

      {/* work */}
      <div style={{
        marginTop: 16, padding: "14px 18px",
        background: dark ? "rgba(107,93,74,0.1)" : "rgba(107,93,74,0.06)",
        border: `1px solid ${dark ? "rgba(107,93,74,0.2)" : "rgba(107,93,74,0.12)"}`,
        borderRadius: 10,
      }}>
        <div style={{
          fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase",
          fontFamily: "'Cormorant Garamond', serif",
          color: dark ? "#6B5D4A" : "#A09080",
          marginBottom: 8,
        }}>代表著作 · Major Work</div>
        <div style={{
          fontSize: "clamp(14px,2.5vw,17px)", fontWeight: 700,
          color: ph.color, marginBottom: 6,
        }}>{ph.work}</div>
        <p style={{
          fontSize: "clamp(12px,2vw,13px)", lineHeight: 1.8,
          color: dark ? "#A89880" : "#7A6A58", margin: 0,
        }}>{ph.workDesc}</p>
      </div>
    </div>
  );
}

// ─── PANEL COMPONENT ────────────────────────────────────────────
function Panel({ philosophers, eras, theme, title, subtitle, quote }) {
  const [selected, setSelected] = useState(null);
  const detailRef = useRef(null);
  const dark = theme === "dark";

  useEffect(() => {
    if (selected && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected]);

  const cur = selected ? philosophers.find(p => p.nameEn === selected) : null;

  return (
    <div style={{
      background: dark
        ? "linear-gradient(180deg, #0D0D0D 0%, #1A1610 40%, #0D0D0D 100%)"
        : "#F5F0E8",
      color: dark ? "#E8DCC8" : "#2A2420",
      padding: "32px 16px 40px",
      minHeight: "100%",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 10, letterSpacing: 5,
          color: dark ? "#6B5D4A" : "#A09080",
          textTransform: "uppercase", marginBottom: 10,
        }}>{subtitle}</div>
        <h2 style={{
          fontSize: "clamp(22px,4vw,32px)",
          fontWeight: 900, lineHeight: 1.3, marginBottom: 8,
          background: dark ? "linear-gradient(135deg, #E8DCC8, #C4956A)" : "linear-gradient(135deg, #3A3025, #8B4513)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          margin: 0,
        }}>{title}</h2>
        <p style={{
          fontSize: 12, marginTop: 10,
          color: dark ? "#5A5040" : "#A09080",
        }}>点击姓名展开思想与著作</p>
      </div>

      {/* Eras + Philosophers */}
      {eras.map(era => {
        const ep = philosophers.filter(p => p.era === era.name);
        return (
          <div key={era.name} style={{ marginBottom: 20 }}>
            {/* Era label */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 10, padding: "0 4px",
            }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: era.color,
                letterSpacing: 1, whiteSpace: "nowrap",
              }}>{era.name}</span>
              <div style={{
                flex: 1, height: 1,
                background: `linear-gradient(90deg, ${era.color}50, transparent)`,
              }} />
            </div>

            {/* Philosopher buttons */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 6,
              padding: "0 4px",
            }}>
              {ep.map(ph => {
                const isActive = selected === ph.nameEn;
                return (
                  <button
                    key={ph.nameEn}
                    onClick={() => setSelected(isActive ? null : ph.nameEn)}
                    style={{
                      background: isActive
                        ? (dark ? `${ph.color}18` : `${ph.color}15`)
                        : "transparent",
                      border: `1.5px solid ${isActive ? ph.color : dark ? "#3A3228" : "#D0C8B8"}`,
                      borderRadius: 32,
                      padding: "6px 14px",
                      cursor: "pointer",
                      fontFamily: "'Noto Serif SC', serif",
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? ph.color : (dark ? "#C8B898" : "#5A5040"),
                      transition: "all 0.3s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = `${ph.color}88`;
                        e.currentTarget.style.color = dark ? "#E8DCC8" : "#3A3025";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = dark ? "#3A3228" : "#D0C8B8";
                        e.currentTarget.style.color = dark ? "#C8B898" : "#5A5040";
                        e.currentTarget.style.transform = "none";
                      }
                    }}
                  >
                    {ph.name}
                    <span style={{
                      fontSize: 10, marginLeft: 5, opacity: 0.5,
                      fontFamily: "'Cormorant Garamond', serif",
                    }}>
                      {ph.year < 0 ? `${Math.abs(ph.year)}BC` : ph.year}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Detail card (inline under its era) */}
            {cur && cur.era === era.name && (
              <div ref={detailRef}>
                <DetailCard ph={cur} onClose={() => setSelected(null)} theme={theme} />
              </div>
            )}
          </div>
        );
      })}

      {/* Footer quote */}
      <div style={{
        textAlign: "center", marginTop: 36, paddingTop: 20,
        borderTop: `1px solid ${dark ? "#2A241C" : "#D8D0C0"}`,
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 12, fontStyle: "italic",
          color: dark ? "#4A4030" : "#B8A890",
        }}>{quote}</p>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────
function PhilosophyDualTimeline() {
  const [tab, setTab] = useState("both"); // "west", "east", "both"
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 840);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const showBoth = !isMobile;

  return (
    <div style={{
      fontFamily: "'Noto Serif SC', 'Source Han Serif SC', Georgia, serif",
      minHeight: "100vh",
      background: "#111",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&family=Ma+Shan+Zheng&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(150,130,100,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(150,130,100,0.5); }
      `}</style>

      {/* Mobile tab switcher */}
      {isMobile && (
        <div style={{
          display: "flex",
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(17,17,17,0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #2A2420",
        }}>
          {[
            { key: "west", label: "西方哲学" },
            { key: "east", label: "东方思想" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                padding: "14px 0",
                background: "none",
                border: "none",
                borderBottom: tab === t.key ? "2px solid #C4956A" : "2px solid transparent",
                color: tab === t.key ? "#E8DCC8" : "#6B5D4A",
                fontFamily: "'Noto Serif SC', serif",
                fontSize: 15,
                fontWeight: tab === t.key ? 700 : 400,
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >{t.label}</button>
          ))}
        </div>
      )}

      {/* Desktop: side by side */}
      {showBoth ? (
        <div style={{ display: "flex", height: "100vh" }}>
          {/* West panel */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            borderRight: "1px solid #2A241C",
          }}>
            <Panel
              philosophers={westPhilosophers}
              eras={westEras}
              theme="dark"
              title="西"
              subtitle="Western Philosophy"
              quote={`"The unexamined life is not worth living." — Socrates`}
            />
          </div>

          {/* Divider accent */}
          <div style={{
            width: 1,
            background: "linear-gradient(180deg, transparent, #6B5D4A 20%, #6B5D4A 80%, transparent)",
            flexShrink: 0,
          }} />

          {/* East panel */}
          <div style={{
            flex: 1,
            overflowY: "auto",
          }}>
            <Panel
              philosophers={eastPhilosophers}
              eras={eastEras}
              theme="light"
              title="东"
              subtitle="Eastern Philosophy"
              quote={`"道可道，非常道。" — 老子`}
            />
          </div>
        </div>
      ) : (
        /* Mobile: tab content */
        <div>
          {tab === "west" && (
            <Panel
              philosophers={westPhilosophers}
              eras={westEras}
              theme="dark"
              title="西"
              subtitle="Western Philosophy"
              quote={`"The unexamined life is not worth living." — Socrates`}
            />
          )}
          {tab === "east" && (
            <Panel
              philosophers={eastPhilosophers}
              eras={eastEras}
              theme="light"
              title="东"
              subtitle="Eastern Philosophy"
              quote={`"道可道，非常道。" — 老子`}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Self-mount: scan [data-widget="east-west"] divs ---- */
function mountEastWest(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-widget="east-west"]').forEach((el) => {
    if (el.dataset.ewMounted) return;
    el.dataset.ewMounted = "1";
    ReactDOM.createRoot(el).render(React.createElement(PhilosophyDualTimeline));
  });
}

if (typeof window !== "undefined") {
  window.RuoshuiWidgets = window.RuoshuiWidgets || {};
  window.RuoshuiWidgets.eastWest = mountEastWest;
  // Babel-standalone transforms after DOMContentLoaded, so mount eagerly.
  mountEastWest();
}