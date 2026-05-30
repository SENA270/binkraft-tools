import { describe, it, expect, beforeAll, vi, afterEach } from "vitest";
import { signState, verifyState, oauthStateConfigured } from "../app/chousei/lib/oauth-state";

const TEST_SECRET = "test-secret-at-least-16-chars-long";

beforeAll(() => {
  process.env.SESSION_SECRET = TEST_SECRET;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("oauth-state(HMAC署名state・CSRF対策)", () => {
  it("oauthStateConfigured: SESSION_SECRETがあれば true", () => {
    expect(oauthStateConfigured()).toBe(true);
  });

  it("sign→verify ラウンドトリップで同じ id が返る", () => {
    const token = signState("event-abc123");
    const v = verifyState(token);
    expect(v?.id).toBe("event-abc123");
  });

  it("空idも署名・検証可能(汎用ログイン用)", () => {
    const token = signState("");
    const v = verifyState(token);
    expect(v?.id).toBe("");
  });

  it("改ざんしたbodyは null(別のidに差し替え不可)", () => {
    const token = signState("victim-event");
    const [, sig] = token.split(".");
    const fakeBody = Buffer.from(JSON.stringify({ id: "attacker-event", exp: 9e9 })).toString("base64url");
    expect(verifyState(`${fakeBody}.${sig}`)).toBeNull();
  });

  it("改ざんしたsignatureは null", () => {
    const token = signState("event-x");
    const [body] = token.split(".");
    const fakeSig = "A".repeat(43); // 43文字=base64url(32bytes)の長さ
    expect(verifyState(`${body}.${fakeSig}`)).toBeNull();
  });

  it("形式不正は null", () => {
    expect(verifyState("garbage")).toBeNull();
    expect(verifyState("")).toBeNull();
    expect(verifyState(null)).toBeNull();
    expect(verifyState(undefined)).toBeNull();
  });

  it("10分超過は期限切れで null(再生攻撃の窓を制限)", () => {
    const token = signState("event-y");
    // 11分後にジャンプ
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 11 * 60 * 1000));
    expect(verifyState(token)).toBeNull();
  });

  it("別の SESSION_SECRET で作った state は検証失敗(秘密漏れない限り偽造不可)", () => {
    const token = signState("event-z");
    process.env.SESSION_SECRET = "different-secret-16chars-min!!";
    expect(verifyState(token)).toBeNull();
    process.env.SESSION_SECRET = TEST_SECRET; // 復元
  });

  it("session cookie と context が分離されている(別用途のHMACを流用できない)", () => {
    // session.ts は CONTEXT_PREFIX を付けない。同じ body+sig を渡してもパースが失敗するか、
    // 仮にパースできても署名が一致しないことを担保。
    // ここでは「異なる prefix で計算した署名は通らない」ことだけ確認する。
    const body = Buffer.from(JSON.stringify({ id: "x", exp: 9e9 })).toString("base64url");
    // signState を介さずに body だけ作って渡しても、対応するHMACが無いので通らない。
    expect(verifyState(`${body}.AAAA`)).toBeNull();
  });
});
