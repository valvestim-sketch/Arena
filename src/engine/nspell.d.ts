declare module 'nspell' {
  export interface NSpell {
    correct(word: string): boolean
    suggest(word: string, limit?: number): string[]
    add(word: string): void
    remove(word: string): void
  }
  export default function nspell(aff: string | Uint8Array, dic: string | Uint8Array): NSpell
}
