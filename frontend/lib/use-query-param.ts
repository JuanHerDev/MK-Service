"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Reads one search param after mount. Avoids useSearchParams so pages keep a static shell
 * without needing a Suspense boundary.
 */
export function useQueryParam(name: string) {
  const pathname = usePathname();
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window.location is only available after mount
    setValue(new URLSearchParams(window.location.search).get(name));
  }, [name, pathname]);
  return value;
}
