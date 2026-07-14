import {
  PageHeader as LayoutPageHeader,
} from "@/components/layout/PageHeader";
import type { ComponentProps, ReactNode } from "react";

type Props = ComponentProps<typeof LayoutPageHeader> & {
  children?: ReactNode;
};

/** Re-export that accepts either `actions` or `children` as the action slot. */
export function PageHeader({ children, actions, ...rest }: Props) {
  return <LayoutPageHeader {...rest} actions={actions ?? children} />;
}

export default PageHeader;
