function stripCodeFence(value: string) {
  return value
    .replace(/^```(json|markdown|text)?/im, "")
    .replace(/```$/m, "")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCaseInsensitiveValue(value: unknown, keyName: string): unknown {
  if (!isRecord(value)) {
    return null;
  }

  const key = Object.keys(value).find(
    (candidate) => candidate.toLowerCase() === keyName.toLowerCase()
  );

  return key ? value[key] : null;
}

function extractSection(text: string, sectionName: string) {
  const regex = new RegExp(
    `###\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=###|$)`,
    "i"
  );
  const match = text.match(regex);
  return match?.[1]?.trim() ?? "";
}

function extractHeader(text: string) {
  const lines = text.trim().split("\n");
  const nameLine = lines.find((line) => line.startsWith("#")) || lines[0] || "Candidate";
  const contactLine =
    lines.find((line) => line.includes("@") || line.includes("+")) || "";

  return {
    name: nameLine.replace(/^#+\s*/, "").trim(),
    contacts: contactLine.trim(),
  };
}

export function isLegacyFinalResumeMarkdown(value: string) {
  const normalized = stripCodeFence(value);

  return (
    /^#\s+.+/m.test(normalized) &&
    /^---$/m.test(normalized) &&
    /###\s*Summary/i.test(normalized) &&
    /###\s*Skills/i.test(normalized) &&
    /###\s*Experience/i.test(normalized) &&
    (/###\s*Education/i.test(normalized) || /###\s*Languages/i.test(normalized))
  );
}

export function buildLegacyResumeMarkdown(rawOutput: string, baseCv: string) {
  const cleanedOutput = stripCodeFence(rawOutput);

  if (isLegacyFinalResumeMarkdown(cleanedOutput)) {
    return cleanedOutput;
  }

  if (!baseCv.trim()) {
    throw new Error("Base CV is required to assemble the resume export.");
  }

  let refinedCvMarkdown = "";
  const jsonMatch = cleanedOutput.match(/(\[[\s\S]*\])|(\{[\s\S]*\})/);
  let parsedStructuredOutput = false;

  if (jsonMatch) {
    try {
      let parsed: unknown = JSON.parse(jsonMatch[0] ?? "");

      if (Array.isArray(parsed)) {
        parsed = parsed[0];
      }

      const summary = getCaseInsensitiveValue(parsed, "summary");
      const skills = getCaseInsensitiveValue(parsed, "skills");
      const experience = getCaseInsensitiveValue(parsed, "experience");

      if (summary || experience) {
        let builtMarkdown = `### Summary\n${String(summary || "")}\n\n### Skills\n`;

        if (isRecord(skills)) {
          for (const [key, value] of Object.entries(skills)) {
            const cleanKey = key.includes("_")
              ? key
                  .split("_")
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(" ")
                  .replace(" And ", " & ")
              : key;

            builtMarkdown += `**${cleanKey}:** ${String(value)}\n`;
          }
        }

        builtMarkdown += `\n### Experience\n\n`;

        if (Array.isArray(experience)) {
          for (const job of experience) {
            const title =
              getCaseInsensitiveValue(job, "title") ||
              getCaseInsensitiveValue(job, "role") ||
              "";
            const company = getCaseInsensitiveValue(job, "company") || "";
            const dates = getCaseInsensitiveValue(job, "dates") || "";

            let header = String(title);

            if (company && !String(title).includes(String(company))) {
              header += ` | ${String(company)}`;
            }

            builtMarkdown += `**${header}** | *${String(dates)}*\n`;

            const bullets =
              getCaseInsensitiveValue(job, "bullets") ||
              getCaseInsensitiveValue(job, "experience") ||
              [];

            if (Array.isArray(bullets)) {
              for (const bullet of bullets) {
                builtMarkdown += `* ${String(bullet).replace(/\n/g, " ").trim()}\n`;
              }
            }

            builtMarkdown += `\n`;
          }
        }

        refinedCvMarkdown = builtMarkdown.trim();
        parsedStructuredOutput = true;
      }
    } catch {
      // fall back to plain markdown parsing below
    }
  }

  if (!parsedStructuredOutput) {
    const [beforeEducation = ""] = cleanedOutput.split(
      /(###\s*(Education|Languages)|EDUCATION\n)/i
    );
    refinedCvMarkdown = beforeEducation.trim();
  }

  const education = extractSection(baseCv, "Education");
  const languages = extractSection(baseCv, "Languages");
  const { name, contacts } = extractHeader(baseCv);

  const sections = [
    `# ${name}`,
    contacts ? `**${contacts}**` : "",
    "",
    "---",
    "",
    refinedCvMarkdown,
    education ? `### Education\n${education}` : "",
    languages ? `### Languages\n${languages}` : "",
  ].filter(Boolean);

  return sections.join("\n\n").trim();
}

export function buildResumeMarkdownForPreview(rawOutput: string, baseCv: string) {
  const cleanedOutput = stripCodeFence(rawOutput);

  if (isLegacyFinalResumeMarkdown(cleanedOutput)) {
    return cleanedOutput;
  }

  if (!baseCv.trim()) {
    return cleanedOutput;
  }

  return buildLegacyResumeMarkdown(cleanedOutput, baseCv);
}

export function markdownToLegacyResumeHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;

  for (let line of lines) {
    line = line.trim();

    if (!line) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }

    line = line
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a target="_blank" href="$2">$1</a>');

    if (line.startsWith("### ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h3>${line.substring(4)}</h3>`);
    } else if (line.startsWith("## ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h2>${line.substring(3)}</h2>`);
    } else if (line.startsWith("# ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h1>${line.substring(2)}</h1>`);
    } else if (line === "---") {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push("<hr>");
    } else if (line.startsWith("* ") || line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${line.substring(2)}</li>`);
    } else {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      if (html.length > 0 && html.at(-1)?.startsWith("<h1>")) {
        html.push(`<p class="contact-info">${line}</p>`);
      } else {
        html.push(`<p>${line}</p>`);
      }
    }
  }

  if (inList) {
    html.push("</ul>");
  }

  return html.join("\n");
}

export function buildLegacyResumeHtmlDocument(markdown: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; line-height: 1.3; color: #222; margin: 20px 30px; font-size: 12px; }
    h1 { text-align: center; margin: 0 0 4px 0; color: #000; font-size: 22px; letter-spacing: 0.5px; }
    .contact-info { text-align: center; font-size: 11px; color: #444; margin: 0 0 10px 0; }
    hr { border: none; border-top: 1px solid #ddd; margin: 10px 0; }
    h3 { border-bottom: 1px solid #333; padding-bottom: 2px; margin-top: 10px; margin-bottom: 4px; font-size: 13px; text-transform: uppercase; color: #111; }
    p { margin: 2px 0; }
    ul { margin: 4px 0 8px 0; padding-left: 20px; }
    li { margin-bottom: 3px; }
    a { color: #0056b3; text-decoration: none; }
    strong { color: #000; font-weight: 600; }
  </style>
</head>
<body>
${markdownToLegacyResumeHtml(markdown)}
</body>
</html>`;
}
