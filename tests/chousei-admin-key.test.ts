import { describe, it, expect } from "vitest";
import { generateAdminKey, adminKeyMatches } from "../app/chousei/lib/storage";

describe("generateAdminKey", () => {
  it("32文字の16進文字列を返す", () => {
    const k = generateAdminKey();
    expect(k).toMatch(/^[0-9a-f]{32}$/);
  });

  it("連続呼び出しで毎回異なる値を返す(エントロピー確認)", () => {
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) set.add(generateAdminKey());
    expect(set.size).toBe(50);
  });
});

describe("adminKeyMatches", () => {
  it("両方が同じ文字列なら true", () => {
    expect(adminKeyMatches("abc", "abc")).toBe(true);
  });

  it("文字列が違えば false", () => {
    expect(adminKeyMatches("abc", "abd")).toBe(false);
  });

  it("片方が undefined/null なら false", () => {
    expect(adminKeyMatches(undefined, "abc")).toBe(false);
    expect(adminKeyMatches("abc", undefined)).toBe(false);
    expect(adminKeyMatches(null, "abc")).toBe(false);
    expect(adminKeyMatches("abc", null)).toBe(false);
    expect(adminKeyMatches(undefined, undefined)).toBe(false);
  });

  it("空文字は false(保存側が無効な場合に意図せず通さない)", () => {
    expect(adminKeyMatches("", "")).toBe(false);
    expect(adminKeyMatches("", "abc")).toBe(false);
    expect(adminKeyMatches("abc", "")).toBe(false);
  });
});
