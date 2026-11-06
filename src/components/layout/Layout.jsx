import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WhatsAppFab from "../ui/WhatsAppFab";
import CartSidebar from "../cart/CartSidebar";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 lg:pt-[72px] xl:pt-[113px]">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFab />
      <CartSidebar />
    </div>
  );
}