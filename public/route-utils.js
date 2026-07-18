export function parseScheduledDate(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTime(date) {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function calculateTimeline({
  scheduledAt,
  timeType,
  durationMinutes,
  preparationMinutes,
  bufferMinutes,
}) {
  const durationMs = Math.max(0, durationMinutes) * 60_000;
  const preparationMs = Math.max(0, preparationMinutes) * 60_000;
  const bufferMs = Math.max(0, bufferMinutes) * 60_000;

  if (timeType === 'arrival') {
    const departure = new Date(scheduledAt.getTime() - durationMs - bufferMs);
    return {
      preparationStart: new Date(departure.getTime() - preparationMs),
      recommendedDeparture: departure,
      expectedArrival: new Date(departure.getTime() + durationMs),
      bufferMinutes: Math.max(0, bufferMinutes),
    };
  }

  return {
    preparationStart: new Date(scheduledAt.getTime() - preparationMs),
    recommendedDeparture: new Date(scheduledAt),
    expectedArrival: new Date(scheduledAt.getTime() + durationMs),
    bufferMinutes: 0,
  };
}

function flattenSteps(route) {
  return (route.legs || []).flatMap((leg) => leg.steps || []);
}

function getDurationMinutes(route) {
  const durationMs = Number(route.durationMillis)
    || (route.legs || []).reduce((total, leg) => total + (Number(leg.durationMillis) || 0), 0);
  return Math.max(1, Math.round(durationMs / 60_000));
}

function getWalkingMinutes(steps) {
  const walkingSteps = steps.filter((step) => step.travelMode === 'WALKING');
  const durationMs = walkingSteps.reduce(
    (total, step) => total + (Number(step.staticDurationMillis) || 0),
    0,
  );
  if (durationMs > 0) return Math.round(durationMs / 60_000);

  const distanceMeters = walkingSteps.reduce(
    (total, step) => total + (Number(step.distanceMeters) || 0),
    0,
  );
  return Math.round(distanceMeters / 80);
}

function getTransitLines(steps) {
  return [...new Set(
    steps
      .map((step) => {
        const line = step.transitDetails?.transitLine;
        return line?.shortName || line?.name || '';
      })
      .filter(Boolean),
  )];
}

export function calculateStressScore({
  durationMinutes,
  walkingMinutes,
  transfers,
  trafficDelayMinutes = 0,
}) {
  const score = Math.round(
    16
      + Math.max(0, durationMinutes - 30) * 0.25
      + walkingMinutes * 1.3
      + transfers * 17
      + trafficDelayMinutes * 1.2,
  );
  return Math.min(100, Math.max(0, score));
}

export function getStressLabel(score) {
  if (score <= 35) return '快適';
  if (score <= 60) return '標準';
  return '負担高め';
}

export function summarizeGoogleRoute(route, index, travelMode) {
  const steps = flattenSteps(route);
  const durationMinutes = getDurationMinutes(route);
  const walkingMinutes = getWalkingMinutes(steps);
  const transitSteps = steps.filter((step) => step.travelMode === 'TRANSIT');
  const transfers = Math.max(0, transitSteps.length - 1);
  const staticMinutes = Math.round((Number(route.staticDurationMillis) || 0) / 60_000);
  const trafficDelayMinutes = staticMinutes > 0
    ? Math.max(0, durationMinutes - staticMinutes)
    : 0;
  const lines = getTransitLines(steps);
  const stressScore = calculateStressScore({
    durationMinutes,
    walkingMinutes,
    transfers,
    trafficDelayMinutes,
  });

  const modeNames = {
    BICYCLING: '自転車',
    DRIVING: '車',
    TRANSIT: '公共交通',
    WALKING: '徒歩',
  };

  return {
    index,
    name: lines.length > 0
      ? lines.join(' → ')
      : `${modeNames[travelMode] || '移動'}ルート ${index + 1}`,
    durationMinutes,
    distanceText: route.localizedValues?.distance || '',
    durationText: route.localizedValues?.duration || `${durationMinutes}分`,
    walkingMinutes,
    transfers,
    lines,
    stressScore,
    stressLabel: getStressLabel(stressScore),
    warnings: Array.isArray(route.warnings) ? route.warnings.filter(Boolean) : [],
  };
}

export function chooseRecommendedRoute(routes, preference) {
  if (routes.length === 0) return -1;

  const valueFor = (route) => {
    if (preference === 'fewer-transfers') {
      return route.transfers * 1_000 + route.walkingMinutes * 10 + route.durationMinutes;
    }
    if (preference === 'less-walking') {
      return route.walkingMinutes * 1_000 + route.transfers * 20 + route.durationMinutes;
    }
    if (preference === 'fastest') return route.durationMinutes;
    return route.stressScore * 100 + route.durationMinutes;
  };

  return routes.reduce(
    (bestIndex, route, index, all) => (
      valueFor(route) < valueFor(all[bestIndex]) ? index : bestIndex
    ),
    0,
  );
}

export function weatherIcon(code) {
  if (code === 0) return '☀️';
  if ([1, 2].includes(code)) return '🌤️';
  if (code === 3) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '☔';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
}

export function weatherLabel(code) {
  if (code === 0) return '快晴';
  if ([1, 2].includes(code)) return '晴れ時々曇り';
  if (code === 3) return '曇り';
  if ([45, 48].includes(code)) return '霧';
  if ([51, 53, 55, 56, 57].includes(code)) return '霧雨';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '雨';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '雪';
  if ([95, 96, 99].includes(code)) return '雷雨';
  return '天気情報';
}
