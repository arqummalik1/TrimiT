type NavigationRouteLike = {
  name: string;
  state?: NavigationStateLike;
};

type NavigationStateLike = {
  index?: number;
  routes: readonly NavigationRouteLike[];
};

/** Screen names only: useful for debugging without logging route params or PII. */
export function summarizeNavigationState(state: NavigationStateLike | undefined) {
  if (!state || state.routes.length === 0) {
    return { rootRoutes: [] as string[], activePath: [] as string[] };
  }

  const activePath: string[] = [];
  let current: NavigationStateLike | undefined = state;

  while (current?.routes.length) {
    const fallbackIndex = current.routes.length - 1;
    const index = Math.min(Math.max(current.index ?? fallbackIndex, 0), fallbackIndex);
    const route: NavigationRouteLike | undefined = current.routes[index];
    if (!route) break;
    activePath.push(route.name);
    current = route.state;
  }

  return {
    rootRoutes: state.routes.map((route) => route.name),
    activePath,
  };
}
