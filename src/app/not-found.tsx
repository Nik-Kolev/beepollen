import { ShopFrame } from "@/components/layout/shop-frame";
import {
  NotFoundContent,
  notFoundMetadata,
} from "@/components/not-found-content";

export const metadata = notFoundMetadata;

export default function NotFound() {
  return (
    <ShopFrame>
      <NotFoundContent />
    </ShopFrame>
  );
}
