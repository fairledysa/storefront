import type { SVGProps } from "react";

export type IconName =
  | "arrow"
  | "spark"
  | "store"
  | "credit"
  | "truck"
  | "megaphone"
  | "boxes"
  | "people"
  | "chart"
  | "check"
  | "plus"
  | "globe"
  | "menu"
  | "play"
  | "quote"
  | "cube"
  | "bolt"
  | "shield"
  | "layers"
  | "close";

type Props = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 20, ...props }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };

  const shapes: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    spark: <><path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></>,
    store: <><path d="M4 10h16v10H4z" /><path d="M3 10 5 4h14l2 6" /><path d="M8 14h4v6H8z" /><path d="M16 14h1" /></>,
    credit: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h3" /></>,
    truck: <><path d="M3 6h11v11H3z" /><path d="M14 9h4l3 3v5h-7z" /><path d="M5.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /></>,
    megaphone: <><path d="M3 13h4l10 4V7L7 11H3z" /><path d="m7 13 1.5 6" /><path d="M20 9.5c.7.7 1 1.5 1 2.5s-.3 1.8-1 2.5" /></>,
    boxes: <><path d="m12 3 7 4-7 4-7-4 7-4Z" /><path d="m5 12 7 4 7-4" /><path d="m5 17 7 4 7-4" /></>,
    people: <><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="8" r="3" /><path d="M17 11a3 3 0 1 0-1.5-5.6" /><path d="M19 20v-1.2a3 3 0 0 0-2-2.8" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /><path d="M16 6h2v2" /></>,
    check: <path d="m5 12 4.3 4.3L19 6.7" />,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.3 2.4 3.5 5.4 3.5 9S14.3 18.6 12 21c-2.3-2.4-3.5-5.4-3.5-9S9.7 5.4 12 3Z" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    play: <path d="m9 6 9 6-9 6V6Z" />,
    quote: <path d="M8.5 6C6 7.3 4.8 9.3 4.8 12.1c0 3 1.4 5 4.5 5 2.2 0 3.8-1.5 3.8-3.6 0-2-1.4-3.4-3.4-3.4-.5 0-1 .1-1.5.3.5-1.3 1.4-2.4 2.8-3.2L8.5 6Zm8.4 0c-2.5 1.3-3.7 3.3-3.7 6.1 0 3 1.4 5 4.5 5 2.2 0 3.8-1.5 3.8-3.6 0-2-1.4-3.4-3.4-3.4-.5 0-1 .1-1.5.3.5-1.3 1.4-2.4 2.8-3.2L16.9 6Z" />,
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M12 12 4 7.5" /><path d="M12 12l8-4.5" /><path d="M12 12v9" /></>,
    bolt: <path d="m13 2-8 12h6l-1 8 9-13h-6l0-7Z" />,
    shield: <><path d="M12 3 19 6v5c0 4.7-2.9 8-7 10-4.1-2-7-5.3-7-10V6l7-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    layers: <><path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" /><path d="m4 12 8 4.5 8-4.5" /><path d="m4 16.5 8 4.5 8-4.5" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
  };

  return <svg {...common}>{shapes[name]}</svg>;
}
