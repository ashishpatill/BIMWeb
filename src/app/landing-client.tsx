"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  LoginLink,
  RegisterLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import Link from "next/link";
import {
  Box,
  Search,
  FileText,
  Users,
  Key,
  Activity,
  Upload,
  MessageSquare,
  Eye,
  ArrowRight,
  Menu,
  X,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  GitFork,
  Cpu,
  Database,
  Globe,
} from "lucide-react";

// ── Props ──────────────────────────────────────────────────────────

interface LandingClientProps {
  isSignedIn: boolean;
}

// ── Feature data ───────────────────────────────────────────────────

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Box,
    title: "3D BIM Viewer",
    description:
      "Visualize IFC and glTF models with orbit, pan, measure, section planes, and a live model tree.",
  },
  {
    icon: Search,
    title: "Smart Search",
    description:
      "Tri-modal retrieval combining keyword, semantic, and graph relationships for grounded answers.",
  },
  {
    icon: FileText,
    title: "Document Ingestion",
    description:
      "Upload PDFs, images, and text files; pipeline parses, indexes, and makes them searchable.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Role-based access (admin, editor, viewer) with project sharing, invites, and audit logs.",
  },
  {
    icon: Key,
    title: "REST API Access",
    description:
      "Full v1 REST API with per-user API keys, scoped permissions, and rate limiting.",
  },
  {
    icon: Activity,
    title: "Platform Health",
    description:
      "Real-time monitoring of all ecosystem services with test queries and trace visibility.",
  },
];

// ── Step data ──────────────────────────────────────────────────────

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: Upload,
    title: "Upload your BIM model",
    description:
      "Drag and drop IFC, glTF, or GLB files. No conversion needed — the viewer loads them directly.",
  },
  {
    icon: MessageSquare,
    title: "Ask questions in plain English",
    description:
      "Type a query like \"What's the fire rating on floor 3?\" and let the platform search across models and documents.",
  },
  {
    icon: Eye,
    title: "See grounded answers on the model",
    description:
      "Get citations from your knowledge base, with source cards and the ability to highlight elements in the 3D viewer.",
  },
];

// ── Comparison data ────────────────────────────────────────────────

interface ComparisonRow {
  feature: string;
  bimweb: boolean;
  llamaParse: boolean | "partial";
  pinecone: boolean;
}

const COMPARISON: ComparisonRow[] = [
  { feature: "3D BIM Visualization", bimweb: true, llamaParse: false, pinecone: false },
  { feature: "Tri-modal Search (keyword + semantic + graph)", bimweb: true, llamaParse: false, pinecone: false },
  { feature: "Graph-based Retrieval", bimweb: true, llamaParse: false, pinecone: false },
  { feature: "Document Ingestion & Parsing", bimweb: true, llamaParse: true, pinecone: false },
  { feature: "Vector Database", bimweb: true, llamaParse: false, pinecone: true },
  { feature: "Self-hostable / On-premises", bimweb: true, llamaParse: false, pinecone: false },
  { feature: "Team Collaboration & RBAC", bimweb: true, llamaParse: false, pinecone: false },
];

// ── Ecosystem services ─────────────────────────────────────────────

interface Service {
  name: string;
  role: string;
  port: number;
  color: string;
}

const SERVICES: Service[] = [
  { name: "BIMAgent", role: "Central orchestrator", port: 8000, color: "text-blue-400" },
  { name: "BIMIndex", role: "Tri-modal retrieval (Tantivy / LanceDB / KùzuDB)", port: 8001, color: "text-emerald-400" },
  { name: "BIMExtract", role: "Ingestion pipeline + research modules", port: 8200, color: "text-purple-400" },
  { name: "BIMCloud", role: "Edge gateway + telemetry + metrics", port: 8080, color: "text-amber-400" },
];

// ── Nav links ──────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Docs", href: "https://github.com/ashishpatill/BIMWeb/blob/main/README.md" },
];

// ── Component ──────────────────────────────────────────────────────

export function LandingClient({ isSignedIn }: LandingClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-x-hidden font-sans">
      {/* Skip-to-content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-4 focus:left-4 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none"
      >
        Skip to content
      </a>

      {/* Background gradients */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-primary/15 rounded-full blur-[150px] opacity-40 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] opacity-30 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] opacity-20 pointer-events-none" />

      {/* ── Sticky Nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-2xl">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 text-primary transition-colors group-hover:bg-primary/30">
              <Box className="size-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              BIMWeb
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) =>
              link.href.startsWith("http") ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  {link.label}
                  <ExternalLink className="inline-block ml-1 size-3" />
                </a>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ),
            )}
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(var(--primary),0.3)]"
              >
                Go to dashboard
                <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <>
                <LoginLink className="px-5 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                  Sign in
                </LoginLink>
                <RegisterLink className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(var(--primary),0.3)]">
                  Get started
                  <ArrowRight className="size-3.5" />
                </RegisterLink>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center size-9 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-white/5 bg-zinc-950/95 backdrop-blur-2xl"
            role="region"
            aria-label="Mobile navigation"
          >
            <nav aria-label="Mobile navigation links" className="flex flex-col gap-1 px-4 py-4">
              {NAV_LINKS.map((link) =>
                link.href.startsWith("http") ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    className="rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ),
              )}
              <div className="mt-3 border-t border-white/5 pt-3 flex flex-col gap-2">
                {isSignedIn ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Go to dashboard
                    <ArrowRight className="size-3.5" />
                  </Link>
                ) : (
                  <>
                    <LoginLink className="flex items-center justify-center rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                      Sign in
                    </LoginLink>
                    <RegisterLink className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                      Get started
                      <ArrowRight className="size-3.5" />
                    </RegisterLink>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </header>

      <main id="main-content" className="relative z-10">
        {/* ── Hero ── */}
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 sm:pt-28 lg:px-8 lg:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            {/* Logo icon */}
            <div className="mb-8 inline-flex items-center justify-center p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <Box className="size-12 text-primary" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
              The BIM intelligence
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                platform
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-zinc-400 leading-relaxed">
              Visualize, search, and reason over 3D building models and engineering
              documents — with tri-modal search, graph relationships, and a connected
              ecosystem.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="group relative inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(var(--primary),0.4)]"
                >
                  <span>Go to dashboard</span>
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <RegisterLink className="group relative inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(var(--primary),0.4)]">
                  <span>Start free</span>
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </RegisterLink>
              )}

              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-zinc-300 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white active:scale-95"
              >
                See live demo
                <ExternalLink className="size-4" />
              </Link>
            </div>

            <p className="mt-6 text-sm text-zinc-500">
              {isSignedIn
                ? "Continue where you left off — your projects and models are ready."
                : "No credit card required. Sign up in seconds."}
            </p>
          </motion.div>
        </section>

        {/* ── How it works (3 steps) ── */}
        <section
          id="how-it-works"
          className="border-t border-white/5 bg-zinc-950/50"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                How it works
              </h2>
              <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
                From upload to insight in three steps — no configuration required.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Step number */}
                  <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary border border-primary/20">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                    <step.icon className="size-6 text-primary" />
                  </div>

                  <h3 className="text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed max-w-xs">
                    {step.description}
                  </p>

                  {/* Connector arrow (desktop) */}
                  {index < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-6 -right-4 text-zinc-600">
                      <ChevronRight className="size-5" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features grid (6) ── */}
        <section id="features" className="border-t border-white/5">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Everything you need for BIM intelligence
              </h2>
              <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
                A unified platform spanning 3D visualization, search, ingestion,
                collaboration, and API access.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-primary/20 hover:bg-white/[0.05]"
                >
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <feature.icon className="size-5" />
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparison strip ── */}
        <section className="border-t border-white/5 bg-zinc-950/50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                How BIMWeb compares
              </h2>
              <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
                Unlike single-purpose tools, BIMWeb is a full BIM intelligence
                platform — combining 3D visualization, tri-modal search,
                document ingestion, graph relationships, and team collaboration
                in one self-hostable stack.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="overflow-x-auto"
            >
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 pr-6 text-sm font-semibold text-zinc-300">
                      Feature
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-bold text-primary">
                      BIMWeb
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-zinc-300">
                      LlamaParse
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-zinc-300">
                      Pinecone
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="py-3.5 pr-6 text-sm text-zinc-300">
                        {row.feature}
                      </td>
                      <td className="text-center py-3.5 px-4">
                        {row.bimweb ? (
                          <CheckCircle2 className="inline-block size-4.5 text-emerald-400" />
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="text-center py-3.5 px-4">
                        {row.llamaParse === true ? (
                          <CheckCircle2 className="inline-block size-4.5 text-emerald-400" />
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="text-center py-3.5 px-4">
                        {row.pinecone ? (
                          <CheckCircle2 className="inline-block size-4.5 text-emerald-400" />
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>

            <p className="mt-6 text-center text-xs text-zinc-500 max-w-lg mx-auto">
              <strong>LlamaParse</strong> is a document parsing API.{" "}
              <strong>Pinecone</strong> is a managed vector database. BIMWeb
              combines 3D visualization, search, ingestion, graph, and
              collaboration in a single open platform.
            </p>
          </div>
        </section>

        {/* ── Ecosystem diagram ── */}
        <section id="ecosystem" className="border-t border-white/5">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Ecosystem architecture
              </h2>
              <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
                BIMWeb is the front door to a modular, model-agnostic ecosystem
                of retrieval, ingestion, and gateway services.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-6"
            >
              {/* BIMWeb box */}
              <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-8 py-4 shadow-[0_0_30px_rgba(var(--primary),0.15)]">
                <Box className="size-6 text-primary" />
                <span className="text-lg font-bold text-white">BIMWeb</span>
                <span className="text-sm text-zinc-400">(UI — port 3000)</span>
              </div>

              {/* Down arrow */}
              <div className="flex flex-col items-center gap-1">
                <ArrowRight className="size-5 text-zinc-600 rotate-90" />
                <span className="text-[10px] font-mono text-zinc-600">HTTP / REST</span>
              </div>

              {/* BIMAgent box */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 py-4">
                <Cpu className="size-5 text-blue-400" />
                <span className="text-base font-semibold text-white">BIMAgent</span>
                <span className="text-sm text-zinc-400">(Orchestrator — :8000)</span>
              </div>

              {/* Branching arrows */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <ArrowRight className="size-5 text-zinc-600 rotate-90" />
                </div>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-[10px] font-mono text-zinc-600">triggers</span>
                  <span className="text-zinc-500">|</span>
                  <span className="text-[10px] font-mono text-zinc-600">routes queries</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ArrowRight className="size-5 text-zinc-600 rotate-90" />
                </div>
              </div>

              {/* Two columns: BIMIndex + BIMExtract on one row, BIMCloud below */}
              <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
                {/* Top row: BIMIndex + BIMExtract */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5">
                    <Database className="size-5 text-emerald-400" />
                    <span className="text-base font-semibold text-white">BIMIndex</span>
                    <span className="text-sm text-zinc-400">(Retrieval — :8001)</span>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-zinc-500">
                    <span className="size-1.5 rounded-full bg-zinc-600" />
                    <span className="size-1.5 rounded-full bg-zinc-600" />
                    <span className="size-1.5 rounded-full bg-zinc-600" />
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5">
                    <GitFork className="size-5 text-purple-400" />
                    <span className="text-base font-semibold text-white">BIMExtract</span>
                    <span className="text-sm text-zinc-400">(Ingestion — :8200)</span>
                  </div>
                </div>

                {/* Gateway row */}
                <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-3.5">
                  <Globe className="size-5 text-amber-400" />
                  <span className="text-base font-semibold text-white">BIMCloud</span>
                  <span className="text-sm text-zinc-400">(Gateway + Metrics — :8080)</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-zinc-950/80">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Box className="size-3.5" />
                </div>
                <span className="text-sm font-bold text-white">BIMWeb</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-xs">
                An open BIM intelligence platform with 3D visualization, tri-modal
                search, document ingestion, and team collaboration.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                Resources
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="https://github.com/ashishpatill/BIMWeb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="size-3" />
                    GitHub / Repo
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ashishpatill/BIMWeb/blob/main/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="size-3" />
                    Documentation
                  </a>
                </li>
                <li>
                  <Link
                    href="/dashboard/health"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Platform Status
                  </Link>
                </li>
              </ul>
            </div>

            {/* Ecosystem */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                Ecosystem
              </h4>
              <ul className="space-y-2.5">
                {SERVICES.map((svc) => (
                  <li key={svc.name}>
                    <span className="text-sm text-zinc-500">
                      <span className={`${svc.color} font-medium`}>{svc.name}</span>
                      {" — "}
                      <span className="text-zinc-600">{svc.role}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-zinc-600">
              &copy; {new Date().getFullYear()} BIMWeb. Open source (MIT).
            </p>
            <p className="text-xs text-zinc-600">
              Built with Next.js, Drizzle ORM, and three.js.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
