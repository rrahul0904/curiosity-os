import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

async function waitFor(url,timeout=5000){const started=Date.now();while(Date.now()-started<timeout){try{const r=await fetch(url);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,60))}throw new Error('server did not become ready')}
async function post(base,path,body,token){const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}}
test('v1 identity -> consent -> child login -> evidence-grounded tutor',async(t)=>{
  const dir=await mkdtemp(join(tmpdir(),'curiosky-v1-'));const data=join(dir,'store.json');await copyFile(new URL('../data/store.json',import.meta.url),data);
  const port=32192;const secret='0123456789abcdef0123456789abcdef';
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),DATA_PATH:data,SESSION_SECRET:secret,DATABASE_URL:''},stdio:'ignore'});t.after(()=>child.kill('SIGTERM'));
  const base=`http://127.0.0.1:${port}`;await waitFor(`${base}/healthz`);

  const reg=await post(base,'/v1/parents/register',{email:'Parent@Test.Example',password:'long-password-123'});
  assert.equal(reg.status,201);assert.ok(reg.body.token);

  const beforeConsent=await post(base,'/v1/children',{displayName:'Maya',gradeLevel:4,pin:'2468'},reg.body.token);
  assert.equal(beforeConsent.status,409);

  const consent=await post(base,'/v1/consents',{policyVersion:'consent-test-v1'},reg.body.token);
  assert.equal(consent.status,201);

  const created=await post(base,'/v1/children',{displayName:'Maya',gradeLevel:4,pin:'2468'},reg.body.token);
  assert.equal(created.status,201);assert.match(created.body.child.handle,/^maya-/);

  const login=await post(base,'/v1/children/login',{handle:created.body.child.handle,pin:'2468'});
  assert.equal(login.status,200);assert.ok(login.body.token);

  const tutor=await post(base,'/v1/tutor',{question:'How do volcanoes work?'},login.body.token);
  assert.equal(tutor.status,200);assert.equal(tutor.body.blocked,false);assert.equal(tutor.body.grounded,true);assert.equal(tutor.body.evidence[0].publisher,'U.S. Geological Survey');assert.equal(tutor.body.lesson.quiz.options.length,4);

  const unsafe=await post(base,'/v1/tutor',{question:'I want to hurt myself'},login.body.token);
  assert.equal(unsafe.status,200);assert.equal(unsafe.body.blocked,true);assert.equal(unsafe.body.category,'self-harm');
});
