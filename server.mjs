import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonStore } from './src/store.mjs';
import { classifySafety, safeRefusal } from './src/safety.mjs';
import { findLesson, fallbackLesson, buildReviewQueue, freshnessForStar, nextReviewAt } from './src/knowledge.mjs';
import { generateGatewayLesson } from './src/ai.mjs';
import { createPlatformStore } from './src/platform-store.mjs';
import { createV1Handler } from './src/v1-api.mjs';

const root=fileURLToPath(new URL('.',import.meta.url));
const publicDir=join(root,'public');
const dataPath=process.env.DATA_PATH || join(root,'data','store.json');
const store=new JsonStore(dataPath);
const platform=await createPlatformStore({jsonStore:store});
const port=Number(process.env.PORT||3000);

const devSessionSecret='dev-only-curiosky-session-secret-change-me';
const sessionSecret=process.env.SESSION_SECRET || devSessionSecret;
if(process.env.NODE_ENV==='production' && sessionSecret===devSessionSecret) throw new Error('SESSION_SECRET is required in production');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};

function send(res,status,body,headers={}) {
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',...headers});
  res.end(JSON.stringify(body));
}
async function bodyJson(req) {
  const chunks=[]; let size=0;
  for await (const chunk of req) { size+=chunk.length; if(size>32000) { const e=new Error('request too large');e.statusCode=413;throw e; } chunks.push(chunk); }
  if(!chunks.length)return {};
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
  catch{const e=new Error('invalid json');e.statusCode=400;throw e}
}

const handleV1=createV1Handler({platform,sessionSecret,send,bodyJson});
function parentSummary(state) {
  return {recentQuestions:state.questions.slice(-8).reverse(),fading:buildReviewQueue(state.stars).slice(0,5),safetyCount:state.safetyEvents.length,starsCount:state.stars.length,stardust:state.child.stardust};
}
async function bootstrap(res) {
  const state=await store.read();
  send(res,200,{family:state.family,child:state.child,stars:state.stars.map(s=>({...s,freshness:freshnessForStar(s)})),reviewQueue:buildReviewQueue(state.stars),rewards:state.rewards,safetyEvents:state.safetyEvents.slice(-8).reverse(),parentSummary:parentSummary(state)});
}
async function tutor(req,res) {
  const {question}=await bodyJson(req);
  const safety=classifySafety(question);
  if(!safety.allowed) {
    const event=await store.mutate(state=>{
      const x={id:store.id('safe'),category:safety.category,createdAt:new Date().toISOString()};
      state.safetyEvents.push(x);
      state.questions.push({id:store.id('q'),text:String(question??'').slice(0,120),createdAt:x.createdAt,status:'blocked',topic:'Safety'});
      return x;
    });
    return send(res,200,{blocked:true,category:event.category,message:safeRefusal(event.category)});
  }
  const snapshot=await store.read();
  let lesson=findLesson(question); let source='curated-demo';
  if(!lesson) {
    try { lesson=await generateGatewayLesson(question,snapshot.child); if(lesson) source='ai-gateway'; }
    catch(error){ console.error('AI tutor error:',error.message); }
  }
  if(!lesson){lesson=fallbackLesson(question);source='safe-fallback';}
  const quizId=store.id('quiz');
  await store.mutate(state=>{
    const now=new Date().toISOString();
    state.questions.push({id:store.id('q'),text:String(question).slice(0,500),createdAt:now,status:'answered',topic:lesson.topic});
    state.pendingQuizzes.push({id:quizId,title:lesson.title,topic:lesson.topic,emoji:lesson.emoji||'✨',quiz:lesson.quiz,createdAt:now,attempts:0});
  });
  send(res,200,{blocked:false,source,title:lesson.title,topic:lesson.topic,emoji:lesson.emoji||'✨',answer:lesson.answer,quizId,quiz:{question:lesson.quiz.question,options:lesson.quiz.options}});
}
async function gradeQuiz(req,res) {
  const {quizId,selectedIndex}=await bodyJson(req);
  const result=await store.mutate(state=>{
    const pending=state.pendingQuizzes.find(q=>q.id===quizId);
    if(!pending)return {error:'quiz not found'};
    pending.attempts+=1;
    const correct=Number(selectedIndex)===pending.quiz.correctIndex;
    if(!correct)return {correct:false,explanation:pending.quiz.explanation,stardustEarned:0,totalStardust:state.child.stardust};
    const now=new Date();
    let star=state.stars.find(s=>s.title===pending.title);
    if(!star){
      star={id:store.id('star'),title:pending.title,topic:pending.topic,emoji:pending.emoji,mastery:70,earnedAt:now.toISOString(),lastReviewedAt:now.toISOString(),nextReviewAt:nextReviewAt(0,now),reviews:0};
      state.stars.push(star);
    } else {
      star.mastery=Math.min(100,Number(star.mastery||0)+8);star.lastReviewedAt=now.toISOString();star.reviews=Number(star.reviews||0)+1;star.nextReviewAt=nextReviewAt(star.reviews,now);
    }
    state.child.stardust+=10;
    state.ledger.push({id:store.id('tx'),amount:10,reason:`Mastered: ${pending.title}`,createdAt:now.toISOString()});
    state.pendingQuizzes=state.pendingQuizzes.filter(q=>q.id!==quizId);
    return {correct:true,explanation:pending.quiz.explanation,star,stardustEarned:10,totalStardust:state.child.stardust};
  });
  if(result.error)return send(res,404,result); send(res,200,result);
}
async function review(req,res) {
  const {starId}=await bodyJson(req);
  const result=await store.mutate(state=>{
    const star=state.stars.find(s=>s.id===starId); if(!star)return null;
    const now=new Date();star.reviews=Number(star.reviews||0)+1;star.mastery=Math.min(100,Number(star.mastery||0)+4);star.lastReviewedAt=now.toISOString();star.nextReviewAt=nextReviewAt(star.reviews,now);
    return {...star,freshness:freshnessForStar(star,now)};
  });
  if(!result)return send(res,404,{error:'star not found'});send(res,200,{star:result});
}
async function createReward(req,res) {
  const {title,cost}=await bodyJson(req); const clean=String(title??'').trim().slice(0,100); const n=Number(cost);
  if(!clean||!Number.isFinite(n)||n<1||n>100000)return send(res,400,{error:'valid title and positive cost required'});
  const reward=await store.mutate(state=>{const r={id:store.id('reward'),title:clean,cost:Math.round(n),createdAt:new Date().toISOString(),redeemed:false};state.rewards.push(r);return r;});
  send(res,201,{reward});
}
async function staticFile(urlPath,res) {
  const requested=urlPath==='/'?'/index.html':urlPath;
  const safe=normalize(requested).replace(/^([.][.][/\\])+/, '');
  const path=join(publicDir,safe); if(!path.startsWith(publicDir))return false;
  try{
    const file=await readFile(path);
    res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream','cache-control':extname(path)==='.html'?'no-cache':'public, max-age=300','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'"});
    res.end(file);return true;
  }catch{return false;}
}

const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(req.method==='GET'&&url.pathname==='/healthz')return send(res,200,{ok:true,service:'curiosity-os',persistence:platform.kind});
    if(await handleV1(req,res,url))return;
    if(req.method==='GET'&&url.pathname==='/api/bootstrap')return bootstrap(res);
    if(req.method==='POST'&&url.pathname==='/api/tutor')return tutor(req,res);
    if(req.method==='POST'&&url.pathname==='/api/quiz')return gradeQuiz(req,res);
    if(req.method==='POST'&&url.pathname==='/api/review')return review(req,res);
    if(req.method==='POST'&&url.pathname==='/api/rewards')return createReward(req,res);
    if(req.method==='GET'&&await staticFile(url.pathname,res))return;
    send(res,404,{error:'not found'});
  }catch(error){console.error(error);send(res,error.statusCode||500,{error:error.statusCode?error.message:'internal error'});}
});
server.listen(port,'0.0.0.0',()=>console.log(`CurioSky listening on http://localhost:${port} (${platform.kind})`));
