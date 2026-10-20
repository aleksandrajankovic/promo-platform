import { describe, expect, it } from "vitest";
import { sanitizeRichHtml, sanitizeSvg } from "./sanitize";

describe("sanitizeSvg", () => {
  it("strips <script> tags", () => {
    const out = sanitizeSvg('<svg><script>alert(1)</script><circle r="5"/></svg>');
    expect(out).not.toContain("<script");
    expect(out).toContain("<circle");
  });

  it("strips <style> blocks (CSS-based exfiltration vector)", () => {
    const out = sanitizeSvg("<svg><style>rect{fill:red}</style><rect/></svg>");
    expect(out).not.toContain("<style");
  });

  it("strips SMIL-based attribute injection (<set>, <animate>)", () => {
    const out = sanitizeSvg(
      '<svg><rect><set attributeName="onmouseover" to="alert(1)"/><animate attributeName="href" values="javascript:alert(1)"/></rect></svg>'
    );
    expect(out).not.toContain("onmouseover");
    expect(out).not.toContain("javascript:");
  });

  it("strips <foreignObject>", () => {
    const out = sanitizeSvg("<svg><foreignObject><div>x</div></foreignObject></svg>");
    expect(out).not.toContain("foreignObject");
  });

  it("preserves case-sensitive SVG attributes like viewBox/preserveAspectRatio", () => {
    const out = sanitizeSvg(
      '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><circle r="5"/></svg>'
    );
    expect(out).toContain("viewBox=");
    expect(out).toContain("preserveAspectRatio=");
    // A naive HTML5 parser would lowercase these — confirm it didn't happen.
    expect(out).not.toContain("viewbox=");
    expect(out).not.toContain("preserveaspectratio=");
  });

  it("returns null for non-string input", () => {
    expect(sanitizeSvg(null)).toBeNull();
    expect(sanitizeSvg(undefined)).toBeNull();
    expect(sanitizeSvg(42)).toBeNull();
  });
});

describe("sanitizeRichHtml", () => {
  it("strips disallowed tags like <script>", () => {
    const out = sanitizeRichHtml("<p>hi</p><script>alert(1)</script>");
    expect(out).not.toContain("<script");
    expect(out).toContain("<p>hi</p>");
  });

  it("forces rel=noopener noreferrer on links", () => {
    const out = sanitizeRichHtml('<a href="https://example.com">link</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("returns null for empty/non-string input", () => {
    expect(sanitizeRichHtml("")).toBeNull();
    expect(sanitizeRichHtml(null)).toBeNull();
  });
});
