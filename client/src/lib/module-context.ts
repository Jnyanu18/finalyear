type ModuleKey = "yield" | "disease" | "market" | "irrigation";

type ModuleSnapshot<TData = any, TInput = any> = {
  data: TData;
  input: TInput;
  updatedAt: string;
};

const moduleKey = (key: ModuleKey) => `agri:module:${key}`;

export function saveModuleSnapshot<TData = any, TInput = any>(key: ModuleKey, data: TData, input: TInput) {
  if (typeof window === "undefined") return;
  const payload: ModuleSnapshot<TData, TInput> = {
    data,
    input,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(moduleKey(key), JSON.stringify(payload));
}

export function readModuleSnapshot<TData = any, TInput = any>(key: ModuleKey): ModuleSnapshot<TData, TInput> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(moduleKey(key));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ModuleSnapshot<TData, TInput>;
  } catch {
    return null;
  }
}
