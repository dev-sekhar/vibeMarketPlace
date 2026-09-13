export type ResourceKind = 'guides' | 'instructions' | 'templates';
export type ResourceAudience = 'all' | 'ai-assisted' | 'ai-powered';

export interface DevResource {
    id: string;
    kind: ResourceKind;
    audience: ResourceAudience;
    category: 'guide' | 'readme' | 'testing' | 'gitignore' | 'license' | 'contributing' | 'env' | 'structure' | 'agent' | 'security' | 'ai';
    name: string;
    description: string;
    /** Destination within the user's repository; downloads use the basename. */
    filename: string;
    content: string;
    guidance: string;
    tags: string[];
}

export const RESOURCE_KINDS: ResourceKind[] = ['guides', 'instructions', 'templates'];

export function filterResources(resources: DevResource[], kind: ResourceKind, category = 'all', query = '') {
    const term = query.trim().toLowerCase();
    return resources.filter(resource => resource.kind === kind
        && (category === 'all' || resource.category === category)
        && (!term || [resource.name, resource.description, resource.guidance, resource.filename, ...resource.tags]
            .some(value => value.toLowerCase().includes(term))));
}

export function resourceDownloadName(resource: DevResource) {
    return resource.filename.split('/').pop()!;
}
