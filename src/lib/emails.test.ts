import { describe, it, expect } from "vitest";
import { escapeHtml, reservationApprovedEmail, reservationCreatedEmail } from "./emails";

describe("escapeHtml", () => {
  it("escapa < > & \" '", () => {
    expect(escapeHtml(`<script>alert("x&y")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });
  it("escapa & primero (sin doble escape)", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("templates", () => {
  it("approved: adminNotes con XSS llega escapado", () => {
    const html = reservationApprovedEmail({
      userName: "Ana",
      areaName: "Salón",
      startTime: "hoy",
      endTime: "10:00",
      adminNotes: `<img src=x onerror=alert(1)>`,
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
  it("created: userName/areaName llegan escapados", () => {
    const html = reservationCreatedEmail({
      userName: "<b>Ana</b>",
      areaName: "<i>Salón</i>",
      startTime: "hoy",
      endTime: "10:00",
      reservationId: "abc123",
    });
    expect(html).not.toContain("<b>Ana</b>");
    expect(html).toContain("&lt;b&gt;Ana&lt;/b&gt;");
  });
});
