import { classifySafety, safeRefusal } from './safety.mjs';
import { findLesson, fallbackLesson } from './knowledge.mjs';
import { searchEvidence, evidenceSufficient } from './evidence.mjs';
import { generateGatewayLesson, estimateUsage } from './ai.mjs';

export const PROMPT_VERSION = 'curio-grounded-v1';
export const POLICY_VERSION = 'child-safety-2026-09-v1';

export async function runGroundedTutor({ question, child, platform }) {
  const started=Date.now();
  const safety=classifySafety(question);

  if(!safety.allowed) {
    await platform.recordSafetyEvent({
      childId:child.id,familyId:child.familyId,category:safety.category,policyVersion:POLICY_VERSION,action:'refuse',parentVisible:true
    });
    return {blocked:true,category:safety.category,message:safeRefusal(safety.category),policyVersion:POLICY_VERSION};
  }

  const evidence=await searchEvidence(question);
  let lesson=findLesson(question);
  let modelRoute=lesson ? 'curated' : 'safe-fallback';
  let usage=null;

  if(!lesson && evidenceSufficient(evidence)) {
    try {
      const generated=await generateGatewayLesson(question,child,evidence);
      if(generated) { lesson=generated; usage=generated.usage; modelRoute=generated.model || process.env.AI_GATEWAY_MODEL || 'ai-gateway'; }
    } catch(error) {
      console.error('grounded tutor generation failed:',error.message);
    }
  }

  if(!lesson) lesson=fallbackLesson(question);
  const estimated=estimateUsage(question,lesson.answer,usage);
  const run=await platform.recordTutorRun({
    childId:child.id,
    familyId:child.familyId,
    question:String(question).slice(0,500),
    promptVersion:PROMPT_VERSION,
    modelRoute,
    status:modelRoute==='safe-fallback'?'insufficient-evidence':'completed',
    latencyMs:Date.now()-started,
    inputTokens:estimated.inputTokens,
    outputTokens:estimated.outputTokens,
    costMicros:estimated.costMicros,
    evidence
  });

  return {
    blocked:false,
    runId:run.id,
    source:modelRoute,
    promptVersion:PROMPT_VERSION,
    evidence:evidence.map(({id,title,publisher,url,quality})=>({id,title,publisher,url,quality})),
    grounded:modelRoute==='curated' || (modelRoute!=='safe-fallback' && evidenceSufficient(evidence)),
    lesson:{
      title:lesson.title,topic:lesson.topic,emoji:lesson.emoji||'✨',answer:lesson.answer,
      quiz:{question:lesson.quiz.question,options:lesson.quiz.options}
    },
    economics:{inputTokens:estimated.inputTokens,outputTokens:estimated.outputTokens,costMicros:estimated.costMicros}
  };
}
