import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MarketHeader from "@/components/MarketHeader";
import HeroSection from "@/components/HeroSection";
import MarqueeStrip from "@/components/MarqueeStrip";
import TextureBand from "@/components/TextureBand";
import StorySection from "@/components/StorySection";
import ShippingSection from "@/components/ShippingSection";
import CategoriesSection from "@/components/CategoriesSection";
import ProductGrid from "@/components/ProductGrid";
import ArtisansSection from "@/components/ArtisansSection";
import CTASection from "@/components/CTASection";
import MarketFooter from "@/components/MarketFooter";
import CatalogPage from "@/pages/CatalogPage";
import DashboardPage from "@/pages/DashboardPage";
import ChatPage from "@/pages/ChatPage";
import ArtisanAuthPage from "@/pages/ArtisanAuthPage";
import ArtisanProfilePage from "@/pages/ArtisanProfilePage";
import ExperiencesPage from "@/pages/ExperiencesPage";

const Index = () => {
  const [page, setPage] = useState("home");
  const [selectedArtisan, setSelectedArtisan] = useState(0);
  const { user, signOut } = useAuth();

  const handleNavigate = (target: string) => {
    if ((target === "dashboard" || target === "chat") && !user) {
      setPage("artisan-login");
      return;
    }
    setPage(target);
  };

  const handleViewProfile = (index: number) => {
    setSelectedArtisan(index);
    setPage("artisan-profile");
  };

  return (
    <div>
      <div className="grain-overlay" />
      {page !== "artisan-login" && (
        <MarketHeader
          currentPage={page}
          onNavigate={handleNavigate}
          isLoggedIn={!!user}
          onSignOut={signOut}
        />
      )}

      {page === "home" && (
        <>
          <HeroSection onExplore={() => handleNavigate("catalog")} />
          <MarqueeStrip />
          <TextureBand />
          <StorySection />
          <ShippingSection />
          <CategoriesSection onNavigate={() => handleNavigate("catalog")} />
          <section className="px-9 pb-16">
            <div className="max-w-[1320px] mx-auto">
              <div className="flex items-end justify-between mb-8 pb-3 border-b border-border">
                <div>
                  <div className="text-[0.63rem] tracking-[0.2em] uppercase text-terra mb-2">Curadoria</div>
                  <h2 className="font-display font-normal text-[2.1rem] leading-[1.15]">
                    Peças <em className="italic text-terra">em destaque</em>
                  </h2>
                </div>
                <button onClick={() => handleNavigate("catalog")} className="bg-transparent border-none cursor-pointer font-body text-[0.66rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-terra transition-colors">
                  Ver todos →
                </button>
              </div>
              <ProductGrid />
            </div>
          </section>
          <ArtisansSection onViewProfile={handleViewProfile} />
          <CTASection onNavigate={() => handleNavigate("dashboard")} />
          <MarketFooter />
        </>
      )}

      {page === "catalog" && <CatalogPage />}
      {page === "experiences" && <ExperiencesPage onExplore={() => handleNavigate("catalog")} />}
      {page === "dashboard" && user && <DashboardPage />}
      {page === "chat" && user && <ChatPage />}
      {page === "artisan-login" && (
        <ArtisanAuthPage
          onSuccess={() => setPage("dashboard")}
          onBack={() => setPage("home")}
        />
      )}
      {page === "artisan-profile" && (
        <ArtisanProfilePage
          artisanIndex={selectedArtisan}
          onBack={() => setPage("home")}
        />
      )}
    </div>
  );
};

export default Index;
