import type { VibeApp } from '../types/app';
export function filterApps(apps: VibeApp[], searchQuery: string, activeCategory: string | null, directory: boolean, params: URLSearchParams): VibeApp[] {
    const q = searchQuery.trim().toLowerCase();
    return apps.filter(app => {
      const matchesSearch =
        !q ||
        app.name.toLowerCase().includes(q) ||
        app.shortDescription.toLowerCase().includes(q) ||
        app.tags.some(t => t.toLowerCase().includes(q)) ||
        app.techStack.some(t => t.toLowerCase().includes(q)) ||
        app.author.name.toLowerCase().includes(q);
      const matchesCategory = !activeCategory || app.category === activeCategory;
      const status = directory ? params.get('status') : '';
      const demo = directory && params.get('demo') === 'yes';
      return matchesSearch && matchesCategory && (!status || (app.projectStatus || 'unspecified') === status) && (!demo || !!app.demoUrl);
    }).sort((a, b) => {
      const sort = directory ? params.get('sort') : 'latest';
      if (sort === 'votes') return b.upvotes - a.upvotes || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
      if (sort === 'name') return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
      return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
    });
}
