#!/usr/bin/env node
// Gera as páginas produtos/<slug>/index.html a partir de data/videos.json,
// mantém o sitemap.xml em sincronia e cria QR codes que ainda não existem.
//
// Fluxo para um vídeo novo:
//   1. Adicione os produtos em data/products.json (se ainda não existirem)
//   2. Adicione a entrada do vídeo em data/videos.json
//   3. Rode: node scripts/generate-video-pages.mjs
//
// Uso: node scripts/generate-video-pages.mjs [slug]
//   Sem argumento, regenera as páginas de todos os vídeos.

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = "https://andredestro.github.io";
const sitemapPath = path.join(root, "sitemap.xml");

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

  // Insere depois do último bloco de /produtos/ (ou do /setup/) para manter
  // as URLs agrupadas antes das páginas de apps.
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
    console.log(`  QR já existe: assets/qr/${slug}.png`);
    return;
  }
  if (process.platform !== "darwin") {
    console.warn(`  QR não gerado (requer macOS): swift scripts/generate-qr.swift ${pageUrl} assets/qr/${slug}.png`);
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
    console.error(`Vídeo não encontrado em data/videos.json: ${slug}`);
    process.exitCode = 1;
    continue;
  }

  console.log(`Vídeo: ${slug}`);
  const pageUrl = `${baseUrl}/produtos/${slug}/`;
  const html = template
    .replaceAll("{{slug}}", slug)
    .replaceAll("{{url}}", pageUrl)
    .replaceAll("{{title}}", escapeHtml(video.title))
    .replaceAll("{{description}}", escapeHtml(video.description));

  const pageDir = path.join(root, "produtos", slug);
  await mkdir(pageDir, { recursive: true });
  await writeFile(path.join(pageDir, "index.html"), html);
  console.log(`  Página gerada: produtos/${slug}/index.html`);

  if (sitemap.includes(`<loc>${pageUrl}</loc>`)) {
    console.log("  Sitemap já contém a URL.");
  } else {
    sitemap = insertSitemapUrl(sitemap, pageUrl);
    sitemapChanged = true;
    console.log("  URL adicionada ao sitemap.xml.");
  }

  await generateQrCode(slug, pageUrl);
}

if (sitemapChanged) {
  await writeFile(sitemapPath, sitemap);
}
