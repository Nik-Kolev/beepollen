import { ShopFrame } from "@/components/layout/shop-frame";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return <ShopFrame>{children}</ShopFrame>;
}
