import test from 'node:test';import assert from 'node:assert/strict';import { findLesson,fallbackLesson,freshnessForStar,nextReviewAt } from '../src/knowledge.mjs';
test('volcano lesson is quiz-valid',()=>{const x=findLesson('How do volcanoes work?');assert.ok(x);assert.equal(x.quiz.options[x.quiz.correctIndex],'Lava')});
test('unknown topic fails safely',()=>assert.match(fallbackLesson('Why are zibbles purple?').answer,/don’t want to invent facts/i));
test('freshness decays and review moves forward',()=>{const s={earnedAt:'2026-08-01T00:00:00.000Z',lastReviewedAt:'2026-08-01T00:00:00.000Z',reviews:0};assert.ok(freshnessForStar(s,new Date('2026-08-10T00:00:00.000Z'))<50);assert.ok(new Date(nextReviewAt(2,new Date('2026-08-10T00:00:00.000Z')))>new Date('2026-08-10T00:00:00.000Z'))});
