import { queryOptions } from "@tanstack/react-query";

import { getJaipurEnvironment } from "./environment.functions";

export const environmentQueryOptions = queryOptions({
  queryKey: ["jaipur-environment"],
  queryFn: () => getJaipurEnvironment(),
  staleTime: 30 * 60 * 1000,
});
