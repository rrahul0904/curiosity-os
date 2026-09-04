const LESSONS = [
  {
    match:/volcano|lava|magma/i, topic:'Earth Science', emoji:'🌋', title:'How volcanoes work',
    answer:'Deep underground, rock can become hot enough to melt into magma. Gas pressure can push magma upward through cracks in Earth’s crust. When magma reaches the surface, we call it lava. Over many eruptions, cooled lava and ash can build a volcano.',
    quiz:{question:'What do we call magma after it reaches Earth’s surface?',options:['Steam','Lava','Sand','Clay'],correctIndex:1,explanation:'Magma is underground. Once it reaches the surface, it is called lava.'}
  },
  {
    match:/butterfl|caterpillar|chrysalis/i, topic:'Life Science', emoji:'🦋', title:'Butterfly life cycle',
    answer:'A butterfly begins as an egg. A caterpillar, or larva, hatches and spends lots of time eating and growing. Then it forms a chrysalis, where its body changes dramatically. Finally, an adult butterfly emerges.',
    quiz:{question:'What stage usually comes after the caterpillar?',options:['Egg','Chrysalis','Seed','Nest'],correctIndex:1,explanation:'The caterpillar forms a chrysalis before becoming an adult butterfly.'}
  },
  {
    match:/moon phase|phases of the moon/i, topic:'Space', emoji:'🌙', title:'Moon phases',
    answer:'The Moon does not make its own visible light; sunlight shines on it. As the Moon travels around Earth, we see different amounts of its sunlit half. Those changing shapes are called phases.',
    quiz:{question:'What mainly causes the Moon’s phases?',options:['Clouds covering the Moon','Earth’s shadow every night','Our changing view of the Moon’s sunlit half','The Moon turning lights on and off'],correctIndex:2,explanation:'The Moon’s orbit changes how much of its sunlit half we can see.'}
  },
  {
    match:/fraction/i, topic:'Math', emoji:'➗', title:'Fractions',
    answer:'A fraction describes equal parts of a whole. The denominator tells how many equal parts the whole is split into. The numerator tells how many of those parts we are talking about.',
    quiz:{question:'In 3/4, what does the 4 tell us?',options:['There are 4 equal parts in the whole','We have 4 wholes','The answer is always 4','There are 3 equal parts'],correctIndex:0,explanation:'The denominator tells the number of equal parts in one whole.'}
  },
  {
    match:/rainbow/i, topic:'Weather & Light', emoji:'🌈', title:'How rainbows form',
    answer:'A rainbow can appear when sunlight enters tiny water droplets. The light bends, reflects inside the droplet, and bends again as it leaves. Different colors bend by slightly different amounts.',
    quiz:{question:'What helps split sunlight into rainbow colors?',options:['Water droplets','Tree leaves','Dust on the ground','Moon rocks'],correctIndex:0,explanation:'Water droplets bend and reflect sunlight, separating its colors.'}
  }
];

export function findLesson(question) { return LESSONS.find((lesson) => lesson.match.test(question)) ?? null; }
export function fallbackLesson(question) {
  const clean = String(question).replace(/[<>]/g,'').slice(0,140);
  return {
    topic:'Curiosity',emoji:'✨',title:clean.replace(/\?+$/,'') || 'A new question',
    answer:`That is a great question: “${clean}” I don’t want to invent facts in offline demo mode. Connect the optional AI tutor adapter for verified open-ended answers, or try a curated demo topic.`,
    quiz:{question:'What is the best next step when we are not sure of a fact?',options:['Guess confidently','Check a trustworthy source','Repeat the first idea','Ignore the question'],correctIndex:1,explanation:'Good learners check reliable evidence instead of pretending to know.'}
  };
}
export function freshnessForStar(star, now=new Date()) {
  const reviewed = new Date(star.lastReviewedAt ?? star.earnedAt).getTime();
  const days = Math.max(0,(now.getTime()-reviewed)/86400000);
  const freshness = Math.round(100*Math.exp(-days/Math.max(3,5+Number(star.reviews??0)*3)));
  return Math.max(5,Math.min(100,freshness));
}
export function nextReviewAt(reviews=0, from=new Date()) {
  const intervals=[1,3,7,14,30,60];
  return new Date(from.getTime()+intervals[Math.min(reviews,intervals.length-1)]*86400000).toISOString();
}
export function buildReviewQueue(stars, now=new Date()) {
  return [...stars].map(s=>({...s,freshness:freshnessForStar(s,now)}))
    .filter(s=>new Date(s.nextReviewAt).getTime()<=now.getTime()||s.freshness<55)
    .sort((a,b)=>a.freshness-b.freshness);
}
