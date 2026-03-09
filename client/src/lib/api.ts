import { API_V1_BASE } from './api-base';

async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
        const res = await fetch(`${API_V1_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            credentials: 'include',
            ...options,
        });
        let body: any = {};
        try { body = await res.json(); } catch {}
        if (!res.ok) {
            return { success: false, error: body?.error || body?.message || `Request failed (${res.status})` };
        }
        return { success: true, data: body?.data as T };
    } catch (err: any) {
        return { success: false, error: err.message || 'Network error' };
    }
}

export async function runPlantAnalysis(photoDataUri: string, contentType: string, cropTypeHint = 'tomato') {
    return apiFetch<any>('/analysis/plant', {
        method: 'POST',
        body: JSON.stringify({ imageData: photoDataUri, mimeType: contentType, cropTypeHint }),
    });
}

export async function getLatestAnalysis() {
    return apiFetch<any>('/analysis/latest', { method: 'GET' });
}

export async function runDecisionPipeline(input: any) {
    return apiFetch<any>('/analysis/pipeline', {
        method: 'POST',
        body: JSON.stringify(input || {}),
    });
}

export async function predictYield(input: any) {
    const res = await apiFetch<any>('/prediction/yield', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).prediction;
    return res;
}

export async function predictDisease(input: any) {
    const res = await apiFetch<any>('/prediction/disease', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).prediction;
    return res;
}

export async function recommendIrrigation(input: any) {
    const res = await apiFetch<any>('/irrigation/recommend', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).recommendation;
    return res;
}

export async function planHarvest(input: any) {
    const res = await apiFetch<any>('/harvest/plan', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).plan;
    return res;
}

export async function storageAdvice(input: any) {
    const res = await apiFetch<any>('/storage/advice', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).advice;
    return res;
}

export async function bestMarketRoute(input: any) {
    const res = await apiFetch<any>('/market/best', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).market;
    return res;
}

export async function simulateProfit(input: any) {
    const res = await apiFetch<any>('/profit/simulate', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).simulation;
    return res;
}

export async function advisorChat(query: string) {
    return apiFetch<{ reply: string; context: any }>('/advisor/chat', {
        method: 'POST',
        body: JSON.stringify({ query }),
    });
}

export async function fetchReport() {
    const res = await apiFetch<any>('/advisor/report', { method: 'GET' });
    if (res.success && res.data) res.data = (res.data as any).summary;
    return res;
}

export async function getProfile() {
    return apiFetch<any>('/profile', { method: 'GET' });
}

export async function updateProfile(data: any) {
    return apiFetch<any>('/profile', { method: 'PUT', body: JSON.stringify(data) });
}

export async function submitOutcome(data: any) {
    return apiFetch<any>('/outcome/submit', { method: 'POST', body: JSON.stringify(data) });
}
