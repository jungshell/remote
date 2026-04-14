"use client";

import type { GovernanceNode } from "@/content/types";
import { ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

function NodeCard({
  node,
  depth,
  layout,
}: {
  node: GovernanceNode;
  depth: number;
  layout: "vertical" | "horizontal";
}) {
  const hasKids = Boolean(node.children?.length);
  const [expanded, setExpanded] = useState(depth < 2);

  const row = layout === "horizontal";

  return (
    <div
      className={clsx(
        "flex min-w-0",
        row ? "flex-row items-stretch gap-3" : "flex-col gap-3"
      )}
    >
      <div className="flex min-w-[10rem] flex-col gap-1">
        <div
          className={clsx(
            "rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm",
            depth === 0 && "border-sky-300/40 bg-white/15"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">{node.label}</p>
              {node.subtitle && (
                <p className="mt-1 text-xs leading-snug text-white/75">{node.subtitle}</p>
              )}
            </div>
            {hasKids && !row && (
              <button
                type="button"
                data-print-hide
                aria-expanded={expanded}
                onClick={() => setExpanded((e) => !e)}
                className="shrink-0 rounded-md p-1 text-white/80 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
              >
                {expanded ? (
                  <ChevronDown className="size-4" aria-hidden />
                ) : (
                  <ChevronRight className="size-4" aria-hidden />
                )}
                <span className="sr-only">하위 노드 {expanded ? "접기" : "펼치기"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {hasKids && (row || expanded) && (
        <div
          className={clsx(
            "flex min-w-0",
            row
              ? "flex-row flex-wrap items-stretch gap-3 border-l border-white/15 pl-4"
              : "ml-2 flex-col gap-3 border-l border-white/15 pl-4"
          )}
        >
          {node.children!.map((c) => (
            <NodeCard key={c.id} node={c} depth={depth + 1} layout={layout} />
          ))}
        </div>
      )}
    </div>
  );
}

export function GovernanceTree({ root }: { root: GovernanceNode }) {
  return (
    <>
      <div className="hidden md:block">
        <NodeCard node={root} depth={0} layout="horizontal" />
      </div>
      <div className="md:hidden">
        <NodeCard node={root} depth={0} layout="vertical" />
      </div>
    </>
  );
}
