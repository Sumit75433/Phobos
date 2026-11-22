/* Generated from schemas/mark_descriptor.schema.json — do not edit.
 * Source of truth: the Rust types (crates/phobos-schemas surfaces()).
 * Regenerate: cargo run -p phobos-schemas --bin phobos-emit-schemas && npm run gen:types */

export type MarkClass = "success";

export interface MarkDescriptor {
  class: MarkClass;
  id: string;
  package: string;
}
