import StarsBackground from "@/components/StarsBackground";
import LandingNavbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import ShowcaseSection from "@/components/landing/ShowcaseSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <StarsBackground />
      <LandingNavbar />
      <HeroSection />
      <AboutSection />
      <ShowcaseSection />
      <Footer />
    </div>
  );
};

export default Index;
