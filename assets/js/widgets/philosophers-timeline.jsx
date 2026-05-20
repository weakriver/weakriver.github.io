import { useState, useRef, useEffect } from "react";

const philosophers = [
  {
    name: "苏格拉底", nameEn: "Socrates", year: -470, death: -399, era: "古希腊",
    color: "#C4956A",
    ideas: "「我只知道我一无所知。」苏格拉底不写书，只用对话追问真理。他开创了‘苏格拉底诘问法’——通过不断提问，揭露对方思想中的矛盾，引导人走向自我认知。他认为美德即知识，人作恶是因为无知，而‘认识你自己‘是哲学的起点。",
    work: "《申辩篇》（柏拉图记录）",
    workDesc: "苏格拉底在雅典法庭上为自己辩护的记录，展现了他对真理的不妥协与面对死亡的坦然。"
  },
  {
    name: "柏拉图", nameEn: "Plato", year: -428, death: -348, era: "古希腊",
    color: "#7B9DB7",
    ideas: "世界分为「理念世界」和「现象世界」。我们看到的一切只是理念的影子（洞穴隐喻）。真正的实在是永恒不变的理念/形式。灵魂由理性、激情、欲望三部分组成，正义就是三者各安其位。哲学家应当成为统治者，因为只有他们能认识真理。",
    work: "《理想国》",
    workDesc: "探讨正义的本质，构想由哲学家治理的理想城邦，包含著名的「洞穴寓言」。"
  },
  {
    name: "亚里士多德", nameEn: "Aristotle", year: -384, death: -322, era: "古希腊",
    color: "#8B7355",
    ideas: "反对柏拉图的理念论，认为形式内在于事物本身。万物皆有「四因」：质料因、形式因、动力因、目的因。提出「中庸之道」——美德是两个极端之间的平衡。人是「政治的动物」，幸福（eudaimonia）在于依照理性过完善的生活。创立了形式逻辑学。",
    work: "《尼各马可伦理学》",
    workDesc: "系统探讨幸福、美德与中庸之道，是西方伦理学的奠基之作。"
  },
  {
    name: "伊壁鸠鲁", nameEn: "Epicurus", year: -341, death: -270, era: "古希腊",
    color: "#A0C4A0",
    ideas: "快乐是最高善，但不是放纵——而是「没有痛苦的宁静」（ataraxia）。通过节制欲望、友谊和理性思考达到幸福。死亡不必恐惧：「死亡与我们无关，因为当我们存在时，死亡还未来；当死亡来临时，我们已不在。」世界由原子构成，无需神的干预。",
    work: "《致美诺伊凯斯的信》",
    workDesc: "阐述伊壁鸠鲁的自然哲学、原子论和对死亡恐惧的解药。"
  },
  {
    name: "芝诺 / 斯多葛学派", nameEn: "Zeno / Stoicism", year: -334, death: -262, era: "古希腊",
    color: "#9B8EA0",
    ideas: "宇宙由理性（logos）支配，一切皆有因果。我们无法控制外在事件，但可以控制自己的反应——这就是自由。美德是唯一的善，外在财富、名誉皆无关紧要。「顺应自然而活」，接受命运，专注于自身能掌控之事。情绪来自错误判断，智者应保持内心平静。",
    work: "《沉思录》（马可·奥勒留）",
    workDesc: "罗马皇帝的私人日记，斯多葛哲学最动人的实践记录。"
  },
  {
    name: "奥古斯丁", nameEn: "Augustine", year: 354, death: 430, era: "中世纪",
    color: "#C4A06A",
    ideas: "人因原罪而堕落，唯有上帝的恩典能拯救灵魂。时间是灵魂的延展，不在外部世界。世界分「上帝之城」与「尘世之城」，历史是走向上帝的朝圣之旅。恶不是实体，而是善的缺乏。信仰先于理解：「我信，故我理解。」",
    work: "《忏悔录》",
    workDesc: "西方第一部自传体哲学作品，记录奥古斯丁从放荡到皈依的灵魂历程。"
  },
  {
    name: "托马斯·阿奎那", nameEn: "Thomas Aquinas", year: 1225, death: 1274, era: "中世纪",
    color: "#7A6B5D",
    ideas: "理性与信仰并不矛盾，而是互补。提出上帝存在的「五路证明」。将亚里士多德哲学与基督教神学融合。自然法则植根于上帝的永恒法——人类通过理性可以发现道德法则。灵魂是身体的形式，人是灵肉统一体。",
    work: "《神学大全》",
    workDesc: "中世纪最宏大的哲学-神学体系，试图以理性论证信仰的全部内容。"
  },
  {
    name: "笛卡尔", nameEn: "Descartes", year: 1596, death: 1650, era: "近代早期",
    color: "#5B8FA8",
    ideas: "「我思故我在」（Cogito ergo sum）——怀疑一切之后，唯一不可怀疑的是「我在怀疑」这件事本身。心灵与身体是两种不同的实体（心物二元论）。建立了以理性和数学为基础的哲学方法，要求从清晰明确的观念出发推导知识。",
    work: "《第一哲学沉思集》",
    workDesc: "通过系统怀疑重建知识大厦，奠定了近代理性主义哲学的基石。"
  },
  {
    name: "斯宾诺莎", nameEn: "Spinoza", year: 1632, death: 1677, era: "近代早期",
    color: "#6B8E6B",
    ideas: "上帝即自然（Deus sive Natura），整个宇宙是一个唯一的实体。自由意志是幻觉——一切事件都是必然的。人的解放在于用理性理解必然性，从而达到「对上帝的理智之爱」。情感可以通过理性认识来转化，最高的善是认知的喜悦。",
    work: "《伦理学》",
    workDesc: "以几何学方式（定义-公理-命题）构建的完整哲学体系，探讨上帝、心灵、情感与自由。"
  },
  {
    name: "休谟", nameEn: "David Hume", year: 1711, death: 1776, era: "启蒙时代",
    color: "#B07D62",
    ideas: "一切知识来自经验（经验主义）。因果关系不过是习惯性联想——我们从未真正「看见」因果。理性是激情的奴隶，道德基于情感而非理性。自我不过是一束不断变化的知觉。对宗教奇迹和上帝存在的证明提出了毁灭性批判。",
    work: "《人性论》",
    workDesc: "试图用实验方法研究人性，动摇了因果律、自我同一性和理性道德的传统观念。"
  },
  {
    name: "卢梭", nameEn: "Rousseau", year: 1712, death: 1778, era: "启蒙时代",
    color: "#7CAA7C",
    ideas: "「人生而自由，却无往不在枷锁之中。」文明使人堕落，自然状态中的人是善良的「高贵野蛮人」。私有制是不平等的根源。通过「社会契约」，人民将个人意志汇聚为「公意」，实现真正的自由。教育应顺应儿童天性，而非强制灌输。",
    work: "《社会契约论》",
    workDesc: "提出人民主权与公意理论，深刻影响了法国大革命和现代民主思想。"
  },
  {
    name: "康德", nameEn: "Immanuel Kant", year: 1724, death: 1804, era: "启蒙时代",
    color: "#8A7EB8",
    ideas: "人的认识不是被动接受，而是主动建构——心灵为经验提供时空和范畴的框架（哥白尼式革命）。道德的最高原则是「绝对命令」：只按你愿意它成为普遍法则的准则行事。人是目的，永远不能仅仅被当作手段。自由、上帝和灵魂不朽虽不可证明，但是道德实践的必要预设。",
    work: "《纯粹理性批判》",
    workDesc: "重新定义了人类认识的边界与结构，被认为是哲学史上最重要的著作之一。"
  },
  {
    name: "黑格尔", nameEn: "Hegel", year: 1770, death: 1831, era: "19世纪",
    color: "#6A6A8A",
    ideas: "现实是「绝对精神」自我展开的过程。一切发展遵循辩证法：正题→反题→合题。历史有方向——是自由意识的不断进步。真理是整体，孤立的事物不具有完全的实在性。存在即合理，合理即存在。哲学是「把握在思想中的时代」。",
    work: "《精神现象学》",
    workDesc: "追踪意识从最初的感性确定性到绝对知识的辩证发展历程。"
  },
  {
    name: "叔本华", nameEn: "Schopenhauer", year: 1788, death: 1860, era: "19世纪",
    color: "#7A5C5C",
    ideas: "世界的本质是盲目的「意志」——一种无目的、永不满足的冲动。人生本质上是痛苦的：欲望满足后是空虚，未满足则是痛苦。解脱之道有三：艺术审美（暂时忘我）、同情心（打破个体化幻象）、禁欲否定意志（彻底解脱）。深受佛教和印度哲学影响。",
    work: "《作为意志和表象的世界》",
    workDesc: "构建了以「意志」为核心的悲观主义哲学体系，影响了尼采、弗洛伊德和瓦格纳。"
  },
  {
    name: "克尔凯郭尔", nameEn: "Kierkegaard", year: 1813, death: 1855, era: "19世纪",
    color: "#A07B5B",
    ideas: "存在主义之父。反对黑格尔的抽象体系，强调个体的主观存在。人生有三个阶段：审美阶段（追求快感）→伦理阶段（承担责任）→宗教阶段（信仰的飞跃）。焦虑是自由的眩晕。真正的信仰需要「信仰的跳跃」——超越理性的抉择。",
    work: "《恐惧与颤栗》",
    workDesc: "通过亚伯拉罕献子的故事，探讨信仰、伦理与荒谬之间的张力。"
  },
  {
    name: "马克思", nameEn: "Karl Marx", year: 1818, death: 1883, era: "19世纪",
    color: "#B85C5C",
    ideas: "「哲学家们只是用不同的方式解释世界，问题在于改变世界。」历史是阶级斗争的历史。经济基础决定上层建筑。资本主义通过剥削工人的剩余价值运转，必然导致异化——人与劳动、产品和自身的疏离。无产阶级革命将终结阶级社会，实现共产主义。",
    work: "《资本论》",
    workDesc: "系统分析资本主义生产方式的运作逻辑、内在矛盾与历史趋势。"
  },
  {
    name: "尼采", nameEn: "Nietzsche", year: 1844, death: 1900, era: "19世纪",
    color: "#C45C5C",
    ideas: "「上帝死了」——传统道德和宗教失去了根基。主奴道德：强者创造价值，弱者以怨恨制造「善恶」。「超人」（Übermensch）是超越旧道德、自我创造价值的人。永恒回归：如果你的人生要无限重复，你能欣然接受吗？对生命说「是」——即使在苦难之中。",
    work: "《查拉图斯特拉如是说》",
    workDesc: "以诗化散文宣告超人理想、永恒回归和对生命的肯定，尼采最具文学性的哲学作品。"
  },
  {
    name: "海德格尔", nameEn: "Heidegger", year: 1889, death: 1976, era: "20世纪",
    color: "#5C7A8A",
    ideas: "哲学最根本的问题是「存在的意义」。人是「此在」（Dasein）——被「抛入」世界的存在者。日常生活中我们沉沦于「常人」的庸碌中，只有面对死亡（向死而生），才能唤醒本真的存在。技术时代的危险在于把一切存在者都变成可利用的「持存物」。",
    work: "《存在与时间》",
    workDesc: "重新追问存在的意义，从此在的时间性出发展开存在论分析，是20世纪最重要的哲学著作之一。"
  },
  {
    name: "维特根斯坦", nameEn: "Wittgenstein", year: 1889, death: 1951, era: "20世纪",
    color: "#6B9A7B",
    ideas: "前期：语言是世界的逻辑图像，「凡是不能说的，就应当沉默。」后期：语言没有固定本质，意义来自使用——「语言游戏」。哲学问题是语言的误用造成的困惑。哲学的任务不是建构理论，而是治疗：让苍蝇找到飞出瓶子的路。",
    work: "《哲学研究》",
    workDesc: "推翻自己早期理论，提出语言游戏、家族相似性等概念，重塑了20世纪语言哲学。"
  },
  {
    name: "萨特", nameEn: "Sartre", year: 1905, death: 1980, era: "20世纪",
    color: "#8A6A9A",
    ideas: "「存在先于本质」——人没有预定的本质，你的选择定义了你是谁。人被「判处自由」：你不能不选择，即使不选也是一种选择。「他人即地狱」——他人的注视使我物化。自欺（bad faith）是逃避自由与责任的自我欺骗。人必须在荒诞中创造意义。",
    work: "《存在与虚无》",
    workDesc: "存在主义的哲学巨著，系统论述自由、意识、他者与人的存在处境。"
  },
  {
    name: "加缪", nameEn: "Camus", year: 1913, death: 1960, era: "20世纪",
    color: "#B89A6A",
    ideas: "人生是荒诞的——我们渴望意义，但宇宙沉默不语。面对荒诞有三种态度：自杀（拒绝）、信仰飞跃（逃避）、反抗（直面）。西西弗斯推石上山，石头永远滚落——但「我们必须想象西西弗斯是幸福的」。在荒诞中反抗、创造、活着，就是意义本身。",
    work: "《西西弗斯神话》",
    workDesc: "从「自杀是否值得」这个问题出发，探讨荒诞与人如何在无意义中活出尊严。"
  }
];

const eras = [
  { name: "古希腊", range: [-500, -200], color: "#C4956A" },
  { name: "中世纪", range: [300, 1300], color: "#C4A06A" },
  { name: "近代早期", range: [1550, 1700], color: "#5B8FA8" },
  { name: "启蒙时代", range: [1700, 1810], color: "#8A7EB8" },
  { name: "19世纪", range: [1770, 1900], color: "#C45C5C" },
  { name: "20世纪", range: [1889, 1980], color: "#6B9A7B" },
];

export default function PhilosophersTimeline() {
  const [selected, setSelected] = useState(null);
  const [hovering, setHovering] = useState(null);
  const detailRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (selected && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected]);

  const p = selected ? philosophers.find(ph => ph.nameEn === selected) : null;

  return (
    <div ref={containerRef} style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0D0D0D 0%, #1A1610 40%, #0D0D0D 100%)",
      fontFamily: "'Noto Serif SC', 'Source Han Serif SC', 'Georgia', serif",
      color: "#E8DCC8",
      padding: "40px 20px",
      boxSizing: "border-box",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .timeline-line {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(180deg, transparent, #4A3F2F 5%, #6B5D4A 50%, #4A3F2F 95%, transparent);
        }

        .phil-btn {
          background: none;
          border: 1.5px solid #3A3228;
          padding: 8px 18px;
          border-radius: 40px;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Noto Serif SC', serif;
          font-size: 14px;
          color: #C8B898;
          position: relative;
          white-space: nowrap;
        }
        .phil-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(196, 168, 120, 0.15);
        }
        .phil-btn.active {
          transform: translateY(-2px);
          box-shadow: 0 4px 24px rgba(196, 168, 120, 0.25);
        }
        
        .year-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid #6B5D4A;
          background: #1A1610;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          transition: all 0.3s;
        }

        .detail-panel {
          animation: slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          max-width: 680px;
          margin: 0 auto;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .era-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #6B5D4A;
          text-align: center;
          padding: 30px 0 10px;
        }

        .work-card {
          background: linear-gradient(135deg, rgba(107, 93, 74, 0.12), rgba(42, 36, 28, 0.3));
          border: 1px solid rgba(107, 93, 74, 0.25);
          border-radius: 12px;
          padding: 20px 24px;
          margin-top: 20px;
          position: relative;
          overflow: hidden;
        }
        .work-card::before {
          content: '📖';
          position: absolute;
          right: 16px;
          top: 12px;
          font-size: 28px;
          opacity: 0.15;
        }
        
        .close-btn {
          background: none;
          border: 1px solid rgba(107, 93, 74, 0.3);
          color: #8A7B68;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.25s;
          font-family: sans-serif;
        }
        .close-btn:hover {
          background: rgba(107, 93, 74, 0.15);
          color: #C8B898;
        }

        @media (max-width: 600px) {
          .phil-btn { font-size: 12px; padding: 6px 14px; }
          .timeline-line { left: 20px; }
          .year-dot { left: 20px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 50, position: "relative" }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 11,
          letterSpacing: 6,
          color: "#6B5D4A",
          textTransform: "uppercase",
          marginBottom: 14,
        }}>The History of Western Philosophy</div>
        <h1 style={{
          fontSize: "clamp(28px, 5vw, 42px)",
          fontWeight: 900,
          background: "linear-gradient(135deg, #E8DCC8, #C4956A)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1.3,
          marginBottom: 12,
        }}>西方哲学家思想长廊</h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 16,
          color: "#8A7B68",
          fontStyle: "italic",
        }}>From Socrates to Camus — 2,400 years of ideas that shaped the world</p>
        <p style={{
          fontSize: 13,
          color: "#5A5040",
          marginTop: 12,
        }}>点击哲学家姓名，展开其核心思想与代表著作</p>
      </div>

      {/* Timeline */}
      <div style={{ position: "relative", maxWidth: 780, margin: "0 auto" }}>
        {eras.map((era, ei) => {
          const eraPhils = philosophers.filter(p => p.era === era.name);
          return (
            <div key={era.name} style={{ marginBottom: 24 }}>
              <div className="era-label" style={{ color: era.color }}>{era.name}</div>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 10,
                padding: "0 10px",
              }}>
                {eraPhils.map(ph => {
                  const isActive = selected === ph.nameEn;
                  const isHover = hovering === ph.nameEn;
                  return (
                    <button
                      key={ph.nameEn}
                      className={`phil-btn ${isActive ? "active" : ""}`}
                      onClick={() => setSelected(isActive ? null : ph.nameEn)}
                      onMouseEnter={() => setHovering(ph.nameEn)}
                      onMouseLeave={() => setHovering(null)}
                      style={{
                        borderColor: isActive ? ph.color : isHover ? `${ph.color}88` : "#3A3228",
                        color: isActive ? ph.color : isHover ? "#E8DCC8" : "#C8B898",
                        background: isActive
                          ? `linear-gradient(135deg, ${ph.color}18, ${ph.color}08)`
                          : "transparent",
                      }}
                    >
                      <span style={{ fontWeight: isActive ? 700 : 400 }}>{ph.name}</span>
                      <span style={{
                        fontSize: 11,
                        marginLeft: 6,
                        opacity: 0.5,
                        fontFamily: "'Cormorant Garamond', serif",
                      }}>
                        {ph.year < 0 ? `${Math.abs(ph.year)} BC` : ph.year}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Detail panel inline if selected philosopher is in this era */}
              {p && p.era === era.name && (
                <div ref={detailRef} className="detail-panel" style={{ marginTop: 24, padding: "0 10px" }}>
                  <div style={{
                    background: "linear-gradient(135deg, rgba(26, 22, 16, 0.95), rgba(30, 25, 18, 0.98))",
                    border: `1px solid ${p.color}40`,
                    borderRadius: 16,
                    padding: "clamp(20px, 4vw, 36px)",
                    position: "relative",
                    boxShadow: `0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 ${p.color}15`,
                  }}>
                    {/* Top bar */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 20,
                    }}>
                      <div>
                        <h2 style={{
                          fontSize: "clamp(22px, 4vw, 30px)",
                          fontWeight: 900,
                          color: p.color,
                          lineHeight: 1.2,
                        }}>{p.name}</h2>
                        <div style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: 15,
                          color: "#8A7B68",
                          marginTop: 4,
                        }}>
                          {p.nameEn} · {p.year < 0 ? `${Math.abs(p.year)}` : p.year}–{p.death < 0 ? `${Math.abs(p.death)} BC` : `${p.death} AD`}
                        </div>
                      </div>
                      <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
                    </div>

                    {/* Decorative line */}
                    <div style={{
                      height: 1,
                      background: `linear-gradient(90deg, ${p.color}50, transparent)`,
                      marginBottom: 22,
                    }} />

                    {/* Core ideas */}
                    <div style={{ marginBottom: 4 }}>
                      <div style={{
                        fontSize: 11,
                        letterSpacing: 3,
                        color: "#6B5D4A",
                        textTransform: "uppercase",
                        fontFamily: "'Cormorant Garamond', serif",
                        marginBottom: 12,
                      }}>核心思想 · Core Ideas</div>
                      <p style={{
                        fontSize: "clamp(14px, 2.5vw, 16px)",
                        lineHeight: 1.9,
                        color: "#D4C8B4",
                      }}>{p.ideas}</p>
                    </div>

                    {/* Major work */}
                    <div className="work-card">
                      <div style={{
                        fontSize: 11,
                        letterSpacing: 3,
                        color: "#6B5D4A",
                        textTransform: "uppercase",
                        fontFamily: "'Cormorant Garamond', serif",
                        marginBottom: 10,
                      }}>代表著作 · Major Work</div>
                      <div style={{
                        fontSize: "clamp(17px, 3vw, 20px)",
                        fontWeight: 700,
                        color: p.color,
                        marginBottom: 8,
                      }}>{p.work}</div>
                      <p style={{
                        fontSize: "clamp(13px, 2.2vw, 14.5px)",
                        lineHeight: 1.8,
                        color: "#A89880",
                      }}>{p.workDesc}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center",
        marginTop: 60,
        paddingTop: 30,
        borderTop: "1px solid #2A241C",
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 13,
          color: "#4A4030",
          fontStyle: "italic",
        }}>
          "The unexamined life is not worth living." — Socrates
        </p>
      </div>
    </div>
  );
}