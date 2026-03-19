export function formatTicketTitle(ticketId: string, companyName: string) {
  const normalizedCompanyName = companyName.trim() || "Untitled Company";
  return `${ticketId} · ${normalizedCompanyName}`;
}

export function formatPdfFileName(
  fullName: string,
  document: "cv" | "coverLetter"
) {
  const normalizedFullName = fullName.trim() || "Candidate";

  if (document === "cv") {
    return `${normalizedFullName} CV.pdf`;
  }

  return `${normalizedFullName} Cover Letter.pdf`;
}

export function formatArchiveFileName(companyName: string) {
  const normalizedCompanyName = companyName.trim() || "Documents";
  return `${normalizedCompanyName}.zip`;
}
