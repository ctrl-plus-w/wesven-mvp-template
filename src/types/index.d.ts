declare global {
  export type AsyncVoidFunction = () => Promise<void>;

  type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[]
    ? ElementType
    : never;
}

export default global;
