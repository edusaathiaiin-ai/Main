// Type declarations for react-katex
// react-katex does not ship its own @types package

declare module 'react-katex' {
  import { ReactElement } from 'react';

  interface MathProps {
    math: string;
    errorColor?: string;
    renderError?: (error: Error) => ReactElement;
  }

  export function InlineMath(props: MathProps): ReactElement;
  export function BlockMath(props: MathProps): ReactElement;
}
