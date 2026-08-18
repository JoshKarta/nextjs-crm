"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import useSWR from "swr";
import {
  Image as LogoIcon,
  Building2,
  UserSquare2,
  Hash,
  Table2,
  Sigma,
  StickyNote,
  FileText,
  Type,
  Trash2,
  Copy,
  Check,
  Ruler,
  Save,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import type { InvoiceTemplateBlock, InvoiceTemplateRow } from "@/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const INK = "#1F2A44";
const INK_SOFT = "#3A4A6B";
const BLUEPRINT_BG = "#E9EEF5";
const GRID_LINE = "#D7DFEA";
const PAPER = "#FFFFFF";
const AMBER = "#E8A33D";
const AMBER_SOFT = "#FBEBD3";
const MUTED = "#8892A6";
const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";

const PAGE_SIZES: Record<string, { width: number; height: number; label: string }> = {
  LETTER: { width: 850, height: 1100, label: "Letter · 8.5 × 11 in" },
  A4: { width: 794, height: 1123, label: "A4 · 210 × 297 mm" },
};

const GRID_STEP = 10;
const snap = (v: number) => Math.round(v / GRID_STEP) * GRID_STEP;

const BLOCK_DEFS = [
  { type: "logo", label: "Logo", icon: LogoIcon, w: 160, h: 90 },
  { type: "company_info", label: "Company info", icon: Building2, w: 260, h: 110 },
  { type: "bill_to", label: "Bill to", icon: UserSquare2, w: 260, h: 110 },
  { type: "invoice_meta", label: "Invoice meta", icon: Hash, w: 240, h: 100 },
  { type: "line_items_table", label: "Line items table", icon: Table2, w: 750, h: 260 },
  { type: "totals", label: "Totals", icon: Sigma, w: 260, h: 140 },
  { type: "notes", label: "Notes", icon: StickyNote, w: 750, h: 90 },
  { type: "terms", label: "Terms", icon: FileText, w: 750, h: 90 },
  { type: "text", label: "Custom text", icon: Type, w: 300, h: 60 },
];

const DEFAULT_BLOCKS: InvoiceTemplateBlock[] = [
  { id: "b1", type: "logo", x: 40, y: 40, width: 160, height: 90, config: {} },
  { id: "b2", type: "invoice_meta", x: 550, y: 40, width: 260, height: 100, config: {} },
  { id: "b3", type: "company_info", x: 40, y: 150, width: 260, height: 110, config: {} },
  { id: "b4", type: "bill_to", x: 320, y: 150, width: 260, height: 110, config: {} },
  {
    id: "b5",
    type: "line_items_table",
    x: 40,
    y: 300,
    width: 770,
    height: 280,
    config: { columns: ["Description", "Qty", "Unit price", "Tax", "Total"] },
  },
  { id: "b6", type: "totals", x: 550, y: 600, width: 260, height: 140, config: {} },
  { id: "b7", type: "notes", x: 40, y: 780, width: 770, height: 90, config: { text: "Thank you for your business." } },
];

let nextId = 100;

function BlockPreview({ block }: { block: InvoiceTemplateBlock }) {
  const style = { fontFamily: SERIF, color: INK, width: "100%", height: "100%", overflow: "hidden" };
  switch (block.type) {
    case "logo":
      return (
        <div
          style={{
            ...style,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px dashed ${MUTED}`,
            fontFamily: MONO,
            fontSize: 11,
            color: MUTED,
            letterSpacing: "0.08em",
          }}
        >
          YOUR LOGO
        </div>
      );
    case "company_info":
      return (
        <div style={{ ...style, fontSize: 13, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700 }}>Acme Studio LLC</div>
          <div>142 Harbor Row, Suite 4</div>
          <div>Paramaribo, Suriname</div>
          <div>billing@acmestudio.example</div>
        </div>
      );
    case "bill_to":
      return (
        <div style={{ ...style, fontSize: 13, lineHeight: 1.5 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginBottom: 4, letterSpacing: "0.06em" }}>
            BILL TO
          </div>
          <div style={{ fontWeight: 700 }}>Contact name</div>
          <div>Company name</div>
          <div>client@example.com</div>
        </div>
      );
    case "invoice_meta":
      return (
        <div style={{ ...style, fontSize: 12.5, lineHeight: 1.7 }}>
          {[
            ["Invoice #", "INV-000123"],
            ["Date", "Aug 15, 2026"],
            ["Due date", "Sep 14, 2026"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: MUTED }}>{k}</span>
              <span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      );
    case "line_items_table": {
      const cols = (block.config?.columns as string[]) || ["Description", "Qty", "Unit price", "Tax", "Total"];
      return (
        <div style={{ ...style, fontSize: 12 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `2fr repeat(${cols.length - 1}, 1fr)`,
              borderBottom: `2px solid ${INK}`,
              paddingBottom: 6,
              fontFamily: MONO,
              fontSize: 10,
              color: MUTED,
              letterSpacing: "0.04em",
            }}
          >
            {cols.map((c) => (
              <span key={c}>{c.toUpperCase()}</span>
            ))}
          </div>
          {[1, 2].map((row) => (
            <div
              key={row}
              style={{
                display: "grid",
                gridTemplateColumns: `2fr repeat(${cols.length - 1}, 1fr)`,
                padding: "8px 0",
                borderBottom: `1px solid ${GRID_LINE}`,
              }}
            >
              <span>Sample product or service</span>
              {cols.slice(1).map((c) => (
                <span key={c}>—</span>
              ))}
            </div>
          ))}
        </div>
      );
    }
    case "totals":
      return (
        <div style={{ ...style, fontSize: 13 }}>
          {[
            ["Subtotal", "$0.00"],
            ["Discount", "$0.00"],
            ["Tax", "$0.00"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: INK_SOFT }}>
              <span>{k}</span>
              <span>{v}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              paddingTop: 6,
              borderTop: `2px solid ${INK}`,
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            <span>Total due</span>
            <span>$0.00</span>
          </div>
        </div>
      );
    case "notes":
      return (
        <div style={{ ...style, fontSize: 12.5, color: INK_SOFT, fontStyle: "italic" }}>
          {((block.config?.text as string) || "Notes go here.")}
        </div>
      );
    case "terms":
      return (
        <div style={{ ...style, fontSize: 12.5, color: INK_SOFT }}>
          {((block.config?.text as string) || "Payment due within 30 days. Late payments may incur a 1.5% monthly fee.")}
        </div>
      );
    case "text":
      return <div style={{ ...style, fontSize: 13 }}>{((block.config?.text as string) || "Custom text block")}</div>;
    default:
      return null;
  }
}

export default function InvoiceTemplateBuilder() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<"LETTER" | "A4">("LETTER");
  const [templateName, setTemplateName] = useState("Standard invoice");
  const [isDefault, setIsDefault] = useState(false);
  const [blocks, setBlocks] = useState<InvoiceTemplateBlock[]>(DEFAULT_BLOCKS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const zoom = 0.62;

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<any>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number; label: string } | null>(null);

  const { data: templatesData, mutate: mutateTemplates } = useSWR("/api/invoice-templates", fetcher);
  const templates: InvoiceTemplateRow[] = templatesData?.templates || [];

  const page = PAGE_SIZES[pageSize];
  const selected = blocks.find((b) => b.id === selectedId) || null;

  // Load selected template
  const loadTemplate = (tmpl: InvoiceTemplateRow) => {
    setSelectedTemplateId(tmpl.id);
    setTemplateName(tmpl.name);
    setIsDefault(tmpl.isDefault);
    if (tmpl.layout) {
      setPageSize(tmpl.layout.pageSize || "LETTER");
      setBlocks(tmpl.layout.blocks || DEFAULT_BLOCKS);
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplateId(null);
    setTemplateName("New Custom Invoice Layout");
    setIsDefault(false);
    setPageSize("LETTER");
    setBlocks(DEFAULT_BLOCKS);
  };

  const handleSaveBackend = async () => {
    setIsSaving(true);
    try {
      const layoutPayload = {
        pageSize,
        blocks,
      };

      let url = "/api/invoice-templates";
      let method = "POST";

      if (selectedTemplateId) {
        url = `/api/invoice-templates/${selectedTemplateId}`;
        method = "PATCH";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          layout: layoutPayload,
          isDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");

      toast.success(selectedTemplateId ? "Template updated!" : "Template created!");
      if (data.template) {
        setSelectedTemplateId(data.template.id);
      }
      mutateTemplates();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / zoom,
        y: (clientY - rect.top) / zoom,
      };
    },
    [zoom]
  );

  const onBlockPointerDown = (e: React.PointerEvent, block: InvoiceTemplateBlock) => {
    e.stopPropagation();
    setSelectedId(block.id);
    const pt = getCanvasPoint(e.clientX, e.clientY);
    dragState.current = { mode: "move", id: block.id, offsetX: pt.x - block.x, offsetY: pt.y - block.y };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onPaletteMouseDown = (e: React.PointerEvent, def: any) => {
    dragState.current = { mode: "new", type: def.type, w: def.w, h: def.h, label: def.label };
    setGhostPos({ x: e.clientX, y: e.clientY, label: def.label });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragState.current;
      if (!drag) return;

      if (drag.mode === "move") {
        const pt = getCanvasPoint(e.clientX, e.clientY);
        const x = Math.max(0, Math.min(page.width - 20, pt.x - drag.offsetX));
        const y = Math.max(0, Math.min(page.height - 20, pt.y - drag.offsetY));
        setBlocks((prev) => prev.map((b) => (b.id === drag.id ? { ...b, x, y } : b)));
      } else if (drag.mode === "new") {
        setGhostPos({ x: e.clientX, y: e.clientY, label: drag.label });
      }
    },
    [getCanvasPoint, page.width, page.height]
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const drag = dragState.current;
      if (drag?.mode === "move") {
        setBlocks((prev) => prev.map((b) => (b.id === drag.id ? { ...b, x: snap(b.x), y: snap(b.y) } : b)));
      } else if (drag?.mode === "new" && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const insideCanvas =
          e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (insideCanvas) {
          const pt = getCanvasPoint(e.clientX, e.clientY);
          const newBlock: InvoiceTemplateBlock = {
            id: `b${nextId++}`,
            type: drag.type,
            x: snap(Math.max(0, Math.min(page.width - drag.w, pt.x - drag.w / 2))),
            y: snap(Math.max(0, Math.min(page.height - drag.h, pt.y - drag.h / 2))),
            width: drag.w,
            height: drag.h,
            config: {},
          };
          setBlocks((prev) => [...prev, newBlock]);
          setSelectedId(newBlock.id);
        }
      }
      dragState.current = null;
      setGhostPos(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    },
    [getCanvasPoint, onPointerMove, page.width, page.height]
  );

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateConfigText = (id: string, text: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, config: { ...b.config, text } } : b)));
  };

  const layoutJson = {
    pageSize,
    blocks: blocks.map(({ id, type, x, y, width, height, config }) => ({ id, type, x, y, width, height, config })),
  };

  const copyJson = () => {
    navigator.clipboard?.writeText(
      JSON.stringify({ name: templateName, layout: layoutJson, isDefault }, null, 2)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        display: "flex",
        height: 640,
        fontFamily: SANS,
        border: `1px solid ${GRID_LINE}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Palette */}
      <div style={{ width: 210, background: INK, color: "#fff", padding: "16px 12px", overflowY: "auto", flexShrink: 0 }}>
        {/* Saved Templates List */}
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${INK_SOFT}` }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", color: "#93A2C4", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>TEMPLATES</span>
            <button onClick={handleCreateNew} style={{ background: "transparent", border: "none", color: AMBER, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
              + NEW
            </button>
          </div>
          {templates.length === 0 ? (
            <div style={{ fontSize: 11, color: MUTED }}>No saved templates</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => loadTemplate(tmpl)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: `1px solid ${selectedTemplateId === tmpl.id ? AMBER : "transparent"}`,
                    background: selectedTemplateId === tmpl.id ? INK_SOFT : "transparent",
                    color: "#fff",
                    fontSize: 11.5,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tmpl.name}</span>
                  {tmpl.isDefault && <Star size={11} fill={AMBER} color={AMBER} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", color: "#93A2C4", marginBottom: 10 }}>
          BLOCKS · DRAG IN
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {BLOCK_DEFS.map((def) => {
            const Icon = def.icon;
            return (
              <div
                key={def.type}
                onPointerDown={(e) => onPaletteMouseDown(e, def)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid ${INK_SOFT}`,
                  cursor: "grab",
                  fontSize: 12,
                  userSelect: "none",
                  touchAction: "none",
                }}
              >
                <Icon size={14} strokeWidth={1.75} />
                {def.label}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${INK_SOFT}` }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", color: "#93A2C4", marginBottom: 8 }}>
            PAGE SIZE
          </div>
          {Object.entries(PAGE_SIZES).map(([key, val]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, marginBottom: 6, cursor: "pointer" }}>
              <input type="radio" checked={pageSize === key} onChange={() => setPageSize(key as any)} />
              {val.label}
            </label>
          ))}
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ flex: 1, background: BLUEPRINT_BG, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            borderBottom: `1px solid ${GRID_LINE}`,
            background: PAPER,
          }}
        >
          <input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: INK,
              border: "none",
              outline: "none",
              background: "transparent",
              minWidth: 160,
            }}
          />
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: MUTED, display: "flex", alignItems: "center", gap: 4 }}>
            <Ruler size={11} /> {page.width} × {page.height}
          </span>
          <div style={{ flex: 1 }} />

          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: INK_SOFT, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Default Template
          </label>

          <button
            onClick={() => setShowJson((s) => !s)}
            style={{
              fontSize: 11.5,
              padding: "5px 10px",
              borderRadius: 6,
              border: `1px solid ${GRID_LINE}`,
              background: showJson ? AMBER_SOFT : "transparent",
              cursor: "pointer",
            }}
          >
            {showJson ? "Canvas" : "JSON"}
          </button>

          <button
            onClick={handleSaveBackend}
            disabled={isSaving}
            style={{
              fontSize: 11.5,
              padding: "5px 12px",
              borderRadius: 6,
              border: "none",
              background: AMBER,
              color: INK,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Save size={12} />
            {isSaving ? "Saving..." : "Save Template"}
          </button>
        </div>

        {showJson ? (
          <pre
            style={{
              margin: 0,
              padding: 16,
              fontFamily: MONO,
              fontSize: 11,
              color: INK,
              background: "#fff",
              overflow: "auto",
              flex: 1,
              borderBottom: `1px solid ${GRID_LINE}`,
            }}
          >
{JSON.stringify({ name: templateName, layout: layoutJson, isDefault }, null, 2)}
          </pre>
        ) : (
          <div style={{ flex: 1, overflow: "auto", padding: 20, display: "flex", justifyContent: "center" }}>
            <div
              ref={canvasRef}
              onPointerDown={() => setSelectedId(null)}
              style={{
                position: "relative",
                width: page.width * zoom,
                height: page.height * zoom,
                backgroundImage: `linear-gradient(${GRID_LINE} 1px, transparent 1px), linear-gradient(90deg, ${GRID_LINE} 1px, transparent 1px)`,
                backgroundSize: `${GRID_STEP * zoom}px ${GRID_STEP * zoom}px`,
                backgroundColor: PAPER,
                boxShadow: "0 1px 3px rgba(31,42,68,0.12), 0 8px 24px rgba(31,42,68,0.08)",
                flexShrink: 0,
              }}
            >
              {blocks.map((block) => {
                const isSelected = block.id === selectedId;
                return (
                  <div
                    key={block.id}
                    onPointerDown={(e) => onBlockPointerDown(e, block)}
                    style={{
                      position: "absolute",
                      left: block.x * zoom,
                      top: block.y * zoom,
                      width: block.width * zoom,
                      height: block.height * zoom,
                      border: `1.5px ${isSelected ? "solid" : "dashed"} ${isSelected ? AMBER : GRID_LINE}`,
                      background: isSelected ? "rgba(232,163,61,0.06)" : "transparent",
                      cursor: "grab",
                      padding: 8 * zoom,
                      boxSizing: "border-box",
                      touchAction: "none",
                    }}
                  >
                    <BlockPreview block={block} />
                    {isSelected && (
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => deleteBlock(block.id)}
                        style={{
                          position: "absolute",
                          top: -10,
                          right: -10,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: "none",
                          background: INK,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                        aria-label={`Remove ${block.type} block`}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Inspector */}
      <div style={{ width: 200, background: "#fff", borderLeft: `1px solid ${GRID_LINE}`, padding: 14, flexShrink: 0, overflowY: "auto" }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", color: MUTED, marginBottom: 10 }}>
          INSPECTOR
        </div>
        {!selected ? (
          <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
            Select a block on the canvas, or drag one in from the palette to place it.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, textTransform: "capitalize" }}>
                {selected.type.replace(/_/g, " ")}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontFamily: MONO, fontSize: 10.5 }}>
              <div>
                <div style={{ color: MUTED, marginBottom: 2 }}>X</div>
                <div>{Math.round(selected.x)}</div>
              </div>
              <div>
                <div style={{ color: MUTED, marginBottom: 2 }}>Y</div>
                <div>{Math.round(selected.y)}</div>
              </div>
              <div>
                <div style={{ color: MUTED, marginBottom: 2 }}>W</div>
                <div>{Math.round(selected.width)}</div>
              </div>
              <div>
                <div style={{ color: MUTED, marginBottom: 2 }}>H</div>
                <div>{Math.round(selected.height)}</div>
              </div>
            </div>

            {(selected.type === "text" || selected.type === "notes" || selected.type === "terms") && (
              <div>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Content</div>
                <textarea
                  value={((selected.config?.text as string) || "")}
                  onChange={(e) => updateConfigText(selected.id, e.target.value)}
                  rows={4}
                  style={{
                    width: "100%",
                    fontSize: 12,
                    fontFamily: SERIF,
                    border: `1px solid ${GRID_LINE}`,
                    borderRadius: 6,
                    padding: 6,
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            <button
              onClick={() => deleteBlock(selected.id)}
              style={{
                fontSize: 11.5,
                padding: "6px 8px",
                borderRadius: 6,
                border: `1px solid #E24B4A`,
                color: "#A32D2D",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                justifyContent: "center",
                marginTop: 8,
              }}
            >
              <Trash2 size={12} /> Remove block
            </button>
          </div>
        )}
      </div>

      {ghostPos && (
        <div
          style={{
            position: "fixed",
            left: ghostPos.x + 10,
            top: ghostPos.y + 10,
            pointerEvents: "none",
            background: INK,
            color: "#fff",
            fontSize: 11,
            fontFamily: MONO,
            padding: "4px 8px",
            borderRadius: 4,
            zIndex: 50,
          }}
        >
          + {ghostPos.label}
        </div>
      )}
    </div>
  );
}
