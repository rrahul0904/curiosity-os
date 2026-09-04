import { evidenceContext } from './evidence.mjs';

function isLessonShape(value) {
  return Boolean(value && typeof value.title==='string' && typeof value.topic==='string' && typeof value.answer==='string' &&
    value.quiz && typeof value.quiz.question==='string' && Array.isArray(value.quiz.options) && value.quiz.options.length===4 &&
    Number.isInteger(value.quiz.correctIndex) && value.quiz.correctIndex>=0 && value.quiz.correctIndex<4 && typeof value.quiz.explanation==='string');
}

export async function generateGatewayLesson(question, child, evidence = []) {
  const apiKey=process.env.AI_GATEWAY_API_KEY;
  const model=process.env.AI_GATEWAY_MODEL;
  const baseUrl=process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1';
  if (!apiKey || !model) return null;

  const system=[
    'You are Curio, a careful educational tutor for a child.',
    `The learner is in grade ${child.grade ?? child.gradeLevel ?? 3}.`,
    'Use only the supplied evidence for factual claims. If evidence is insufficient, say you are not sure.',
    'Explain clearly, never shame the learner, and do not request personal information.',
    'Return JSON only with keys: title, topic, emoji, answer, quiz.',
    'quiz must contain question, exactly four options, correctIndex, explanation.'
  ].join(' ');

  const content = `Question: ${question}\n\nEvidence:\n${evidenceContext(evidence) || 'No approved evidence was supplied.'}`;
  const response=await fetch(`${baseUrl.replace(/\/$/,'')}/chat/completions`,{
    method:'POST',
    headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
    body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content}],response_format:{type:'json_object'}}),
    signal:AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 12000))
  });
  if(!response.ok) throw new Error(`AI gateway returned ${response.status}`);
  const payload=await response.json();
  const lesson=JSON.parse(payload?.choices?.[0]?.message?.content);
  if(!isLessonShape(lesson)) throw new Error('AI lesson failed schema validation');
  return { ...lesson, usage: payload.usage ?? null, model: payload.model ?? model };
}

export function estimateUsage(question, answer, usage = null) {
  const inputTokens = Number(usage?.prompt_tokens ?? usage?.input_tokens ?? Math.ceil(String(question).length / 4));
  const outputTokens = Number(usage?.completion_tokens ?? usage?.output_tokens ?? Math.ceil(String(answer).length / 4));
  const inRate = Number(process.env.AI_INPUT_COST_PER_MILLION ?? 0);
  const outRate = Number(process.env.AI_OUTPUT_COST_PER_MILLION ?? 0);
  const costMicros = Math.round((inputTokens * inRate + outputTokens * outRate));
  return { inputTokens, outputTokens, costMicros };
}
