import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateStressScore,
  calculateTimeline,
  chooseRecommendedRoute,
  getStressLabel,
  parseScheduledDate,
  summarizeGoogleRoute,
  weatherIcon,
} from '../public/route-utils.js';

test('日付と時刻をローカル日時として読み取る', () => {
  const date = parseScheduledDate('2026-07-18', '09:30');
  assert.ok(date instanceof Date);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 6);
  assert.equal(date.getDate(), 18);
  assert.equal(date.getHours(), 9);
  assert.equal(date.getMinutes(), 30);
  assert.equal(parseScheduledDate('', '09:30'), null);
});

test('到着希望から準備開始と出発時刻を逆算する', () => {
  const scheduledAt = new Date('2026-07-18T10:00:00');
  const timeline = calculateTimeline({
    scheduledAt,
    timeType: 'arrival',
    durationMinutes: 40,
    preparationMinutes: 20,
    bufferMinutes: 10,
  });

  assert.equal(timeline.preparationStart.getHours(), 8);
  assert.equal(timeline.preparationStart.getMinutes(), 50);
  assert.equal(timeline.recommendedDeparture.getHours(), 9);
  assert.equal(timeline.recommendedDeparture.getMinutes(), 10);
  assert.equal(timeline.expectedArrival.getHours(), 9);
  assert.equal(timeline.expectedArrival.getMinutes(), 50);
});

test('徒歩と乗換が増えるほど負担度が上がる', () => {
  const easy = calculateStressScore({
    durationMinutes: 30,
    walkingMinutes: 3,
    transfers: 0,
  });
  const hard = calculateStressScore({
    durationMinutes: 60,
    walkingMinutes: 15,
    transfers: 2,
  });

  assert.ok(hard > easy);
  assert.equal(getStressLabel(easy), '快適');
  assert.equal(getStressLabel(90), '負担高め');
});

test('Google Routeデータから決定的な比較情報を作る', () => {
  const summary = summarizeGoogleRoute({
    durationMillis: 45 * 60_000,
    staticDurationMillis: 45 * 60_000,
    localizedValues: { duration: '45分', distance: '18 km' },
    legs: [{
      steps: [
        { travelMode: 'WALKING', staticDurationMillis: 8 * 60_000, distanceMeters: 600 },
        {
          travelMode: 'TRANSIT',
          transitDetails: { transitLine: { shortName: '東横線' } },
        },
        {
          travelMode: 'TRANSIT',
          transitDetails: { transitLine: { name: 'みなとみらい線' } },
        },
      ],
    }],
    warnings: ['時刻表を確認してください'],
  }, 0, 'TRANSIT');

  assert.equal(summary.name, '東横線 → みなとみらい線');
  assert.equal(summary.durationMinutes, 45);
  assert.equal(summary.walkingMinutes, 8);
  assert.equal(summary.transfers, 1);
  assert.deepEqual(summary.lines, ['東横線', 'みなとみらい線']);
});

test('利用者の優先条件でおすすめを切り替える', () => {
  const routes = [
    { durationMinutes: 30, walkingMinutes: 12, transfers: 2, stressScore: 65 },
    { durationMinutes: 40, walkingMinutes: 3, transfers: 0, stressScore: 30 },
  ];

  assert.equal(chooseRecommendedRoute(routes, 'fastest'), 0);
  assert.equal(chooseRecommendedRoute(routes, 'less-walking'), 1);
  assert.equal(chooseRecommendedRoute(routes, 'fewer-transfers'), 1);
  assert.equal(chooseRecommendedRoute(routes, 'balanced'), 1);
});

test('天気コードを表示アイコンへ変換する', () => {
  assert.equal(weatherIcon(0), '☀️');
  assert.equal(weatherIcon(63), '☔');
  assert.equal(weatherIcon(95), '⛈️');
});
