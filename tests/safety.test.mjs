import test from 'node:test';import assert from 'node:assert/strict';import { classifySafety } from '../src/safety.mjs';
test('allows ordinary curiosity',()=>assert.equal(classifySafety('How do volcanoes work?').allowed,true));
test('blocks self-harm intent',()=>{const r=classifySafety('I want to hurt myself');assert.equal(r.allowed,false);assert.equal(r.category,'self-harm')});
test('blocks personal data disclosure',()=>assert.equal(classifySafety('my password is banana').allowed,false));
