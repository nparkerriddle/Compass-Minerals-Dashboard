// Simple localStorage CRUD layer.
// Each collection is stored as a JSON array under a namespaced key.

const NS = 'compass_';

function key(collection) {
  return NS + collection;
}

export function getAll(collection) {
  try {
    const raw = localStorage.getItem(key(collection));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAll(collection, items) {
  localStorage.setItem(key(collection), JSON.stringify(items));
}

export function newId() {
  return crypto.randomUUID();
}

export function getById(collection, id) {
  return getAll(collection).find((item) => item.id === id) || null;
}

export function insert(collection, item) {
  const items = getAll(collection);
  const record = { ...item, id: item.id || newId(), created_at: new Date().toISOString() };
  items.push(record);
  saveAll(collection, items);
  return record;
}

export function update(collection, id, patch) {
  const items = getAll(collection);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch, updated_at: new Date().toISOString() };
  saveAll(collection, items);
  return items[idx];
}

export function remove(collection, id) {
  const items = getAll(collection).filter((i) => i.id !== id);
  saveAll(collection, items);
}
