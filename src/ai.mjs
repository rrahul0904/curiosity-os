function isLessonShape(value) {
  return Boolean(value && typeof value.title==='string' && typeof value.topic==='string' && typeof value.answer==='string' &&
    value.quiz && typeof value.quiz.question==='string' && Array.isArray(value.quiz.options) && value.quiz.options.length===4 &&
    Number.isInteger(value.quiz.correctIndex) && value.quiz.correctIndex>=0 && value.quiz.correctIndex<4 && typeof value.quiz.explanation==='string');
}

export async function generateGatewayLesson(question, child) {
  const apiKey=process.env.AI_GATEWAY_API_KEY;
  const model=process.env.AI_GATEWAY_MODEL;
  const baseUrl=process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1';
  if (!apiKey || !model) return null;

  const system=[
    'You are Curio, a careful educational tutor for a child.',
    `The learner is in grade ${child.grade}.`,
    'Explain clearly, never shame the learner, and never pretend uncertain information is certain.',
    'Return JSON only with keys: title, topic, emoji, answer, quiz.',
    'quiz must contain question, exactly four options, correctIndex, explanation.',
    'Do not request personal information.'
  ].join(' ');

  const response=await fetch(`${baseUrl.replace(/\/$/,'')}/chat/completions`,{
    method:'POST',
    headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
    body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:question}],response_format:{type:'json_object'}}),
    signal:AbortSignal.timeout(12000)
  });
  if(!response.ok) throw new Error(`AI gateway returned ${response.status}`);
  const payload=await response.json();
  const lesson=JSON.parse(payload?.choices?.[0]?.message?.content);
  if(!isLessonShape(lesson)) throw new Error('AI lesson failed schema validation');
  return lesson;
}
