const form = document.querySelector('#atlas-form');
const graph = document.querySelector('#graph');
const status = document.querySelector('#status');
const detail = document.querySelector('#detail');
const title = document.querySelector('#graph-title');
const meta = document.querySelector('#graph-meta');
const button = document.querySelector('#explore');
const NS = 'http://www.w3.org/2000/svg';
let current = null;

function svg(tag, attrs = {}) {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  return element;
}

function clear(element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function api(path, options = {}) {
  return fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } })
    .then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Request failed');
      return payload;
    });
}

function positions(nodes) {
  const center = { x: 450, y: 310 };
  const groups = new Map();
  for (const node of nodes) {
    const depth = Number(node.depth || 0);
    if (!groups.has(depth)) groups.set(depth, []);
    groups.get(depth).push(node);
  }
  const output = new Map();
  output.set(nodes.find((node) => node.depth === 0)?.id, center);
  for (const [depth, group] of groups.entries()) {
    if (depth === 0) continue;
    const radius = depth === 1 ? 205 : 285;
    group.forEach((node, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, group.length);
      output.set(node.id, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
    });
  }
  return output;
}

function wrapLabel(label, max = 22) {
  if (label.length <= max) return [label];
  const words = label.split(' ');
  const lines = [''];
  for (const word of words) {
    const line = lines[lines.length - 1];
    if ((line + ' ' + word).trim().length > max && line) lines.push(word);
    else lines[lines.length - 1] = (line + ' ' + word).trim();
    if (lines.length === 2 && words.indexOf(word) < words.length - 1) break;
  }
  if (lines.join(' ').length < label.length) lines[1] = `${lines[1].replace(/…$/, '')}…`;
  return lines.slice(0, 2);
}

function inspect(node) {
  clear(detail);
  detail.append(textElement('span', `Depth ${node.depth}`, 'eyebrow'));
  detail.append(textElement('h2', node.title));
  detail.append(textElement('p', node.summary || 'No short summary was returned for this concept.'));

  if (node.categories?.length) {
    detail.append(textElement('h3', 'Categories'));
    const chips = document.createElement('div');
    chips.className = 'chips';
    node.categories.slice(0, 6).forEach((category) => chips.append(textElement('span', category)));
    detail.append(chips);
  }

  const edges = current.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
  detail.append(textElement('h3', 'Why it connects'));
  if (!edges.length) detail.append(textElement('p', 'No in-graph connection evidence was returned for this node.'));
  for (const edge of edges.slice(0, 8)) {
    const source = current.nodes.find((item) => item.id === edge.source);
    const target = current.nodes.find((item) => item.id === edge.target);
    const item = document.createElement('article');
    item.className = 'edge-reason';
    item.append(textElement('strong', `${source?.title || 'Source'} → ${target?.title || 'Target'}`));
    item.append(textElement('span', `Evidence score ${edge.score}/100`, 'score'));
    item.append(textElement('p', edge.why));
    detail.append(item);
  }
}

function render(data) {
  current = data;
  clear(graph);
  const locations = positions(data.nodes);
  title.textContent = `${data.seed} knowledge neighborhood`;
  meta.textContent = `${data.nodes.length} concepts · ${data.edges.length} explained links · ${data.meta.upstreamRequests} upstream requests`;
  status.textContent = data.meta.partial
    ? `Partial graph: ${data.meta.warnings.join(' ') || 'a configured budget was reached.'}`
    : 'Graph complete within the configured exploration budget.';
  status.classList.toggle('warning', Boolean(data.meta.partial));

  const edgeLayer = svg('g', { class: 'edge-layer' });
  for (const edge of data.edges) {
    const a = locations.get(edge.source);
    const b = locations.get(edge.target);
    if (!a || !b) continue;
    const line = svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'edge', 'data-score': edge.score });
    const edgeTitle = svg('title');
    edgeTitle.textContent = edge.why;
    line.append(edgeTitle);
    edgeLayer.append(line);
  }
  graph.append(edgeLayer);

  const nodeLayer = svg('g', { class: 'node-layer' });
  for (const node of data.nodes) {
    const point = locations.get(node.id);
    if (!point) continue;
    const group = svg('g', { class: `node depth-${node.depth}`, tabindex: '0', role: 'button', 'aria-label': `Inspect ${node.title}` });
    group.setAttribute('transform', `translate(${point.x} ${point.y})`);
    const circle = svg('circle', { r: node.depth === 0 ? 31 : 22 });
    group.append(circle);
    const label = svg('text', { y: node.depth === 0 ? 49 : 39, 'text-anchor': 'middle' });
    wrapLabel(node.title).forEach((line, index) => {
      const tspan = svg('tspan', { x: '0', dy: index === 0 ? '0' : '16' });
      tspan.textContent = line;
      label.append(tspan);
    });
    group.append(label);
    group.addEventListener('click', () => inspect(node));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inspect(node); }
    });
    nodeLayer.append(group);
  }
  graph.append(nodeLayer);
  inspect(data.nodes.find((node) => node.depth === 0) || data.nodes[0]);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const seed = document.querySelector('#seed').value.trim();
  if (!seed) return;
  button.disabled = true;
  button.textContent = 'Mapping…';
  status.classList.remove('warning');
  status.textContent = `Exploring Wikipedia around ${seed}…`;
  try {
    const data = await api('/api/atlas', {
      method: 'POST',
      body: JSON.stringify({
        seed,
        maxDepth: Number(document.querySelector('#depth').value),
        maxNodes: Number(document.querySelector('#nodes').value),
        maxRequests: 28,
      }),
    });
    render(data);
  } catch (error) {
    status.classList.add('warning');
    status.textContent = `Could not build this graph: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = 'Explore connections →';
  }
});
