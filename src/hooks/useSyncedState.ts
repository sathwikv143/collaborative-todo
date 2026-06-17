import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/** Local state that resets when the source value changes (e.g. after server sync). */
export function useSyncedState<T>(value: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(value);
  useEffect(() => {
    setState(value);
  }, [value]);
  return [state, setState];
}
