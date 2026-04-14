import { siteMeta, ui } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#001a33] py-10 text-sm text-white/80">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 md:flex-row md:items-center md:justify-between">
        <p>{siteMeta.title}</p>
        <p className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/90">
          자료 반영: <time dateTime={siteMeta.lastContentSync}>{siteMeta.lastContentSyncLabel}</time>
        </p>
      </div>
      <p className="mx-auto mt-6 max-w-5xl px-6 text-xs text-white/50">{ui.footerPrintHint}</p>
    </footer>
  );
}
