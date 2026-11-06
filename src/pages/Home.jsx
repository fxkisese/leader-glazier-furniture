import HeroSection from "../components/home/HeroSection";
import FeaturedCategories from "../components/home/FeaturedCategories";
import TrustSection from "../components/home/TrustSection";
import BestSellers from "../components/home/BestSellers";
import ShowroomSection from "../components/home/ShowroomSection";
import ReviewsSection from "../components/home/ReviewsSection";
import GlassQuotePreview from "../components/home/GlassQuotePreview";
import SocialFeedSection from "../components/home/SocialFeedSection";
import { FEATURES } from "@/lib/features";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <FeaturedCategories />
      <TrustSection />
      <BestSellers />
      <ShowroomSection />
      <ReviewsSection />
      {FEATURES.glassQuote && <GlassQuotePreview />}
      <SocialFeedSection />
    </div>
  );
}