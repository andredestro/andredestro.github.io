#!/usr/bin/env node
// Generates produtos/<slug>/index.html pages from data/videos.json,
// keeps sitemap.xml in sync, and creates QR codes that do not exist yet.
//
// Workflow for a new video:
//   1. Add products to data/products.json (if they do not exist yet)
//   2. Add the video entry to data/videos.json
//   3. Run: node scripts/generate-video-pages.mjs
//
// Usage: node scripts/generate-video-pages.mjs [slug]
//   With no argument, regenerates every video page.

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = "https://andredestro.github.io";
const sitemapPath = path.join(root, "sitemap.xml");
const pageCopy = {
  eyebrow: "Products from the video",
  setupTitle: "My programming setup",
  setupDescription: "Monitor, keyboard, mouse, dock, audio and lighting",
  affiliateNote: "Some links on this page are affiliate links. If you buy through them, I may earn a small commission at no extra cost to you. Prices, sellers and availability may change."
};

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function insertSitemapUrl(sitemap, pageUrl) {
  const block = `  <url>\n    <loc>${pageUrl}</loc>\n  </url>\n`;
  const urlBlockRegex = /  <url>\n    <loc>([^<]+)<\/loc>\n  <\/url>\n/g;

  // Insert after the last /produtos/ block (or /setup/) to keep these URLs
  // grouped before the app pages.
  let insertAt = -1;
  for (const match of sitemap.matchAll(urlBlockRegex)) {
    const loc = match[1];
    if (loc.startsWith(`${baseUrl}/produtos/`) || loc === `${baseUrl}/setup/`) {
      insertAt = match.index + match[0].length;
    }
  }

  if (insertAt === -1) {
    return sitemap.replace("</urlset>", `${block}</urlset>`);
  }
  return sitemap.slice(0, insertAt) + block + sitemap.slice(insertAt);
}

async function generateQrCode(slug, pageUrl) {
  const qrPath = path.join(root, "assets/qr", `${slug}.png`);
  if (await fileExists(qrPath)) {
    console.log(`  QR already exists: assets/qr/${slug}.png`);
    return;
  }
  if (process.platform !== "darwin") {
    console.warn(`  QR not generated (requires macOS): swift scripts/generate-qr.swift ${pageUrl} assets/qr/${slug}.png`);
    return;
  }
  const { stdout } = await execFileAsync("swift", [
    path.join(root, "scripts/generate-qr.swift"),
    pageUrl,
    qrPath
  ]);
  console.log(`  ${stdout.trim()}`);
}

const [, , onlySlug] = process.argv;
const videosData = JSON.parse(await readFile(path.join(root, "data/videos.json"), "utf8"));
const template = await readFile(path.join(root, "scripts/video-page.template.html"), "utf8");

const slugs = onlySlug ? [onlySlug] : Object.keys(videosData.videos);
let sitemap = await readFile(sitemapPath, "utf8");
let sitemapChanged = false;

for (const slug of slugs) {
  const video = videosData.videos[slug];
  if (!video) {
    console.error(`Video not found in data/videos.json: ${slug}`);
    process.exitCode = 1;
    continue;
  }

  console.log(`Video: ${slug}`);
  const pageUrl = `${baseUrl}/produtos/${slug}/`;
  const language = video.language ?? "en";
  if (language !== "en") {
    console.error(`Unsupported language for ${slug}: ${language}. Video pages must be in English.`);
    process.exitCode = 1;
    continue;
  }
  const copy = pageCopy;
  const html = template
    .replaceAll("{{slug}}", slug)
    .replaceAll("{{url}}", pageUrl)
    .replaceAll("{{language}}", language)
    .replaceAll("{{title}}", escapeHtml(video.title))
    .replaceAll("{{description}}", escapeHtml(video.description))
    .replaceAll("{{eyebrow}}", escapeHtml(copy.eyebrow))
    .replaceAll("{{setupTitle}}", escapeHtml(copy.setupTitle))
    .replaceAll("{{setupDescription}}", escapeHtml(copy.setupDescription))
    .replaceAll("{{affiliateNote}}", escapeHtml(copy.affiliateNote));

  const pageDir = path.join(root, "produtos", slug);
  await mkdir(pageDir, { recursive: true });
  await writeFile(path.join(pageDir, "index.html"), html);
  console.log(`  Page generated: produtos/${slug}/index.html`);

  if (sitemap.includes(`<loc>${pageUrl}</loc>`)) {
    console.log("  Sitemap already contains the URL.");
  } else {
    sitemap = insertSitemapUrl(sitemap, pageUrl);
    sitemapChanged = true;
    console.log("  URL added to sitemap.xml.");
  }

  try {
    await generateQrCode(slug, pageUrl);
  } catch (error) {
    const reason = error instanceof Error ? error.message.split("\n", 1)[0] : String(error);
    console.warn(`  QR generation skipped for ${slug}: ${reason}`);
  }
}

if (sitemapChanged) {
  await writeFile(sitemapPath, sitemap);
}
