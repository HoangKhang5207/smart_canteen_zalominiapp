import { atom } from "jotai";
import type { AuthUser } from "./api";

export const currentUserAtom = atom<AuthUser | null>(null);
export const authErrorAtom = atom<string | null>(null);
