import {
  calculateTimeline,
  chooseRecommendedRoute,
  formatTime,
  parseScheduledDate,
  summarizeGoogleRoute,
  weatherIcon,
  weatherLabel,
} from './route-utils.js?v=4';

const STORAGE_KEYS = {
  places: 'route-concierge:places:v1',
  routes: 'route-concierge:routes:v1',
};

const state = {
  config: { mapsConfigured: false, geminiConfigured: false },
  autocomplete: {},
  currentRoutes: [],
  routeSummaries: [],
  recommendedIndex: 0,
  selectedIndex: 0,
  map: null,
  mapPolylines: [],
  mapMarkers: [],
  mapRenderId: 0,
  drivingDepartureTime: null,
  searchId: 0,
  aiAbortController: null,
  demoMode: false,
  RouteClass: null,
};

const elements = {};

function byId(id) {
  return document.getElementById(id);
}

function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = String(options.text);
  if (options.type) element.type = options.type;
  return element;
}

function setStatus(element, text, status = '') {
  element.textContent = text;
  element.classList.remove('ready', 'error', 'demo');
  if (status) element.classList.add(status);
}

function showMessage(message, isError = false) {
  elements.routeMessage.textContent = message;
  elements.routeMessage.classList.toggle('error', isError);
}

function localDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initializeDateTime() {
  const defaultTime = new Date(Date.now() + 60 * 60_000);
  defaultTime.setMinutes(Math.ceil(defaultTime.getMinutes() / 5) * 5, 0, 0);
  elements.commuteDate.value = localDateValue(defaultTime);
  elements.commuteTime.value = `${String(defaultTime.getHours()).padStart(2, '0')}:${String(defaultTime.getMinutes()).padStart(2, '0')}`;
}

function safelyReadList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveList(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function migrateLegacyStorage() {
  const places = safelyReadList(STORAGE_KEYS.places);
  const routes = safelyReadList(STORAGE_KEYS.routes);
  const migratedPlaces = [...places];
  const migratedRoutes = [...routes];
  const keysToRemove = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('PLACE_')) {
      migratedPlaces.push({
        id: crypto.randomUUID(),
        name: key.slice('PLACE_'.length).slice(0, 40),
        address: (localStorage.getItem(key) || '').slice(0, 160),
      });
      keysToRemove.push(key);
    }
    if (key?.startsWith('ROUTE_')) {
      const [origin, destination] = (localStorage.getItem(key) || '').split('|');
      if (origin && destination) {
        migratedRoutes.push({
          id: crypto.randomUUID(),
          name: key.slice('ROUTE_'.length).slice(0, 40),
          origin: origin.slice(0, 160),
          destination: destination.slice(0, 160),
        });
      }
      keysToRemove.push(key);
    }
  }

  if (migratedPlaces.length !== places.length) saveList(STORAGE_KEYS.places, migratedPlaces);
  if (migratedRoutes.length !== routes.length) saveList(STORAGE_KEYS.routes, migratedRoutes);
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  // 旧版がブラウザー内に保存していたAPIキーは、新版では利用しない。
  localStorage.removeItem('GMAP_KEY');
  localStorage.removeItem('GEMINI_KEY');
}

async function loadConfiguration() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('設定を取得できませんでした。');
    state.config = await response.json();
    if (state.config.personalSetupEnabled) {
      elements.personalApiSetup.classList.remove('hidden');
      elements.apiConfigNote.textContent = '個人用の一時設定です。キーはブラウザに保存されず、サーバーを再起動すると消去されます。';
    }

    setStatus(
      elements.mapsConfigStatus,
      state.config.mapsConfigured ? '接続済み' : '未設定',
      state.config.mapsConfigured ? 'ready' : 'error',
    );
    setStatus(
      elements.geminiConfigStatus,
      state.config.geminiConfigured ? '接続済み' : '未設定',
      state.config.geminiConfigured ? 'ready' : 'error',
    );

    if (state.config.mapsConfigured && state.config.googleMapsApiKey) {
      await loadGoogleMaps(state.config.googleMapsApiKey);
    } else {
      enableDemoMode();
    }
  } catch (error) {
    enableDemoMode();
    setStatus(elements.mapsStatus, '接続エラー', 'error');
    showMessage(error instanceof Error ? error.message : '初期化に失敗しました。', true);
  }
}

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly&language=ja&region=JP`;
    script.async = true;
    script.onerror = () => reject(new Error('Google Mapsを読み込めませんでした。APIの制限設定を確認してください。'));
    script.onload = async () => {
      try {
        await initializeGoogleMaps();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    document.head.appendChild(script);
  });
}

async function initializeGoogleMaps() {
  const [{ Map }, { PlaceAutocompleteElement }, { Route }] = await Promise.all([
    google.maps.importLibrary('maps'),
    google.maps.importLibrary('places'),
    google.maps.importLibrary('routes'),
  ]);

  state.RouteClass = Route;
  state.autocomplete.origin = new PlaceAutocompleteElement({
    placeholder: '出発地を検索',
    requestedLanguage: 'ja',
    requestedRegion: 'JP',
  });
  state.autocomplete.destination = new PlaceAutocompleteElement({
    placeholder: '目的地を検索',
    requestedLanguage: 'ja',
    requestedRegion: 'JP',
  });

  elements.originAutocomplete.append(state.autocomplete.origin);
  elements.destinationAutocomplete.append(state.autocomplete.destination);
  attachPlaceSelection(state.autocomplete.origin);
  attachPlaceSelection(state.autocomplete.destination);

  state.map = new Map(elements.map, {
    center: { lat: 35.6812, lng: 139.7671 },
    zoom: 11,
    mapId: 'DEMO_MAP_ID',
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  state.demoMode = false;
  elements.demoSample.classList.add('hidden');
  elements.mapPlaceholder.classList.add('hidden');
  elements.searchRouteLabel.textContent = '最適なルートを調べる';
  setStatus(elements.mapsStatus, '接続済み', 'ready');
}

function attachPlaceSelection(autocomplete) {
  autocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
    try {
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'displayName'] });
      autocomplete.value = place.formattedAddress || place.displayName || autocomplete.value;
    } catch {
      // 候補の表示文字列は残るため、詳細取得だけに失敗した場合は入力を維持する。
    }
  });
}

function enableFallbackInputs() {
  elements.originAutocomplete.classList.add('hidden');
  elements.destinationAutocomplete.classList.add('hidden');
  elements.originFallback.classList.remove('hidden');
  elements.destinationFallback.classList.remove('hidden');
}

function enableDemoMode() {
  state.demoMode = true;
  enableFallbackInputs();
  elements.demoSample.classList.remove('hidden');
  setStatus(elements.mapsStatus, 'デモ', 'demo');
  elements.searchRouteLabel.textContent = 'デモ結果を表示';
  elements.routeDataSource.textContent = 'デモデータ';
  elements.mapPlaceholder.classList.remove('hidden');
  showMessage('出発地と目的地を入力すると、API設定前でも完成イメージを確認できます。');
}

function runDemoSample() {
  setLocationValue('origin', '横浜駅');
  setLocationValue('destination', '東京駅');
  runDemoSearch();
}

function enterResultsMode(input) {
  const timeTypeLabel = input.timeType === 'arrival' ? '到着' : '出発';
  const modeLabel = elements.travelMode.selectedOptions[0]?.textContent || '';
  const dateLabel = new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(input.scheduledAt);

  elements.compactRouteText.textContent = `${input.origin} → ${input.destination}`;
  elements.compactTimeText.textContent = `${dateLabel} ${formatTime(input.scheduledAt)} ${timeTypeLabel}・${modeLabel}`;
  elements.routeFormBody.classList.add('hidden');
  elements.compactSearchSummary.classList.remove('hidden');
  elements.routePanel.classList.add('results-mode');

  window.requestAnimationFrame(() => {
    elements.aiSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function exitResultsMode() {
  elements.routePanel.classList.remove('results-mode');
  elements.compactSearchSummary.classList.add('hidden');
  elements.routeFormBody.classList.remove('hidden');
  elements.aiSection.classList.add('hidden');
  elements.timelineSection.classList.add('hidden');
  elements.resultsSection.classList.add('hidden');
  elements.routePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getLocationValue(type) {
  const autocomplete = state.autocomplete[type];
  if (autocomplete) return String(autocomplete.value || '').trim();
  return String(
    type === 'origin' ? elements.originFallback.value : elements.destinationFallback.value,
  ).trim();
}

function setLocationValue(type, value) {
  const autocomplete = state.autocomplete[type];
  if (autocomplete) autocomplete.value = value;
  const fallback = type === 'origin' ? elements.originFallback : elements.destinationFallback;
  fallback.value = value;
}

function swapLocations() {
  const origin = getLocationValue('origin');
  const destination = getLocationValue('destination');
  setLocationValue('origin', destination);
  setLocationValue('destination', origin);
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('この端末では位置情報を利用できません。'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      () => reject(new Error('位置情報を取得できませんでした。端末の許可設定を確認してください。')),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

async function useCurrentLocation() {
  try {
    showMessage('現在地を取得しています…');
    const position = await getPosition();
    setLocationValue('origin', `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`);
    await loadWeatherForPosition(position);
    showMessage('現在地を出発地に設定しました。');
  } catch (error) {
    showMessage(error instanceof Error ? error.message : '現在地を取得できませんでした。', true);
  }
}

async function loadWeather() {
  elements.loadWeather.disabled = true;
  try {
    const position = await getPosition();
    await loadWeatherForPosition(position);
  } catch (error) {
    elements.weatherSummary.textContent = error instanceof Error
      ? error.message
      : '天気を取得できませんでした。';
  } finally {
    elements.loadWeather.disabled = false;
  }
}

async function loadWeatherForPosition({ lat, lng }) {
  elements.weatherSummary.textContent = '天気を取得しています…';
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'temperature_2m,weather_code',
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    forecast_days: '2',
    timezone: 'auto',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error('天気情報を取得できませんでした。');
  const data = await response.json();
  const currentCode = Number(data.current?.weather_code);
  const temperature = Math.round(Number(data.current?.temperature_2m));
  elements.weatherIcon.textContent = weatherIcon(currentCode);
  elements.weatherTitle.textContent = '現在地の天気';
  elements.weatherSummary.textContent = `${weatherLabel(currentCode)} / ${temperature}℃`;
  renderForecast(data.hourly);
}

function renderForecast(hourly) {
  elements.weatherForecast.replaceChildren();
  if (!hourly?.time || !hourly?.temperature_2m) return;
  const now = Date.now();
  const firstIndex = Math.max(
    0,
    hourly.time.findIndex((time) => new Date(time).getTime() >= now),
  );

  for (let index = firstIndex; index < Math.min(firstIndex + 7, hourly.time.length); index += 1) {
    const item = createElement('div', { className: 'forecast-item' });
    item.append(
      createElement('span', { text: `${String(new Date(hourly.time[index]).getHours()).padStart(2, '0')}:00` }),
      createElement('span', { text: weatherIcon(Number(hourly.weather_code[index])) }),
      createElement('span', { text: `${Math.round(hourly.temperature_2m[index])}℃` }),
    );
    if (Number(hourly.precipitation_probability?.[index]) >= 40) {
      item.title = `降水確率 ${hourly.precipitation_probability[index]}%`;
    }
    elements.weatherForecast.append(item);
  }
}

function validateRouteInput() {
  const origin = getLocationValue('origin');
  const destination = getLocationValue('destination');
  const scheduledAt = parseScheduledDate(elements.commuteDate.value, elements.commuteTime.value);
  const timeType = document.querySelector('input[name="time-type"]:checked')?.value;

  if (!origin || !destination) throw new Error('出発地と目的地を入力してください。');
  if (!scheduledAt) throw new Error('日付と時刻を入力してください。');
  if (scheduledAt.getTime() < Date.now() - 5 * 60_000) {
    throw new Error('現在より後の日時を指定してください。');
  }
  if (
    elements.travelMode.value === 'TRANSIT'
    && scheduledAt.getTime() > Date.now() + 100 * 24 * 60 * 60_000
  ) {
    throw new Error('公共交通の検索日時は100日以内にしてください。');
  }

  return { origin, destination, scheduledAt, timeType };
}

function buildRouteRequest({ origin, destination, scheduledAt, timeType }) {
  const travelMode = elements.travelMode.value;
  const preference = elements.routePreference.value;
  const bufferMinutes = timeType === 'arrival'
    ? Number(elements.bufferMinutes.value) || 0
    : 0;
  const effectiveTime = new Date(scheduledAt.getTime() - bufferMinutes * 60_000);
  const request = {
    origin,
    destination,
    travelMode,
    computeAlternativeRoutes: true,
    language: 'ja',
    region: 'JP',
    units: google.maps.UnitSystem.METRIC,
    fields: [
      'path',
      'legs',
      'localizedValues',
      'durationMillis',
      'staticDurationMillis',
      'distanceMeters',
      'warnings',
      'viewport',
    ],
  };

  if (travelMode === 'TRANSIT') {
    if (timeType === 'arrival') request.arrivalTime = effectiveTime;
    else request.departureTime = effectiveTime;
    request.transitPreference = {
      allowedTransitModes: ['BUS', 'SUBWAY', 'TRAIN', 'LIGHT_RAIL', 'RAIL'],
    };
    if (preference === 'fewer-transfers') {
      request.transitPreference.routingPreference = 'FEWER_TRANSFERS';
    }
    if (preference === 'less-walking') {
      request.transitPreference.routingPreference = 'LESS_WALKING';
    }
  }

  if (travelMode === 'DRIVING' && timeType === 'departure') {
    request.departureTime = effectiveTime;
    request.routingPreference = 'TRAFFIC_AWARE';
  }

  return request;
}

async function computeRoutes(input) {
  const request = buildRouteRequest(input);
  let result = await state.RouteClass.computeRoutes(request);
  let routes = result.routes || [];

  if (elements.travelMode.value !== 'DRIVING' || input.timeType !== 'arrival') {
    return { routes, drivingDepartureTime: null };
  }

  const bufferMs = (Number(elements.bufferMinutes.value) || 0) * 60_000;
  let queriedDepartureTime = null;
  for (let attempt = 0; attempt < 3 && routes[0]; attempt += 1) {
    const durationMs = Number(routes[0].durationMillis);
    if (!durationMs) break;
    const estimatedDeparture = new Date(input.scheduledAt.getTime() - durationMs - bufferMs);
    if (estimatedDeparture.getTime() <= Date.now()) {
      throw new Error('指定した到着時刻に間に合う出発時刻を計算できません。到着時刻を遅らせてください。');
    }
    if (
      queriedDepartureTime
      && Math.abs(queriedDepartureTime.getTime() - estimatedDeparture.getTime()) < 60_000
    ) {
      break;
    }
    request.departureTime = estimatedDeparture;
    request.routingPreference = 'TRAFFIC_AWARE';
    result = await state.RouteClass.computeRoutes(request);
    routes = result.routes || [];
    queriedDepartureTime = estimatedDeparture;
  }

  return { routes, drivingDepartureTime: queriedDepartureTime };
}

async function searchRoutes() {
  if (!state.RouteClass) {
    runDemoSearch();
    return;
  }

  elements.searchRoute.disabled = true;
  const searchId = ++state.searchId;
  state.aiAbortController?.abort();
  showMessage('正確な経路情報を調べています…');
  try {
    const input = validateRouteInput();
    const { routes, drivingDepartureTime } = await computeRoutes(input);
    if (routes.length === 0) throw new Error('条件に合うルートが見つかりませんでした。');

    state.currentRoutes = routes;
    state.drivingDepartureTime = drivingDepartureTime;
    state.routeSummaries = routes.map((route, index) => (
      summarizeGoogleRoute(route, index, elements.travelMode.value)
    ));
    state.recommendedIndex = chooseRecommendedRoute(
      state.routeSummaries,
      elements.routePreference.value,
    );
    state.selectedIndex = state.recommendedIndex;

    renderRouteResults();
    renderTimeline(state.routeSummaries[state.recommendedIndex], input);
    renderMapRoute(state.recommendedIndex);
    renderLocalRecommendation(state.routeSummaries[state.recommendedIndex]);
    elements.resultsSection.classList.remove('hidden');
    elements.timelineSection.classList.remove('hidden');
    elements.aiSection.classList.remove('hidden');
    enterResultsMode(input);
    showMessage(`${routes.length}件の候補を比較しました。時刻はGoogle Mapsの経路情報から計算しています。`);
    void requestAiRecommendation(input, searchId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '経路検索に失敗しました。';
    showMessage(`検索できませんでした：${message}`, true);
  } finally {
    elements.searchRoute.disabled = false;
  }
}

function demoRouteSummaries() {
  const transit = elements.travelMode.value === 'TRANSIT';
  const driving = elements.travelMode.value === 'DRIVING';
  const walking = elements.travelMode.value === 'WALKING';
  const durations = driving ? [34, 39, 31] : transit ? [42, 49, 46] : walking ? [48, 53, 45] : [28, 31, 26];
  const stressScores = transit ? [38, 35, 52] : walking ? [58, 63, 55] : [31, 29, 27];
  const stressLabels = stressScores.map((score) => (
    score <= 35 ? '快適' : score <= 60 ? '標準' : '負担高め'
  ));
  return [
    {
      index: 0,
      name: 'バランスルート',
      durationMinutes: durations[0],
      distanceText: '約12.4 km',
      durationText: `${durations[0]}分`,
      walkingMinutes: walking ? durations[0] : driving ? 1 : transit ? 7 : 0,
      transfers: transit ? 1 : 0,
      lines: [],
      stressScore: stressScores[0],
      stressLabel: stressLabels[0],
      warnings: [],
      departureTime: null,
      arrivalTime: null,
    },
    {
      index: 1,
      name: transit ? '乗換少なめ' : 'ゆったりルート',
      durationMinutes: durations[1],
      distanceText: '約13.1 km',
      durationText: `${durations[1]}分`,
      walkingMinutes: walking ? durations[1] : driving ? 1 : transit ? 10 : 0,
      transfers: 0,
      lines: [],
      stressScore: stressScores[1],
      stressLabel: stressLabels[1],
      warnings: [],
      departureTime: null,
      arrivalTime: null,
    },
    {
      index: 2,
      name: transit ? '徒歩少なめ' : '最短ルート',
      durationMinutes: durations[2],
      distanceText: '約11.8 km',
      durationText: `${durations[2]}分`,
      walkingMinutes: walking ? durations[2] : driving ? 1 : transit ? 3 : 0,
      transfers: transit ? 2 : 0,
      lines: [],
      stressScore: stressScores[2],
      stressLabel: stressLabels[2],
      warnings: [],
      departureTime: null,
      arrivalTime: null,
    },
  ];
}

function runDemoSearch() {
  elements.searchRoute.disabled = true;
  try {
    const input = validateRouteInput();
    state.demoMode = true;
    state.currentRoutes = [];
    state.drivingDepartureTime = null;
    state.routeSummaries = demoRouteSummaries();
    state.recommendedIndex = chooseRecommendedRoute(
      state.routeSummaries,
      elements.routePreference.value,
    );
    state.selectedIndex = state.recommendedIndex;
    renderRouteResults();
    renderTimeline(state.routeSummaries[state.recommendedIndex], input);
    renderMapRoute(state.recommendedIndex);
    renderLocalRecommendation(state.routeSummaries[state.recommendedIndex]);
    elements.aiCautions.replaceChildren(
      createElement('li', { text: 'これは画面確認用のデモです。時刻・距離・経路は実際の検索結果ではありません。' }),
    );
    elements.routeDataSource.textContent = 'デモデータ（実際の経路ではありません）';
    elements.resultsSection.classList.remove('hidden');
    elements.timelineSection.classList.remove('hidden');
    elements.aiSection.classList.remove('hidden');
    enterResultsMode(input);
    showMessage('デモ結果を表示しています。API設定後は実際の経路に切り替わります。');
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'デモを表示できませんでした。', true);
  } finally {
    elements.searchRoute.disabled = false;
  }
}

function stressClass(score) {
  if (score <= 35) return 'stress-low';
  if (score <= 60) return 'stress-medium';
  return 'stress-high';
}

function metric(label, value, className = '') {
  const item = createElement('div', { className: 'metric' });
  const strong = createElement('strong', { text: value });
  if (className) strong.classList.add(className);
  item.append(strong, createElement('span', { text: label }));
  return item;
}

function renderRouteResults() {
  elements.routeResults.replaceChildren();
  state.routeSummaries.forEach((route, index) => {
    const card = createElement('button', {
      className: `route-card${index === state.selectedIndex ? ' selected' : ''}`,
      type: 'button',
    });
    const header = createElement('div', { className: 'route-card-header' });
    const titleWrap = createElement('div');
    titleWrap.append(
      createElement('h3', { text: route.name }),
      createElement('span', { className: 'small-note', text: route.distanceText || '距離情報なし' }),
    );
    header.append(titleWrap);
    if (index === state.recommendedIndex) {
      header.append(createElement('span', { className: 'recommended-label', text: 'おすすめ' }));
    }

    const metrics = createElement('div', { className: 'route-metrics' });
    metrics.append(
      metric('所要時間', route.durationText),
      metric('徒歩', `${route.walkingMinutes}分`),
      metric('乗換', `${route.transfers}回`),
      metric('負担度', `${route.stressScore}・${route.stressLabel}`, stressClass(route.stressScore)),
    );
    card.append(header, metrics);

    if (route.warnings.length > 0) {
      card.append(createElement('p', {
        className: 'route-warning',
        text: route.warnings.join(' / '),
      }));
    }
    card.addEventListener('click', () => selectRoute(index));
    elements.routeResults.append(card);
  });
}

function selectRoute(index) {
  state.selectedIndex = index;
  renderRouteResults();
  const input = validateRouteInput();
  renderTimeline(state.routeSummaries[index], input);
  renderMapRoute(index);
}

function renderTimeline(route, input) {
  const useTransitSchedule = elements.travelMode.value === 'TRANSIT';
  const useDrivingArrivalTime = (
    elements.travelMode.value === 'DRIVING'
    && input.timeType === 'arrival'
    && state.drivingDepartureTime
  );
  const actualDeparture = useTransitSchedule
    ? route.departureTime
    : useDrivingArrivalTime
      ? state.drivingDepartureTime
      : null;
  const actualArrival = useTransitSchedule
    ? route.arrivalTime
    : useDrivingArrivalTime
      ? new Date(state.drivingDepartureTime.getTime() + route.durationMinutes * 60_000)
      : null;
  const timeline = calculateTimeline({
    scheduledAt: input.scheduledAt,
    timeType: input.timeType,
    durationMinutes: route.durationMinutes,
    preparationMinutes: Number(elements.preparationMinutes.value) || 0,
    bufferMinutes: Number(elements.bufferMinutes.value) || 0,
    actualDeparture,
    actualArrival,
  });
  const items = [
    ['準備開始', formatTime(timeline.preparationStart), '身支度をスタート'],
    ['家を出る', formatTime(timeline.recommendedDeparture), '推奨出発時刻'],
    [
      '到着見込み',
      formatTime(timeline.expectedArrival),
      timeline.lateMinutes
        ? `希望より${timeline.lateMinutes}分遅い見込み`
        : timeline.bufferMinutes
          ? `${timeline.bufferMinutes}分の余裕`
          : '予定どおり',
    ],
  ];
  elements.timeline.replaceChildren();
  items.forEach(([label, value, note]) => {
    const item = createElement('div', { className: 'timeline-item' });
    item.append(
      createElement('span', { text: label }),
      createElement('strong', { text: value }),
      createElement('small', { text: note }),
    );
    elements.timeline.append(item);
  });
}

async function renderMapRoute(index) {
  if (state.demoMode || !state.map || !state.currentRoutes[index]) {
    elements.mapPlaceholder.textContent = 'API設定後に実際のルート地図が表示されます';
    elements.mapPlaceholder.classList.remove('hidden');
    return;
  }
  const renderId = ++state.mapRenderId;
  state.mapPolylines.forEach((polyline) => polyline.setMap(null));
  state.mapMarkers.forEach((marker) => { marker.map = null; });
  state.mapPolylines = [];
  state.mapMarkers = [];

  try {
    const route = state.currentRoutes[index];
    const polylines = route.createPolylines();
    polylines.forEach((polyline) => polyline.setMap(state.map));
    const markers = await route.createWaypointAdvancedMarkers();
    if (renderId !== state.mapRenderId) {
      polylines.forEach((polyline) => polyline.setMap(null));
      markers.forEach((marker) => { marker.map = null; });
      return;
    }
    state.mapPolylines = polylines;
    state.mapMarkers = markers;
    state.mapMarkers.forEach((marker) => { marker.map = state.map; });
    if (route.viewport) state.map.fitBounds(route.viewport);
  } catch {
    // 経路一覧は利用できるため、描画だけに失敗した場合は検索結果を維持する。
  }
}

function renderLocalRecommendation(route) {
  elements.aiSummary.textContent = `${route.name}は、所要${route.durationMinutes}分・徒歩${route.walkingMinutes}分・乗換${route.transfers}回です。`;
  elements.aiReason.textContent = `${state.demoMode ? 'デモでは、' : ''}選択した「${preferenceLabel(elements.routePreference.value)}」を基準に、負担度${route.stressScore}のルートをおすすめしています。`;
  elements.aiCautions.replaceChildren(
    createElement('li', { text: '運行状況や時刻は変わる場合があります。出発前に最新情報を確認してください。' }),
  );
}

async function savePersonalApiConfig(event) {
  event.preventDefault();
  elements.apiConfigMessage.textContent = 'API設定を反映しています…';
  try {
    const response = await fetch('/api/personal-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleMapsApiKey: elements.googleApiKey.value,
        geminiApiKey: elements.geminiApiKey.value,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'API設定に失敗しました。');
    elements.apiConfigMessage.textContent = '設定しました。画面を再読み込みします…';
    window.setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    elements.apiConfigMessage.textContent = error instanceof Error
      ? error.message
      : 'API設定に失敗しました。';
  }
}

async function clearPersonalApiConfig() {
  elements.apiConfigMessage.textContent = '一時設定を削除しています…';
  try {
    const response = await fetch('/api/personal-config', { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '一時設定を削除できませんでした。');
    elements.apiConfigMessage.textContent = '削除しました。画面を再読み込みします…';
    window.setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    elements.apiConfigMessage.textContent = error instanceof Error
      ? error.message
      : '一時設定を削除できませんでした。';
  }
}

function preferenceLabel(value) {
  const labels = {
    balanced: '負担の少なさ',
    fastest: '速さ',
    'fewer-transfers': '乗換の少なさ',
    'less-walking': '徒歩の少なさ',
  };
  return labels[value] || '負担の少なさ';
}

async function requestAiRecommendation(input, searchId) {
  if (!state.config.geminiConfigured) {
    elements.aiCautions.append(
      createElement('li', { text: 'Gemini未設定のため、現在はルールベースで比較しています。' }),
    );
    return;
  }

  try {
    const abortController = new AbortController();
    state.aiAbortController = abortController;
    const timeout = window.setTimeout(() => abortController.abort(), 13_000);
    const response = await fetch('/api/concierge', {
      method: 'POST',
      signal: abortController.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: input.origin,
        destination: input.destination,
        preference: preferenceLabel(elements.routePreference.value),
        recommendedRouteIndex: state.recommendedIndex,
        routes: state.routeSummaries,
      }),
    }).finally(() => window.clearTimeout(timeout));
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'AIの提案を取得できませんでした。');
    if (searchId !== state.searchId) return;

    elements.aiSummary.textContent = result.summary;
    elements.aiReason.textContent = result.reason;
    elements.aiCautions.replaceChildren();
    (Array.isArray(result.cautions) ? result.cautions : []).forEach((caution) => {
      elements.aiCautions.append(createElement('li', { text: caution }));
    });
    elements.aiCautions.append(
      createElement('li', { text: 'AIはGoogle Mapsの候補を説明しています。運休や遅延を予測するものではありません。' }),
    );
  } catch (error) {
    if (searchId !== state.searchId || (error instanceof Error && error.name === 'AbortError')) {
      return;
    }
    elements.aiCautions.append(
      createElement('li', {
        text: `AI説明を取得できなかったため、計算結果を表示しています。${error instanceof Error ? `（${error.message}）` : ''}`,
      }),
    );
  } finally {
    if (searchId === state.searchId) state.aiAbortController = null;
  }
}

function renderEmptyState(container) {
  const template = byId('empty-state-template');
  container.append(template.content.cloneNode(true));
}

function renderPlaces() {
  const places = safelyReadList(STORAGE_KEYS.places);
  elements.placeList.replaceChildren();
  elements.favoritePlaceChips.replaceChildren();

  if (places.length === 0) {
    renderEmptyState(elements.placeList);
    return;
  }

  places.forEach((place) => {
    const chip = createElement('button', { className: 'chip', text: `📍 ${place.name}`, type: 'button' });
    chip.title = '目的地に設定';
    chip.addEventListener('click', () => setLocationValue('destination', place.address));
    elements.favoritePlaceChips.append(chip);

    const item = createElement('div', { className: 'saved-item' });
    const content = createElement('div');
    content.append(
      createElement('strong', { text: place.name }),
      createElement('small', { text: place.address }),
    );
    const actions = createElement('div', { className: 'item-actions' });
    const useButton = createElement('button', { className: 'text-button', text: '使う', type: 'button' });
    const editButton = createElement('button', { className: 'text-button', text: '編集', type: 'button' });
    const deleteButton = createElement('button', { className: 'text-button danger', text: '削除', type: 'button' });
    useButton.addEventListener('click', () => setLocationValue('destination', place.address));
    editButton.addEventListener('click', () => startPlaceEdit(place));
    deleteButton.addEventListener('click', () => deletePlace(place.id));
    actions.append(useButton, editButton, deleteButton);
    item.append(content, actions);
    elements.placeList.append(item);
  });
}

function startPlaceEdit(place) {
  elements.placeId.value = place.id;
  elements.placeName.value = place.name;
  elements.placeAddress.value = place.address;
  elements.cancelPlaceEdit.classList.remove('hidden');
  elements.placeName.focus();
}

function resetPlaceForm() {
  elements.placeForm.reset();
  elements.placeId.value = '';
  elements.cancelPlaceEdit.classList.add('hidden');
}

function savePlace(event) {
  event.preventDefault();
  const name = elements.placeName.value.trim();
  const address = elements.placeAddress.value.trim();
  if (!name || !address) return;
  const places = safelyReadList(STORAGE_KEYS.places);
  const id = elements.placeId.value || crypto.randomUUID();
  const existingIndex = places.findIndex((place) => place.id === id);
  const value = { id, name: name.slice(0, 40), address: address.slice(0, 160) };
  if (existingIndex >= 0) places[existingIndex] = value;
  else places.push(value);
  saveList(STORAGE_KEYS.places, places);
  resetPlaceForm();
  renderPlaces();
}

function deletePlace(id) {
  if (!window.confirm('この場所を削除しますか？')) return;
  saveList(
    STORAGE_KEYS.places,
    safelyReadList(STORAGE_KEYS.places).filter((place) => place.id !== id),
  );
  renderPlaces();
}

function renderSavedRoutes() {
  const routes = safelyReadList(STORAGE_KEYS.routes);
  elements.savedRouteList.replaceChildren();
  if (routes.length === 0) {
    renderEmptyState(elements.savedRouteList);
    return;
  }

  routes.forEach((route) => {
    const item = createElement('div', { className: 'saved-item' });
    const content = createElement('div');
    content.append(
      createElement('strong', { text: route.name }),
      createElement('small', { text: `${route.origin} → ${route.destination}` }),
    );
    const actions = createElement('div', { className: 'item-actions' });
    const useButton = createElement('button', { className: 'text-button', text: '使う', type: 'button' });
    const editButton = createElement('button', { className: 'text-button', text: '編集', type: 'button' });
    const deleteButton = createElement('button', { className: 'text-button danger', text: '削除', type: 'button' });
    useButton.addEventListener('click', () => {
      setLocationValue('origin', route.origin);
      setLocationValue('destination', route.destination);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    editButton.addEventListener('click', () => startRouteEdit(route));
    deleteButton.addEventListener('click', () => deleteSavedRoute(route.id));
    actions.append(useButton, editButton, deleteButton);
    item.append(content, actions);
    elements.savedRouteList.append(item);
  });
}

function startRouteEdit(route) {
  elements.savedRouteId.value = route.id;
  elements.savedRouteName.value = route.name;
  elements.savedRouteOrigin.value = route.origin;
  elements.savedRouteDestination.value = route.destination;
  elements.cancelRouteEdit.classList.remove('hidden');
  elements.savedRouteName.focus();
}

function resetRouteForm() {
  elements.savedRouteForm.reset();
  elements.savedRouteId.value = '';
  elements.cancelRouteEdit.classList.add('hidden');
}

function saveRoute(event) {
  event.preventDefault();
  const name = elements.savedRouteName.value.trim();
  const origin = elements.savedRouteOrigin.value.trim();
  const destination = elements.savedRouteDestination.value.trim();
  if (!name || !origin || !destination) return;
  const routes = safelyReadList(STORAGE_KEYS.routes);
  const id = elements.savedRouteId.value || crypto.randomUUID();
  const existingIndex = routes.findIndex((route) => route.id === id);
  const value = {
    id,
    name: name.slice(0, 40),
    origin: origin.slice(0, 160),
    destination: destination.slice(0, 160),
  };
  if (existingIndex >= 0) routes[existingIndex] = value;
  else routes.push(value);
  saveList(STORAGE_KEYS.routes, routes);
  resetRouteForm();
  renderSavedRoutes();
}

function deleteSavedRoute(id) {
  if (!window.confirm('このルートを削除しますか？')) return;
  saveList(
    STORAGE_KEYS.routes,
    safelyReadList(STORAGE_KEYS.routes).filter((route) => route.id !== id),
  );
  renderSavedRoutes();
}

function cacheElements() {
  Object.assign(elements, {
    aiCautions: byId('ai-cautions'),
    apiConfigForm: byId('api-config-form'),
    apiConfigMessage: byId('api-config-message'),
    apiConfigNote: byId('api-config-note'),
    aiReason: byId('ai-reason'),
    aiSection: byId('ai-section'),
    aiSummary: byId('ai-summary'),
    bufferMinutes: byId('buffer-minutes'),
    cancelPlaceEdit: byId('cancel-place-edit'),
    cancelRouteEdit: byId('cancel-route-edit'),
    commuteDate: byId('commute-date'),
    commuteTime: byId('commute-time'),
    compactRouteText: byId('compact-route-text'),
    compactSearchSummary: byId('compact-search-summary'),
    compactTimeText: byId('compact-time-text'),
    destinationAutocomplete: byId('destination-autocomplete'),
    destinationFallback: byId('destination-fallback'),
    demoSample: byId('demo-sample'),
    favoritePlaceChips: byId('favorite-place-chips'),
    geminiConfigStatus: byId('gemini-config-status'),
    geminiApiKey: byId('gemini-api-key'),
    googleApiKey: byId('google-api-key'),
    loadWeather: byId('load-weather'),
    map: byId('map'),
    mapPlaceholder: byId('map-placeholder'),
    mapsConfigStatus: byId('maps-config-status'),
    mapsStatus: byId('maps-status'),
    originAutocomplete: byId('origin-autocomplete'),
    originFallback: byId('origin-fallback'),
    placeAddress: byId('place-address'),
    placeForm: byId('place-form'),
    placeId: byId('place-id'),
    placeList: byId('place-list'),
    placeName: byId('place-name'),
    personalApiSetup: byId('personal-api-setup'),
    preparationMinutes: byId('preparation-minutes'),
    resultsSection: byId('results-section'),
    routeFormBody: byId('route-form-body'),
    routeMessage: byId('route-message'),
    routePanel: byId('route-panel'),
    routeDataSource: byId('route-data-source'),
    routePreference: byId('route-preference'),
    routeResults: byId('route-results'),
    savedRouteDestination: byId('saved-route-destination'),
    savedRouteForm: byId('saved-route-form'),
    savedRouteId: byId('saved-route-id'),
    savedRouteList: byId('saved-route-list'),
    savedRouteName: byId('saved-route-name'),
    savedRouteOrigin: byId('saved-route-origin'),
    searchRoute: byId('search-route'),
    searchRouteLabel: byId('search-route-label'),
    settingsDialog: byId('settings-dialog'),
    timeline: byId('timeline'),
    timelineSection: byId('timeline-section'),
    travelMode: byId('travel-mode'),
    weatherForecast: byId('weather-forecast'),
    weatherIcon: byId('weather-icon'),
    weatherSummary: byId('weather-summary'),
    weatherTitle: byId('weather-title'),
  });
}

function attachEvents() {
  byId('swap-locations').addEventListener('click', swapLocations);
  elements.demoSample.addEventListener('click', runDemoSample);
  byId('edit-search').addEventListener('click', exitResultsMode);
  byId('current-location').addEventListener('click', useCurrentLocation);
  elements.loadWeather.addEventListener('click', loadWeather);
  elements.searchRoute.addEventListener('click', searchRoutes);
  elements.placeForm.addEventListener('submit', savePlace);
  elements.savedRouteForm.addEventListener('submit', saveRoute);
  elements.apiConfigForm.addEventListener('submit', savePersonalApiConfig);
  byId('clear-api-config').addEventListener('click', clearPersonalApiConfig);
  elements.cancelPlaceEdit.addEventListener('click', resetPlaceForm);
  elements.cancelRouteEdit.addEventListener('click', resetRouteForm);
  byId('open-settings').addEventListener('click', () => elements.settingsDialog.showModal());
  byId('close-settings').addEventListener('click', () => elements.settingsDialog.close());
  elements.settingsDialog.addEventListener('click', (event) => {
    if (event.target === elements.settingsDialog) elements.settingsDialog.close();
  });
}

async function initialize() {
  cacheElements();
  migrateLegacyStorage();
  initializeDateTime();
  attachEvents();
  renderPlaces();
  renderSavedRoutes();
  elements.routePanel.insertAdjacentElement('afterend', elements.aiSection);
  await loadConfiguration();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
}

initialize();
