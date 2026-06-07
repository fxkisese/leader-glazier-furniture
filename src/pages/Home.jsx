import HeroSection from "../components/home/HeroSection";
import FeaturedCategories from "../components/home/FeaturedCategories";
import TrustSection from "../components/home/TrustSection";
import BestSellers from "../components/home/BestSellers";
import ShowroomSection from "../components/home/ShowroomSection";
import ReviewsSection from "../components/home/ReviewsSection";
import GlassQuotePreview from "../components/home/GlassQuotePreview";
import SocialFeedSection from "../components/home/SocialFeedSection";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <FeaturedCategories />
      <TrustSection />
      <BestSellers />
      <ShowroomSection />
      <ReviewsSection />
      <GlassQuotePreview />
      <SocialFeedSection />
    </div>
  );
}