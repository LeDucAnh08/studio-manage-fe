import { matchPath } from 'react-router-dom';
import { adminItems, navItems, type NavItem } from './navItems';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface ConfiguredRoute {
  path: string;
  label: string;
  parent?: NavItem;
  parentPath?: string;
  parentHasIndexRoute?: boolean;
}

const allNavigationItems = [...navItems, ...adminItems];

const normalizePath = (path: string) => {
  const normalized = path.replace(/\/+$/, '');
  return normalized || '/';
};

const joinPaths = (parent: string, child: string) => {
  const parentPath = parent === '/' ? '' : parent;
  const childPath = child ? (child.startsWith('/') ? child : `/${child}`) : '';
  return normalizePath(`${parentPath}${childPath}` || '/');
};

const getConfiguredRoutes = (): ConfiguredRoute[] =>
  allNavigationItems.flatMap((item) => {
    if (!item.children) {
      return [{ path: normalizePath(item.to), label: item.label }];
    }

    const parentPath = normalizePath(item.to);
    const parentHasIndexRoute = item.children.some((child) => child.to === '');

    return item.children.map((child) => ({
      path: joinPaths(item.to, child.to),
      label: child.label,
      parent: item,
      parentPath,
      parentHasIndexRoute,
    }));
  });

const routeSpecificity = (path: string) =>
  path
    .split('/')
    .filter(Boolean)
    .reduce((score, segment) => score + (segment.startsWith(':') ? 1 : 10), 0);

export function getNavigationGroupForPath(pathname: string): string | null {
  const currentPath = normalizePath(pathname);

  return (
    allNavigationItems.find((item) =>
      item.children?.some((child) =>
        matchPath({ path: joinPaths(item.to, child.to), end: true }, currentPath),
      ),
    )?.to ?? null
  );
}

export function getNavigationBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const currentPath = normalizePath(pathname);
  const matchingRoute = getConfiguredRoutes()
    .filter((route) => matchPath({ path: route.path, end: true }, currentPath))
    .sort((a, b) => routeSpecificity(b.path) - routeSpecificity(a.path))[0];

  if (!matchingRoute) return [];

  if (!matchingRoute.parent) return [{ label: matchingRoute.label }];

  return [
    {
      label: matchingRoute.parent.label,
      ...(matchingRoute.parentHasIndexRoute && matchingRoute.parentPath
        ? { to: matchingRoute.parentPath }
        : {}),
    },
    { label: matchingRoute.label },
  ];
}
