import { useMutation } from "@tanstack/react-query";

export function useModuleAction(fn) {
  return useMutation({
    mutationFn: fn
  });
}
