import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/**
 * Tombol tebal ala aplikasi belajar: tepi bawah 4px yang "mengempis" saat ditekan.
 * Label 20px tebal → masuk kategori teks besar (kontras minimal 3:1 di atas hijau/biru).
 */
const playButtonVariants = cva(
  "press-3d inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border-solid font-extrabold whitespace-nowrap transition-[background-color,border-color,color,filter] duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink disabled:cursor-not-allowed disabled:border-play-line disabled:bg-play-line disabled:text-play-ink-faint [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      tone: {
        green:
          "border-play-green-strong border-b-play-green-shade bg-play-green-strong text-white hover:not-disabled:brightness-110",
        blue: "border-play-blue-strong border-b-play-blue-shade bg-play-blue-strong text-white hover:not-disabled:brightness-110",
        white:
          "border-play-line bg-white text-play-ink-muted hover:not-disabled:bg-play-polar aria-pressed:border-play-gold aria-pressed:border-b-play-gold-shade aria-pressed:bg-play-gold-soft aria-pressed:text-play-gold-ink",
        danger: "border-transparent bg-transparent text-play-red-ink hover:not-disabled:bg-play-red-soft",
      },
      size: {
        default: "h-[52px] px-6 text-xl",
        sm: "h-11 px-4 text-base",
        icon: "size-[52px] px-0 text-xl",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      tone: "white",
      size: "default",
      block: false,
    },
  },
);

function PlayButton({
  className,
  tone,
  size,
  block,
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof playButtonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="play-button"
      data-tone={tone ?? "white"}
      className={cn(playButtonVariants({ tone, size, block, className }))}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    />
  );
}

export { PlayButton, playButtonVariants };
