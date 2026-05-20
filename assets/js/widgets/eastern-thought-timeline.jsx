/* global React, ReactDOM */
const { useState, useRef, useEffect } = React;

const philosophers = [
  // 古印度
  {
    name: "释迦牟尼", nameEn: "Siddhartha Gautama", year: -563, death: -483, era: "古印度",
    color: "#D4A76A",
    ideas: "人生有「四谛」：苦谛（生命充满苦）、集谛（苦因是贪爱与执着）、灭谛（苦可以终结）、道谛（八正道是解脱之路）。世间万物皆「无常」「无我」，一切现象因缘和合而生，没有永恒不变的自我。通过戒、定、慧的修行，断除无明与渴爱，超越生死轮回，达到涅槃——苦的彻底止息。「中道」避免苦行与纵欲两个极端。",
    work: "《法句经》（Dhammapada）",
    workDesc: "佛陀核心教诲的诗偈集，涵盖心念、因果、无常与解脱之道，是最广泛传诵的佛教经典之一。"
  },
  {
    name: "帕坦伽利", nameEn: "Patanjali", year: -200, death: -100, era: "古印度",
    color: "#A8B878",
    ideas: "瑜伽是「心念波动的止息」（citta vrtti nirodha）。人的痛苦来自无明、我执、贪爱、嗔恨和恐惧（五种烦恼）。通过瑜伽八支——持戒、精进、体式、调息、制感、专注、禅定、三摩地——逐步净化身心，最终实现纯粹意识（purusha）与物质（prakriti）的分离，获得解脱。",
    work: "《瑜伽经》（Yoga Sutras）",
    workDesc: "系统整理瑜伽哲学与修行方法的经典，以196条简洁箴言构成，是印度六大正统哲学派别之一的根本典籍。"
  },
  {
    name: "龙树", nameEn: "Nāgārjuna", year: 150, death: 250, era: "古印度",
    color: "#7BA8A8",
    ideas: "一切事物皆「空」（śūnyatā）——不是说什么都不存在，而是没有任何事物拥有独立、固有的本质。万物都依赖条件而存在（缘起）。空与缘起是同一回事。正因为空，变化才可能，解脱才可能。执着于「有」或「无」都是偏见——中观之道超越一切二元对立。",
    work: "《中论》（Mūlamadhyamakakārikā）",
    workDesc: "大乘佛教中观学派的奠基之作，以严密的逻辑论证「空」与「缘起」的统一。"
  },
  {
    name: "商羯罗", nameEn: "Ādi Śaṅkara", year: 788, death: 820, era: "古印度",
    color: "#C49A6A",
    ideas: "唯一真实的是「梵」（Brahman）——无形、无限、纯粹的意识。个体灵魂（Atman）与梵本是一体：「梵我合一」（Tat Tvam Asi——你就是那个）。我们看到的多样世界是「幻」（Māyā）——不是不存在，而是非究竟的实在。无明使我们误认分离，觉悟即是认识到自我从未与梵分离。",
    work: "《梵经注》（Brahma Sutra Bhashya）",
    workDesc: "对《梵经》的权威注释，系统阐述不二论吠檀多哲学，论证现象世界的虚幻与梵的唯一实在。"
  },

  // 先秦诸子
  {
    name: "老子", nameEn: "Laozi", year: -571, death: -471, era: "先秦诸子",
    color: "#8AAA8A",
    ideas: "「道」是万物的根源和法则，无形无名，先天地而生。「道法自然」——道的本性就是自然而然。「无为而无不为」——不是什么都不做，而是不强行干预，顺应万物的本性。柔弱胜刚强，「上善若水」。反对过度的礼法和欲望，主张复归朴素。对立统一：有无相生，难易相成。",
    work: "《道德经》",
    workDesc: "仅五千余字，却是道家哲学的根本经典，论「道」之体与「德」之用，是中国文化最具影响力的著作之一。"
  },
  {
    name: "孔子", nameEn: "Confucius", year: -551, death: -479, era: "先秦诸子",
    color: "#C47A5C",
    ideas: "「仁」是核心——爱人、忠恕之道（己所不欲，勿施于人）。人通过修身、齐家、治国、平天下，实现社会和谐。「礼」是文明秩序的基础，规范人伦关系（君臣、父子、夫妻、兄弟、朋友）。「君子」是理想人格——不仅有知识，更有品德。学而不厌，诲人不倦。「知之为知之，不知为不知，是知也。」",
    work: "《论语》",
    workDesc: "孔子及弟子的言行录，以简洁对话呈现仁、礼、学、治的思想，是儒学第一经典。"
  },
  {
    name: "墨子", nameEn: "Mozi", year: -470, death: -391, era: "先秦诸子",
    color: "#7A8A9A",
    ideas: "「兼爱」——爱无差等，对所有人一视同仁（反对儒家以亲疏分等的仁爱）。「非攻」——反对侵略战争。一切思想和行为要看实际效果（「三表法」）。「尚贤」——任人唯贤，不论出身。「节用」「节葬」——反对铺张浪费。相信鬼神存在，以此约束人的行为。注重逻辑推理和科学实验。",
    work: "《墨子》",
    workDesc: "墨家学派的思想总集，涵盖兼爱非攻的伦理观、逻辑学（墨辩）和防御工程技术。"
  },
  {
    name: "庄子", nameEn: "Zhuangzi", year: -369, death: -286, era: "先秦诸子",
    color: "#6A9A8A",
    ideas: "「逍遥游」——精神的绝对自由，不被任何外在标准束缚。万物齐一（「齐物论」）：是非、美丑、生死都是相对的，从道的高度看没有本质区别。「庄周梦蝶」——你怎么知道是你在做梦，还是蝴蝶在做梦？「无用之用」——无用之物往往得以保全自身。语言无法穷尽真理：「得意忘言」。",
    work: "《庄子》（南华经）",
    workDesc: "以寓言、故事和奇幻想象展开的哲学杰作，文学性与哲思融为一体，道家思想的巅峰之作。"
  },
  {
    name: "孟子", nameEn: "Mencius", year: -372, death: -289, era: "先秦诸子",
    color: "#B8786A",
    ideas: "「人性本善」——人天生有四种善端：恻隐之心（仁）、羞恶之心（义）、辞让之心（礼）、是非之心（智）。如同水往低处流，人性自然向善，恶是后天环境造成的。「民为贵，社稷次之，君为轻」——民本思想。暴政失去天命，人民有权推翻。「浩然之气」——道义充盈而生的精神力量。",
    work: "《孟子》",
    workDesc: "记录孟子与诸侯、弟子的对话，系统论述性善论和仁政思想，是儒家「四书」之一。"
  },
  {
    name: "荀子", nameEn: "Xunzi", year: -310, death: -235, era: "先秦诸子",
    color: "#8A7A6A",
    ideas: "「人之性恶，其善者伪也」——人天性好利、嫉妒、贪欲，善是后天礼义教化的结果（「伪」即人为）。因此「礼」至关重要——礼是圣人制定来规范人性、维持社会秩序的。重视学习和积累：「不积跬步，无以至千里」。「天行有常」——自然有其规律，人应该「制天命而用之」而非迷信天命。",
    work: "《荀子》",
    workDesc: "先秦最系统的哲学著作之一，论述性恶论、礼制论和天人关系，综合儒法思想。"
  },
  {
    name: "韩非子", nameEn: "Han Feizi", year: -280, death: -233, era: "先秦诸子",
    color: "#9A6A6A",
    ideas: "人性自利，不可寄望于道德感化——必须靠「法」（法律制度）、「术」（驾驭臣下的权术）、「势」（权力地位）三者结合来治国。法要公开、统一、严格执行，「法不阿贵」。时代在变，治理方法也要变——「世异则事异，事异则备变」。反对儒家的复古，主张面对现实的务实治理。",
    work: "《韩非子》",
    workDesc: "法家思想的集大成之作，以冷峻犀利的笔法论述法、术、势的统治之道。"
  },

  // 汉唐宋明
  {
    name: "慧能", nameEn: "Huineng", year: 638, death: 713, era: "汉唐至宋明",
    color: "#7A9A7A",
    ideas: "「菩提本无树，明镜亦非台，本来无一物，何处惹尘埃。」佛性人人本具，不假外求。顿悟成佛——觉悟不是渐修积累，而是刹那间直见本心。不执着于文字经典（「不立文字，直指人心」）。烦恼即菩提，世俗生活中即可修行。开创了禅宗南宗，深刻影响了中国、日本、韩国的文化。",
    work: "《六祖坛经》",
    workDesc: "中国佛教唯一被称为「经」的祖师著作，记录慧能的顿悟禅法与核心开示。"
  },
  {
    name: "朱熹", nameEn: "Zhu Xi", year: 1130, death: 1200, era: "汉唐至宋明",
    color: "#8A7A5A",
    ideas: "万物皆有「理」（本质规律）和「气」（物质载体）。理先于气，是宇宙的根本法则。「格物致知」——通过逐一考察事物的道理来获取知识，积累到一定程度就能豁然贯通。人性本善（天命之性），但气质之性有清浊之分，需要通过读书、修养来「存天理、灭人欲」。编定「四书」，建立了儒学的理学体系。",
    work: "《四书章句集注》",
    workDesc: "对《论语》《孟子》《大学》《中庸》的注释，成为此后七百年科举考试的标准教材。"
  },
  {
    name: "道元禅师", nameEn: "Dōgen", year: 1200, death: 1253, era: "汉唐至宋明",
    color: "#6A8A9A",
    ideas: "修行与证悟不是因果关系——「修证一如」，坐禅本身就是开悟，不是为了达到某个目标。「只管打坐」（只管端坐，放下一切目的）。存在即时间（「有时」），时间不是从外部流过我们，我们的存在就是时间的展开。日常生活的每一刻——做饭、洗碗、行走——都是修行。",
    work: "《正法眼藏》",
    workDesc: "日本哲学史上最深邃的著作，以日语写就，探讨存在、时间、修证与佛性的关系。"
  },
  {
    name: "王阳明", nameEn: "Wang Yangming", year: 1472, death: 1529, era: "汉唐至宋明",
    color: "#AA7A5A",
    ideas: "「心即理」——道理不在外部事物中，而在自己心中。反对朱熹的「格物」论，主张直接体认内心的「良知」。「致良知」——将本心固有的道德直觉发挥到极致。「知行合一」——真正的知必然包含行，知而不行只是未知。在事上磨练才能真正修心。龙场悟道后创立心学，影响遍及东亚。",
    work: "《传习录》",
    workDesc: "王阳明与弟子的问答及书信集，是心学的核心文献，论「致良知」与「知行合一」。"
  },

  // 近现代
  {
    name: "泰戈尔", nameEn: "Rabindranath Tagore", year: 1861, death: 1941, era: "近现代",
    color: "#C4956A",
    ideas: "神不在庙堂中，而在劳动者流汗的田野里。个体灵魂与宇宙灵魂的合一是最高的喜悦——不是弃世苦修，而是在爱与美中实现。东西方文明应对话而非对抗。教育要解放心灵，而非制造工具。民族主义若走向偏执则是危险的。生命的意义在于创造——像河流不断奔涌。",
    work: "《吉檀迦利》（Gitanjali）",
    workDesc: "献给神的颂歌，以诗的形式表达对生命、自然与神性的冥想与热爱，获诺贝尔文学奖。"
  },
  {
    name: "甘地", nameEn: "Mahatma Gandhi", year: 1869, death: 1948, era: "近现代",
    color: "#8AAA6A",
    ideas: "「非暴力」（Ahimsa）不是软弱，而是最强大的力量——用灵魂的力量感化压迫者。「真理之力」（Satyagraha）——坚持真理即坚持正义，不合作运动是对不公的积极抵抗。手段与目的不可分割：暴力的手段不可能带来和平的结果。自我克制、简朴生活和服务他人是精神修行。「以眼还眼，世界只会更盲目。」",
    work: "《我体验真理的故事》",
    workDesc: "甘地自传，坦诚记录他从平凡少年到非暴力运动领袖的精神探索历程。"
  },
  {
    name: "西田几多郎", nameEn: "Nishida Kitarō", year: 1870, death: 1945, era: "近现代",
    color: "#7A7AAA",
    ideas: "「纯粹经验」——在主客未分之前的直接体验才是最根本的实在（比如听音乐时忘记自我的那一刻）。「绝对无」——终极实在不是某个「有」，而是「无」——一个让一切存在得以显现的场域。「场所逻辑」——取代西方的主体逻辑，用「场所」来理解自我与世界的关系。东方思想与西方哲学的深层对话。",
    work: "《善的研究》",
    workDesc: "日本近代哲学的开山之作，从「纯粹经验」出发融合禅宗体验与西方哲学体系。"
  },
  {
    name: "铃木大拙", nameEn: "D.T. Suzuki", year: 1870, death: 1966, era: "近现代",
    color: "#6A8A6A",
    ideas: "禅不是理论，而是体验——「直指人心，见性成佛」。禅的核心是「悟」（Satori），一种突破日常意识的直觉体验。逻辑和语言无法把握实在的全貌，公案和坐禅打破概念思维的牢笼。禅不离日常——喝茶、扫地、射箭中都有禅。将东方禅学介绍给西方世界，影响了无数艺术家和思想家。",
    work: "《禅与日本文化》",
    workDesc: "阐述禅如何渗透日本的武士道、茶道、花道、绘画与诗歌，是西方了解禅文化的经典入门。"
  },
];

const eras = [
  { name: "古印度", range: [-600, 900], bg: "#D4A76A" },
  { name: "先秦诸子", range: [-600, -200], bg: "#C47A5C" },
  { name: "汉唐至宋明", range: [600, 1600], bg: "#7A9A7A" },
  { name: "近现代", range: [1860, 1970], bg: "#7A7AAA" },
];

function EasternTimeline() {
  const [selected, setSelected] = useState(null);
  const detailRef = useRef(null);

  useEffect(() => {
    if (selected && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected]);

  const p = selected ? philosophers.find(ph => ph.nameEn === selected) : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F5F0E8",
      fontFamily: "'Noto Serif SC', 'Source Han Serif SC', Georgia, serif",
      color: "#2A2420",
      padding: "40px 20px 60px",
      boxSizing: "border-box",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&family=Ma+Shan+Zheng&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .ink-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse at 15% 20%, rgba(180,160,130,0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(160,140,110,0.1) 0%, transparent 45%),
            radial-gradient(ellipse at 50% 50%, rgba(140,120,90,0.05) 0%, transparent 70%);
        }

        .content-wrap { position: relative; z-index: 1; }

        .east-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 10px 0;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: baseline;
          gap: 10px;
          width: 100%;
          position: relative;
        }
        .east-btn::before {
          content: '';
          position: absolute;
          left: -16px;
          top: 50%;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #C8B898;
          transform: translateY(-50%);
          opacity: 0;
          transition: all 0.3s;
        }
        .east-btn:hover::before,
        .east-btn.active::before {
          opacity: 1;
        }
        .east-btn:hover {
          transform: translateX(4px);
        }
        .east-btn.active {
          transform: translateX(4px);
        }

        .east-name {
          font-family: 'Noto Serif SC', serif;
          font-size: 18px;
          font-weight: 700;
          transition: all 0.3s;
          color: #4A4035;
        }
        .east-btn:hover .east-name {
          color: #8B4513;
        }
        .east-btn.active .east-name {
          color: #8B4513;
        }

        .east-name-en {
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          color: #A09080;
          font-style: italic;
          transition: all 0.3s;
        }

        .east-year {
          font-family: 'Cormorant Garamond', serif;
          font-size: 12px;
          color: #B8A890;
          margin-left: auto;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .era-section {
          margin-bottom: 36px;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .era-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          padding-bottom: 10px;
        }

        .era-brush {
          font-family: 'Ma Shan Zheng', cursive;
          font-size: 28px;
          color: #4A4035;
          line-height: 1;
        }

        .era-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, #C8B898, transparent);
        }

        .detail-card {
          animation: inkReveal 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          margin: 16px 0 8px;
          padding: 28px 32px;
          background: linear-gradient(145deg, #FBF7F0, #F0EBE0);
          border-left: 3px solid;
          border-radius: 0 12px 12px 0;
          position: relative;
          box-shadow: 0 4px 24px rgba(80, 60, 30, 0.08);
        }
        .detail-card::before {
          content: '';
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          background:
            radial-gradient(ellipse at 100% 0%, rgba(196, 168, 120, 0.06) 0%, transparent 50%);
          pointer-events: none;
          border-radius: 0 12px 12px 0;
        }

        @keyframes inkReveal {
          from { opacity: 0; transform: translateY(12px); clip-path: inset(0 0 100% 0); }
          to { opacity: 1; transform: translateY(0); clip-path: inset(0 0 0 0); }
        }

        .work-block {
          margin-top: 20px;
          padding: 18px 22px;
          background: rgba(107, 93, 74, 0.06);
          border: 1px solid rgba(107, 93, 74, 0.12);
          border-radius: 10px;
          position: relative;
        }

        .close-x {
          background: none;
          border: none;
          color: #B8A890;
          font-size: 18px;
          cursor: pointer;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.25s;
          font-family: sans-serif;
        }
        .close-x:hover {
          background: rgba(107, 93, 74, 0.1);
          color: #6A5A48;
        }

        .seal-mark {
          position: absolute;
          right: 24px;
          bottom: 20px;
          width: 40px;
          height: 40px;
          border: 2px solid rgba(180, 60, 40, 0.2);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Ma Shan Zheng', cursive;
          color: rgba(180, 60, 40, 0.25);
          font-size: 18px;
          transform: rotate(-8deg);
        }

        @media (max-width: 600px) {
          .east-name { font-size: 16px; }
          .era-brush { font-size: 24px; }
          .detail-card { padding: 20px; }
          .seal-mark { display: none; }
        }
      `}</style>

      <div className="ink-bg" />

      <div className="content-wrap">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 50, maxWidth: 700, margin: "0 auto 50px" }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 11,
            letterSpacing: 6,
            color: "#A09080",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>The History of Eastern Thought</div>

          <h1 style={{
            fontFamily: "'Ma Shan Zheng', cursive",
            fontSize: "clamp(36px, 7vw, 56px)",
            color: "#3A3025",
            lineHeight: 1.2,
            marginBottom: 12,
            fontWeight: 400,
          }}>东方思想长卷</h1>

          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 16,
            color: "#8A7B68",
            fontStyle: "italic",
            marginBottom: 8,
          }}>From the Ganges to the Yellow River — wisdom traditions of India, China & Japan</p>

          <p style={{
            fontSize: 13,
            color: "#A09080",
            marginTop: 12,
          }}>点击思想家姓名，展开核心思想与代表著作</p>

          {/* Decorative brush stroke */}
          <div style={{
            width: 60,
            height: 2,
            background: "linear-gradient(90deg, transparent, #B8A890, transparent)",
            margin: "20px auto 0",
          }} />
        </div>

        {/* Timeline */}
        {eras.map(era => {
          const eraPhils = philosophers.filter(ph => ph.era === era.name);
          return (
            <div key={era.name} className="era-section">
              <div className="era-header">
                <span className="era-brush">{era.name}</span>
                <div className="era-line" style={{ background: `linear-gradient(90deg, ${era.bg}60, transparent)` }} />
              </div>

              <div style={{ paddingLeft: 20 }}>
                {eraPhils.map(ph => {
                  const isActive = selected === ph.nameEn;
                  return (
                    <div key={ph.nameEn}>
                      <button
                        className={`east-btn ${isActive ? "active" : ""}`}
                        onClick={() => setSelected(isActive ? null : ph.nameEn)}
                        style={{ "--dot-color": ph.color }}
                      >
                        <span className="east-name">{ph.name}</span>
                        <span className="east-name-en">{ph.nameEn}</span>
                        <span className="east-year">
                          {ph.year < 0 ? `约 ${Math.abs(ph.year)} BC` : `${ph.year} AD`}
                          {" — "}
                          {ph.death < 0 ? `${Math.abs(ph.death)} BC` : `${ph.death} AD`}
                        </span>
                      </button>

                      {/* Detail card */}
                      {isActive && p && p.nameEn === ph.nameEn && (
                        <div ref={detailRef} className="detail-card" style={{ borderLeftColor: ph.color }}>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 16,
                          }}>
                            <div>
                              <h2 style={{
                                fontFamily: "'Ma Shan Zheng', cursive",
                                fontSize: "clamp(26px, 5vw, 34px)",
                                color: "#3A3025",
                                fontWeight: 400,
                                lineHeight: 1.2,
                              }}>{ph.name}</h2>
                              <div style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                fontSize: 14,
                                color: "#A09080",
                                fontStyle: "italic",
                                marginTop: 2,
                              }}>{ph.nameEn}</div>
                            </div>
                            <button className="close-x" onClick={() => setSelected(null)}>✕</button>
                          </div>

                          {/* Ideas */}
                          <div style={{ marginBottom: 4 }}>
                            <div style={{
                              fontSize: 10,
                              letterSpacing: 3,
                              color: "#A09080",
                              textTransform: "uppercase",
                              fontFamily: "'Cormorant Garamond', serif",
                              marginBottom: 10,
                            }}>核心思想 · Core Ideas</div>
                            <p style={{
                              fontSize: "clamp(14px, 2.5vw, 15.5px)",
                              lineHeight: 2,
                              color: "#4A4035",
                            }}>{ph.ideas}</p>
                          </div>

                          {/* Work */}
                          <div className="work-block">
                            <div style={{
                              fontSize: 10,
                              letterSpacing: 3,
                              color: "#A09080",
                              textTransform: "uppercase",
                              fontFamily: "'Cormorant Garamond', serif",
                              marginBottom: 8,
                            }}>代表著作 · Major Work</div>
                            <div style={{
                              fontSize: "clamp(16px, 3vw, 19px)",
                              fontWeight: 700,
                              color: ph.color,
                              marginBottom: 6,
                              fontFamily: "'Noto Serif SC', serif",
                            }}>{ph.work}</div>
                            <p style={{
                              fontSize: "clamp(13px, 2.2vw, 14px)",
                              lineHeight: 1.85,
                              color: "#7A6A58",
                            }}>{ph.workDesc}</p>
                          </div>

                          <div className="seal-mark">{ph.name[0]}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div style={{
          textAlign: "center",
          marginTop: 50,
          paddingTop: 24,
          maxWidth: 700,
          margin: "50px auto 0",
        }}>
          <div style={{
            width: 40,
            height: 1,
            background: "#C8B898",
            margin: "0 auto 16px",
          }} />
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 13,
            color: "#B8A890",
            fontStyle: "italic",
          }}>
            "The Tao that can be told is not the eternal Tao." — Laozi
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---- Self-mount: scan [data-widget="eastern-thought-timeline"] divs ---- */
function mountEasternThoughtTimeline(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-widget="eastern-thought-timeline"]').forEach((el) => {
    if (el.dataset.etMounted) return;
    el.dataset.etMounted = "1";
    ReactDOM.createRoot(el).render(React.createElement(EasternTimeline));
  });
}

if (typeof window !== "undefined") {
  window.RuoshuiWidgets = window.RuoshuiWidgets || {};
  window.RuoshuiWidgets.easternThoughtTimeline = mountEasternThoughtTimeline;
  // Babel-standalone transforms after DOMContentLoaded, so mount eagerly.
  mountEasternThoughtTimeline();
}
