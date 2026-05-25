import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const SAMPLE_REVIEWS = [
  { id: "1", customer_name: "James Mwangi", rating: 5, comment: "Ordered a custom 5-seater sofa. Quality is exceptional and delivery was on time. The purple velvet finish is exactly what I wanted.", product_type: "Custom Sofa" },
  { id: "2", customer_name: "Sarah Otieno", rating: 5, comment: "Got mirror glass cut for my bathroom. The glass quote calculator made it so easy to know the price before ordering. Very professional service.", product_type: "Mirror Glass" },
  { id: "3", customer_name: "David Kimani", rating: 5, comment: "Furnished my entire office — desks, chairs, and glass partitions. Leader Glazier delivered everything in one go. Highly recommend.", product_type: "Office Furniture & Glass" },
];

export default function ReviewsSection() {
  const { data: reviews = [] } = useQuery({
    queryKey: ["featured-reviews"],
    queryFn: () => base44.entities.Review.filter({ is_featured: true }),
  });

  const displayReviews = reviews.length > 0 ? reviews : SAMPLE_REVIEWS;

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-gold font-medium text-sm uppercase tracking-widest mb-2">What Clients Say</p>
          <h2 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground">Customer Reviews</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayReviews.slice(0, 3).map((review) => (
            <div key={review.id} className="bg-[#f8f5ff] rounded-2xl p-6 space-y-4 border border-border hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="flex gap-1">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold text-gold" style={{ color: "hsl(43 74% 60%)", fill: "hsl(43 74% 60%)" }} />
                ))}
              </div>
              <p className="text-foreground/80 text-sm leading-relaxed">"{review.comment}"</p>
              <div>
                <p className="font-semibold text-foreground text-sm">{review.customer_name}</p>
                {review.product_type && <p className="text-xs text-muted-foreground">{review.product_type}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}