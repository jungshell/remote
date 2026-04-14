"use client";

import { FullPageDeck } from "@/components/deck/FullPageDeck";
import { WelcomePage } from "@/components/pages/WelcomePage";
import { VisionValuesPage } from "@/components/pages/VisionValuesPage";
import { PortfolioInfographicPage } from "@/components/pages/PortfolioInfographicPage";
import { RegionNetworkPage } from "@/components/pages/RegionNetworkPage";
import { MindsetTimelinePage } from "@/components/pages/MindsetTimelinePage";
import { FacilitiesPage } from "@/components/pages/FacilitiesPage";
import { HistoryTimelinePage } from "@/components/pages/HistoryTimelinePage";
import { MainBusinessPage } from "@/components/pages/MainBusinessPage";
import { MediaPage } from "@/components/pages/MediaPage";
import { OrgChartPage } from "@/components/pages/OrgChartPage";
import { SupportPrograms2026Page } from "@/components/pages/SupportPrograms2026Page";
import { SectionFaq } from "@/components/sections/SectionFaq";
import { SectionGlossary } from "@/components/sections/SectionGlossary";
import { SectionGovernance } from "@/components/sections/SectionGovernance";
import { SectionIdentity } from "@/components/sections/SectionIdentity";
import { SectionIdentityContext } from "@/components/sections/SectionIdentityContext";
import { SectionIntro } from "@/components/sections/SectionIntro";
import { SectionOrganization } from "@/components/sections/SectionOrganization";

export function AppDeck() {
  return (
    <FullPageDeck
      renderPage={(id) => {
        switch (id) {
          case "welcome":
            return <WelcomePage />;
          case "vision":
            return <VisionValuesPage />;
          case "history":
            return <HistoryTimelinePage />;
          case "orgChart":
            return <OrgChartPage />;
          case "support2026":
            return <SupportPrograms2026Page />;
          case "mainBusiness":
            return <MainBusinessPage />;
          case "facilities":
            return <FacilitiesPage />;
          case "portfolio":
            return <PortfolioInfographicPage />;
          case "region":
            return <RegionNetworkPage />;
          case "mindset":
            return <MindsetTimelinePage />;
          case "identity":
            return <SectionIdentity />;
          case "identityContext":
            return <SectionIdentityContext />;
          case "intro":
            return <SectionIntro />;
          case "governance":
            return <SectionGovernance />;
          case "organization":
            return <SectionOrganization />;
          case "media":
            return <MediaPage />;
          case "glossary":
            return <SectionGlossary />;
          case "faq":
            return <SectionFaq />;
          default:
            return <WelcomePage />;
        }
      }}
    />
  );
}

