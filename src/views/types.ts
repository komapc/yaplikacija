// A mountable tab/game: a root element plus a teardown (cancels timers,
// detaches listeners, stops audio) called when the tab is switched away.
export interface View {
  element: HTMLElement;
  destroy(): void;
}
