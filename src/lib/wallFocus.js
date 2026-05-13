// Module-level ref for passing a "focus this stone" signal from
// notification handlers into the Wall screen. Read-and-clear semantics.

let _pendingStoneId = null;
const _listeners = new Set();

export function setFocusStone(stoneId) {
  _pendingStoneId = stoneId;
  _listeners.forEach(fn => {
    try { fn(stoneId); } catch (_) {}
  });
}

export function consumeFocusStone() {
  const id = _pendingStoneId;
  _pendingStoneId = null;
  return id;
}

export function peekFocusStone() {
  return _pendingStoneId;
}

// Wall subscribes when mounted so it reacts even if it's already on screen
export function subscribeFocus(listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
