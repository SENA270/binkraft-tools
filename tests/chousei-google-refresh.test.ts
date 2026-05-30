import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import {
  RefreshExpiredError,
  isRefreshExpiredError,
  refreshAccessToken,
} from "../app/chousei/lib/google";

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("refresh token 失効検知", () => {
  it("isRefreshExpiredError: RefreshExpiredError は true", () => {
    expect(isRefreshExpiredError(new RefreshExpiredError())).toBe(true);
    expect(isRefreshExpiredError(new Error("other"))).toBe(false);
    expect(isRefreshExpiredError(null)).toBe(false);
    expect(isRefreshExpiredError("string")).toBe(false);
  });

  it("Google が 400 invalid_grant を返すと RefreshExpiredError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"error":"invalid_grant","error_description":"Token has been expired or revoked."}', {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    await expect(refreshAccessToken("dead-token")).rejects.toBeInstanceOf(RefreshExpiredError);
  });

  it("Google が 400 でも invalid_grant 以外なら汎用エラー", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"error":"invalid_client"}', { status: 400 })
      )
    );
    await expect(refreshAccessToken("token")).rejects.toThrowError(/refresh 400/);
    await expect(refreshAccessToken("token")).rejects.not.toBeInstanceOf(RefreshExpiredError);
  });

  it("成功時は access_token を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"access_token":"new-access-token","expires_in":3600}', {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    await expect(refreshAccessToken("valid-token")).resolves.toBe("new-access-token");
  });

  it("500 等のサーバエラーは汎用エラー(失効ではない)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 500 })));
    await expect(refreshAccessToken("token")).rejects.toThrowError(/refresh 500/);
    await expect(refreshAccessToken("token")).rejects.not.toBeInstanceOf(RefreshExpiredError);
  });
});
