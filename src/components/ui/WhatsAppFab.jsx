import { MessageCircle } from "lucide-react";

const WHATSAPP = "254722914819";

export default function WhatsAppFab() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP}?text=Hello%20Craftsman%20Galore,%20I%20would%20like%20more%20information%20about%20your%20handcrafted%20furniture.`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
      title="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  );
}