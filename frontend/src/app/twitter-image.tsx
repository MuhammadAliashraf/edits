import { createSocialImageResponse } from "@/lib/social-image";

export const runtime = "edge";

export const alt = "igedits — Turn long videos into Reels-ready shorts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return createSocialImageResponse();
}
