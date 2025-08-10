export type HeroItem = {
    id: string;
    title: string;
    imageUrl: string;
    href: string;         // Substack article URL
    kicker?: string;      // small label, e.g., "Feature"
  };
  
  export const HERO_ITEMS: HeroItem[] = [
    {
      id: "smurfs",
      title: "New Smurfs Movie: Will it Hold Up?",
      imageUrl: "/smurfs.webp",
      href: "https://open.substack.com/pub/outcomeoracle/p/smurfs-2025-rotten-tomatoes-market?r=5pypx8&utm_campaign=post&utm_medium=web&showWelcomeOnShare=false",
      kicker: "Feature"
    },
    {
      id: "tech-trends",
      title: "The Future of Web Development",
      imageUrl: "/next.svg",
      href: "https://example.com/tech-trends",
      kicker: "Technology"
    },
    {
      id: "design-system",
      title: "Building Scalable Design Systems",
      imageUrl: "/vercel.svg",
      href: "https://example.com/design-systems",
      kicker: "Design"
    },
  ];