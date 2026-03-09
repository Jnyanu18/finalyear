import { useMutation, type UseMutationResult } from "@tanstack/react-query";

export function useModuleAction<TData = any, TVariables = any>(
  fn: (variables: TVariables) => Promise<TData>
): UseMutationResult<TData, Error, TVariables> {
  return useMutation({
    mutationFn: fn
  });
}
